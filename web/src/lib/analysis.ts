import { prisma } from '@/lib/prisma'

export type FeatureRow = {
  userId: string
  username: string
  features: number[]
  genres: string[]
}

const FEATURE_NAMES = ['Energy', 'Valence', 'Danceability', 'Acousticness', 'Tempo'] as const
export type FeatureName = typeof FEATURE_NAMES[number]

export async function getFeatureRows(): Promise<FeatureRow[]> {
  const submissions = await prisma.musicSubmission.findMany({
    where: {
      energy: { not: null },
      valence: { not: null },
      danceability: { not: null },
      acousticness: { not: null },
      tempo: { not: null },
    },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  const rows: FeatureRow[] = []
  for (const s of submissions) {
    if (
      s.energy == null ||
      s.valence == null ||
      s.danceability == null ||
      s.acousticness == null ||
      s.tempo == null
    ) continue

    let genres: string[] = []
    try { genres = JSON.parse(s.genres || '[]') as string[] } catch { genres = [] }
    const username = s.user?.name || s.user?.email?.split('@')[0] || 'User'
    // Normalize tempo to ~[0,1]
    const tempoNorm = Math.min(1, Math.max(0, (s.tempo || 120) / 200))
    rows.push({
      userId: s.userId,
      username,
      features: [s.energy, s.valence, s.danceability, s.acousticness, tempoNorm],
      genres,
    })
  }
  return rows
}

// Basic K-means implementation for small datasets
export function kmeans(X: number[][], k: number, maxIter = 50): { centroids: number[][]; labels: number[] } {
  const n = X.length
  const d = X[0]?.length || 0
  if (n === 0 || d === 0) return { centroids: [], labels: [] }

  // Initialize centroids by picking k distinct random points
  const indices = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const centroids = indices.slice(0, Math.min(k, n)).map(i => [...X[i]])
  const labels = new Array(n).fill(0)

  const distance = (a: number[], b: number[]) => {
    let s = 0
    for (let i = 0; i < d; i++) { const diff = a[i] - b[i]; s += diff * diff }
    return s
  }

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign step
    let changed = false
    for (let i = 0; i < n; i++) {
      let best = 0
      let bestDist = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const dist = distance(X[i], centroids[c])
        if (dist < bestDist) { bestDist = dist; best = c }
      }
      if (labels[i] !== best) { labels[i] = best; changed = true }
    }

    // Update step
    const sums = Array.from({ length: centroids.length }, () => new Array(d).fill(0))
    const counts = new Array(centroids.length).fill(0)
    for (let i = 0; i < n; i++) {
      const c = labels[i]
      counts[c]++
      const xi = X[i]
      for (let j = 0; j < d; j++) sums[c][j] += xi[j]
    }
    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] === 0) continue // keep centroid if empty
      for (let j = 0; j < d; j++) centroids[c][j] = sums[c][j] / counts[c]
    }

    if (!changed) break
  }
  return { centroids, labels }
}

// Compute correlation matrix (Pearson) for columns in X
export function correlationMatrix(X: number[][]): number[][] {
  const n = X.length
  const d = X[0]?.length || 0
  if (n === 0 || d === 0) return []

  const means = new Array(d).fill(0)
  for (const row of X) for (let j = 0; j < d; j++) means[j] += row[j]
  for (let j = 0; j < d; j++) means[j] /= n

  const stds = new Array(d).fill(0)
  for (const row of X) for (let j = 0; j < d; j++) stds[j] += Math.pow(row[j] - means[j], 2)
  for (let j = 0; j < d; j++) stds[j] = Math.sqrt(stds[j] / (n - 1 || 1))

  const corr = Array.from({ length: d }, () => new Array(d).fill(0))
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let cov = 0
      for (let r = 0; r < n; r++) cov += (X[r][i] - means[i]) * (X[r][j] - means[j])
      cov /= (n - 1 || 1)
      const denom = (stds[i] || 1e-12) * (stds[j] || 1e-12)
      const c = cov / denom
      corr[i][j] = c
      corr[j][i] = c
    }
  }
  return corr
}

// Simple PCA: compute covariance eigenvectors via power iteration with deflation
export function pca(X: number[][], k = 3): { components: number[][]; variances: number[]; explained: number[]; means: number[]; stds: number[]; scores: number[][] } {
  const n = X.length
  const d = X[0]?.length || 0
  if (n === 0 || d === 0) return { components: [], variances: [], explained: [], means: [], stds: [], scores: [] }

  // Standardize
  const means = new Array(d).fill(0)
  for (const row of X) for (let j = 0; j < d; j++) means[j] += row[j]
  for (let j = 0; j < d; j++) means[j] /= n
  const stds = new Array(d).fill(0)
  for (const row of X) for (let j = 0; j < d; j++) stds[j] += Math.pow(row[j] - means[j], 2)
  for (let j = 0; j < d; j++) stds[j] = Math.sqrt(stds[j] / (n - 1 || 1)) || 1

  const Z = X.map(row => row.map((v, j) => (v - means[j]) / stds[j]))

  // Covariance matrix S = (Z^T Z) / (n-1)
  const S = Array.from({ length: d }, () => new Array(d).fill(0))
  for (let i = 0; i < d; i++) {
    for (let j = i; j < d; j++) {
      let sum = 0
      for (let r = 0; r < n; r++) sum += Z[r][i] * Z[r][j]
      const v = sum / (n - 1 || 1)
      S[i][j] = v
      S[j][i] = v
    }
  }

  // Power iteration to get top-k eigenvectors
  function matVec(M: number[][], v: number[]): number[] {
    const m = M.length
    const out = new Array(m).fill(0)
    for (let i = 0; i < m; i++) {
      let s = 0
      for (let j = 0; j < m; j++) s += M[i][j] * v[j]
      out[i] = s
    }
    return out
  }
  function norm(v: number[]): number { return Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1 }
  function dot(a: number[], b: number[]): number { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

  const comps: number[][] = []
  const eigvals: number[] = []
  const A = S.map(row => [...row])

  for (let c = 0; c < Math.min(k, d); c++) {
    let v = new Array(d).fill(0).map(() => Math.random())
    for (let it = 0; it < 200; it++) {
      const Av = matVec(A, v)
      const nv = norm(Av)
      const vNext = Av.map(x => x / (nv || 1))
      const diff = norm(vNext.map((x, i) => x - v[i]))
      v = vNext
      if (diff < 1e-6) break
    }
    // Rayleigh quotient for eigenvalue
    const Av = matVec(A, v)
    const lambda = dot(v, Av)
    eigvals.push(lambda)
    comps.push(v)
    // Deflate: A = A - lambda v v^T
    const outer = comps[c].map((vi) => comps[c].map(vj => vi * vj))
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        A[i][j] = A[i][j] - lambda * outer[i][j]
      }
    }
  }

  const totalVar = eigvals.reduce((s, v) => s + v, 0) || 1
  const explained = eigvals.map(v => v / totalVar)

  // Scores: Z * components (columns)
  const scores = Z.map(row => comps.map(comp => row.reduce((s, x, i) => s + x * comp[i], 0)))

  return { components: comps, variances: eigvals, explained, means, stds, scores }
}

export function featureNames(): FeatureName[] { return [...FEATURE_NAMES] }
