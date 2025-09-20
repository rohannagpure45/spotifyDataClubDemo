"use client"

import { useState } from 'react'

export default function TestAPI() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState<string | null>(null)

  const testEndpoint = async (endpoint: string, name: string) => {
    setLoading(name)
    try {
      const response = await fetch(endpoint)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'success',
          dataKeys: Object.keys(data),
          itemCount: data.musicDNA?.length || data.matches?.length || data.clusters?.length || data.groups?.length || 'N/A'
        }
      }))
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      }))
    } finally {
      setLoading(null)
    }
  }

  const endpoints = [
    { path: '/api/analysis/pca', name: 'PCA Analysis' },
    { path: '/api/analysis/clusters', name: 'Clusters' },
    { path: '/api/analysis/heatmap', name: 'Heatmap' },
    { path: '/api/twins/audio-match', name: 'Audio Match' },
    { path: '/api/twins/genre-match', name: 'Genre Match' }
  ]

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] p-8">
      <h1 className="text-3xl font-bold mb-8">API Endpoint Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {endpoints.map(({ path, name }) => (
          <div key={path} className="p-4 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)]">
            <h3 className="font-semibold mb-2">{name}</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-3">{path}</p>

            <button
              onClick={() => testEndpoint(path, name)}
              disabled={loading === name}
              className="w-full px-4 py-2 bg-[var(--spotify-green)] text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading === name ? 'Testing...' : 'Test'}
            </button>

            {results[name] && (
              <div className={`mt-3 p-2 rounded text-xs ${
                results[name].status === 'success'
                  ? 'bg-green-900/20 text-green-400'
                  : 'bg-red-900/20 text-red-400'
              }`}>
                {results[name].status === 'success' ? (
                  <div>
                    <div>✓ Success</div>
                    <div>Keys: {results[name].dataKeys.join(', ')}</div>
                    <div>Items: {results[name].itemCount}</div>
                  </div>
                ) : (
                  <div>
                    <div>✗ Error</div>
                    <div>{results[name].error}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => endpoints.forEach(({ path, name }) => testEndpoint(path, name))}
        className="px-6 py-3 bg-[var(--accent-primary)] text-white rounded-md hover:opacity-90"
      >
        Test All Endpoints
      </button>
    </div>
  )
}