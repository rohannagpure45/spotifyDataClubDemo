import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get recent submissions (last 20) ordered by creation time
    const recentSubmissions = await prisma.musicSubmission.findMany({
      take: 20,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            major: true
          }
        }
      }
    })

    // Calculate time ago for each submission
    const submissionsWithTimeAgo = recentSubmissions.map(submission => {
      const now = new Date()
      const createdAt = new Date(submission.createdAt)
      const timeDiffMs = now.getTime() - createdAt.getTime()

      let timeAgo: string
      if (timeDiffMs < 60000) { // Less than 1 minute
        timeAgo = 'Just now'
      } else if (timeDiffMs < 3600000) { // Less than 1 hour
        const minutes = Math.floor(timeDiffMs / 60000)
        timeAgo = `${minutes}m ago`
      } else if (timeDiffMs < 86400000) { // Less than 1 day
        const hours = Math.floor(timeDiffMs / 3600000)
        timeAgo = `${hours}h ago`
      } else { // More than 1 day
        const days = Math.floor(timeDiffMs / 86400000)
        timeAgo = `${days}d ago`
      }

      return {
        name: submission.user.name || submission.user.email.split('@')[0],
        song: submission.songName,
        artist: submission.artistName,
        major: submission.user.major || 'Undeclared',
        timeAgo
      }
    })

    // Calculate activity rate (submissions in last minute)
    const oneMinuteAgo = new Date(Date.now() - 60000)
    const recentActivityCount = await prisma.musicSubmission.count({
      where: {
        createdAt: {
          gte: oneMinuteAgo
        }
      }
    })

    return NextResponse.json({
      recentSubmissions: submissionsWithTimeAgo,
      activityRate: recentActivityCount
    })

  } catch (error) {
    console.error('Live Feed API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch live feed data' },
      { status: 500 }
    )
  }
}