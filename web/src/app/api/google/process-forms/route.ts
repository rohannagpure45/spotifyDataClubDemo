import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { calculateCompatibilities as calcCompat, formOptimizedGroups as formGroups, generateCSV as genCSV } from '@/lib/music-utils'

// (Removed unused FormResponse interface to satisfy lint)

interface ProcessedMember {
  id: string
  name: string
  email: string
  major: string
  year: string
  musicProfile: {
    topGenres: string[]
    topArtists: string[]
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
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)
  return undefined
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

    // Process file upload (CSV)
    if (file && file.size > 0) {
      const text = await file.text()
      responses = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      })
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

      // In production, fetch actual data from Google Sheets API
      // For now, use mock data
      responses = generateMockResponses(20)
    }

    // Validate we have data
    if (!responses || responses.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No data to process. Please provide a CSV file or Google Sheets URL.'
      }, { status: 400 })
    }

    // Process the responses
    const members = processFormResponses(responses)

    // Calculate compatibilities (shared util)
    calcCompat(members)

    // Create users for all email addresses in responses and store form data
    for (const response of responses as FormRow[]) {
      const email = getStr(response, 'email')
      if (email) {
        const user = await ensureUserExists(
          email,
          getStr(response, 'name'),
          getStr(response, 'major'),
          getStr(response, 'year')
        )

        // Store the form response
        await prisma.formResponse.create({
          data: {
            userId: user.id,
            email: email,
            formData: JSON.stringify(response),
            sourceType: file ? 'csv' : 'sheets',
            sourceUrl: sheetsUrl || null,
            processed: true
          }
        })

        // Store music submission if it doesn't exist
        const favorite_artists = getStr(response, 'favorite_artists')
        const genresStr = getStr(response, 'genres')
        if (favorite_artists || genresStr) {
          const existingSubmission = await prisma.musicSubmission.findFirst({
            where: {
              userId: user.id,
              songName: getStr(response, 'favorite_song') || 'Unknown'
            }
          })

          if (!existingSubmission) {
            await prisma.musicSubmission.create({
              data: {
                userId: user.id,
                songName: getStr(response, 'favorite_song') || 'Unknown',
                artistName: favorite_artists || 'Unknown',
                genres: JSON.stringify(genresStr ? genresStr.split(',') : []),
                energy: parseFloat(getStr(response, 'energy') || '0.5'),
                valence: parseFloat(getStr(response, 'valence') || '0.5'),
                danceability: parseFloat(getStr(response, 'danceability') || '0.5'),
                acousticness: parseFloat(getStr(response, 'acousticness') || '0.5'),
                tempo: parseFloat(getStr(response, 'tempo') || '120')
              }
            })
          }
        }
      }
    }

    // Form optimized groups (shared util)
    const groups = formGroups(members, groupSize)

    // Replace existing groups if requested (demo mode)
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
          members: JSON.stringify(group.members),
          compatibility: group.groupCompatibility,
          commonGenres: JSON.stringify(group.commonGenres),
          recommendations: JSON.stringify(group.recommendations)
        }
      })
    }

    // Generate CSV
    const csvContent = genCSV(groups)

    // Create summary statistics
    const summary = {
      totalResponses: responses.length,
      totalGroups: groups.length,
      averageGroupSize: responses.length / groups.length,
      averageCompatibility: groups.reduce((sum, g) => sum + g.groupCompatibility, 0) / groups.length,
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
    return NextResponse.json({
      success: false,
      error: `Failed to process forms: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 })
  }
}

// Generate mock responses for testing
function generateMockResponses(count: number): unknown[] {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']
  const majors = ['Computer Science', 'Psychology', 'Business', 'Engineering', 'Music', 'Biology']
  const years = ['Freshman', 'Sophomore', 'Junior', 'Senior']
  const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country', 'Indie', 'Metal']
  const artists = ['Taylor Swift', 'The Weeknd', 'Drake', 'Billie Eilish', 'Ed Sheeran', 'Ariana Grande', 'Post Malone', 'Dua Lipa']

  const responses = []
  for (let i = 0; i < count; i++) {
    const selectedGenres: string[] = []
    for (let j = 0; j < 3; j++) {
      const genre = genres[Math.floor(Math.random() * genres.length)]
      if (!selectedGenres.includes(genre)) {
        selectedGenres.push(genre)
      }
    }

    responses.push({
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      name: `${names[i % names.length]} ${['Smith', 'Johnson', 'Williams', 'Brown'][i % 4]}`,
      email: `user${i + 1}@university.edu`,
      major: majors[Math.floor(Math.random() * majors.length)],
      year: years[Math.floor(Math.random() * years.length)],
      genres: selectedGenres.join(','),
      favorite_artists: artists.slice(
        Math.floor(Math.random() * artists.length),
        Math.floor(Math.random() * artists.length) + 2
      ).join(','),
      energy: (0.3 + Math.random() * 0.6).toFixed(2),
      valence: (0.3 + Math.random() * 0.6).toFixed(2),
      danceability: (0.3 + Math.random() * 0.6).toFixed(2),
      acousticness: (0.2 + Math.random() * 0.5).toFixed(2),
      tempo: (80 + Math.random() * 100).toFixed(0)
    })
  }

  return responses
}

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
    const csvContent = genCSV(groups)

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
