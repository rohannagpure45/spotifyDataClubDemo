import { NextResponse } from 'next/server'

interface CorrelationData {
  features: string[]
  matrix: number[][]
  insights: string[]
}

export async function GET() {
  // Generate correlation matrix for audio features
  const features = [
    'Energy',
    'Danceability',
    'Valence',
    'Acousticness',
    'Instrumentalness',
    'Speechiness'
  ]

  // Simulated correlation matrix (symmetric)
  const matrix = [
    [1.00, 0.72, 0.45, -0.58, -0.32, 0.28],
    [0.72, 1.00, 0.63, -0.42, -0.18, 0.35],
    [0.45, 0.63, 1.00, -0.38, -0.25, 0.15],
    [-0.58, -0.42, -0.38, 1.00, 0.55, -0.22],
    [-0.32, -0.18, -0.25, 0.55, 1.00, -0.48],
    [0.28, 0.35, 0.15, -0.22, -0.48, 1.00]
  ]

  const insights = [
    'Strong positive correlation between Energy and Danceability (0.72)',
    'Negative correlation between Energy and Acousticness (-0.58)',
    'Valence moderately correlates with Danceability (0.63)',
    'Instrumentalness and Speechiness show negative correlation (-0.48)'
  ]

  const data: CorrelationData = {
    features,
    matrix,
    insights
  }

  return NextResponse.json(data)
}