"use client"

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import type { Layout, Config, Data } from 'plotly.js'

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-primary)] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--spotify-green)]"></div>
        <p className="text-[var(--text-secondary)] mt-2">Loading 3D visualization...</p>
      </div>
    </div>
  ),
})

export interface PCAData {
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

interface PCA3DVisualizationProps {
  data?: PCAData
}

export default function PCA3DVisualization({ data }: PCA3DVisualizationProps) {
  const [plotData, setPlotData] = useState<{ data: Data[]; layout: Partial<Layout>; config: Partial<Config> } | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!data || !isClient || !data.musicDNA || !data.components) return

    // Extract coordinates and labels
    const xData = data.musicDNA.map(user => user.coordinates[0])
    const yData = data.musicDNA.map(user => user.coordinates[1])
    const zData = data.musicDNA.map(user => user.coordinates[2])
    const labels = data.musicDNA.map(user => user.username)
    const hoverTexts = data.musicDNA.map(user =>
      `<b>${user.username}</b><br>` +
      `Traits: ${user.dominantTraits.join(', ')}<br>` +
      `Position: (${user.coordinates[0].toFixed(2)}, ${user.coordinates[1].toFixed(2)}, ${user.coordinates[2].toFixed(2)})`
    )

    // Color mapping for different trait combinations
    const colors = data.musicDNA.map((user) => {
      const traitColors: Record<string, number> = {
        'High Energy': 0,
        'Energetic': 0,
        'Mellow': 1,
        'Acoustic': 1,
        'Positive Mood': 2,
        'Upbeat': 2,
        'Melancholic': 3,
        'Contemplative': 3,
        'Instrumental': 4,
        'Vocal-focused': 5
      }

      // Get the first matching trait color
      const colorIndex = user.dominantTraits
        .map(trait => traitColors[trait] ?? 6)
        .find(color => color !== undefined) ?? 6

      return colorIndex
    })

    const trace = {
      x: xData,
      y: yData,
      z: zData,
      mode: 'markers+text',
      type: 'scatter3d',
      text: labels,
      textposition: 'top center',
      textfont: {
        size: 10,
        color: 'var(--text-secondary)'
      },
      marker: {
        size: 12,
        color: colors,
        colorscale: [
          [0, '#FF6B6B'],     // High Energy - Red
          [0.2, '#4ECDC4'],   // Mellow - Teal
          [0.4, '#45B7D1'],   // Positive - Blue
          [0.6, '#96CEB4'],   // Melancholic - Green
          [0.8, '#FFEAA7'],   // Instrumental - Yellow
          [1, '#DDA0DD']      // Vocal - Purple
        ],
        showscale: true,
        colorbar: {
          title: {
            text: 'Musical Traits',
            side: 'right'
          },
          tickmode: 'array',
          tickvals: [0, 1, 2, 3, 4, 5],
          ticktext: ['Energetic', 'Mellow', 'Positive', 'Melancholic', 'Instrumental', 'Vocal'],
          ticks: 'outside',
          tickfont: {
            size: 10
          }
        },
        line: {
          color: 'rgba(217, 217, 217, 0.14)',
          width: 0.5
        },
        opacity: 0.9
      },
      hovertemplate: hoverTexts.map(text => text + '<extra></extra>'),
      hoverlabel: {
        bgcolor: 'var(--surface-secondary)',
        bordercolor: 'var(--border-primary)',
        font: { color: 'var(--text-primary)' }
      }
    } as unknown as Data

