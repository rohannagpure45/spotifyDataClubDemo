import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Response shape for user-specific major/genre heatmap
type MajorGenreHeatmap = {
  type: 'major-genre'
  majors: string[]
  genres: string[]
  matrix: number[][] // normalized 0..1 intensities for UI coloring
  counts: number[][] // raw counts for labels/tooltips
  insights: string[]
}

// Legacy fallback response (feature correlation demo)
type FeatureCorrelation = {
  type: 'feature-correlation'
  features: string[]
  matrix: number[][]
  insights: string[]
}

export async function GET() {
  try {
    // Try to build a user-scoped heatmap from that user's groups (if any)
    const session = await getServerSession(authOptions)

    if (session?.user?.id) {
      const groups = await prisma.group.findMany({ where: { userId: session.user.id } })

      // Aggregate majors and genres from group members
      const majorGenreCounts = new Map<string, Map<string, number>>()
      let anyMember = false

      for (const g of groups) {
        try {
          const members = JSON.parse(g.members || '[]') as Array<{
            major?: string
            musicProfile?: { topGenres?: string[] }
          }>
          for (const m of members) {
            const major = (m.major || 'Unknown').trim()
            const genres = m.musicProfile?.topGenres || []
            if (!major) continue
            anyMember = true
            if (!majorGenreCounts.has(major)) majorGenreCounts.set(major, new Map())
            const byGenre = majorGenreCounts.get(major)!
            for (const gname of genres) {
              const genre = (gname || 'Other').trim()
              byGenre.set(genre, (byGenre.get(genre) || 0) + 1)
            }
          }
        } catch (_) {
          // Ignore malformed group rows
        }
      }

      if (anyMember && majorGenreCounts.size > 0) {
        // Rank genres globally to pick top columns
        const globalGenreCounts = new Map<string, number>()
        for (const byGenre of majorGenreCounts.values()) {
          for (const [genre, count] of byGenre.entries()) {
            globalGenreCounts.set(genre, (globalGenreCounts.get(genre) || 0) + count)
          }
        }

        const sortedGenres = [...globalGenreCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([g]) => g)

        const genres = sortedGenres.slice(0, 8) // cap to 8 columns for readability
        const majors = [...majorGenreCounts.keys()]

        // Build raw count matrix and normalize for color intensity
        const counts: number[][] = majors.map(major =>
          genres.map(genre => majorGenreCounts.get(major)!.get(genre) || 0)
        )
        const maxCount = Math.max(1, ...counts.flat())
        const matrix = counts.map(row => row.map(v => v / maxCount))

        const insights: string[] = []
        if (genres[0]) insights.push(`Most common genre in your dataset: ${genres[0]}`)
        if (majors.length > 0) insights.push(`Majors represented: ${majors.length}`)

        const payload: MajorGenreHeatmap = {
          type: 'major-genre',
          majors,
          genres,
          matrix,
          counts,
          insights
        }

        return NextResponse.json(payload)
      }
    }

    // Fallback: compute from global music submissions if available
    const submissions = await prisma.musicSubmission.findMany({ include: { user: true } })
    if (submissions.length > 0) {
      const majorGenreCounts = new Map<string, Map<string, number>>()
      for (const s of submissions) {
        const major = (s.user?.major || 'Unknown').trim()
        let genres: string[] = []
        try {
          genres = JSON.parse(s.genres || '[]')
        } catch (_) {
          genres = []
        }
        if (!major) continue
        if (!majorGenreCounts.has(major)) majorGenreCounts.set(major, new Map())
        const byGenre = majorGenreCounts.get(major)!
        for (const gname of genres) {
          const genre = (gname || 'Other').trim()
          byGenre.set(genre, (byGenre.get(genre) || 0) + 1)
        }
      }

      if (majorGenreCounts.size > 0) {
        const globalGenreCounts = new Map<string, number>()
        for (const byGenre of majorGenreCounts.values()) {
          for (const [genre, count] of byGenre.entries()) {
            globalGenreCounts.set(genre, (globalGenreCounts.get(genre) || 0) + count)
          }
        }
        const sortedGenres = [...globalGenreCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([g]) => g)
        const genres = sortedGenres.slice(0, 8)
        const majors = [...majorGenreCounts.keys()]
        const counts: number[][] = majors.map(major =>
          genres.map(genre => majorGenreCounts.get(major)!.get(genre) || 0)
        )
        const maxCount = Math.max(1, ...counts.flat())
        const matrix = counts.map(row => row.map(v => v / maxCount))

        const payload: MajorGenreHeatmap = {
          type: 'major-genre',
          majors,
          genres,
          matrix,
          counts,
          insights: ['Aggregated across all submissions']
        }
        return NextResponse.json(payload)
      }
    }

    // Last-resort demo: feature correlation matrix (static)
    const features = [
      'Energy',
      'Danceability',
      'Valence',
      'Acousticness',
      'Instrumentalness',
      'Speechiness'
    ]
    const matrix = [
      [1.0, 0.72, 0.45, -0.58, -0.32, 0.28],
      [0.72, 1.0, 0.63, -0.42, -0.18, 0.35],
      [0.45, 0.63, 1.0, -0.38, -0.25, 0.15],
      [-0.58, -0.42, -0.38, 1.0, 0.55, -0.22],
      [-0.32, -0.18, -0.25, 0.55, 1.0, -0.48],
      [0.28, 0.35, 0.15, -0.22, -0.48, 1.0]
    ]
    const insights = [
      'Strong positive correlation between Energy and Danceability (0.72)',
      'Negative correlation between Energy and Acousticness (-0.58)',
      'Valence moderately correlates with Danceability (0.63)',
      'Instrumentalness and Speechiness show negative correlation (-0.48)'
    ]
    const fallback: FeatureCorrelation = {
      type: 'feature-correlation',
      features,
      matrix,
      insights
    }
    return NextResponse.json(fallback)
  } catch (e) {
    // Preserve original static demo on unexpected error
    const features = ['Energy','Danceability','Valence','Acousticness','Instrumentalness','Speechiness']
    const matrix = [
      [1.0, 0.72, 0.45, -0.58, -0.32, 0.28],
      [0.72, 1.0, 0.63, -0.42, -0.18, 0.35],
      [0.45, 0.63, 1.0, -0.38, -0.25, 0.15],
      [-0.58, -0.42, -0.38, 1.0, 0.55, -0.22],
      [-0.32, -0.18, -0.25, 0.55, 1.0, -0.48],
      [0.28, 0.35, 0.15, -0.22, -0.48, 1.0]
    ]
    return NextResponse.json({ type: 'feature-correlation', features, matrix, insights: [] })
  }
}
