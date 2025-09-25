import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { buildMembersFromUsers } from '@/lib/music-utils'
import { searchTrackId, fetchAudioFeaturesBatch } from '@/lib/spotify'
import * as XLSX from 'xlsx'

// (Removed unused FormResponse interface to satisfy lint)

interface ProcessedMember {
  id: string
  userId?: string
  name: string
  email?: string
  major: string
  year?: string
  musicProfile: {
    topGenres: string[]
    topArtists?: string[]
    preferenceVector: number[]
    listeningStyle: string
  }
  compatibility: Map<string, number>
}

interface OptimizedGroup {
  id: string
  name: string
  members: ProcessedMember[]
  groupCompatibility: number
  commonGenres: string[]
  groupDynamics: {
    diversity: number
    cohesion: number
    balance: number
  }
  recommendations: {
    playlist: string
    activities: string[]
    meetingTimes: string[]
  }
}

// Calculate similarity between two music profiles using cosine similarity
function calculateSimilarity(profile1: number[], profile2: number[]): number {
  if (profile1.length !== profile2.length) return 0

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < profile1.length; i++) {
    dotProduct += profile1[i] * profile2[i]
    norm1 += profile1[i] * profile1[i]
    norm2 += profile2[i] * profile2[i]
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// Process raw form responses into member profiles
type FormRow = Record<string, unknown>

function getStr(row: FormRow, key: string): string | undefined {
  const v = row[key]
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'number') return String(v)
  return undefined
}

function isValidEmail(email?: string): boolean {
  if (!email) return false
  // Basic, permissive email check
  return /.+@.+\..+/.test(email)
}

function processFormResponses(responses: unknown[]): ProcessedMember[] {
  const rows: FormRow[] = Array.isArray(responses) ? (responses as FormRow[]) : []
  return rows.map((response, index) => {
    // Extract music preferences from form data
    const preferenceVector = [
      parseFloat(getStr(response, 'energy') ?? '0.5'),
      parseFloat(getStr(response, 'valence') ?? '0.5'),
      parseFloat(getStr(response, 'danceability') ?? '0.5'),
      parseFloat(getStr(response, 'acousticness') ?? '0.5'),
      parseFloat(getStr(response, 'tempo') ?? '120') / 200, // Normalize tempo
      getStr(response, 'genres') ? (getStr(response, 'genres')!.split(',').length / 10) : 0.3 // Genre diversity
    ]

    // Parse genres and artists
    const genres = getStr(response, 'genres') ?
      getStr(response, 'genres')!.split(',').map((g: string) => g.trim()).filter(Boolean) :
      ['Pop', 'Rock']

    const favArtists = getStr(response, 'favorite_artists')
    const artists = favArtists ?
      favArtists.split(',').map((a: string) => a.trim()).filter(Boolean) :
      []

    // Determine listening style based on preferences
    let listeningStyle = 'Balanced'
    if (preferenceVector[0] > 0.7) listeningStyle = 'High Energy'
    else if (preferenceVector[1] > 0.7) listeningStyle = 'Upbeat'
    else if (preferenceVector[2] > 0.7) listeningStyle = 'Dance-focused'
    else if (preferenceVector[3] > 0.7) listeningStyle = 'Acoustic'

    return {
      id: `member-${index + 1}`,
      name: getStr(response, 'name') || `User ${index + 1}`,
      email: getStr(response, 'email') || `user${index + 1}@example.com`,
      major: getStr(response, 'major') || 'Undeclared',
      year: getStr(response, 'year') || 'Unknown',
      musicProfile: {
        topGenres: genres,
        topArtists: artists,
        preferenceVector,
        listeningStyle
      },
      compatibility: new Map()
    }
  })
}

// Calculate pairwise compatibility between all members
function calculateCompatibilities(members: ProcessedMember[]): void {
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      // Calculate music preference similarity
      const musicSim = calculateSimilarity(
        members[i].musicProfile.preferenceVector,
        members[j].musicProfile.preferenceVector
      )

      // Calculate genre overlap
      const genres1 = new Set(members[i].musicProfile.topGenres)
      const genres2 = new Set(members[j].musicProfile.topGenres)
      const intersection = [...genres1].filter(g => genres2.has(g))
      const union = new Set([...genres1, ...genres2])
      const genreSim = union.size > 0 ? intersection.length / union.size : 0

      // Calculate artist overlap
      const artists1 = new Set(members[i].musicProfile.topArtists)
      const artists2 = new Set(members[j].musicProfile.topArtists)
      const artistIntersection = [...artists1].filter(a => artists2.has(a))
      const artistSim = Math.max(artists1.size, artists2.size) > 0 ?
        artistIntersection.length / Math.max(artists1.size, artists2.size) : 0

      // Weighted compatibility score
      const compatibility = (musicSim * 0.5) + (genreSim * 0.3) + (artistSim * 0.2)

      members[i].compatibility.set(members[j].id, compatibility)
      members[j].compatibility.set(members[i].id, compatibility)
    }
  }
}