    const layout = {
      title: {
        text: '<b>Music DNA - 3D Principal Component Analysis</b>',
        font: {
          size: 18,
          color: 'var(--text-primary)'
        }
      },
      scene: {
        xaxis: {
          title: {
            text: `PC1: Energy Axis (${Math.round(data.components[0].variance * 100)}%)`,
            font: {
              size: 12,
              color: 'var(--accent-error)'
            }
          },
          gridcolor: 'rgba(255, 255, 255, 0.1)',
          zerolinecolor: 'rgba(255, 255, 255, 0.2)',
          showbackground: true,
          backgroundcolor: 'var(--surface-tertiary)'
        },
        yaxis: {
          title: {
            text: `PC2: Mood Axis (${Math.round(data.components[1].variance * 100)}%)`,
            font: {
              size: 12,
              color: 'var(--accent-success)'
            }
          },
          gridcolor: 'rgba(255, 255, 255, 0.1)',
          zerolinecolor: 'rgba(255, 255, 255, 0.2)',
          showbackground: true,
          backgroundcolor: 'var(--surface-tertiary)'
        },
        zaxis: {
          title: {
            text: `PC3: Tempo Axis (${Math.round(data.components[2].variance * 100)}%)`,
            font: {
              size: 12,
              color: 'var(--accent-warning)'
            }
          },
          gridcolor: 'rgba(255, 255, 255, 0.1)',
          zerolinecolor: 'rgba(255, 255, 255, 0.2)',
          showbackground: true,
          backgroundcolor: 'var(--surface-tertiary)'
        },
        camera: {
          eye: { x: 1.5, y: 1.5, z: 1.5 },
          center: { x: 0, y: 0, z: 0 }
        },
        aspectmode: 'cube'
      },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'var(--surface-tertiary)',
      height: 500,
      margin: { l: 0, r: 0, b: 0, t: 40 },
      font: {
        family: 'system-ui, -apple-system, sans-serif',
        color: 'var(--text-primary)'
      },
      hoverlabel: {
        bgcolor: 'var(--surface-secondary)',
        bordercolor: 'var(--border-primary)'
      },
      annotations: [
        {
          text: `Total Variance Explained: ${Math.round((data.components[0].variance + data.components[1].variance + data.components[2].variance) * 100)}%`,
          showarrow: false,
          xref: 'paper',
          yref: 'paper',
          x: 0.5,
          y: -0.05,
          xanchor: 'center',
          yanchor: 'top',
          font: {
            size: 12,
            color: 'var(--text-secondary)'
          }
        }
      ]
    } as Partial<Layout>

    const config = {
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['pan3d', 'select3d', 'lasso3d'],
      toImageButtonOptions: {
        format: 'png',
        filename: 'music-dna-pca',
        height: 800,
        width: 1200,
        scale: 1
      }
    } as Partial<Config>

    setPlotData({ data: [trace], layout, config })
  }, [data, isClient])

  if (!isClient) {
    return (
      <div className="h-96 bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">Initializing 3D visualization...</p>
      </div>
    )
  }

  if (!plotData) {
    return (
      <div className="h-96 bg-[var(--surface-tertiary)] rounded-xl border border-[var(--border-primary)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">No data available for visualization</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl overflow-hidden border border-[var(--border-primary)] bg-[var(--surface-tertiary)]">
        <Plot
          data={plotData.data}
          layout={plotData.layout}
          config={plotData.config}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Component Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {data?.components.map((component, index) => {
          const colors = ['accent-error', 'accent-success', 'accent-warning']
          const color = colors[index]

          return (
            <div key={index} className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
              <div className={`font-bold text-[var(--${color})] mb-2`}>
                {component.name}
              </div>
              <div className="text-sm text-[var(--text-secondary)] mb-2">
                Variance: {Math.round(component.variance * 100)}%
              </div>
              <div className="space-y-1">
                {component.features.slice(0, 3).map((feature, fIndex) => (
                  <div key={fIndex} className="flex justify-between text-xs">
                    <span className="text-[var(--text-tertiary)]">{feature.feature}</span>
                    <span className={`text-[var(--${color})]`}>
                      {feature.loading > 0 ? '+' : ''}{feature.loading.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-xs text-[var(--text-tertiary)] text-center">
        <p>💡 Drag to rotate • Scroll to zoom • Double-click to reset view</p>
      </div>
    </div>
  )
}
