import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { searchTrackId, fetchAudioFeaturesBatch } from '@/lib/spotify'

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
  const key = (s: { songName: string; artistName: string }) => `${(s.songName || '').trim().toLowerCase()}|${(s.artistName || '').trim().toLowerCase()}`
  const uniqueMap = new Map<string, { song: string; artist: string; ids: string[]; rows: number[]; trackId?: string | null }>()
  submissions.forEach((s, i) => {
    const k = key(s)
    if (!uniqueMap.has(k)) uniqueMap.set(k, { song: s.songName, artist: s.artistName, ids: [], rows: [] })
    uniqueMap.get(k)!.rows.push(i)
  })

  // Search track IDs
  let searchCount = 0
  for (const item of uniqueMap.values()) {
    const id = await searchTrackId(item.song, item.artist)
    item.trackId = id || null
    if (id) searchCount++
  }

  // Batch fetch features
  const allIds = Array.from(uniqueMap.values()).map(x => x.trackId).filter(Boolean) as string[]
  const featureMap = await fetchAudioFeaturesBatch(allIds)

  // Update DB rows
  let updated = 0
  let notFound = 0
  for (const item of uniqueMap.values()) {
    const id = item.trackId
    if (!id) { notFound += item.rows.length; continue }
    const f = featureMap[id]
    if (!f) { notFound += item.rows.length; continue }
    for (const rowIdx of item.rows) {
      const s = submissions[rowIdx]
      // Only update if force or fields missing
      const shouldUpdate = force || s.energy == null || s.valence == null || s.danceability == null || s.tempo == null
      if (!shouldUpdate) continue
      await prisma.musicSubmission.update({
        where: { id: s.id },
        data: {
          energy: f.energy,
          valence: f.valence,
          danceability: f.danceability,
          tempo: f.tempo,
        }
      })
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

