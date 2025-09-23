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

// Demo training data for when no real data is available
const getDemoTrainingData = (): Map<string, number[][]> => {
  const demoData = new Map<string, number[][]>()

  // Computer Science - High energy, moderate valence, electronic music
  demoData.set('Computer Science', [
    toVector({ energy: 0.8, valence: 0.6, danceability: 0.7, acousticness: 0.2, tempo: 128 }),
    toVector({ energy: 0.85, valence: 0.55, danceability: 0.75, acousticness: 0.15, tempo: 140 }),
    toVector({ energy: 0.9, valence: 0.65, danceability: 0.8, acousticness: 0.1, tempo: 135 }),
    toVector({ energy: 0.75, valence: 0.7, danceability: 0.6, acousticness: 0.25, tempo: 120 })
  ])

  // Psychology - Moderate energy, high valence, indie/alternative
  demoData.set('Psychology', [
    toVector({ energy: 0.6, valence: 0.8, danceability: 0.5, acousticness: 0.4, tempo: 110 }),
    toVector({ energy: 0.65, valence: 0.85, danceability: 0.55, acousticness: 0.35, tempo: 115 }),
    toVector({ energy: 0.7, valence: 0.75, danceability: 0.6, acousticness: 0.3, tempo: 105 }),
    toVector({ energy: 0.55, valence: 0.9, danceability: 0.45, acousticness: 0.5, tempo: 100 })
  ])

  // Business - Moderate everything, mainstream preferences
  demoData.set('Business', [
    toVector({ energy: 0.7, valence: 0.7, danceability: 0.7, acousticness: 0.3, tempo: 125 }),
    toVector({ energy: 0.75, valence: 0.65, danceability: 0.75, acousticness: 0.25, tempo: 130 }),
    toVector({ energy: 0.65, valence: 0.75, danceability: 0.65, acousticness: 0.35, tempo: 120 }),
    toVector({ energy: 0.8, valence: 0.6, danceability: 0.8, acousticness: 0.2, tempo: 128 })
  ])

  // English Literature - Lower energy, high valence, acoustic preferences
  demoData.set('English Literature', [
    toVector({ energy: 0.4, valence: 0.8, danceability: 0.4, acousticness: 0.7, tempo: 95 }),
    toVector({ energy: 0.45, valence: 0.85, danceability: 0.35, acousticness: 0.75, tempo: 90 }),
    toVector({ energy: 0.35, valence: 0.9, danceability: 0.3, acousticness: 0.8, tempo: 85 }),
    toVector({ energy: 0.5, valence: 0.75, danceability: 0.45, acousticness: 0.65, tempo: 100 })
  ])

  // Engineering - High energy, moderate valence, rock/metal
  demoData.set('Engineering', [
    toVector({ energy: 0.9, valence: 0.5, danceability: 0.6, acousticness: 0.1, tempo: 145 }),
    toVector({ energy: 0.95, valence: 0.45, danceability: 0.55, acousticness: 0.05, tempo: 150 }),
    toVector({ energy: 0.85, valence: 0.55, danceability: 0.65, acousticness: 0.15, tempo: 140 }),
    toVector({ energy: 0.9, valence: 0.4, danceability: 0.5, acousticness: 0.1, tempo: 155 })
  ])

  // Biology - Moderate energy, high valence, nature-inspired
  demoData.set('Biology', [
    toVector({ energy: 0.6, valence: 0.85, danceability: 0.5, acousticness: 0.6, tempo: 108 }),
    toVector({ energy: 0.55, valence: 0.9, danceability: 0.45, acousticness: 0.65, tempo: 102 }),
    toVector({ energy: 0.65, valence: 0.8, danceability: 0.55, acousticness: 0.55, tempo: 112 }),
    toVector({ energy: 0.7, valence: 0.75, danceability: 0.6, acousticness: 0.5, tempo: 115 })
  ])

  return demoData
}

