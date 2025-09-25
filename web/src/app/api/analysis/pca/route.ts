import { NextResponse } from 'next/server'
import { getFeatureRows, pca as doPCA, featureNames } from '@/lib/analysis'

interface PCAResult {
  components: {
    name: string
    variance: number
    features: {
      feature: string
      loading: number
    }[]
  }[]
  musicDNA: {
    userId: string
    username: string
    coordinates: [number, number, number]
    dominantTraits: string[]
  }[]
}

export async function GET() {
  try {
    const rows = await getFeatureRows()
    const X = rows.map(r => r.features)
    const names = featureNames()
    if (X.length === 0) return NextResponse.json({ components: [], musicDNA: [] })

    const { components, explained, scores } = doPCA(X, 3)

    const compPayload = components.map((vec, i) => ({
      name: `PC${i + 1}`,
      variance: Number((explained[i] || 0).toFixed(2)),
      features: vec.map((loading, j) => ({ feature: names[j], loading: Number(loading.toFixed(2)) })),
    }))

    // Limit to top N users for visualization to keep payload reasonable
    const MAX_USERS = 250
    const musicDNA = rows.slice(0, MAX_USERS).map((row, idx) => {
      const p = scores[idx] || [0, 0, 0]
      const coords: [number, number, number] = [Number((p[0] || 0).toFixed(2)), Number((p[1] || 0).toFixed(2)), Number((p[2] || 0).toFixed(2))]
      const dom: string[] = []
      if ((p[0] || 0) > 0.5) dom.push('Energy')
      if ((p[1] || 0) > 0.5) dom.push('Mood')
      if ((p[2] || 0) > 0.5) dom.push('Tempo')
      return {
        userId: row.userId,
        username: row.username,
        coordinates: coords,
        dominantTraits: dom,
      }
    })

    const result: PCAResult = { components: compPayload, musicDNA }
    return NextResponse.json(result)
  } catch (e) {
    console.error('pca analysis failed', e)
    return NextResponse.json({ components: [], musicDNA: [], error: 'Failed to compute PCA' }, { status: 500 })
  }
}
