import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchTrackId, fetchAudioFeaturesBatch } from '@/lib/spotify'

export const runtime = 'nodejs'

type Summary = {
  totalSubmissions: number
  distinctTracks: number
}

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || ''
  const defaults = ['nagpure.r@northeastern.edu']
  const parsed = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([...defaults, ...parsed]))
}

export async function GET() {
  const totalSubmissions = await prisma.musicSubmission.count()
  const all = await prisma.musicSubmission.findMany({ select: { songName: true, artistName: true } })
  const unique = new Set(all.map(s => `${(s.songName || '').trim().toLowerCase()}|${(s.artistName || '').trim().toLowerCase()}`))
  const summary: Summary = { totalSubmissions, distinctTracks: unique.size }
  return NextResponse.json({ success: true, summary })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  const admins = getAdminEmails()
  const caller = session.user.email.toLowerCase()
  if (!admins.includes(caller)) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({})) as { force?: boolean; limit?: number }
  const force = Boolean(body.force ?? true)
  const limit = Number.isFinite(body.limit) ? Math.max(1, Math.floor(body.limit!)) : undefined

  // Load submissions
  const submissions = await prisma.musicSubmission.findMany({
    include: { user: { select: { id: true } } },
    take: limit,
  })

  // Map unique track queries → indices and ids
  const key = (s: { songName: string; artistName: string | null }) => `${(s.songName || '').trim().toLowerCase()}|${(s.artistName || '').trim().toLowerCase()}`
  const uniqueMap = new Map<string, { song: string; artist: string | null; ids: string[]; rows: number[]; trackId?: string | null }>()
  submissions.forEach((s, i) => {
    const artist = (s.artistName || '').split(',')[0]?.trim() || null
    const k = key({ songName: s.songName, artistName: artist })
    if (!uniqueMap.has(k)) uniqueMap.set(k, { song: s.songName, artist, ids: [], rows: [] })
    uniqueMap.get(k)!.rows.push(i)
  })

  // Search track IDs
  let searchCount = 0
  for (const item of uniqueMap.values()) {
    console.log(`Searching for: "${item.song}" by "${item.artist}"`)
    const id = await searchTrackId(item.song, item.artist || undefined)
    item.trackId = id || null
    if (id) {
      console.log(`Found track ID: ${id}`)
      searchCount++
    } else {
      console.log(`No track found for: "${item.song}" by "${item.artist}"`)
    }
  }

  // Batch fetch features
  const allIds = Array.from(uniqueMap.values()).map(x => x.trackId).filter(Boolean) as string[]
  console.log(`Fetching audio features for ${allIds.length} track IDs: ${allIds.join(', ')}`)
  const featureMap = await fetchAudioFeaturesBatch(allIds)
  console.log(`Received audio features for ${Object.keys(featureMap).length} tracks: ${Object.keys(featureMap).join(', ')}`)

  // Update DB rows
  let updated = 0
  let notFound = 0
  for (const item of uniqueMap.values()) {
    const id = item.trackId
    if (!id) {
      console.log(`No track ID for "${item.song}" - skipping ${item.rows.length} rows`)
      notFound += item.rows.length
      continue
    }
    const f = featureMap[id]
    if (!f) {
      console.log(`No audio features found for track ID ${id} ("${item.song}") - skipping ${item.rows.length} rows`)
      notFound += item.rows.length
      continue
    }
    console.log(`Processing ${item.rows.length} rows for "${item.song}" with features: energy=${f.energy}, valence=${f.valence}, danceability=${f.danceability}, acousticness=${f.acousticness}, tempo=${f.tempo}`)
    for (const rowIdx of item.rows) {
      const s = submissions[rowIdx]
      // Only update if force or fields missing or placeholder values
      const isPlaceholder = s.energy === 0.5 && s.valence === 0.5 && s.danceability === 0.5 && s.acousticness === 0.5 && s.tempo === 120
      const shouldUpdate = force || s.energy == null || s.valence == null || s.danceability == null || s.acousticness == null || s.tempo == null || isPlaceholder
      console.log(`Row ${s.id}: current values [${s.energy}, ${s.valence}, ${s.danceability}, ${s.acousticness}, ${s.tempo}], isPlaceholder=${isPlaceholder}, force=${force}, shouldUpdate=${shouldUpdate}`)
      if (!shouldUpdate) continue
      await prisma.musicSubmission.update({
        where: { id: s.id },
        data: {
          energy: f.energy,
          valence: f.valence,
          danceability: f.danceability,
          acousticness: f.acousticness,
          tempo: f.tempo,
        }
      })
      console.log(`Updated row ${s.id} with Spotify features`)
      updated++
    }
  }

  return NextResponse.json({
    success: true,
    scanned: submissions.length,
    matchedTracks: searchCount,
    updatedRows: updated,
    notFound
  })
}
