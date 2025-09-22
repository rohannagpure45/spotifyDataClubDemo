import { NextResponse } from 'next/server'
import { parse } from 'csv-parse/sync'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

interface FormResponse {
  timestamp: string
  email: string
  name: string
  major: string
  year: string
  favoriteSongs: string[]
  favoriteArtists: string[]
  genres: string[]
  listeningHabits: {
    hoursPerDay: number
    preferredTime: string
    mood: string
  }
  musicPreferences: {
    energy: number
    valence: number
    danceability: number
    acousticness: number
  }
}

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
function processFormResponses(responses: any[]): ProcessedMember[] {
  return responses.map((response, index) => {
    // Extract music preferences from form data
    const preferenceVector = [
      parseFloat(response.energy || '0.5'),
      parseFloat(response.valence || '0.5'),
      parseFloat(response.danceability || '0.5'),
      parseFloat(response.acousticness || '0.5'),
      parseFloat(response.tempo || '120') / 200, // Normalize tempo
      response.genres ? response.genres.split(',').length / 10 : 0.3 // Genre diversity
    ]

    // Parse genres and artists
    const genres = response.genres ?
      response.genres.split(',').map((g: string) => g.trim()).filter(Boolean) :
      ['Pop', 'Rock']

    const artists = response.favorite_artists ?
      response.favorite_artists.split(',').map((a: string) => a.trim()).filter(Boolean) :
      []

    // Determine listening style based on preferences
    let listeningStyle = 'Balanced'
    if (preferenceVector[0] > 0.7) listeningStyle = 'High Energy'
    else if (preferenceVector[1] > 0.7) listeningStyle = 'Upbeat'
    else if (preferenceVector[2] > 0.7) listeningStyle = 'Dance-focused'
    else if (preferenceVector[3] > 0.7) listeningStyle = 'Acoustic'

    return {
      id: `member-${index + 1}`,
      name: response.name || `User ${index + 1}`,
      email: response.email || `user${index + 1}@example.com`,
      major: response.major || 'Undeclared',
      year: response.year || 'Unknown',
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
function formOptimizedGroups(
  members: ProcessedMember[],
  targetGroupSize: number
): OptimizedGroup[] {
  const groups: OptimizedGroup[] = []
  const assigned = new Set<string>()

  // Sort members by average compatibility to find good starting points
  const membersByCompatibility = [...members].sort((a, b) => {
    const avgA = Array.from(a.compatibility.values()).reduce((s, v) => s + v, 0) / a.compatibility.size
    const avgB = Array.from(b.compatibility.values()).reduce((s, v) => s + v, 0) / b.compatibility.size
    return avgB - avgA
  })

  let groupId = 1

  for (const seed of membersByCompatibility) {
    if (assigned.has(seed.id)) continue

    const group: ProcessedMember[] = [seed]
    assigned.add(seed.id)

    // Find most compatible members for this group
    const candidates = members
      .filter(m => !assigned.has(m.id))
      .sort((a, b) => {
        const compatA = seed.compatibility.get(a.id) || 0
        const compatB = seed.compatibility.get(b.id) || 0
        return compatB - compatA
      })

    // Add members to group based on compatibility
    for (const candidate of candidates) {
      if (group.length >= targetGroupSize) break

      // Calculate average compatibility with existing group members
      const avgCompat = group.reduce((sum, member) =>
        sum + (member.compatibility.get(candidate.id) || 0), 0
      ) / group.length

      // Add if compatibility is above threshold
      if (avgCompat > 0.4) {
        group.push(candidate)
        assigned.add(candidate.id)
      }
    }

    // If group has at least 2 members, create it
    if (group.length >= 2) {
      groups.push(createGroupFromMembers(group, groupId++))
    }
  }

  // Handle any remaining unassigned members
  const unassigned = members.filter(m => !assigned.has(m.id))
  if (unassigned.length > 0) {
    // Add to existing groups or create new one
    if (unassigned.length >= 2) {
      groups.push(createGroupFromMembers(unassigned, groupId++))
    } else {
      // Add to smallest existing group
      const smallestGroup = groups.reduce((min, g) =>
        g.members.length < min.members.length ? g : min
      )
      smallestGroup.members.push(...unassigned)
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

    let responses: any[] = []

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

    // Calculate compatibilities
    calculateCompatibilities(members)

    // Create users for all email addresses in responses and store form data
    for (const response of responses) {
      if (response.email) {
        const user = await ensureUserExists(
          response.email,
          response.name,
          response.major,
          response.year
        )

        // Store the form response
        await prisma.formResponse.create({
          data: {
            userId: user.id,
            email: response.email,
            formData: JSON.stringify(response),
            sourceType: file ? 'csv' : 'sheets',
            sourceUrl: sheetsUrl || null,
            processed: true
          }
        })

        // Store music submission if it doesn't exist
        if (response.favorite_artists || response.genres) {
          const existingSubmission = await prisma.musicSubmission.findFirst({
            where: {
              userId: user.id,
              songName: response.favorite_song || 'Unknown'
            }
          })

          if (!existingSubmission) {
            await prisma.musicSubmission.create({
              data: {
                userId: user.id,
                songName: response.favorite_song || 'Unknown',
                artistName: response.favorite_artists || 'Unknown',
                genres: JSON.stringify(response.genres ? response.genres.split(',') : []),
                energy: parseFloat(response.energy || '0.5'),
                valence: parseFloat(response.valence || '0.5'),
                danceability: parseFloat(response.danceability || '0.5'),
                acousticness: parseFloat(response.acousticness || '0.5'),
                tempo: parseFloat(response.tempo || '120')
              }
            })
          }
        }
      }
    }

    // Form optimized groups
    const groups = formOptimizedGroups(members, groupSize)

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
    const csvContent = generateCSV(groups)

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
function generateMockResponses(count: number): any[] {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack']
  const majors = ['Computer Science', 'Psychology', 'Business', 'Engineering', 'Music', 'Biology']
  const years = ['Freshman', 'Sophomore', 'Junior', 'Senior']
  const genres = ['Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 'R&B', 'Country', 'Indie', 'Metal']
  const artists = ['Taylor Swift', 'The Weeknd', 'Drake', 'Billie Eilish', 'Ed Sheeran', 'Ariana Grande', 'Post Malone', 'Dua Lipa']

  const responses = []
  for (let i = 0; i < count; i++) {
    const selectedGenres = []
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
    const csvContent = generateCSV(groups)

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="music-groups-${Date.now()}.csv"`
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Invalid group data'
    }, { status: 400 })
  }
}