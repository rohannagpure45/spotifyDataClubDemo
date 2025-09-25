import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchAudioFeaturesFor, type AudioFeatures } from '@/lib/spotify'

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

    // Spotify enrichment for leaderboard awards (if credentials are configured)
    let spotifyMostEnergetic: AudioFeatures | null = null
    let spotifyHappiest: AudioFeatures | null = null
    let spotifyMostDanceable: AudioFeatures | null = null
    try {
      if (mostEnergetic) {
        const f = await fetchAudioFeaturesFor(mostEnergetic.songName, mostEnergetic.artistName)
        if (f) spotifyMostEnergetic = { energy: f.energy, valence: f.valence, danceability: f.danceability, acousticness: f.acousticness, tempo: f.tempo }
      }
      if (happiest) {
        const f = await fetchAudioFeaturesFor(happiest.songName, happiest.artistName)
        if (f) spotifyHappiest = { energy: f.energy, valence: f.valence, danceability: f.danceability, acousticness: f.acousticness, tempo: f.tempo }
      }
      if (mostDanceable) {
        const f = await fetchAudioFeaturesFor(mostDanceable.songName, mostDanceable.artistName)
        if (f) spotifyMostDanceable = { energy: f.energy, valence: f.valence, danceability: f.danceability, acousticness: f.acousticness, tempo: f.tempo }
      }
    } catch {
      // If Spotify is not configured or rate-limited, silently continue
    }

    const extremes = {
      mostEnergetic: mostEnergetic ? {
        song: mostEnergetic.songName,
        artist: mostEnergetic.artistName,
        energy: mostEnergetic.energy,
        user: mostEnergetic.user.name || mostEnergetic.user.email,
        spotify: spotifyMostEnergetic
      } : null,
      happiest: happiest ? {
        song: happiest.songName,
        artist: happiest.artistName,
        valence: happiest.valence,
        user: happiest.user.name || happiest.user.email,
        spotify: spotifyHappiest
      } : null,
      mostDanceable: mostDanceable ? {
        song: mostDanceable.songName,
        artist: mostDanceable.artistName,
        danceability: mostDanceable.danceability,
        user: mostDanceable.user.name || mostDanceable.user.email,
        spotify: spotifyMostDanceable
      } : null
    }

    // Featured Community Highlights
    // - Most Diverse Taste: user with most unique genres across their submissions
    // - Tempo Extremist: highest tempo submission
    // - Mood Curator: submission with valence closest to 0.5
    const byUserGenres = new Map<string, Set<string>>()
    for (const s of submissions) {
      const uid = s.userId
      if (!byUserGenres.has(uid)) byUserGenres.set(uid, new Set<string>())
      try {
        const gs = JSON.parse(s.genres || '[]') as string[]
        gs.forEach(g => byUserGenres.get(uid)!.add(g))
      } catch {/* ignore */}
    }
    let mostDiverse: { user: string; genreCount: number } | null = null
    for (const s of submissions) {
      const set = byUserGenres.get(s.userId)
      const name = s.user.name || s.user.email
      const count = set ? set.size : 0
      if (!mostDiverse || count > mostDiverse.genreCount) mostDiverse = { user: name, genreCount: count }
    }
    const tempoExtremist = submissions.reduce((max, s) => (s.tempo || 0) > (max?.tempo || 0) ? s : max, submissions[0])
    const moodCurator = submissions.reduce((best, s) => {
      const cur = s.valence ?? 0.5
      const bestv = best ? (best.valence ?? 0.5) : 0.5
      return Math.abs(cur - 0.5) < Math.abs(bestv - 0.5) ? s : best
    }, submissions[0])

    return NextResponse.json({
      totalSubmissions,
      uniqueArtists,
      topArtist,
      topGenre,
      averages,
      extremes,
      highlights: {
        mostDiverse: mostDiverse ? { user: mostDiverse.user, genreCount: mostDiverse.genreCount } : null,
        tempoExtremist: tempoExtremist ? {
          user: tempoExtremist.user.name || tempoExtremist.user.email,
          song: tempoExtremist.songName,
          artist: tempoExtremist.artistName,
          tempo: tempoExtremist.tempo
        } : null,
        moodCurator: moodCurator ? {
          user: moodCurator.user.name || moodCurator.user.email,
          song: moodCurator.songName,
          artist: moodCurator.artistName,
          valence: moodCurator.valence
        } : null
      }
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
export const runtime = 'nodejs'
