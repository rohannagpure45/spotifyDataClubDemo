import type { MusicSubmission } from '@prisma/client'

// Shared types for music analysis and grouping
export interface MusicProfile {
  topGenres: string[]
  topArtists?: string[]
  preferenceVector: number[]
  listeningStyle: string
}

export interface ProcessedMember {
  id: string
  userId?: string
  name: string
  email?: string
  major: string
  year?: string
  musicProfile: MusicProfile
  compatibility: Map<string, number>
}

export interface OptimizedGroup {
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
export function calculateSimilarity(profile1: number[], profile2: number[]): number {
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

// Build a user preference vector aggregated from their music submissions
export function calculatePreferenceVectorFromSubmissions(submissions: Pick<MusicSubmission, 'energy' | 'valence' | 'danceability' | 'acousticness' | 'tempo' | 'genres'>[]): {
  vector: number[]
  topGenres: string[]
  listeningStyle: string
} {
  if (!submissions || submissions.length === 0) {
    return {
      vector: [0.5, 0.5, 0.5, 0.5, 120 / 200, 0.3],
      topGenres: [],
      listeningStyle: 'Balanced'
    }
  }

  const agg = submissions.reduce(
    (acc, s) => {
      acc.energy += s.energy ?? 0.5
      acc.valence += s.valence ?? 0.5
      acc.danceability += s.danceability ?? 0.5
      acc.acousticness += s.acousticness ?? 0.5
      acc.tempo += s.tempo ?? 120
      if (s.genres) {
        try {
          const arr = JSON.parse(s.genres) as unknown
          const genres = Array.isArray(arr) ? (arr as string[]) : []
          for (const g of genres) acc.genreCounts.set(g, (acc.genreCounts.get(g) || 0) + 1)
        } catch {
          /* ignore bad JSON */
        }
      }
      return acc
    },
    { energy: 0, valence: 0, danceability: 0, acousticness: 0, tempo: 0, genreCounts: new Map<string, number>() }
  )

  const n = submissions.length
  const avgEnergy = agg.energy / n
  const avgValence = agg.valence / n
  const avgDance = agg.danceability / n
  const avgAcoustic = agg.acousticness / n
  const avgTempo = (agg.tempo / n) / 200 // normalize

  const uniqueGenres = Array.from(agg.genreCounts.keys())
  const genreDiversity = Math.min(1, uniqueGenres.length / 10)

  // Determine listening style heuristically
  let listeningStyle = 'Balanced'
  if (avgEnergy > 0.7) listeningStyle = 'High Energy'
  else if (avgValence > 0.7) listeningStyle = 'Upbeat'
  else if (avgDance > 0.7) listeningStyle = 'Dance-focused'
  else if (avgAcoustic > 0.7) listeningStyle = 'Acoustic'

  const topGenres = Array.from(agg.genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g)

  return {
    vector: [avgEnergy, avgValence, avgDance, avgAcoustic, avgTempo, genreDiversity],
    topGenres,
    listeningStyle
  }
}

// Compute pairwise compatibility for members (mutates members' compatibility maps)
export function calculateCompatibilities(members: ProcessedMember[]): void {
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const musicSim = calculateSimilarity(
        members[i].musicProfile.preferenceVector,
        members[j].musicProfile.preferenceVector
      )

      // Genre overlap (Jaccard-like)
      const genres1 = new Set(members[i].musicProfile.topGenres)
      const genres2 = new Set(members[j].musicProfile.topGenres)
      const intersection = [...genres1].filter(g => genres2.has(g))
      const union = new Set([...genres1, ...genres2])
      const genreSim = union.size > 0 ? intersection.length / union.size : 0

      // Artist overlap if present (optional)
      const artists1 = new Set(members[i].musicProfile.topArtists || [])
      const artists2 = new Set(members[j].musicProfile.topArtists || [])
      const artistIntersection = [...artists1].filter(a => artists2.has(a))
      const artistSim = Math.max(artists1.size, artists2.size) > 0
        ? artistIntersection.length / Math.max(artists1.size, artists2.size)
        : 0

      const compatibility = (musicSim * 0.5) + (genreSim * 0.3) + (artistSim * 0.2)

      members[i].compatibility.set(members[j].id, compatibility)
      members[j].compatibility.set(members[i].id, compatibility)
    }
  }
}

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

