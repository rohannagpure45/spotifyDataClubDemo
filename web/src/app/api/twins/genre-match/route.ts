import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface GenreMatch {
  userId: string
  username: string
  similarity: number
  sharedGenres: string[]
  uniqueToYou: string[]
  uniqueToThem: string[]
  recommendation: string
}

// Calculate Jaccard similarity between two genre arrays
function calculateGenreSimilarity(genres1: string[], genres2: string[]): number {
  const set1 = new Set(genres1.map(g => g.toLowerCase().trim()))
  const set2 = new Set(genres2.map(g => g.toLowerCase().trim()))

  const intersection = new Set([...set1].filter(g => set2.has(g)))
  const union = new Set([...set1, ...set2])

  return union.size === 0 ? 0 : intersection.size / union.size
}

// Generate personalized recommendation based on unique genres
function generateRecommendation(sharedGenres: string[], uniqueToThem: string[], username: string): string {
  if (uniqueToThem.length === 0) {
    return `Perfect match! You and ${username} have identical genre preferences`
  }

  if (sharedGenres.length >= 3) {
    const topUnique = uniqueToThem.slice(0, 2).join(' and ')
    return `Check out ${username}'s ${topUnique} tracks - they align with your shared love of ${sharedGenres[0]}`
  }

  if (uniqueToThem.length === 1) {
    return `${username}'s ${uniqueToThem[0]} collection could be your next favorite discovery`
  }

  const recommendations = [
    `Explore ${username}'s ${uniqueToThem[0]} playlist for something fresh`,
    `${username} could introduce you to amazing ${uniqueToThem[0]} artists`,
    `Trade playlists with ${username} for the perfect music exchange`,
    `${username}'s taste in ${uniqueToThem[0]} might expand your horizons`
  ]

  return recommendations[Math.floor(Math.random() * recommendations.length)]
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestedUserId = searchParams.get('userId') || session.user.id

    // Get the current user's music submission
    const currentUserSubmission = await prisma.musicSubmission.findFirst({
      where: { userId: requestedUserId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (!currentUserSubmission) {
      return NextResponse.json({
        matches: [],
        userId: requestedUserId,
        timestamp: new Date().toISOString(),
        message: 'No music submission found for comparison'
      })
    }

    // Parse current user's genres
    let currentGenres: string[] = []
    try {
      currentGenres = JSON.parse(currentUserSubmission.genres) as string[]
    } catch {
      currentGenres = []
    }

    if (currentGenres.length === 0) {
      return NextResponse.json({
        matches: [],
        userId: requestedUserId,
        timestamp: new Date().toISOString(),
        message: 'No genres found for comparison'
      })
    }

    // Get all other users' submissions
    const otherSubmissions = await prisma.musicSubmission.findMany({
      where: {
        userId: { not: requestedUserId }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    if (otherSubmissions.length === 0) {
      return NextResponse.json({
        matches: [],
        userId: requestedUserId,
        timestamp: new Date().toISOString(),
        message: 'No other users found for comparison'
      })
    }

    const matches: GenreMatch[] = []

    for (const submission of otherSubmissions) {
      let theirGenres: string[] = []
      try {
        theirGenres = JSON.parse(submission.genres) as string[]
      } catch {
        continue // Skip submissions with invalid genre data
      }

      if (theirGenres.length === 0) continue

      const similarity = calculateGenreSimilarity(currentGenres, theirGenres)

      // Find shared and unique genres (case-insensitive)
      const currentSet = new Set(currentGenres.map(g => g.toLowerCase().trim()))
      const theirSet = new Set(theirGenres.map(g => g.toLowerCase().trim()))

      const sharedGenres = [...currentSet].filter(g => theirSet.has(g))
        .map(g => {
          // Find original casing from their genres
          const original = theirGenres.find(tg => tg.toLowerCase().trim() === g)
          return original || g
        })

      const uniqueToYou = [...currentSet].filter(g => !theirSet.has(g))
        .map(g => {
          const original = currentGenres.find(cg => cg.toLowerCase().trim() === g)
          return original || g
        })

      const uniqueToThem = [...theirSet].filter(g => !currentSet.has(g))
        .map(g => {
          const original = theirGenres.find(tg => tg.toLowerCase().trim() === g)
          return original || g
        })

      const username = submission.user.name || submission.user.email.split('@')[0]

      matches.push({
        userId: submission.userId,
        username,
        similarity: Number((similarity).toFixed(2)),
        sharedGenres: sharedGenres.slice(0, 6), // Limit to avoid UI overflow
        uniqueToYou: uniqueToYou.slice(0, 4),
        uniqueToThem: uniqueToThem.slice(0, 4),
        recommendation: generateRecommendation(sharedGenres, uniqueToThem, username)
      })
    }

    // Sort by similarity and take top 3
    const topMatches = matches
      .filter(m => m.similarity > 0) // Only include matches with at least some overlap
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)

    return NextResponse.json({
      matches: topMatches,
      userId: requestedUserId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Genre match API error:', error)
    return NextResponse.json(
      { error: 'Failed to find genre matches' },
      { status: 500 }
    )
  }
}