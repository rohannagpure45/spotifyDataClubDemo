import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

// Calculate cosine similarity between two audio feature vectors
function calculateSimilarity(features1: number[], features2: number[]): number {
  if (features1.length !== features2.length) return 0

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < features1.length; i++) {
    dotProduct += features1[i] * features2[i]
    norm1 += features1[i] * features1[i]
    norm2 += features2[i] * features2[i]
  }

  const denominator = Math.sqrt(norm1) * Math.sqrt(norm2)
  return denominator === 0 ? 0 : dotProduct / denominator
}

// Generate match reason based on similarity patterns
function generateMatchReason(sharedFeatures: AudioMatch['sharedFeatures']): string {
  const lowDifferences = sharedFeatures.filter(f => Math.abs(f.difference) < 0.05)
  const highValues = sharedFeatures.filter(f => f.yourValue > 0.7 && f.theirValue > 0.7)

  if (lowDifferences.length >= 3) {
    return `Nearly identical music preferences across ${lowDifferences.map(f => f.feature.toLowerCase()).join(', ')}`
  }

  if (highValues.length >= 2) {
    return `Both love ${highValues.map(f => f.feature.toLowerCase()).join(' and ')} music`
  }

  const dominantFeature = sharedFeatures.reduce((prev, current) =>
    Math.abs(prev.difference) < Math.abs(current.difference) ? prev : current
  )

  return `Strong match in ${dominantFeature.feature.toLowerCase()} preferences`
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

    // Get all other users' submissions
    const otherSubmissions = await prisma.musicSubmission.findMany({
      where: {
        userId: { not: requestedUserId },
        energy: { not: null },
        valence: { not: null },
        danceability: { not: null },
        acousticness: { not: null }
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

    // Create feature vectors for comparison
    const currentFeatures = [
      currentUserSubmission.energy || 0.5,
      currentUserSubmission.valence || 0.5,
      currentUserSubmission.danceability || 0.5,
      currentUserSubmission.acousticness || 0.5,
      Math.min(1, (currentUserSubmission.tempo || 120) / 200) // Normalize tempo
    ]

    const matches: AudioMatch[] = []

    for (const submission of otherSubmissions) {
      const theirFeatures = [
        submission.energy || 0.5,
        submission.valence || 0.5,
        submission.danceability || 0.5,
        submission.acousticness || 0.5,
        Math.min(1, (submission.tempo || 120) / 200)
      ]

      const similarity = calculateSimilarity(currentFeatures, theirFeatures)

      const sharedFeatures = [
        {
          feature: 'Energy',
          yourValue: Number((currentFeatures[0]).toFixed(2)),
          theirValue: Number((theirFeatures[0]).toFixed(2)),
          difference: Number((theirFeatures[0] - currentFeatures[0]).toFixed(2))
        },
        {
          feature: 'Valence',
          yourValue: Number((currentFeatures[1]).toFixed(2)),
          theirValue: Number((theirFeatures[1]).toFixed(2)),
          difference: Number((theirFeatures[1] - currentFeatures[1]).toFixed(2))
        },
        {
          feature: 'Danceability',
          yourValue: Number((currentFeatures[2]).toFixed(2)),
          theirValue: Number((theirFeatures[2]).toFixed(2)),
          difference: Number((theirFeatures[2] - currentFeatures[2]).toFixed(2))
        },
        {
          feature: 'Acousticness',
          yourValue: Number((currentFeatures[3]).toFixed(2)),
          theirValue: Number((theirFeatures[3]).toFixed(2)),
          difference: Number((theirFeatures[3] - currentFeatures[3]).toFixed(2))
        }
      ]

      matches.push({
        userId: submission.userId,
        username: submission.user.name || submission.user.email.split('@')[0],
        similarity: Number((similarity).toFixed(2)),
        sharedFeatures,
        matchReason: generateMatchReason(sharedFeatures)
      })
    }

    // Sort by similarity and take top 3
    const topMatches = matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3)

    return NextResponse.json({
      matches: topMatches,
      userId: requestedUserId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Audio match API error:', error)
    return NextResponse.json(
      { error: 'Failed to find audio matches' },
      { status: 500 }
    )
  }
}