import { NextResponse } from 'next/server'

interface AudioMatch {
  userId: string
  username: string
  similarity: number
  sharedFeatures: {
    feature: string
    yourValue: number
    theirValue: number
    difference: number
  }[]
  matchReason: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'current-user'

  const matches: AudioMatch[] = [
    {
      userId: 'match-1',
      username: 'Jordan Lee',
      similarity: 0.92,
      sharedFeatures: [
        { feature: 'Energy', yourValue: 0.75, theirValue: 0.78, difference: 0.03 },
        { feature: 'Danceability', yourValue: 0.82, theirValue: 0.79, difference: -0.03 },
        { feature: 'Valence', yourValue: 0.65, theirValue: 0.68, difference: 0.03 },
        { feature: 'Acousticness', yourValue: 0.22, theirValue: 0.25, difference: 0.03 }
      ],
      matchReason: 'Nearly identical energy and danceability preferences'
    },
    {
      userId: 'match-2',
      username: 'Casey Taylor',
      similarity: 0.85,
      sharedFeatures: [
        { feature: 'Energy', yourValue: 0.75, theirValue: 0.68, difference: -0.07 },
        { feature: 'Danceability', yourValue: 0.82, theirValue: 0.75, difference: -0.07 },
        { feature: 'Valence', yourValue: 0.65, theirValue: 0.72, difference: 0.07 },
        { feature: 'Acousticness', yourValue: 0.22, theirValue: 0.18, difference: -0.04 }
      ],
      matchReason: 'Similar taste for upbeat, energetic music'
    },
    {
      userId: 'match-3',
      username: 'Morgan Smith',
      similarity: 0.78,
      sharedFeatures: [
        { feature: 'Energy', yourValue: 0.75, theirValue: 0.62, difference: -0.13 },
        { feature: 'Danceability', yourValue: 0.82, theirValue: 0.88, difference: 0.06 },
        { feature: 'Valence', yourValue: 0.65, theirValue: 0.58, difference: -0.07 },
        { feature: 'Acousticness', yourValue: 0.22, theirValue: 0.35, difference: 0.13 }
      ],
      matchReason: 'High danceability with varied energy levels'
    }
  ]

  return NextResponse.json({
    matches,
    userId,
    timestamp: new Date().toISOString()
  })
}