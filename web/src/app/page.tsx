"use client"

import { useState, useEffect } from "react"
import { Music, Users, BarChart3, Gamepad2, Trophy, Activity, Sparkles, Network, Users2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import PCA3DVisualization from "@/components/PCA3DVisualization"

// Helper function to get color class based on color name
const getColorClass = (color: string, prefix: 'text' | 'bg' = 'text') => {
  const colorMap: Record<string, string> = {
    'accent-error': `${prefix}-[var(--accent-error)]`,
    'accent-success': `${prefix}-[var(--accent-success)]`,
    'accent-secondary': `${prefix}-[var(--accent-secondary)]`,
    'accent-warning': `${prefix}-[var(--accent-warning)]`,
    'accent-primary': `${prefix}-[var(--accent-primary)]`,
  }
  return colorMap[color] || `${prefix}-[var(--accent-primary)]`
}

export default function SpotifyDashboard() {
  const [liveResponses] = useState(42)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<{title: string, type: string, data?: any}>({title: '', type: ''})
  const [groups, setGroups] = useState<any[]>([])
  const [showGroupFormation, setShowGroupFormation] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleOpenModal = async (title: string, type: string) => {
    setLoading(true)
    setModalContent({title, type})
    setModalOpen(true)

    try {
      let data
      switch(type) {
        case 'clustering':
          const clusterResponse = await fetch('/api/analysis/clusters')
          data = await clusterResponse.json()
          break
        case 'heatmap':
          const heatmapResponse = await fetch('/api/analysis/heatmap')
          data = await heatmapResponse.json()
          break
        case 'pca':
          const pcaResponse = await fetch('/api/analysis/pca')
          data = await pcaResponse.json()
          break
        case 'audioMatch':
          const audioResponse = await fetch('/api/twins/audio-match')
          data = await audioResponse.json()
          break
        case 'genreMatch':
          const genreResponse = await fetch('/api/twins/genre-match')
          data = await genreResponse.json()
          break
      }
      setModalContent({title, type, data})
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  const handleFormGroups = async () => {
    setShowGroupFormation(true)
    try {
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({groupSize: 4})
      })
      const data = await response.json()
      setGroups(data.groups)
    } catch (error) {
      console.error('Error forming groups:', error)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--text-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--border-primary)] bg-[var(--surface-secondary)]/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-gradient-to-r from-[var(--spotify-green)] to-[var(--accent-primary)] shadow-lg">
              <Music className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--text-primary)] via-[var(--accent-primary)] to-[var(--spotify-green)] bg-clip-text text-transparent">
                Music DNA Analysis
              </h1>
              <p className="text-[var(--text-secondary)] mt-1 text-sm">
                Discover the hidden patterns in our community&apos;s musical preferences
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="live-feed" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-[var(--surface-tertiary)] border border-[var(--border-primary)] rounded-xl p-1 shadow-lg">
            <TabsTrigger value="live-feed" className="flex items-center gap-2 data-[state=active]:bg-[var(--spotify-green)]/10 data-[state=active]:text-[var(--spotify-green)] data-[state=active]:shadow-md transition-all duration-200">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Live Feed</span>
            </TabsTrigger>
            <TabsTrigger value="music-twin" className="flex items-center gap-2 data-[state=active]:bg-[var(--accent-primary)]/10 data-[state=active]:text-[var(--accent-primary)] data-[state=active]:shadow-md transition-all duration-200">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Music Twin</span>
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2 data-[state=active]:bg-[var(--accent-secondary)]/10 data-[state=active]:text-[var(--accent-secondary)] data-[state=active]:shadow-md transition-all duration-200">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="major-guesser" className="flex items-center gap-2 data-[state=active]:bg-[var(--accent-warning)]/10 data-[state=active]:text-[var(--accent-warning)] data-[state=active]:shadow-md transition-all duration-200">
              <Gamepad2 className="h-4 w-4" />
              <span className="hidden sm:inline">Major Guesser</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2 data-[state=active]:bg-[var(--accent-warning)]/10 data-[state=active]:text-[var(--accent-warning)] data-[state=active]:shadow-md transition-all duration-200">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Leaderboard</span>
            </TabsTrigger>
          </TabsList>

          {/* Live Feed Tab */}
          <TabsContent value="live-feed" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm hover:bg-[var(--surface-elevated)] transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[var(--spotify-green)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--spotify-green)] animate-pulse"></div>
                    Live Responses
                  </CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">Real-time survey submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[var(--spotify-green)] group-hover:scale-105 transition-transform">{liveResponses}</div>
                  <p className="text-sm text-[var(--text-tertiary)] mt-2 flex items-center gap-1">
                    <span className="text-[var(--accent-success)]">+3</span> in the last minute
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm hover:bg-[var(--surface-elevated)] transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[var(--accent-primary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
                    Unique Artists
                  </CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">Different artists mentioned</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">28</div>
                  <p className="text-sm text-[var(--text-tertiary)] mt-2">
                    <span className="text-[var(--text-secondary)]">Taylor Swift</span> leads with 6 mentions
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm hover:bg-[var(--surface-elevated)] transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[var(--accent-secondary)] flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]"></div>
                    Top Genre
                  </CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">Most popular music genre</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-[var(--accent-secondary)] group-hover:scale-105 transition-transform">Pop</div>
                  <p className="text-sm text-[var(--text-tertiary)] mt-2">
                    <span className="text-[var(--text-secondary)]">45%</span> of submissions
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[var(--text-primary)] flex items-center gap-2">
                  <Activity className="h-5 w-5 text-[var(--spotify-green)]" />
                  Latest Submissions
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">Recent survey responses as they come in</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: "Alex", song: "Anti-Hero", artist: "Taylor Swift", major: "Computer Science", time: "2s ago" },
                    { name: "Sarah", song: "As It Was", artist: "Harry Styles", major: "Psychology", time: "15s ago" },
                    { name: "Mike", song: "Unholy", artist: "Sam Smith", major: "Business", time: "32s ago" },
                    { name: "Emma", song: "Flowers", artist: "Miley Cyrus", major: "Art", time: "45s ago" },
                  ].map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-200 group">
                      <div className="flex-1">
                        <div className="font-medium text-[var(--text-primary)] group-hover:text-[var(--spotify-green)] transition-colors">
                          {entry.name} • <span className="text-[var(--text-secondary)]">{entry.major}</span>
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] mt-1">
                          &quot;<span className="text-[var(--text-primary)]">{entry.song}</span>&quot; by {entry.artist}
                        </div>
                      </div>
                      <div className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-secondary)] px-2 py-1 rounded-md">
                        {entry.time}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Music Twin Tab */}
          <TabsContent value="music-twin" className="space-y-6">
            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[var(--accent-primary)] flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Find Your Music Twin
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Discover who shares your musical DNA using AI-powered similarity matching
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center py-12 px-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">AI-Powered Matching</h3>
                  <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                    Our advanced algorithm analyzes your music preferences to find your perfect musical soulmate in the community.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    onClick={() => handleOpenModal('Audio Feature Matching', 'audioMatch')}
                    className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-[var(--accent-primary)]" />
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">Audio Feature Matching</h4>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Compare energy, danceability, valence, and tempo preferences to find musical compatibility
                    </p>
                  </button>
                  <button
                    onClick={() => handleOpenModal('Genre Similarity Analysis', 'genreMatch')}
                    className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-secondary)]/10 flex items-center justify-center">
                        <Music className="h-4 w-4 text-[var(--accent-secondary)]" />
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-secondary)] transition-colors">Genre Similarity</h4>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Discover others who share your taste in musical styles, artists, and genres
                    </p>
                  </button>
                </div>

                {/* Group Formation Feature */}
                <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-[var(--spotify-green)]/10 to-[var(--accent-primary)]/10 border border-[var(--spotify-green)]/20">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                        <Users2 className="h-6 w-6 text-[var(--spotify-green)]" />
                        Smart Group Formation
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        AI-powered group creation based on music compatibility (3-4 people per group)
                      </p>
                    </div>
                    <button
                      onClick={handleFormGroups}
                      className="px-6 py-3 bg-gradient-to-r from-[var(--spotify-green)] to-[var(--accent-primary)] text-white font-semibold rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg"
                    >
                      Form Groups
                    </button>
                  </div>
                  {showGroupFormation && (
                    <div className="text-sm text-[var(--text-tertiary)] mt-2">
                      <Sparkles className="inline h-4 w-4 mr-1 text-[var(--accent-warning)]" />
                      Analyzing music preferences and creating optimal groups...
                    </div>
                  )}
                  {groups.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Users2 className="h-5 w-5 text-[var(--spotify-green)]" />
                        Recommended Music Groups
                      </h4>
                      {groups.map((group: any) => (
                        <div key={group.id} className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h5 className="font-bold text-[var(--spotify-green)]">{group.name}</h5>
                              <p className="text-xs text-[var(--text-secondary)]">Compatibility: {Math.round(group.compatibility * 100)}%</p>
                            </div>
                            <div className="px-2 py-1 rounded-full bg-[var(--spotify-green)]/20 text-[var(--spotify-green)] text-xs">
                              {group.members.length} members
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            {group.members.map((member: any) => (
                              <div key={member.userId} className="text-xs">
                                <span className="font-medium text-[var(--text-primary)]">{member.username}</span>
                                <span className="text-[var(--text-tertiary)]"> • {member.major}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)] italic">
                            💡 {group.playlistSuggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-[var(--accent-primary)]/5 to-[var(--accent-secondary)]/5 border border-[var(--accent-primary)]/20">
                  <div className="flex items-center gap-2 text-[var(--accent-primary)] text-sm font-medium mb-1">
                    <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-pulse"></div>
                    Status: Building recommendation engine
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)]">We&apos;re currently training our AI model with community data for more accurate matches</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-6">
            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[var(--accent-secondary)] flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Community Music Analysis
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Advanced data science insights and statistical analysis of our musical preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="text-center py-12 px-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <BarChart3 className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Interactive Data Visualizations</h3>
                  <p className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
                    Explore sophisticated clustering patterns, correlation matrices, and dimensionality reduction to understand our community&apos;s musical DNA.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button
                    onClick={() => handleOpenModal('K-Means Clustering Analysis', 'clustering')}
                    className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-secondary)]/10 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)]"></div>
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)] ml-1"></div>
                        <div className="w-2 h-2 rounded-full bg-[var(--accent-secondary)] ml-1"></div>
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-secondary)] transition-colors">K-Means Clustering</h4>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Discover distinct musical neighborhoods and taste groups within our community
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <div className="w-1 h-1 rounded-full bg-[var(--accent-secondary)]"></div>
                      5 clusters identified
                    </div>
                  </button>

                  <button
                    onClick={() => handleOpenModal('Correlation Heatmap Analysis', 'heatmap')}
                    className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center">
                        <div className="grid grid-cols-2 gap-0.5">
                          <div className="w-1.5 h-1.5 rounded-sm bg-[var(--accent-primary)]"></div>
                          <div className="w-1.5 h-1.5 rounded-sm bg-[var(--accent-primary)]/60"></div>
                          <div className="w-1.5 h-1.5 rounded-sm bg-[var(--accent-primary)]/30"></div>
                          <div className="w-1.5 h-1.5 rounded-sm bg-[var(--accent-primary)]/80"></div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">Correlation Heatmaps</h4>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Visualize relationships between academic majors and musical preferences
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <div className="w-1 h-1 rounded-full bg-[var(--accent-primary)]"></div>
                      12 major categories
                    </div>
                  </button>

                  <button
                    onClick={() => handleOpenModal('PCA & Music DNA Analysis', 'pca')}
                    className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--spotify-green)]/10 flex items-center justify-center">
                        <div className="relative">
                          <div className="w-3 h-3 border-2 border-[var(--spotify-green)] rounded-full"></div>
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-[var(--spotify-green)] rounded-full"></div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--spotify-green)] transition-colors">PCA & Music DNA</h4>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Principal component analysis revealing the core dimensions of musical taste
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <div className="w-1 h-1 rounded-full bg-[var(--spotify-green)]"></div>
                      3D visualization ready
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-secondary)]">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-success)] animate-pulse"></div>
                      Key Insights
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Most predictive feature</span>
                        <span className="text-sm font-medium text-[var(--accent-success)]">Valence (0.73 correlation)</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Cluster silhouette score</span>
                        <span className="text-sm font-medium text-[var(--accent-primary)]">0.68 (Good)</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Variance explained</span>
                        <span className="text-sm font-medium text-[var(--accent-secondary)]">84.2% (3 components)</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-secondary)]">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-[var(--accent-warning)]" />
                      Live Analysis
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Sample size</span>
                        <span className="text-sm font-medium text-[var(--text-primary)]">42 responses</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Model accuracy</span>
                        <span className="text-sm font-medium text-[var(--accent-success)]">73.2%</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Last updated</span>
                        <span className="text-sm font-medium text-[var(--text-tertiary)]">2 minutes ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Major Guesser Tab */}
          <TabsContent value="major-guesser" className="space-y-6">
            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[var(--accent-warning)] flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  AI Major Predictor
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Can our machine learning model guess your academic major from your favorite song? Let&apos;s find out!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="text-center py-12 px-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[var(--accent-warning)] to-[var(--accent-error)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Gamepad2 className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Interactive ML Game</h3>
                  <p className="text-[var(--text-secondary)] max-w-lg mx-auto leading-relaxed">
                    Our Random Forest classifier analyzes Spotify audio features like energy, valence, and danceability to predict academic disciplines with surprising accuracy.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-warning)]/30 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-warning)] transition-colors">Model Performance</h4>
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-warning)]/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[var(--accent-warning)] animate-pulse"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold text-[var(--accent-warning)]">73.2%</div>
                        <span className="text-sm text-[var(--accent-success)]">+2.1%</span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">Accuracy based on 42 responses</p>
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-tertiary)]">Precision</span>
                          <span className="text-[var(--text-secondary)]">0.71</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-tertiary)]">Recall</span>
                          <span className="text-[var(--text-secondary)]">0.68</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[var(--text-tertiary)]">F1-Score</span>
                          <span className="text-[var(--text-secondary)]">0.69</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-error)]/30 transition-all duration-300 group">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-error)] transition-colors">Feature Importance</h4>
                      <div className="w-8 h-8 rounded-lg bg-[var(--accent-error)]/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-[var(--accent-error)]" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[var(--text-secondary)]">Valence</span>
                          <span className="text-sm font-medium text-[var(--accent-error)]">0.28</span>
                        </div>
                        <div className="w-full bg-[var(--surface-secondary)] rounded-full h-1.5">
                          <div className="bg-[var(--accent-error)] h-1.5 rounded-full" style={{width: "28%"}}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[var(--text-secondary)]">Energy</span>
                          <span className="text-sm font-medium text-[var(--accent-warning)]">0.24</span>
                        </div>
                        <div className="w-full bg-[var(--surface-secondary)] rounded-full h-1.5">
                          <div className="bg-[var(--accent-warning)] h-1.5 rounded-full" style={{width: "24%"}}></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[var(--text-secondary)]">Tempo</span>
                          <span className="text-sm font-medium text-[var(--accent-primary)]">0.19</span>
                        </div>
                        <div className="w-full bg-[var(--surface-secondary)] rounded-full h-1.5">
                          <div className="bg-[var(--accent-primary)] h-1.5 rounded-full" style={{width: "19%"}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-center hover:bg-[var(--surface-elevated)] transition-all duration-300">
                    <div className="text-2xl font-bold text-[var(--accent-success)] mb-1">CS</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Computer Science</div>
                    <div className="text-sm text-[var(--text-secondary)] mt-2">High energy, electronic</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-center hover:bg-[var(--surface-elevated)] transition-all duration-300">
                    <div className="text-2xl font-bold text-[var(--accent-warning)] mb-1">ART</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Fine Arts</div>
                    <div className="text-sm text-[var(--text-secondary)] mt-2">Creative, experimental</div>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] text-center hover:bg-[var(--surface-elevated)] transition-all duration-300">
                    <div className="text-2xl font-bold text-[var(--accent-secondary)] mb-1">BIZ</div>
                    <div className="text-xs text-[var(--text-tertiary)]">Business</div>
                    <div className="text-sm text-[var(--text-secondary)] mt-2">Mainstream, upbeat</div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--accent-warning)]/5 to-[var(--accent-error)]/5 border border-[var(--accent-warning)]/20">
                  <div className="flex items-center gap-2 text-[var(--accent-warning)] text-sm font-medium mb-2">
                    <Trophy className="h-4 w-4" />
                    Latest Predictions
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">&quot;Anti-Hero&quot; → Computer Science</span>
                      <span className="text-[var(--accent-success)]">✓ Correct</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-secondary)]">&quot;Flowers&quot; → Psychology</span>
                      <span className="text-[var(--accent-error)]">✗ Was Art</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-6">
            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[var(--accent-warning)] flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Music Awards & Leaderboard
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Celebrating the most interesting and extreme musical choices in our community
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="text-center py-8 px-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-[var(--accent-warning)] to-[var(--spotify-green)] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                    <Trophy className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Community Music Champions</h3>
                  <p className="text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
                    Recognizing the most energetic, danceable, and emotionally resonant tracks that define our musical identity.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="group">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-warning)]/50 transition-all duration-300 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--accent-warning)] to-[var(--accent-error)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <div className="mb-3">
                        <h4 className="font-bold text-[var(--accent-warning)] text-lg mb-1">🔥 Most Energetic</h4>
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-warning)] to-transparent my-2"></div>
                      </div>
                      <p className="font-semibold text-[var(--text-primary)] mb-1">&quot;HUMBLE.&quot; by Kendrick Lamar</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-2 py-1 rounded-md bg-[var(--accent-warning)]/10 text-xs font-medium text-[var(--accent-warning)]">Energy: 0.89</div>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">Submitted by Alex - CS Major</p>
                    </div>
                  </div>

                  <div className="group">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-success)]/50 transition-all duration-300 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--accent-success)] to-[var(--spotify-green)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <div className="mb-3">
                        <h4 className="font-bold text-[var(--accent-success)] text-lg mb-1">😊 Happiest Song</h4>
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-success)] to-transparent my-2"></div>
                      </div>
                      <p className="font-semibold text-[var(--text-primary)] mb-1">&quot;Good as Hell&quot; by Lizzo</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-2 py-1 rounded-md bg-[var(--accent-success)]/10 text-xs font-medium text-[var(--accent-success)]">Valence: 0.95</div>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">Submitted by Emma - Psychology</p>
                    </div>
                  </div>

                  <div className="group">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-[var(--surface-tertiary)] to-[var(--surface-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-secondary)]/50 transition-all duration-300 text-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[var(--accent-secondary)] to-[var(--accent-primary)] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                      <div className="mb-3">
                        <h4 className="font-bold text-[var(--accent-secondary)] text-lg mb-1">💃 Most Danceable</h4>
                        <div className="h-px bg-gradient-to-r from-transparent via-[var(--accent-secondary)] to-transparent my-2"></div>
                      </div>
                      <p className="font-semibold text-[var(--text-primary)] mb-1">&quot;Levitating&quot; by Dua Lipa</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="px-2 py-1 rounded-md bg-[var(--accent-secondary)]/10 text-xs font-medium text-[var(--accent-secondary)]">Danceability: 0.88</div>
                      </div>
                      <p className="text-xs text-[var(--text-tertiary)] mt-2">Submitted by Sarah - Business</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-xl font-bold text-[var(--text-primary)]">Community Statistics</h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-primary)] to-transparent"></div>
                    <div className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-tertiary)] px-2 py-1 rounded-md">42 submissions</div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: "Average Energy", value: "0.67", description: "We like moderately energetic music", color: "accent-error", percentage: 67 },
                      { label: "Average Valence", value: "0.58", description: "Slightly more positive than negative", color: "accent-success", percentage: 58 },
                      { label: "Average Danceability", value: "0.72", description: "Our music is quite danceable!", color: "accent-secondary", percentage: 72 },
                      { label: "Most Common Tempo", value: "120 BPM", description: "Perfect for jogging and workouts", color: "accent-warning", percentage: 100 },
                    ].map((stat, index) => (
                      <div key={index} className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{stat.label}</div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1">{stat.description}</div>
                          </div>
                          <div className={`text-2xl font-bold ${getColorClass(stat.color)}`}>{stat.value}</div>
                        </div>
                        {stat.percentage < 100 && (
                          <div className="mt-3">
                            <div className="w-full bg-[var(--surface-secondary)] rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-1000 ease-out ${getColorClass(stat.color, 'bg')}`}
                                style={{width: `${stat.percentage}%`}}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                              <span>0</span>
                              <span>1.0</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-gradient-to-r from-[var(--spotify-green)]/5 to-[var(--accent-warning)]/5 border border-[var(--spotify-green)]/20">
                  <div className="flex items-center gap-2 text-[var(--spotify-green)] text-sm font-medium mb-3">
                    <Music className="h-4 w-4" />
                    Featured Community Highlights
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-[var(--text-primary)] font-medium">Most Diverse Taste</div>
                      <div className="text-[var(--text-secondary)]">Mike - 8 different genres</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[var(--text-primary)] font-medium">Tempo Extremist</div>
                      <div className="text-[var(--text-secondary)]">Luna - 200 BPM electronic</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[var(--text-primary)] font-medium">Mood Curator</div>
                      <div className="text-[var(--text-secondary)]">Jordan - Perfect 0.5 valence</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Modal for interactive visualizations */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalContent.title}
      >
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-primary)]"></div>
              <p className="text-[var(--text-secondary)] mt-2">Loading data...</p>
            </div>
          ) : (
            <>
              {modalContent.type === 'clustering' && modalContent.data && (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Musical Neighborhood Clusters</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {modalContent.data.clusters?.map((cluster: any, index: number) => {
                      const colors = ['accent-secondary', 'accent-primary', 'spotify-green', 'accent-warning']
                      const color = colors[index % colors.length]
                      const energyWidth = Math.round(cluster.features.energy * 100)

                      return (
                        <div key={cluster.id} className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                          <div className={`text-xl font-bold text-[var(--${color})] mb-2`}>{cluster.name}</div>
                          <p className="text-sm text-[var(--text-secondary)]">{cluster.members} members • Energy: {cluster.features.energy.toFixed(2)}</p>
                          <div className="mt-2 h-2 bg-[var(--surface-secondary)] rounded-full overflow-hidden">
                            <div className={`h-full bg-[var(--${color})]`} style={{width: `${energyWidth}%`}}></div>
                          </div>
                          <div className="mt-2 flex gap-1 flex-wrap">
                            {cluster.topGenres.slice(0, 2).map((genre: string) => (
                              <span key={genre} className="text-xs px-2 py-1 rounded bg-[var(--surface-secondary)] text-[var(--text-tertiary)]">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-sm text-[var(--text-tertiary)] mt-4">
                    K-means clustering identified {modalContent.data.clusters?.length || 0} distinct musical taste groups with {modalContent.data.totalUsers || 0} total users.
                  </p>
                </div>
              )}

          {modalContent.type === 'heatmap' && (
            <div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Major vs Genre Correlation Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-primary)]">
                      <th className="p-2 text-left text-[var(--text-secondary)]">Major</th>
                      <th className="p-2 text-center text-[var(--text-secondary)]">Pop</th>
                      <th className="p-2 text-center text-[var(--text-secondary)]">Rock</th>
                      <th className="p-2 text-center text-[var(--text-secondary)]">Electronic</th>
                      <th className="p-2 text-center text-[var(--text-secondary)]">Hip Hop</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[var(--border-primary)]">
                      <td className="p-2 font-medium text-[var(--text-primary)]">Computer Science</td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-primary)]/60"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-primary)]/30"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-primary)]/90"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-primary)]/40"></div>
                      </td>
                    </tr>
                    <tr className="border-b border-[var(--border-primary)]">
                      <td className="p-2 font-medium text-[var(--text-primary)]">Psychology</td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-secondary)]/80"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-secondary)]/50"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-secondary)]/20"></div>
                      </td>
                      <td className="p-2 text-center">
                        <div className="w-8 h-8 mx-auto rounded bg-[var(--accent-secondary)]/30"></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-[var(--text-tertiary)] mt-4">
                Darker colors indicate stronger correlations between academic majors and music genres.
              </p>
            </div>
          )}

          {modalContent.type === 'pca' && modalContent.data && (
            <PCA3DVisualization data={modalContent.data} />
          )}

              {modalContent.type === 'audioMatch' && modalContent.data && (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Audio Feature Compatibility</h3>
                  <div className="space-y-4">
                    {modalContent.data.matches?.map((match: any) => (
                      <div key={match.userId} className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-[var(--text-primary)]">{match.username}</span>
                          <span className="text-[var(--accent-success)] font-bold">{Math.round(match.similarity * 100)}% Match</span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mb-3">{match.matchReason}</p>
                        <div className="space-y-2 text-sm">
                          {match.sharedFeatures.slice(0, 3).map((feature: any) => (
                            <div key={feature.feature} className="flex justify-between">
                              <span className="text-[var(--text-secondary)]">{feature.feature}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[var(--text-primary)]">{feature.yourValue.toFixed(2)}</span>
                                <span className="text-[var(--text-tertiary)]">→</span>
                                <span className="text-[var(--text-primary)]">{feature.theirValue.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {modalContent.type === 'genreMatch' && modalContent.data && (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Genre Similarity Network</h3>
                  <div className="space-y-4">
                    {modalContent.data.matches?.map((match: any) => (
                      <div key={match.userId} className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-[var(--text-primary)]">{match.username}</span>
                          <span className="text-[var(--spotify-green)] font-bold">{Math.round(match.similarity * 100)}% Match</span>
                        </div>
                        <div className="mb-3">
                          <span className="text-xs text-[var(--text-secondary)]">Shared Genres:</span>
                          <div className="flex gap-1 flex-wrap mt-1">
                            {match.sharedGenres.map((genre: string) => (
                              <span key={genre} className="px-2 py-1 rounded-full bg-[var(--spotify-green)]/20 text-[var(--spotify-green)] text-xs">
                                {genre}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] italic">{match.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}