// Optimize group formation using clustering algorithm
// ----- Grouping helpers focused on compatibility cohesion -----
function centroidOf(members: ProcessedMember[]): number[] {
  const dim = members[0]?.musicProfile.preferenceVector.length || 0
  const centroid = new Array(dim).fill(0)
  if (dim === 0) return centroid
  for (const m of members) {
    const vec = m.musicProfile.preferenceVector
    for (let i = 0; i < dim; i++) centroid[i] += vec[i]
  }
  for (let i = 0; i < dim; i++) centroid[i] /= members.length
  return centroid
}

function avgCompatWithGroup(candidate: ProcessedMember, group: ProcessedMember[]): number {
  if (group.length === 0) return 0
  const sum = group.reduce((s, m) => s + (m.compatibility.get(candidate.id) || 0), 0)
  return sum / group.length
}

function genreOverlapWithGroup(candidate: ProcessedMember, group: ProcessedMember[]): number {
  const groupGenres = new Set<string>()
  for (const m of group) m.musicProfile.topGenres.forEach(g => groupGenres.add(g))
  const candGenres = new Set(candidate.musicProfile.topGenres)
  const intersection = [...candGenres].filter(g => groupGenres.has(g))
  const union = new Set([...candGenres, ...Array.from(groupGenres)])
  return union.size > 0 ? intersection.length / union.size : 0
}

function computePairStats(members: ProcessedMember[]): { mean: number; std: number; pairs: Array<{a: number; b: number; w: number}> } {
  const pairs: Array<{a: number; b: number; w: number}> = []
  const all: number[] = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const w = members[i].compatibility.get(members[j].id) || 0
      pairs.push({ a: i, b: j, w })
      all.push(w)
    }
  }
  const mean = all.reduce((s, v) => s + v, 0) / (all.length || 1)
  const variance = all.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (all.length || 1)
  const std = Math.sqrt(variance)
  return { mean, std, pairs }
}

