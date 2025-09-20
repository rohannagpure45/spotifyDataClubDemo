import { NextResponse } from 'next/server'

interface PCAResult {
  components: {
    name: string
    variance: number
    features: {
      feature: string
      loading: number
    }[]
  }[]
  musicDNA: {
    userId: string
    username: string
    coordinates: [number, number, number]
    dominantTraits: string[]
  }[]
}

export async function GET() {
  const result: PCAResult = {
    components: [
      {
        name: 'PC1: Energy Axis',
        variance: 0.35,
        features: [
          { feature: 'Energy', loading: 0.89 },
          { feature: 'Danceability', loading: 0.75 },
          { feature: 'Acousticness', loading: -0.68 }
        ]
      },
      {
        name: 'PC2: Mood Axis',
        variance: 0.28,
        features: [
          { feature: 'Valence', loading: 0.82 },
          { feature: 'Mode', loading: 0.65 },
          { feature: 'Speechiness', loading: -0.45 }
        ]
      },
      {
        name: 'PC3: Tempo Axis',
        variance: 0.21,
        features: [
          { feature: 'Tempo', loading: 0.78 },
          { feature: 'Instrumentalness', loading: 0.62 },
          { feature: 'Loudness', loading: 0.42 }
        ]
      }
    ],
    musicDNA: [
      {
        userId: 'user-1',
        username: 'Alex Chen',
        coordinates: [0.75, 0.45, 0.22],
        dominantTraits: ['High Energy', 'Positive Mood', 'Vocal-focused']
      },
      {
        userId: 'user-2',
        username: 'Sarah Johnson',
        coordinates: [-0.32, 0.68, 0.15],
        dominantTraits: ['Mellow', 'Upbeat', 'Balanced Complexity']
      },
      {
        userId: 'user-3',
        username: 'Mike Davis',
        coordinates: [0.55, -0.28, 0.72],
        dominantTraits: ['Energetic', 'Melancholic', 'Instrumental']
      },
      {
        userId: 'user-4',
        username: 'Emma Wilson',
        coordinates: [-0.48, -0.15, -0.35],
        dominantTraits: ['Acoustic', 'Contemplative', 'Simple Structure']
      }
    ]
  }

  return NextResponse.json(result)
}