export function createGroupFromMembers(
  members: ProcessedMember[],
  groupIndex: number
): OptimizedGroup {
  // Calculate group compatibility (avg pairwise)
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
  const diversity = uniqueGenres.size / (members.length * 3)

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
  const balance = 1 - (Math.max(...Array.from(majorCounts.values())) / members.length)

  const name = generateGroupName(commonGenres, members)

  return {
    id: `group-${groupIndex}`,
    name,
    members,
    groupCompatibility: avgCompatibility,
    commonGenres,
    groupDynamics: { diversity, cohesion, balance },
    recommendations: generateRecommendations(members, commonGenres, avgVector)
  }
}

export function formOptimizedGroups(
  members: ProcessedMember[],
  targetGroupSize: number
): OptimizedGroup[] {
  const groups: OptimizedGroup[] = []
  const assigned = new Set<string>()

  const { mean, std, pairs } = computePairStats(members)
  const sortedPairs = pairs.sort((p1, p2) => p2.w - p1.w)

  for (const p of sortedPairs) {
    const mA = members[p.a]
    const mB = members[p.b]
    if (assigned.has(mA.id) || assigned.has(mB.id)) continue
    groups.push(createGroupFromMembers([mA, mB], groups.length + 1))
    assigned.add(mA.id)
    assigned.add(mB.id)
    if (assigned.size >= members.length) break
  }

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

  const baseThreshold = mean + 0.25 * std
  const alpha = 0.6
  const beta = 0.25
  const gamma = 0.15

  for (const g of groups) {
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

      const relax = 0.08 * Math.max(0, current.length - 2)
      const acceptThreshold = Math.max(0.2, baseThreshold - relax)

      if (best.avg >= acceptThreshold || current.length < 2) {
        current.push(best.m)
        assigned.add(best.m.id)
      } else {
        break
      }
    }

    const rebuilt = createGroupFromMembers(current, groups.indexOf(g) + 1)
    g.members = rebuilt.members
    g.groupCompatibility = rebuilt.groupCompatibility
    g.commonGenres = rebuilt.commonGenres
    g.groupDynamics = rebuilt.groupDynamics
    g.recommendations = rebuilt.recommendations
  }

  const remaining = members.filter(m => !assigned.has(m.id))
  while (remaining.length >= 2) {
    const usablePair = sortedPairs.find(p => !assigned.has(members[p.a].id) && !assigned.has(members[p.b].id))
    if (!usablePair) break
    const a = members[usablePair.a]
    const b = members[usablePair.b]
    groups.push(createGroupFromMembers([a, b], groups.length + 1))
    assigned.add(a.id)
    assigned.add(b.id)
    const idxA = remaining.findIndex(x => x.id === a.id)
    if (idxA >= 0) remaining.splice(idxA, 1)
    const idxB = remaining.findIndex(x => x.id === b.id)
    if (idxB >= 0) remaining.splice(idxB, 1)
  }

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

// Group name suggestion based on genres and styles
export function generateGroupName(genres: string[], members: ProcessedMember[]): string {
  const primary = genres[0]
  if (primary) {
    const prefixes = ['The', 'Sonic', 'Harmonic', 'Rhythmic', 'Electric']
    const names = ['Collective', 'Crew', 'Alliance', 'Guild', 'Assembly']
    const suffixes = ['Society', 'Circle', 'Network', 'Union', 'Club']
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
    const name = names[Math.floor(Math.random() * names.length)]
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)]
    return `${prefix} ${primary} ${name} ${suffix}`
  }

  const styles = members.map(m => m.musicProfile.listeningStyle)
  const unique = [...new Set(styles)]
  if (unique.length === 1) return `The ${unique[0]} Group`
  return `Music Group ${Math.floor(Math.random() * 100)}`
}

// Generate recommendations for the group
export function generateRecommendations(
  members: ProcessedMember[],
  genres: string[],
  avgPreferences: number[]
): { playlist: string; activities: string[]; meetingTimes: string[] } {
  let playlistType = 'Diverse Mix'
  if (avgPreferences[0] > 0.7) playlistType = 'High Energy Workout'
  else if (avgPreferences[1] > 0.7) playlistType = 'Feel Good Vibes'
  else if (avgPreferences[2] > 0.7) playlistType = 'Dance Party'
  else if (avgPreferences[3] > 0.7) playlistType = 'Acoustic Sessions'

  const playlist = `${playlistType} - A collaborative playlist featuring ${genres.slice(0, 3).join(', ')} tracks`

  const activities: string[] = []
  if (avgPreferences[0] > 0.6) activities.push('Attend live concerts together')
  if (avgPreferences[2] > 0.6) activities.push('Organize dance parties or club nights')
  if (avgPreferences[3] > 0.6) activities.push('Host acoustic jam sessions')
  if (genres.includes('Jazz')) activities.push('Visit jazz clubs or lounges')
  if (genres.includes('Classical')) activities.push('Attend symphony performances')
  if (activities.length === 0) {
    activities.push(
      'Weekly music discovery sessions',
      'Collaborative playlist creation workshops',
      'Music trivia nights'
    )
  }

  const meetingTimes = [
    'Thursday evenings (7-9 PM) - Peak music discovery time',
    'Saturday afternoons (2-4 PM) - Relaxed listening sessions',
    'Friday nights (8-10 PM) - Social music experiences'
  ]

  return { playlist, activities: activities.slice(0, 4), meetingTimes: meetingTimes.slice(0, 2) }
}

