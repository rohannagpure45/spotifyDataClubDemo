import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get total submissions count
    const totalSubmissions = await prisma.musicSubmission.count()

    if (totalSubmissions === 0) {
      // Return empty state when no data
      return NextResponse.json({
        totalSubmissions: 0,
        uniqueArtists: 0,
        topArtist: null,
        topGenre: null,
        averages: {
          energy: 0,
          valence: 0,
          danceability: 0,
          tempo: 0
        },
        extremes: {
          mostEnergetic: null,
          happiest: null,
          mostDanceable: null
        }
      })
    }

    // Get all submissions with basic stats
    const submissions = await prisma.musicSubmission.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    // Calculate unique artists
    const uniqueArtists = new Set(submissions.map(s => s.artistName.toLowerCase())).size

    // Find top artist
    const artistCounts = new Map<string, number>()
    submissions.forEach(s => {
      const artist = s.artistName
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1)
    })

    const topArtistEntry = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    const topArtist = topArtistEntry ? {
      name: topArtistEntry[0],
      count: topArtistEntry[1]
    } : null

    // Find top genre
    const genreCounts = new Map<string, number>()
    submissions.forEach(s => {
      try {
        const genres = JSON.parse(s.genres) as string[]
        genres.forEach(genre => {
          const trimmedGenre = genre.trim()
          if (trimmedGenre) {
            genreCounts.set(trimmedGenre, (genreCounts.get(trimmedGenre) || 0) + 1)
          }
        })
      } catch {
        // Skip invalid JSON
      }
    })

    const topGenreEntry = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]

    const topGenre = topGenreEntry ? {
      name: topGenreEntry[0],
      percentage: Math.round((topGenreEntry[1] / totalSubmissions) * 100)
    } : null

    // Calculate averages (filter out null values)
    const validSubmissions = submissions.filter(s =>
      s.energy !== null && s.valence !== null &&
      s.danceability !== null && s.tempo !== null
    )

    const averages = validSubmissions.length > 0 ? {
      energy: Number((validSubmissions.reduce((sum, s) => sum + (s.energy || 0), 0) / validSubmissions.length).toFixed(2)),
      valence: Number((validSubmissions.reduce((sum, s) => sum + (s.valence || 0), 0) / validSubmissions.length).toFixed(2)),
      danceability: Number((validSubmissions.reduce((sum, s) => sum + (s.danceability || 0), 0) / validSubmissions.length).toFixed(2)),
      tempo: Math.round(validSubmissions.reduce((sum, s) => sum + (s.tempo || 0), 0) / validSubmissions.length)
    } : {
      energy: 0,
      valence: 0,
      danceability: 0,
      tempo: 0
    }

    // Find extremes
    const mostEnergetic = validSubmissions.length > 0 ?
      validSubmissions.reduce((max, current) =>
        (current.energy || 0) > (max.energy || 0) ? current : max
      ) : null

    const happiest = validSubmissions.length > 0 ?
      validSubmissions.reduce((max, current) =>
        (current.valence || 0) > (max.valence || 0) ? current : max
      ) : null

    const mostDanceable = validSubmissions.length > 0 ?
      validSubmissions.reduce((max, current) =>
        (current.danceability || 0) > (max.danceability || 0) ? current : max
      ) : null

    const extremes = {
      mostEnergetic: mostEnergetic ? {
        song: mostEnergetic.songName,
        artist: mostEnergetic.artistName,
        energy: mostEnergetic.energy,
        user: mostEnergetic.user.name || mostEnergetic.user.email
      } : null,
      happiest: happiest ? {
        song: happiest.songName,
        artist: happiest.artistName,
        valence: happiest.valence,
        user: happiest.user.name || happiest.user.email
      } : null,
      mostDanceable: mostDanceable ? {
        song: mostDanceable.songName,
        artist: mostDanceable.artistName,
        danceability: mostDanceable.danceability,
        user: mostDanceable.user.name || mostDanceable.user.email
      } : null
    }

    return NextResponse.json({
      totalSubmissions,
      uniqueArtists,
      topArtist,
      topGenre,
      averages,
      extremes
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}