function formOptimizedGroups(
  members: ProcessedMember[],
  targetGroupSize: number
): OptimizedGroup[] {
  const groups: OptimizedGroup[] = []
  const assigned = new Set<string>()

  // Build global stats and high-compatibility seeds (pairs)
  const { mean, std, pairs } = computePairStats(members)
  const sortedPairs = pairs.sort((p1, p2) => p2.w - p1.w)

  // Seed groups with highest-compatibility pairs
  for (const p of sortedPairs) {
    const mA = members[p.a]
    const mB = members[p.b]
    if (assigned.has(mA.id) || assigned.has(mB.id)) continue
    groups.push(createGroupFromMembers([mA, mB], groups.length + 1))
    assigned.add(mA.id)
    assigned.add(mB.id)
    if (assigned.size >= members.length) break
  }

  // If no groups created (e.g., all very low compat), fall back to best-avg seeds
  if (groups.length === 0 && members.length > 0) {
    const membersByAvg = [...members].sort((a, b) => {
      const avgA = Array.from(a.compatibility.values()).reduce((s, v) => s + v, 0) / (a.compatibility.size || 1)
      const avgB = Array.from(b.compatibility.values()).reduce((s, v) => s + v, 0) / (b.compatibility.size || 1)
      return avgB - avgA
    })
    const seed = membersByAvg[0]
    groups.push(createGroupFromMembers([seed], 1))
    assigned.add(seed.id)
  }

  // Greedily grow each group with candidates that maximize internal cohesion
  const baseThreshold = mean + 0.25 * std // dynamic accept threshold baseline
  const alpha = 0.6 // weight for average pairwise compatibility with group
  const beta = 0.25 // weight for centroid similarity
  const gamma = 0.15 // weight for genre overlap

  for (const g of groups) {
    // Extract mutable list of members from created group
    const current: ProcessedMember[] = [...g.members]
    while (current.length < targetGroupSize) {
      let best: { m: ProcessedMember; score: number; avg: number } | null = null
      const centroid = centroidOf(current)

      for (const cand of members) {
        if (assigned.has(cand.id)) continue
        const avg = avgCompatWithGroup(cand, current)
        const centroidSim = calculateSimilarity(cand.musicProfile.preferenceVector, centroid)
        const genreSim = genreOverlapWithGroup(cand, current)
        const score = alpha * avg + beta * centroidSim + gamma * genreSim
        if (!best || score > best.score) best = { m: cand, score, avg }
      }

      if (!best) break

      // Adaptive threshold: slightly relax as group fills to avoid getting stuck
      const relax = 0.08 * Math.max(0, current.length - 2)
      const acceptThreshold = Math.max(0.2, baseThreshold - relax)

      if (best.avg >= acceptThreshold || current.length < 2) {
        current.push(best.m)
        assigned.add(best.m.id)
      } else {
        break // no suitable candidate meets threshold
      }
    }

    // Replace group's members with refined selection and recompute metrics
    const rebuilt = createGroupFromMembers(current, groups.indexOf(g) + 1)
    g.members = rebuilt.members
    g.groupCompatibility = rebuilt.groupCompatibility
    g.commonGenres = rebuilt.commonGenres
    g.groupDynamics = rebuilt.groupDynamics
    g.recommendations = rebuilt.recommendations
  }

  // Handle remaining unassigned members
  const remaining = members.filter(m => !assigned.has(m.id))
  // Seed additional groups from remaining high-compatibility pairs
  while (remaining.length >= 2) {
    const usablePair = sortedPairs.find(p => !assigned.has(members[p.a].id) && !assigned.has(members[p.b].id))
    if (!usablePair) break
    const a = members[usablePair.a]
    const b = members[usablePair.b]
    groups.push(createGroupFromMembers([a, b], groups.length + 1))
    assigned.add(a.id)
    assigned.add(b.id)
    // remove from remaining list
    const idxA = remaining.findIndex(x => x.id === a.id)
    if (idxA >= 0) remaining.splice(idxA, 1)
    const idxB = remaining.findIndex(x => x.id === b.id)
    if (idxB >= 0) remaining.splice(idxB, 1)
  }

  // Assign any leftovers to the most compatible existing group
  for (const m of members) {
    if (assigned.has(m.id)) continue
    let bestG: { idx: number; gain: number } | null = null
    for (let gi = 0; gi < groups.length; gi++) {
      const g = groups[gi]
      const avg = avgCompatWithGroup(m, g.members as unknown as ProcessedMember[])
      if (!bestG || avg > bestG.gain) bestG = { idx: gi, gain: avg }
    }
    if (bestG) {
      const g = groups[bestG.idx]
      ;(g.members as unknown as ProcessedMember[]).push(m)
      assigned.add(m.id)
      // Recompute metrics
      const rebuilt = createGroupFromMembers(g.members as unknown as ProcessedMember[], bestG.idx + 1)
      g.members = rebuilt.members
      g.groupCompatibility = rebuilt.groupCompatibility
      g.commonGenres = rebuilt.commonGenres
      g.groupDynamics = rebuilt.groupDynamics
      g.recommendations = rebuilt.recommendations
    }
  }

  return groups
}

// Create a group object from members
function createGroupFromMembers(
  members: ProcessedMember[],
  groupId: number
): OptimizedGroup {
  // Calculate group compatibility
  let totalCompatibility = 0
  let pairCount = 0

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      totalCompatibility += members[i].compatibility.get(members[j].id) || 0
      pairCount++
    }
  }

  const avgCompatibility = pairCount > 0 ? totalCompatibility / pairCount : 0

  // Find common genres
  const genreCounts = new Map<string, number>()
  members.forEach(member => {
    member.musicProfile.topGenres.forEach(genre => {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
    })
  })

  const commonGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre]) => genre)

  // Calculate group dynamics
  const uniqueGenres = new Set(members.flatMap(m => m.musicProfile.topGenres))
  const diversity = uniqueGenres.size / (members.length * 3) // Assuming 3 genres per person on average

  const preferenceVectors = members.map(m => m.musicProfile.preferenceVector)
  const avgVector = preferenceVectors[0].map((_, i) =>
    preferenceVectors.reduce((sum, vec) => sum + vec[i], 0) / members.length
  )

  const cohesion = 1 - (preferenceVectors.reduce((sum, vec) => {
    const diff = vec.reduce((s, v, i) => s + Math.abs(v - avgVector[i]), 0)
    return sum + diff
  }, 0) / (members.length * avgVector.length))

  const majorCounts = new Map<string, number>()
  members.forEach(m => {
    majorCounts.set(m.major, (majorCounts.get(m.major) || 0) + 1)
  })
  const balance = 1 - (Math.max(...majorCounts.values()) / members.length)

  // Generate group name based on common characteristics
  const groupName = generateGroupName(commonGenres, members)

  // Generate recommendations
  const recommendations = generateRecommendations(members, commonGenres, avgVector)

  return {
    id: `group-${groupId}`,
    name: groupName,
    members,
    groupCompatibility: avgCompatibility,
    commonGenres,
    groupDynamics: {
      diversity: Math.min(1, diversity),
      cohesion: Math.max(0, cohesion),
      balance
    },
    recommendations
  }
}

