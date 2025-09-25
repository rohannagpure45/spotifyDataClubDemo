import { NextResponse } from 'next/server'
import { getFeatureRows, kmeans } from '@/lib/analysis'

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
  try {
    const rows = await getFeatureRows()
    const X = rows.map(r => r.features)
    const n = X.length
    if (n === 0) return NextResponse.json({ clusters: [], totalUsers: 0, timestamp: new Date().toISOString() })

    // Choose k based on dataset size, bounded [2,6]
    const k = Math.max(2, Math.min(6, Math.round(Math.sqrt(n / 2))))
    const { centroids, labels } = kmeans(X, k, 40)

    const clusters: ClusterGroup[] = centroids.map((c, idx) => ({
      id: `cluster-${idx + 1}`,
      name: '',
      description: '',
      features: {
        energy: Number(c[0]?.toFixed(2) ?? 0),
        danceability: Number(c[2]?.toFixed(2) ?? 0),
        valence: Number(c[1]?.toFixed(2) ?? 0),
        acousticness: Number(c[3]?.toFixed(2) ?? 0),
      },
      members: 0,
      topGenres: [],
    }))

    // Aggregate members and top genres per cluster
    const genreCounts: Array<Map<string, number>> = centroids.map(() => new Map())
    for (let i = 0; i < n; i++) {
      const ci = labels[i]
      if (clusters[ci]) clusters[ci].members++
      const genres = rows[i].genres || []
      const gmap = genreCounts[ci]
      for (const g of genres) gmap.set(g, (gmap.get(g) || 0) + 1)
    }
    for (let ci = 0; ci < clusters.length; ci++) {
      const gmap = genreCounts[ci]
      clusters[ci].topGenres = [...gmap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g)
      // Basic label heuristics
      const f = clusters[ci].features
      const traits: string[] = []
      if (f.energy > 0.7) traits.push('High Energy')
      if (f.danceability > 0.7) traits.push('Danceable')
      if (f.valence > 0.65) traits.push('Upbeat')
      if (f.acousticness > 0.6) traits.push('Acoustic')
      clusters[ci].name = traits.length ? traits.join(' • ') : `Cluster ${ci + 1}`
      clusters[ci].description = clusters[ci].topGenres.length
        ? `Common genres: ${clusters[ci].topGenres.slice(0, 3).join(', ')}`
        : 'Mixed preferences'
    }

    return NextResponse.json({
      clusters,
      totalUsers: n,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error('clusters analysis failed', e)
    return NextResponse.json({ clusters: [], totalUsers: 0, error: 'Failed to compute clusters' }, { status: 500 })
  }
}
