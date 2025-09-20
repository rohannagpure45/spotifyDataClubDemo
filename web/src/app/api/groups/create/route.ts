import { NextResponse } from 'next/server'

interface MusicGroup {
  id: string
  name: string
  members: {
    userId: string
    username: string
    major: string
    topGenres: string[]
    role: string
  }[]
  compatibility: number
  sharedInterests: string[]
  playlistSuggestion: string
  meetingIdeas: string[]
}

export async function POST(request: Request) {
  const body = await request.json()
  const { groupSize = 4 } = body

  // Simulate group formation based on music similarity
  const groups: MusicGroup[] = [
    {
      id: 'group-1',
      name: 'The Indie Collective',
      members: [
        {
          userId: 'user-1',
          username: 'Alex Thompson',
          major: 'Computer Science',
          topGenres: ['Indie Rock', 'Alternative', 'Folk'],
          role: 'Playlist Curator'
        },
        {
          userId: 'user-2',
          username: 'Maya Patel',
          major: 'Psychology',
          topGenres: ['Indie Pop', 'Dream Pop', 'Bedroom Pop'],
          role: 'Vibe Setter'
        },
        {
          userId: 'user-3',
          username: 'Jordan Lee',
          major: 'English Literature',
          topGenres: ['Folk', 'Singer-Songwriter', 'Acoustic'],
          role: 'Lyrics Analyst'
        },
        {
          userId: 'user-4',
          username: 'Casey Roberts',
          major: 'Film Studies',
          topGenres: ['Alternative', 'Post-Punk', 'Shoegaze'],
          role: 'Discovery Lead'
        }
      ],
      compatibility: 0.87,
      sharedInterests: ['Live acoustic sessions', 'Vinyl collecting', 'Local venue exploration'],
      playlistSuggestion: 'Create a "Study Sessions" collaborative playlist mixing your mellow favorites',
      meetingIdeas: [
        'Weekly listening party with album discussions',
        'Visit local record stores together',
        'Attend indie concerts at small venues'
      ]
    },
    {
      id: 'group-2',
      name: 'Electronic Explorers',
      members: [
        {
          userId: 'user-5',
          username: 'Sam Chen',
          major: 'Electrical Engineering',
          topGenres: ['EDM', 'House', 'Techno'],
          role: 'Beat Master'
        },
        {
          userId: 'user-6',
          username: 'Riley Johnson',
          major: 'Business',
          topGenres: ['Progressive House', 'Trance', 'Future Bass'],
          role: 'Energy Director'
        },
        {
          userId: 'user-7',
          username: 'Morgan Davis',
          major: 'Music Production',
          topGenres: ['Dubstep', 'Drum and Bass', 'Trap'],
          role: 'Production Expert'
        }
      ],
      compatibility: 0.92,
      sharedInterests: ['Music production', 'DJ sets', 'Electronic music festivals'],
      playlistSuggestion: 'Build a "Workout Power" mix combining your high-energy tracks',
      meetingIdeas: [
        'Organize DJ practice sessions',
        'Attend electronic music workshops',
        'Plan a festival trip together'
      ]
    },
    {
      id: 'group-3',
      name: 'Hip Hop Heads',
      members: [
        {
          userId: 'user-8',
          username: 'Marcus Williams',
          major: 'Sociology',
          topGenres: ['Hip Hop', 'Rap', 'Trap'],
          role: 'Culture Connector'
        },
        {
          userId: 'user-9',
          username: 'Aisha Brown',
          major: 'Communications',
          topGenres: ['R&B', 'Neo-Soul', 'Hip Hop'],
          role: 'Mood Coordinator'
        },
        {
          userId: 'user-10',
          username: 'Chris Martinez',
          major: 'History',
          topGenres: ['Old School Hip Hop', 'Jazz Rap', 'Conscious Rap'],
          role: 'History Keeper'
        },
        {
          userId: 'user-11',
          username: 'Nina Thompson',
          major: 'Creative Writing',
          topGenres: ['Alternative Hip Hop', 'Spoken Word', 'R&B'],
          role: 'Lyrical Guide'
        }
      ],
      compatibility: 0.85,
      sharedInterests: ['Cipher sessions', 'Beat making', 'Hip hop history'],
      playlistSuggestion: 'Curate a "Late Night Vibes" playlist blending your R&B and hip hop favorites',
      meetingIdeas: [
        'Host cipher and freestyle sessions',
        'Visit hip hop museums or exhibitions',
        'Organize beat-making workshops'
      ]
    }
  ]

  // Return groups based on requested size
  const filteredGroups = groups.map(group => ({
    ...group,
    members: group.members.slice(0, groupSize)
  }))

  return NextResponse.json({
    groups: filteredGroups,
    totalGroups: filteredGroups.length,
    averageCompatibility: filteredGroups.reduce((sum, g) => sum + g.compatibility, 0) / filteredGroups.length,
    timestamp: new Date().toISOString()
  })
}