// Generate a creative group name
function generateGroupName(genres: string[], members: ProcessedMember[]): string {
  const prefixes = ['The', 'Team', 'Club', 'Crew', 'Squad']
  const suffixes = ['Collective', 'Society', 'Alliance', 'Union', 'Network']

  if (genres.length > 0) {
    const mainGenre = genres[0]
    const genreNames: Record<string, string[]> = {
      'Pop': ['Mainstream', 'Chart', 'Hit'],
      'Rock': ['Rock', 'Guitar', 'Amp'],
      'Hip Hop': ['Hip Hop', 'Beat', 'Flow'],
      'Electronic': ['Electronic', 'Synth', 'EDM'],
      'Jazz': ['Jazz', 'Smooth', 'Blue Note'],
      'Classical': ['Classical', 'Symphony', 'Harmony'],
      'R&B': ['R&B', 'Soul', 'Groove'],
      'Country': ['Country', 'Nashville', 'Acoustic'],
      'Indie': ['Indie', 'Alternative', 'Underground'],
      'Metal': ['Metal', 'Heavy', 'Power']
    }

    for (const [genre, names] of Object.entries(genreNames)) {
      if (mainGenre.toLowerCase().includes(genre.toLowerCase())) {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
        const name = names[Math.floor(Math.random() * names.length)]
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
        return `${prefix} ${name} ${suffix}`
      }
    }
  }

  // Fallback name
  const styles = members.map(m => m.musicProfile.listeningStyle)
  const uniqueStyles = [...new Set(styles)]
  if (uniqueStyles.length === 1) {
    return `The ${uniqueStyles[0]} Group`
  }

  return `Music Group ${Math.floor(Math.random() * 100)}`
}

// Generate recommendations for the group
function generateRecommendations(
  members: ProcessedMember[],
  genres: string[],
  avgPreferences: number[]
): {
  playlist: string
  activities: string[]
  meetingTimes: string[]
} {
  // Playlist recommendation based on preferences
  let playlistType = 'Diverse Mix'
  if (avgPreferences[0] > 0.7) playlistType = 'High Energy Workout'
  else if (avgPreferences[1] > 0.7) playlistType = 'Feel Good Vibes'
  else if (avgPreferences[2] > 0.7) playlistType = 'Dance Party'
  else if (avgPreferences[3] > 0.7) playlistType = 'Acoustic Sessions'

  const playlist = `${playlistType} - A collaborative playlist featuring ${genres.slice(0, 3).join(', ')} tracks`

  // Activity recommendations based on group preferences
  const activities = []
  if (avgPreferences[0] > 0.6) activities.push('Attend live concerts together')
  if (avgPreferences[2] > 0.6) activities.push('Organize dance parties or club nights')
  if (avgPreferences[3] > 0.6) activities.push('Host acoustic jam sessions')
  if (genres.includes('Jazz')) activities.push('Visit jazz clubs or lounges')
  if (genres.includes('Classical')) activities.push('Attend symphony performances')

  // Default activities
  if (activities.length === 0) {
    activities.push(
      'Weekly music discovery sessions',
      'Collaborative playlist creation workshops',
      'Music trivia nights'
    )
  }

  // Meeting time recommendations based on typical listening habits
  const meetingTimes = [
    'Thursday evenings (7-9 PM) - Peak music discovery time',
    'Saturday afternoons (2-4 PM) - Relaxed listening sessions',
    'Friday nights (8-10 PM) - Social music experiences'
  ]

  return {
    playlist,
    activities: activities.slice(0, 4),
    meetingTimes: meetingTimes.slice(0, 2)
  }
}

