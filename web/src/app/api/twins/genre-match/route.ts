import { NextResponse } from 'next/server'

interface GenreMatch {
  userId: string
  username: string
  similarity: number
  sharedGenres: string[]
  uniqueToYou: string[]
  uniqueToThem: string[]
  recommendation: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId') || 'current-user'

  const matches: GenreMatch[] = [
    {
      userId: 'genre-match-1',
      username: 'Riley Anderson',
      similarity: 0.88,
      sharedGenres: ['Indie Pop', 'Alternative Rock', 'Electronic', 'Synthwave'],
      uniqueToYou: ['Post-Punk', 'Shoegaze'],
      uniqueToThem: ['Dream Pop', 'Chillwave'],
      recommendation: 'Check out their Dream Pop playlist - it aligns perfectly with your Shoegaze interests'
    },
    {
      userId: 'genre-match-2',
      username: 'Sam Martinez',
      similarity: 0.75,
      sharedGenres: ['Hip Hop', 'R&B', 'Jazz', 'Soul'],
      uniqueToYou: ['Trap', 'Drill'],
      uniqueToThem: ['Neo-Soul', 'Afrobeat'],
      recommendation: 'Their Neo-Soul collection could expand your R&B horizons'
    },
    {
      userId: 'genre-match-3',
      username: 'Avery Chen',
      similarity: 0.82,
      sharedGenres: ['EDM', 'House', 'Techno', 'Ambient'],
      uniqueToYou: ['Dubstep', 'Drum and Bass'],
      uniqueToThem: ['Progressive House', 'Trance'],
      recommendation: 'Exchange playlists for the perfect electronic music journey'
    }
  ]

  return NextResponse.json({
    matches,
    userId,
    timestamp: new Date().toISOString()
  })
}