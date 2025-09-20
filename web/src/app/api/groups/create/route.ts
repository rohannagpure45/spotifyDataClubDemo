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

// Helper function to generate more diverse groups
function generateAdditionalMembers(count: number, startId: number): any[] {
  const majors = ['Data Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Philosophy', 'Economics', 'Political Science', 'Art History', 'Theater', 'Dance', 'Architecture']
  const firstNames = ['Oliver', 'Sophia', 'Liam', 'Isabella', 'Noah', 'Mia', 'Ethan', 'Ava', 'Lucas', 'Charlotte', 'Mason', 'Amelia']
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez']
  const genres = [
    ['Pop', 'Dance Pop', 'Electropop'],
    ['Rock', 'Alternative Rock', 'Indie Rock'],
    ['Jazz', 'Smooth Jazz', 'Fusion'],
    ['Classical', 'Modern Classical', 'Orchestral'],
    ['Country', 'Pop Country', 'Folk'],
    ['Metal', 'Progressive Metal', 'Alternative Metal'],
    ['Blues', 'Electric Blues', 'Blues Rock'],
    ['Reggae', 'Dancehall', 'Ska'],
    ['Latin', 'Reggaeton', 'Salsa'],
    ['K-Pop', 'J-Pop', 'C-Pop']
  ]
  const roles = ['Music Explorer', 'Rhythm Keeper', 'Harmony Seeker', 'Genre Mixer', 'Tempo Setter', 'Mood Matcher']

  const members = []
  for (let i = 0; i < count; i++) {
    const id = startId + i
    members.push({
      userId: `user-${id}`,
      username: `${firstNames[id % firstNames.length]} ${lastNames[id % lastNames.length]}`,
      major: majors[id % majors.length],
      topGenres: genres[id % genres.length],
      role: roles[id % roles.length]
    })
  }
  return members
}

// Function to distribute members into groups of specified size
function distributeIntoGroups(totalMembers: number, groupSize: number): number[] {
  const groups = []
  let remaining = totalMembers

  while (remaining > 0) {
    if (remaining >= groupSize) {
      groups.push(groupSize)
      remaining -= groupSize
    } else if (remaining >= 3) {
      // If we have at least 3 people left, make a smaller group
      groups.push(remaining)
      remaining = 0
    } else if (groups.length > 0) {
      // If we have 1-2 people left, distribute them among existing groups
      for (let i = 0; i < remaining; i++) {
        groups[i % groups.length]++
      }
      remaining = 0
    } else {
      // Edge case: total members less than 3
      groups.push(remaining)
      remaining = 0
    }
  }

  return groups
}

export async function POST(request: Request) {
  const body = await request.json()
  const { groupSize = 4, totalParticipants = 42 } = body

  // Calculate optimal group distribution
  const groupSizes = distributeIntoGroups(totalParticipants, groupSize)

  // Base groups template
  const baseGroups: MusicGroup[] = [
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

  // Generate dynamic groups based on group sizes
  const finalGroups: MusicGroup[] = []
  let memberIdCounter = 12 // Start after predefined members

  groupSizes.forEach((size, index) => {
    if (index < baseGroups.length) {
      // Use existing base group and adjust member count
      const baseGroup = baseGroups[index]
      const currentMembers = baseGroup.members.slice(0, Math.min(size, baseGroup.members.length))

      // If we need more members than available, generate additional ones
      if (size > currentMembers.length) {
        const additionalMembers = generateAdditionalMembers(size - currentMembers.length, memberIdCounter)
        memberIdCounter += size - currentMembers.length
        currentMembers.push(...additionalMembers)
      }

      finalGroups.push({
        ...baseGroup,
        id: `group-${index + 1}`,
        members: currentMembers,
        compatibility: 0.75 + Math.random() * 0.20 // Random compatibility between 0.75 and 0.95
      })
    } else {
      // Generate completely new groups if we need more than the base groups
      const newMembers = generateAdditionalMembers(size, memberIdCounter)
      memberIdCounter += size

      const groupNames = [
        'Pop Paradise', 'Rock Revolution', 'Jazz Junction', 'Electronic Empire',
        'Hip Hop Haven', 'Classical Corner', 'Indie Island', 'Metal Mayhem',
        'Folk Forest', 'R&B Realm', 'Country Club', 'Alternative Alley'
      ]

      const groupInterests = [
        ['Concert attendance', 'Music production', 'Album collecting'],
        ['Live performances', 'Music history', 'Genre exploration'],
        ['Collaborative playlists', 'Music theory', 'Instrument learning'],
        ['Festival planning', 'DJ sessions', 'Music streaming'],
        ['Songwriting', 'Music criticism', 'Artist discovery']
      ]

      const playlistSuggestions = [
        'Create a "Study Flow" playlist mixing everyone\'s focus tracks',
        'Build a "Weekend Vibes" collection with your party favorites',
        'Curate a "Chill Zone" playlist for relaxation sessions',
        'Develop a "Workout Warriors" mix with high-energy tracks',
        'Make a "Discovery Weekly" playlist sharing new finds'
      ]

      finalGroups.push({
        id: `group-${index + 1}`,
        name: groupNames[index % groupNames.length],
        members: newMembers,
        compatibility: 0.70 + Math.random() * 0.25,
        sharedInterests: groupInterests[index % groupInterests.length],
        playlistSuggestion: playlistSuggestions[index % playlistSuggestions.length],
        meetingIdeas: [
          'Weekly music listening sessions',
          'Monthly concert or live show attendance',
          'Music trivia nights',
          'Collaborative playlist creation workshops'
        ]
      })
    }
  })

  return NextResponse.json({
    groups: finalGroups,
    totalGroups: finalGroups.length,
    totalMembers: finalGroups.reduce((sum, g) => sum + g.members.length, 0),
    groupSizeDistribution: groupSizes,
    averageCompatibility: finalGroups.reduce((sum, g) => sum + g.compatibility, 0) / finalGroups.length,
    timestamp: new Date().toISOString()
  })
}