// Convert groups to CSV format
function generateCSV(groups: OptimizedGroup[]): string {
  const headers = [
    'Group ID',
    'Group Name',
    'Group Compatibility',
    'Member Name',
    'Email',
    'Major',
    'Year',
    'Top Genres',
    'Listening Style',
    'Common Genres',
    'Diversity Score',
    'Cohesion Score',
    'Playlist Recommendation',
    'Activities'
  ]

  const rows: string[][] = [headers]

  groups.forEach(group => {
    group.members.forEach((member, index) => {
      rows.push([
        index === 0 ? group.id : '',
        index === 0 ? group.name : '',
        index === 0 ? `${Math.round(group.groupCompatibility * 100)}%` : '',
        member.name,
        member.email,
        member.major,
        member.year,
        member.musicProfile.topGenres.join('; '),
        member.musicProfile.listeningStyle,
        index === 0 ? group.commonGenres.join('; ') : '',
        index === 0 ? `${Math.round(group.groupDynamics.diversity * 100)}%` : '',
        index === 0 ? `${Math.round(group.groupDynamics.cohesion * 100)}%` : '',
        index === 0 ? group.recommendations.playlist : '',
        index === 0 ? group.recommendations.activities.join('; ') : ''
      ])
    })

    // Add separator row
    rows.push(Array(headers.length).fill(''))
  })

  // Convert to CSV string
  return rows.map(row =>
    row.map(cell => {
      const str = String(cell)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  ).join('\n')
}

// Helper function to create or find user by email
async function ensureUserExists(email: string, name?: string, major?: string, year?: string) {
  let user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    // Create auto-generated user account for form respondent
    const randomPassword = Math.random().toString(36).substring(7)
    const hashedPassword = await bcrypt.hash(randomPassword, 12)

    user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        major: major || 'Undeclared',
        year: year || 'Unknown',
        autoCreated: true
      }
    })
  } else {
    // User exists - update profile if current values are placeholders
    const updates: Partial<{ name: string; major: string; year: string }> = {}
    const isPlaceholderMajor = !user.major || user.major === 'Undeclared'
    const isPlaceholderYear = !user.year || user.year === 'Unknown'
    const isPlaceholderName = !user.name

    if (isPlaceholderName && name) updates.name = name
    if (isPlaceholderMajor && major) updates.major = major
    if (isPlaceholderYear && year) updates.year = year

    if (Object.keys(updates).length > 0) {
      user = await prisma.user.update({
        where: { email },
        data: updates
      })
    }
  }

  return user
}