// Calculate prediction accuracy from historical predictions
async function calculateAccuracy(): Promise<{ accuracy: number; totalPredictions: number }> {
  try {
    const analysisResults = await prisma.analysisResult.findMany({
      where: {
        analysisType: 'major-predict'
      },
      include: {
        user: {
          select: {
            major: true
          }
        }
      }
    })

    if (analysisResults.length === 0) {
      return { accuracy: 0, totalPredictions: 0 }
    }

    let correct = 0
    let total = 0

    for (const result of analysisResults) {
      try {
        const data = JSON.parse(result.data)
        const predictedMajor = data.predictedMajor
        const actualMajor = result.user.major

        // Only count predictions where we have both predicted and actual major
        if (predictedMajor && actualMajor && actualMajor !== 'Undeclared' && actualMajor !== 'Unknown') {
          total++
          if (predictedMajor === actualMajor) {
            correct++
          }
        }
      } catch {
        // Skip invalid JSON data
        continue
      }
    }

    const accuracy = total > 0 ? (correct / total) * 100 : 0
    return { accuracy: Math.round(accuracy * 10) / 10, totalPredictions: total }
  } catch (error) {
    console.error('Error calculating accuracy:', error)
    return { accuracy: 0, totalPredictions: 0 }
  }
}

export async function GET() {
  try {
    const { accuracy, totalPredictions } = await calculateAccuracy()
    return NextResponse.json({
      accuracy,
      totalPredictions
    })
  } catch (error) {
    console.error('Error getting prediction stats:', error)
    return NextResponse.json(
      { error: 'Failed to get prediction statistics' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const isAuthenticated = !!userId

    // Check if user has form responses (only for authenticated users)
    let hasFormResponses = false
    if (isAuthenticated) {
      const formCount = await prisma.formResponse.count({ where: { userId } })
      hasFormResponses = formCount > 0
    }

    const body = await request.json().catch(() => ({})) as { features?: Partial<Features>; useLatest?: boolean }
    const { features: rawFeatures, useLatest } = body || {}

    // Build training centroids per major from existing submissions or use demo data
    let byMajor = new Map<string, number[][]>()
    let usingDemoData = false

    if (isAuthenticated && hasFormResponses) {
      // Try to use real data for authenticated users with form responses
      const submissions = await prisma.musicSubmission.findMany({ include: { user: true } })
      for (const row of submissions) {
        const major = row.user?.major
        // Exclude placeholder majors that degrade predictions
        if (!major || major === 'Undeclared' || major === 'Unknown') continue
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
    }

    // Fallback to demo data if insufficient real data or unauthenticated user
    if (byMajor.size < 2) {
      byMajor = getDemoTrainingData()
      usingDemoData = true
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

    // Enforce minimum samples per major to stabilize predictions
    const minSamples = Number.parseInt(process.env.MAJOR_PREDICT_MIN_SAMPLES || '3', 10)
    const filteredCentroids = centroids.filter(c => c.n >= minSamples)
    if (filteredCentroids.length < 2) {
      return NextResponse.json({
        success: false,
        error: `Insufficient training data after filtering. Need at least 2 majors with >= ${minSamples} samples each.`,
        datasetMajors: centroids.map(c => ({ major: c.major, samples: c.n }))
      }, { status: 400 })
    }

    // Build input vector
    let inputVec: number[] | null = null
    let inputUsed: Features | null = null

    if (useLatest) {
      if (!isAuthenticated) {
        return NextResponse.json({
          success: false,
          error: 'Please log in to use your latest submission, or enter features manually.'
        }, { status: 400 })
      }
      const latest = await prisma.musicSubmission.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      })
      if (!latest) {
        return NextResponse.json({
          success: false,
          error: 'No saved music submission found for your account. Try entering features manually.'
        }, { status: 400 })
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
      const keys: (keyof Features)[] = ['energy', 'valence', 'danceability', 'acousticness', 'tempo']
      const valid = keys.every(k => Number.isFinite(Number(f[k])))
      if (!valid) {
        return NextResponse.json({ success: false, error: 'Missing or invalid feature values.' }, { status: 400 })
      }
      inputUsed = f
      inputVec = toVector(f)
    }

    // Score against centroids
    const scored = filteredCentroids.map(c => ({
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
      usedMajors: filteredCentroids.map(c => ({ major: c.major, samples: c.n })),
      usingDemoData,
      authenticated: isAuthenticated
    }

    // Persist analysis result for user history (only for authenticated users)
    if (isAuthenticated && userId) {
      await prisma.analysisResult.create({
        data: {
          userId,
          analysisType: 'major-predict',
          data: JSON.stringify(result),
          parameters: JSON.stringify({ method: 'centroid-cosine', featureDim: inputVec.length })
        }
      })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error in /api/major/predict:', error)
    return NextResponse.json({ success: false, error: 'Prediction failed' }, { status: 500 })
  }
}