// Convert groups to CSV format (reusable by routes)
export function generateCSV(groups: OptimizedGroup[]): string {
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
        member.email || '',
        member.major,
        member.year || '',
        member.musicProfile.topGenres.join('; '),
        member.musicProfile.listeningStyle,
        index === 0 ? group.commonGenres.join('; ') : '',
        index === 0 ? `${Math.round(group.groupDynamics.diversity * 100)}%` : '',
        index === 0 ? `${Math.round(group.groupDynamics.cohesion * 100)}%` : '',
        index === 0 ? group.recommendations.playlist : '',
        index === 0 ? group.recommendations.activities.join('; ') : ''
      ])
    })
    rows.push(Array(headers.length).fill(''))
  })

  return rows.map(row => row.map(cell => {
    const str = String(cell)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`
    return str
  }).join(',')).join('\n')
}

// Utility to build ProcessedMember[] from User records + submissions
export function buildMembersFromUsers(users: Array<{ id: string; email: string; name: string | null; major: string | null; year: string | null; submissions: Pick<MusicSubmission, 'energy' | 'valence' | 'danceability' | 'acousticness' | 'tempo' | 'genres'>[] }>): ProcessedMember[] {
  return users.map((u, idx) => {
    const { vector, topGenres, listeningStyle } = calculatePreferenceVectorFromSubmissions(u.submissions || [])
    return {
      id: u.id,
      userId: u.id,
      name: u.name || u.email || `User ${idx + 1}`,
      email: u.email,
      major: u.major || 'Undeclared',
      year: u.year || 'Unknown',
      musicProfile: {
        topGenres,
        topArtists: [],
        preferenceVector: vector,
        listeningStyle
      },
      compatibility: new Map()
    }
  })
}

// Demo data generator for fallbacks
export function generateDemoMembers(count: number): ProcessedMember[] {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']
  const majors = ['Computer Science', 'Psychology', 'Business', 'Engineering', 'Music', 'Biology']
  const years = ['Freshman', 'Sophomore', 'Junior', 'Senior']
  const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country', 'Indie', 'Metal']

  const members: ProcessedMember[] = []
  for (let i = 0; i < count; i++) {
    const selectedGenres: string[] = []
    for (let j = 0; j < 3; j++) {
      const g = genres[Math.floor(Math.random() * genres.length)]
      if (!selectedGenres.includes(g)) selectedGenres.push(g)
    }

    const energy = 0.3 + Math.random() * 0.6
    const valence = 0.3 + Math.random() * 0.6
    const dance = 0.3 + Math.random() * 0.6
    const acoustic = 0.2 + Math.random() * 0.5
    const tempo = (80 + Math.random() * 100) / 200
    const genreDiv = Math.min(1, selectedGenres.length / 10)

    let listeningStyle = 'Balanced'
    if (energy > 0.7) listeningStyle = 'High Energy'
    else if (valence > 0.7) listeningStyle = 'Upbeat'
    else if (dance > 0.7) listeningStyle = 'Dance-focused'
    else if (acoustic > 0.7) listeningStyle = 'Acoustic'

    members.push({
      id: `demo-${i + 1}`,
      name: `${names[i % names.length]} ${['Smith', 'Johnson', 'Williams', 'Brown'][i % 4]}`,
      email: `demo${i + 1}@example.com`,
      major: majors[Math.floor(Math.random() * majors.length)],
      year: years[Math.floor(Math.random() * years.length)],
      musicProfile: {
        topGenres: selectedGenres,
        topArtists: [],
        preferenceVector: [energy, valence, dance, acoustic, tempo, genreDiv],
        listeningStyle
      },
      compatibility: new Map()
    })
  }

  return members
}