// Preprocess CSV data to map Google Form columns to expected format
function preprocessCSVData(rawData: unknown[]): unknown[] {
  if (!Array.isArray(rawData) || rawData.length === 0) return rawData

  return rawData.map((row: unknown) => {
    if (!row || typeof row !== 'object') return row

    const rowRecord = row as Record<string, unknown>

    // Map your Google Form columns to expected format
    const preprocessed: Record<string, unknown> = {}

    // Handle email field (case-insensitive)
    const emailField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('email')
    )
    if (emailField && rowRecord[emailField]) {
      preprocessed.email = rowRecord[emailField]
    }

    // Combine First Name and Last Name or map a single Name field
    const firstNameField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('first') && key.toLowerCase().includes('name')
    )
    const lastNameField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('last') && key.toLowerCase().includes('name')
    )

    if (firstNameField || lastNameField) {
      const firstName = firstNameField ? rowRecord[firstNameField] || '' : ''
      const lastName = lastNameField ? rowRecord[lastNameField] || '' : ''
      preprocessed.name = `${firstName} ${lastName}`.trim()
    } else {
      const nameField = Object.keys(rowRecord).find(key => key.toLowerCase() === 'name' || key.toLowerCase().includes('full name'))
      if (nameField && rowRecord[nameField]) {
        preprocessed.name = String(rowRecord[nameField])
      }
    }

    // Handle major field
    const majorField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('major')
    )
    if (majorField && rowRecord[majorField]) {
      preprocessed.major = rowRecord[majorField]
    } else {
      preprocessed.major = 'Undeclared'
    }

    // Handle year field
    const yearField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('year')
    )
    if (yearField && rowRecord[yearField]) {
      preprocessed.year = rowRecord[yearField]
    }

    // Handle favorite song
    const songField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('song')
    )
    if (songField && rowRecord[songField]) {
      preprocessed.favorite_song = rowRecord[songField]
    }

    // Handle favorite artists
    const artistsField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('artist')
    )
    if (artistsField && rowRecord[artistsField]) {
      preprocessed.favorite_artists = rowRecord[artistsField]
    }

    // Handle genres
    const genresField = Object.keys(rowRecord).find(key =>
      key.toLowerCase().includes('genre')
    )
    if (genresField && rowRecord[genresField]) {
      preprocessed.genres = rowRecord[genresField]
    }

    // Set default audio features (since not collected in your form)
    preprocessed.energy = '0.5'
    preprocessed.valence = '0.5'
    preprocessed.danceability = '0.5'
    preprocessed.acousticness = '0.3'
    preprocessed.tempo = '120'

    // Copy any other fields that might exist
    Object.keys(rowRecord).forEach(key => {
      if (!preprocessed.hasOwnProperty(key.toLowerCase())) {
        preprocessed[key] = rowRecord[key]
      }
    })

    return preprocessed
  })
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const sheetsUrl = formData.get('sheetsUrl') as string
    const groupSize = parseInt(formData.get('groupSize') as string) || 4
    const replace = String(formData.get('replace') || '').toLowerCase() === 'true'
    const replaceScope = String(formData.get('replaceScope') || 'user').toLowerCase() // 'user' | 'all'

    let responses: unknown[] = []

    // Process file upload (CSV or XLSX)
    if (file && file.size > 0) {
      const filename = (file.name || '').toLowerCase()
      let rawResponses: unknown[] = []

      if (filename.endsWith('.xlsx')) {
        // Parse Excel (first worksheet)
        try {
          const buf = await file.arrayBuffer()
          const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
          const sheetName = wb.SheetNames[0]
          const sheet = wb.Sheets[sheetName]
          rawResponses = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' }) as unknown[]
        } catch (e) {
          return NextResponse.json({
            success: false,
            error: `Failed to read .xlsx file: ${e instanceof Error ? e.message : 'unknown error'}. Please upload a CSV as a fallback.`
          }, { status: 400 })
        }
      } else {
        // Default to CSV parsing
        const text = await file.text()
        rawResponses = parse(text, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        }) as unknown[]
      }

      // Preprocess data to map Google Form columns to expected format
      responses = preprocessCSVData(rawResponses)

      // Optional: we no longer hard-require Email; we will generate a placeholder if missing
      // We still recommend having a Name column
      if (responses.length > 0) {
        const firstRow = responses[0] as Record<string, unknown>
        if (!firstRow?.name || String(firstRow.name).trim() === '') {
          return NextResponse.json({
            success: false,
            error: 'Missing required column: Name. Please include a Name column or First/Last Name columns.'
          }, { status: 400 })
        }
      }
    }

    // Process Google Sheets URL
    else if (sheetsUrl) {
      // Extract sheet ID from URL
      const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /[?&]id=([a-zA-Z0-9-_]+)/,
      ]

      let sheetId: string | null = null
      for (const pattern of patterns) {
        const match = sheetsUrl.match(pattern)
        if (match) {
          sheetId = match[1]
          break
        }
      }

      if (!sheetId) {
        return NextResponse.json({
          success: false,
          error: 'Invalid Google Sheets URL'
        }, { status: 400 })
      }

      // Fetch actual data from Google Sheets using CSV export
      try {
        const csvExportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`

        const response = await fetch(csvExportUrl)

        if (!response.ok) {
          if (response.status === 403) {
            return NextResponse.json({
              success: false,
              error: 'Unable to access the Google Sheet. Please ensure the sheet is publicly accessible or shared with viewing permissions.'
            }, { status: 400 })
          }
          throw new Error(`HTTP ${response.status}: Failed to fetch spreadsheet data`)
        }

        const csvText = await response.text()

        if (!csvText || csvText.trim() === '') {
          return NextResponse.json({
            success: false,
            error: 'The Google Sheet appears to be empty or contains no data.'
          }, { status: 400 })
        }

        // Check if Google returned HTML instead of CSV (common for private/invalid sheets)
        const contentType = response.headers.get('content-type') || ''
        const isHTML = contentType.includes('text/html') ||
                      csvText.trim().startsWith('<!DOCTYPE') ||
                      csvText.trim().startsWith('<html')

        if (isHTML) {
          return NextResponse.json({
            success: false,
            error: 'Unable to access the Google Sheet. The sheet may be private or the URL is invalid. Please ensure the sheet is publicly accessible and the URL is correct.'
          }, { status: 400 })
        }

        // Parse CSV with error handling
        let rawResponses: unknown[]
        try {
          rawResponses = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            trim: true
          })
        } catch (parseError) {
          return NextResponse.json({
            success: false,
            error: `Invalid CSV format: ${parseError instanceof Error ? parseError.message : 'Unable to parse CSV data'}. Please ensure the Google Sheet is properly formatted.`
          }, { status: 400 })
        }

        // Validate that CSV parsing returned actual data
        if (!Array.isArray(rawResponses) || rawResponses.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'No valid data found in the Google Sheet. Please ensure the sheet contains at least one row of data with proper column headers.'
          }, { status: 400 })
        }

        // Check if first row looks like actual data (not HTML fragments)
        const firstRow = rawResponses[0] as Record<string, unknown>
        const hasValidColumns = Object.keys(firstRow).length > 0 &&
                               !Object.keys(firstRow).some(key =>
                                 key.toLowerCase().includes('doctype') ||
                                 key.toLowerCase().includes('html') ||
                                 key.toLowerCase().includes('body')
                               )

        if (!hasValidColumns) {
          return NextResponse.json({
            success: false,
            error: 'The sheet data appears to be invalid or corrupted. Please ensure the Google Sheet is publicly accessible and contains valid column headers.'
          }, { status: 400 })
        }

        // Preprocess CSV data to map Google Form columns to expected format
        responses = preprocessCSVData(rawResponses)

        // Optional: we no longer hard-require Email; we will generate a placeholder if missing
        if (responses.length > 0) {
          const firstRow = responses[0] as Record<string, unknown>
          if (!firstRow?.name || String(firstRow.name).trim() === '') {
            return NextResponse.json({
              success: false,
              error: 'Missing required column in Google Sheet: Name. Please include a Name column or First/Last Name columns.'
            }, { status: 400 })
          }
        }

      } catch (error) {
        console.error('Error fetching Google Sheets data:', error)
        return NextResponse.json({
          success: false,
          error: `Failed to fetch Google Sheets data: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure the sheet is publicly accessible.`
        }, { status: 500 })
      }
    }

    // Validate we have data
    if (!responses || responses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data to process. Please provide a CSV file or Google Sheets URL.'
      }, { status: 400 })
    }

    // Process the responses
    let members: ProcessedMember[] = processFormResponses(responses)

    // Calculate compatibilities
    calculateCompatibilities(members)

    // Create users for all email addresses in responses and store form data
    const touchedSubmissions: Array<{ id: string; userId: string; song: string; artist: string }> = []
    const processedUserIds = new Set<string>()
    for (let i = 0; i < (responses as FormRow[]).length; i++) {
      const response = (responses as FormRow[])[i]
      const rawEmail = getStr(response, 'email')
      const safeEmail = isValidEmail(rawEmail) ? rawEmail! : `user${i + 1}@example.local`

      try {
        const user = await ensureUserExists(
          safeEmail,
          getStr(response, 'name') || `User ${i + 1}`,
          getStr(response, 'major') || 'Undeclared',
          getStr(response, 'year') || 'Unknown'
        )

        // Store the form response
        await prisma.formResponse.create({
          data: {
            userId: user.id,
            email: safeEmail,
            formData: JSON.stringify(response),
            sourceType: file ? 'csv' : 'sheets',
            sourceUrl: sheetsUrl || null,
            processed: true
          }
        })

        // Track user for rebuild
        processedUserIds.add(user.id)

        // Store music submission if it doesn't exist
        const favorite_artists = getStr(response, 'favorite_artists')
        const genresStr = getStr(response, 'genres')
        if (favorite_artists || genresStr) {
          const artistFirst = favorite_artists ? favorite_artists.split(',').map(s => s.trim()).filter(Boolean)[0] || 'Unknown' : 'Unknown'
          const existingSubmission = await prisma.musicSubmission.findFirst({
            where: {
              userId: user.id,
              songName: getStr(response, 'favorite_song') || 'Unknown'
            }
          })

          if (!existingSubmission) {
            const created = await prisma.musicSubmission.create({
              data: {
                userId: user.id,
                songName: getStr(response, 'favorite_song') || 'Unknown',
                artistName: artistFirst,
                genres: JSON.stringify(genresStr ? String(genresStr).split(',') : []),
                energy: parseFloat(getStr(response, 'energy') || '0.5'),
                valence: parseFloat(getStr(response, 'valence') || '0.5'),
                danceability: parseFloat(getStr(response, 'danceability') || '0.5'),
                acousticness: parseFloat(getStr(response, 'acousticness') || '0.5'),
                tempo: parseFloat(getStr(response, 'tempo') || '120')
              }
            })
            touchedSubmissions.push({ id: created.id, userId: user.id, song: created.songName, artist: created.artistName })
          } else {
            touchedSubmissions.push({ id: existingSubmission.id, userId: user.id, song: existingSubmission.songName, artist: existingSubmission.artistName })
          }
        }
    } catch {
      // Fallback: if user creation fails due to bad email, retry with generated placeholder
      const fallbackEmail = `autogen${Date.now()}_${i}@example.local`
      const user = await ensureUserExists(
        fallbackEmail,
        getStr(response, 'name') || `User ${i + 1}`,
          getStr(response, 'major') || 'Undeclared',
          getStr(response, 'year') || 'Unknown'
        )
        await prisma.formResponse.create({
          data: {
            userId: user.id,
            email: fallbackEmail,
            formData: JSON.stringify(response),
            sourceType: file ? 'csv' : 'sheets',
            sourceUrl: sheetsUrl || null,
            processed: true
          }
        })
        processedUserIds.add(user.id)
      }
    }

    // Form optimized groups
    let groups: OptimizedGroup[] = formOptimizedGroups(members, groupSize)

    // (Saving groups moved to after Spotify sync and DB-based rebuild)

    // Optionally sync Spotify audio features for imported tracks (auto-run when credentials present)
    try {
      if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET && touchedSubmissions.length > 0) {
        const unique = new Map<string, { trackId?: string | null; rows: number[]; song: string; artist: string }>()
        for (let i = 0; i < touchedSubmissions.length; i++) {
          const t = touchedSubmissions[i]
          const key = `${t.song.trim().toLowerCase()}|${t.artist.trim().toLowerCase()}`
          if (!unique.has(key)) unique.set(key, { rows: [], song: t.song, artist: t.artist })
          unique.get(key)!.rows.push(i)
        }
        // Search IDs (sequential to respect rate limits)
        for (const item of unique.values()) {
          item.trackId = await searchTrackId(item.song, item.artist)
        }
        const ids = Array.from(unique.values()).map(u => u.trackId).filter(Boolean) as string[]
        const featureMap = await fetchAudioFeaturesBatch(ids)
        // Update rows
        for (const item of unique.values()) {
          const id = item.trackId
          if (!id) continue
          const f = featureMap[id]
          if (!f) continue
          for (const rowIdx of item.rows) {
            const s = touchedSubmissions[rowIdx]
            await prisma.musicSubmission.update({
              where: { id: s.id },
              data: {
                energy: f.energy,
                valence: f.valence,
                danceability: f.danceability,
                tempo: f.tempo,
              }
            })
          }
        }
      }
    } catch (e: unknown) {
      console.warn('Spotify sync after import failed (continuing):', e)
    }

    // Rebuild members from DB and reform groups after Spotify sync
    try {
      const usersWithMusic = await prisma.user.findMany({
        where: { id: { in: Array.from(processedUserIds) } },
        include: { submissions: true }
      })
      if (usersWithMusic.length > 0) {
        members = buildMembersFromUsers(usersWithMusic)
        calculateCompatibilities(members)
        // recompute groups
        groups = formOptimizedGroups(members, groupSize)
      }
    } catch (e: unknown) {
      console.warn('DB-based grouping failed (using initial CSV-derived groups):', e)
    }

    // Replace existing groups if requested
    if (replace) {
      if (replaceScope === 'all') {
        await prisma.group.deleteMany({})
      } else {
        await prisma.group.deleteMany({ where: { userId: session.user.id } })
      }
    }

    // Save groups to database for the current user
    for (const group of groups) {
      await prisma.group.create({
        data: {
          userId: session.user.id,
          name: group.name,
          members: JSON.stringify(group.members.map((m: ProcessedMember) => ({
            userId: m.userId ?? m.id,
            name: m.name,
            major: m.major,
            musicProfile: { topGenres: m.musicProfile.topGenres, listeningStyle: m.musicProfile.listeningStyle }
          }))),
          compatibility: group.groupCompatibility,
          commonGenres: JSON.stringify(group.commonGenres),
          recommendations: JSON.stringify(group.recommendations)
        }
      })
    }

    // Generate CSV
    const csvContent = generateCSV(groups)

    // Create summary statistics
    const summary = {
      totalResponses: responses.length,
      totalGroups: groups.length,
      averageGroupSize: responses.length / (groups.length || 1),
      averageCompatibility: groups.reduce((sum, g) => sum + g.groupCompatibility, 0) / (groups.length || 1),
      topGenres: Array.from(
        groups.reduce((genres, g) => {
          g.commonGenres.forEach(genre => genres.add(genre))
          return genres
        }, new Set<string>())
      ).slice(0, 10),
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      groups: groups.map(g => ({
        ...g,
        members: g.members.map(m => ({
          ...m,
          compatibility: Array.from(m.compatibility.entries())
        }))
      })),
      summary,
      csvContent,
      message: `Successfully processed ${responses.length} responses into ${groups.length} optimized groups`
    })

  } catch (error) {
    console.error('Error processing forms:', error)
    const raw = error instanceof Error ? error.message : 'Unknown error'
    const friendly = /did not match the expected pattern/i.test(raw)
      ? 'A value in your CSV appears invalid (likely an email). Please ensure the Email column contains valid addresses, or try removing that column. You can still form groups without emails.'
      : raw
    return NextResponse.json({
      success: false,
      error: `Failed to process forms: ${friendly}`
    }, { status: 500 })
  }
}

// Mock data generation has been removed - we only process real data from actual Google Sheets or CSV files

// GET endpoint to download CSV
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const groupData = searchParams.get('data')

  if (!groupData) {
    return NextResponse.json({
      success: false,
      error: 'No group data provided'
    }, { status: 400 })
  }

  try {
    const groups = JSON.parse(decodeURIComponent(groupData))
    const csvContent = generateCSV(groups)

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="music-groups-${Date.now()}.csv"`
      }
    })
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Invalid group data'
    }, { status: 400 })
  }
}
