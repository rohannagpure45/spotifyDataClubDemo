import { NextResponse } from 'next/server'

interface ClusterGroup {
  id: string
  name: string
  description: string
  features: {
    energy: number
    danceability: number
    valence: number
    acousticness: number
  }
  members: number
  topGenres: string[]
}

export async function GET() {
  // Simulate clustering analysis based on music features
  const clusters: ClusterGroup[] = [
    {
      id: 'cluster-1',
      name: 'High Energy Party',
      description: 'Dance floor dominators with upbeat vibes',
      features: {
        energy: 0.85,
        danceability: 0.92,
        valence: 0.78,
        acousticness: 0.15
      },
      members: 12,
      topGenres: ['EDM', 'Hip Hop', 'Pop']
    },
    {
      id: 'cluster-2',
      name: 'Chill & Introspective',
      description: 'Mellow sounds for deep thoughts',
      features: {
        energy: 0.35,
        danceability: 0.45,
        valence: 0.42,
        acousticness: 0.72
      },
      members: 8,
      topGenres: ['Indie', 'Lo-fi', 'Acoustic']
    },
    {
      id: 'cluster-3',
      name: 'Alternative Mix',
      description: 'Eclectic tastes across multiple genres',
      features: {
        energy: 0.65,
        danceability: 0.58,
        valence: 0.55,
        acousticness: 0.45
      },
      members: 15,
      topGenres: ['Alternative Rock', 'Indie Pop', 'Electronic']
    },
    {
      id: 'cluster-4',
      name: 'Classic & Refined',
      description: 'Timeless melodies and sophisticated arrangements',
      features: {
        energy: 0.48,
        danceability: 0.38,
        valence: 0.52,
        acousticness: 0.68
      },
      members: 6,
      topGenres: ['Jazz', 'Classical', 'Soul']
    }
  ]

  return NextResponse.json({
    clusters,
    totalUsers: clusters.reduce((sum, c) => sum + c.members, 0),
    timestamp: new Date().toISOString()
  })
}