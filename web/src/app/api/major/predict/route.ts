import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Features = {
  energy: number
  valence: number
  danceability: number
  acousticness: number
  tempo: number
}

function toVector(f: Features): number[] {
  // Normalize tempo into ~[0,1] band (assume 200bpm max reasonable)
  const tempoNorm = Math.min(1, Math.max(0, (f.tempo ?? 120) / 200))
  const clamp01 = (n: number, d = 0.5) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d)
  return [
    clamp01(f.energy, 0.5),
    clamp01(f.valence, 0.5),
    clamp01(f.danceability, 0.5),
    clamp01(f.acousticness, 0.5),
    tempoNorm,
  ]
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom === 0 ? 0 : dot / denom
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const userId = session.user.id

    // Only allow if we can correlate to the user's form answers
    const formCount = await prisma.formResponse.count({ where: { userId } })
    if (formCount === 0) {
      return NextResponse.json({
        success: false,
        error: 'No form responses found for your account. Please process Google Form responses first so we can correlate predictions with your data.'
      }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as { features?: Partial<Features>; useLatest?: boolean }
    const { features: rawFeatures, useLatest } = body || {}

    // Build training centroids per major from existing submissions
    const submissions = await prisma.musicSubmission.findMany({ include: { user: true } })
    const byMajor = new Map<string, number[][]>()
    for (const row of submissions) {
      const major = row.user?.major
      if (!major) continue
      const f: Features = {
        energy: row.energy ?? 0.5,
        valence: row.valence ?? 0.5,
        danceability: row.danceability ?? 0.5,
        acousticness: row.acousticness ?? 0.5,
        tempo: row.tempo ?? 120,
      }
      const vec = toVector(f)
      if (!byMajor.has(major)) byMajor.set(major, [])
      byMajor.get(major)!.push(vec)
    }

    if (byMajor.size < 2) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient training data across majors. Please process more form responses to enable predictions.'
      }, { status: 400 })
    }

    // Compute centroids
    const centroids: { major: string; centroid: number[]; n: number }[] = []
    for (const [major, vecs] of byMajor.entries()) {
      const dim = vecs[0].length
      const c = new Array(dim).fill(0)
      for (const v of vecs) for (let i = 0; i < dim; i++) c[i] += v[i]
      for (let i = 0; i < dim; i++) c[i] /= vecs.length
      centroids.push({ major, centroid: c, n: vecs.length })
    }

    // Build input vector
    let inputVec: number[] | null = null
    let inputUsed: Features | null = null

    if (useLatest) {
      const latest = await prisma.musicSubmission.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      if (!latest) {
        return NextResponse.json({ success: false, error: 'No saved music submission found for your account.' }, { status: 400 })
      }
      const f: Features = {
        energy: latest.energy ?? 0.5,
        valence: latest.valence ?? 0.5,
        danceability: latest.danceability ?? 0.5,
        acousticness: latest.acousticness ?? 0.5,
        tempo: latest.tempo ?? 120,
      }
      inputUsed = f
      inputVec = toVector(f)
    } else {
      const f: Features = {
        energy: Number(rawFeatures?.energy ?? NaN),
        valence: Number(rawFeatures?.valence ?? NaN),
        danceability: Number(rawFeatures?.danceability ?? NaN),
        acousticness: Number(rawFeatures?.acousticness ?? NaN),
        tempo: Number(rawFeatures?.tempo ?? NaN),
      }
      // Validate minimal fields
      const valid = ['energy', 'valence', 'danceability', 'acousticness', 'tempo'].every(k => Number.isFinite((f as any)[k]))
      if (!valid) {
        return NextResponse.json({ success: false, error: 'Missing or invalid feature values.' }, { status: 400 })
      }
      inputUsed = f
      inputVec = toVector(f)
    }

    // Score against centroids
    const scored = centroids.map(c => ({
      major: c.major,
      similarity: cosine(inputVec!, c.centroid),
      samples: c.n
    }))
    // Convert similarities to probabilities (non-negative normalization)
    const pos = scored.map(s => ({ ...s, score: Math.max(0, s.similarity) }))
    const total = pos.reduce((s, v) => s + v.score, 0)
    const withProb = pos.map(s => ({ ...s, probability: total > 0 ? s.score / total : 1 / pos.length }))
      .sort((a, b) => b.probability - a.probability)

    const top3 = withProb.slice(0, 3)
    const result = {
      predictedMajor: top3[0]?.major || null,
      top3,
      input: inputUsed,
      method: 'centroid-cosine',
      datasetMajors: centroids.map(c => ({ major: c.major, samples: c.n })),
    }

    // Persist analysis result for user history
    await prisma.analysisResult.create({
      data: {
        userId,
        analysisType: 'major-predict',
        data: JSON.stringify(result),
        parameters: JSON.stringify({ method: 'centroid-cosine', featureDim: inputVec.length })
      }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error in /api/major/predict:', error)
    return NextResponse.json({ success: false, error: 'Prediction failed' }, { status: 500 })
  }
}

