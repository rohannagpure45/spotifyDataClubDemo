"use client"

import { useState, useEffect } from "react"
import { Music, Users, BarChart3, Gamepad2, Trophy, Activity, Sparkles, Network, Users2, Joystick, Upload } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Modal } from "@/components/ui/modal"
import PCA3DVisualization, { type PCAData } from "@/components/PCA3DVisualization"
import SnakeGame from "@/components/SnakeGame"

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

// Types for API/Modal data
type UIGroupMember = {
  userId: string
  username: string
  major: string
  topGenres: string[]
  role: string
}

type UIGroup = {
  id: string
  name: string
  members: UIGroupMember[]
  compatibility: number
  playlistSuggestion?: string
  sharedInterests?: string[]
  meetingIdeas?: string[]
}

type PredictionTop = { major: string; probability: number }
type PredictionResult = {
  predictedMajor: string | null
  top3: PredictionTop[]
  datasetMajors: { major: string; samples: number }[]
}

type ClusterGroup = {
  id: string
  name: string
  description: string
  features: { energy: number; danceability: number; valence: number; acousticness: number }
  members: number
  topGenres: string[]
}

type ClustersApiResponse = { clusters: ClusterGroup[]; totalUsers: number; timestamp: string }

type HeatmapMajorGenreData = {
  type: 'major-genre'
  majors: string[]
  genres: string[]
  matrix: number[][]
  counts: number[][]
  insights: string[]
}

type FeatureCorrelationData = {
  type: 'feature-correlation'
  features: string[]
  matrix: number[][]
  insights: string[]
}

type AudioMatchSharedFeature = { feature: string; yourValue: number; theirValue: number }
type AudioMatchItem = { userId: string; username: string; similarity: number; matchReason: string; sharedFeatures: AudioMatchSharedFeature[] }
type AudioMatchData = { matches: AudioMatchItem[] }

type GenreMatchItem = { userId: string; username: string; similarity: number; sharedGenres: string[]; recommendation: string }
type GenreMatchData = { matches: GenreMatchItem[] }

type ModalType = 'clustering' | 'heatmap' | 'pca' | 'audioMatch' | 'genreMatch'
type ModalContentState = { title: string; type: ModalType; data?: ClustersApiResponse | HeatmapMajorGenreData | FeatureCorrelationData | AudioMatchData | GenreMatchData | null }


export default function SpotifyDashboard() {
  // Dynamic data states
  const [liveResponses, setLiveResponses] = useState(0)
  const [stats, setStats] = useState<{
    totalSubmissions: number
    uniqueArtists: number
    topArtist: { name: string; count: number } | null
    topGenre: { name: string; percentage: number } | null
    averages: { energy: number; valence: number; danceability: number; tempo: number }
    extremes: {
      mostEnergetic: { song: string; artist: string; energy: number; user: string } | null
      happiest: { song: string; artist: string; valence: number; user: string } | null
      mostDanceable: { song: string; artist: string; danceability: number; user: string } | null
    }
  }>({
    totalSubmissions: 0,
    uniqueArtists: 0,
    topArtist: null,
    topGenre: null,
    averages: { energy: 0, valence: 0, danceability: 0, tempo: 0 },
    extremes: { mostEnergetic: null, happiest: null, mostDanceable: null }
  })
  const [liveFeed, setLiveFeed] = useState<{
    recentSubmissions: Array<{ name: string; song: string; artist: string; major: string; timeAgo: string }>
    activityRate: number
  }>({ recentSubmissions: [], activityRate: 0 })
  const [predictionAccuracy, setPredictionAccuracy] = useState<{ accuracy: number; totalPredictions: number }>({ accuracy: 0, totalPredictions: 0 })

  // UI states
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState<ModalContentState>({title: '', type: 'heatmap'})
  const [groups, setGroups] = useState<UIGroup[]>([])
  const [showGroupFormation, setShowGroupFormation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [groupSize, setGroupSize] = useState(4)
  const [isFormingGroups, setIsFormingGroups] = useState(false)
  const [replaceFormGroups, setReplaceFormGroups] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputId = 'group-upload-csv-xlsx'
  const fileInputIdTop = 'music-twin-upload-top'
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('')
  const [importingFromGoogle, setImportingFromGoogle] = useState(false)
  const [autoImport, setAutoImport] = useState(false)
  const [autoRefreshSaved, setAutoRefreshSaved] = useState(false)
  const [isRefreshingSaved, setIsRefreshingSaved] = useState(false)
  const [replaceExisting, setReplaceExisting] = useState(false)
  const [predictLoading, setPredictLoading] = useState(false)
  const [predictError, setPredictError] = useState<string | null>(null)
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [featureForm, setFeatureForm] = useState({
    energy: 0.65,
    valence: 0.5,
    danceability: 0.6,
    acousticness: 0.3,
    tempo: 120
  })

  // Helper to normalize group objects for UI/Export compatibility
  const normalizeGroups = (apiGroups: unknown[]): UIGroup[] =>
    (Array.isArray(apiGroups) ? apiGroups : []).map((g, index: number): UIGroup => {
      const obj = (g ?? {}) as Record<string, unknown>
      const membersRaw = Array.isArray(obj.members) ? obj.members : []
      const members: UIGroupMember[] = membersRaw.map((m): UIGroupMember => {
        const mm = (m ?? {}) as Record<string, unknown>
        const mp = (mm.musicProfile as Record<string, unknown> | undefined) || undefined
        const userId = typeof mm.userId === 'string' ? mm.userId
          : typeof mm.id === 'string' ? mm.id
          : typeof mm.email === 'string' ? mm.email
          : typeof mm.name === 'string' ? mm.name
          : 'member'
        const username = typeof mm.username === 'string' ? mm.username
          : typeof mm.name === 'string' ? mm.name
          : typeof mm.email === 'string' ? mm.email
          : 'Member'
        const major = typeof mm.major === 'string' ? mm.major : 'Unknown'
        const topGenres = Array.isArray(mm.topGenres) ? (mm.topGenres as string[])
          : Array.isArray(mp?.topGenres) ? (mp!.topGenres as string[]) : []
        const role = (typeof mm.role === 'string' ? mm.role
          : typeof mp?.listeningStyle === 'string' ? String(mp!.listeningStyle)
          : 'Member')
        return { userId, username, major, topGenres, role }
      })
      const compatibility = typeof obj.compatibility === 'number'
        ? obj.compatibility as number
        : (typeof obj.groupCompatibility === 'number' ? (obj.groupCompatibility as number) : 0.75)
      const name = typeof obj.name === 'string' ? obj.name : `Group ${index + 1}`
      const id = typeof obj.id === 'string' ? obj.id : `group-${index + 1}`
      const rec = (obj.recommendations as Record<string, unknown> | undefined) || undefined
      const playlistSuggestion = typeof rec?.playlist === 'string'
        ? (rec!.playlist as string)
        : (typeof obj.playlistSuggestion === 'string' ? obj.playlistSuggestion as string : '')
      const sharedInterests = Array.isArray(obj.sharedInterests) ? (obj.sharedInterests as string[]) : []
      const meetingIdeas = Array.isArray(obj.meetingIdeas) ? (obj.meetingIdeas as string[]) : []
      return { id, name, members, compatibility, playlistSuggestion, sharedInterests, meetingIdeas }
    })

  const refreshSavedGroups = async () => {
    try {
      setIsRefreshingSaved(true)
      const resp = await fetch('/api/groups?limit=50')
      if (!resp.ok) return
      const payload = await resp.json()
      setGroups(normalizeGroups(payload.groups || []))
    } catch (e) {
      console.debug('Manual refresh fetch error (ignored):', e)
    } finally {
      setIsRefreshingSaved(false)
    }
  }

  const handlePredict = async (useLatest: boolean) => {
    setPredictLoading(true)
    setPredictError(null)
    setPrediction(null)
    try {
      const body = useLatest
        ? { useLatest: true }
        : { features: featureForm }

      const resp = await fetch('/api/major/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        setPredictError(data.error || 'Prediction failed')
        return
      }
      setPrediction(data)
    } catch {
      setPredictError('Prediction failed. Please try again.')
    } finally {
      setPredictLoading(false)
    }
  }

  const handleOpenModal = async (title: string, type: ModalType) => {
    setLoading(true)
    setModalContent({title, type})
    setModalOpen(true)

    try {
      let data: ClustersApiResponse | HeatmapMajorGenreData | FeatureCorrelationData | AudioMatchData | GenreMatchData | null
      let response: Response | null = null

      switch(type) {
        case 'clustering':
          response = await fetch('/api/analysis/clusters')
          break
        case 'heatmap':
          response = await fetch('/api/analysis/heatmap')
          break
        case 'pca':
          response = await fetch('/api/analysis/pca')
          break
        case 'audioMatch':
          response = await fetch('/api/twins/audio-match')
          break
        case 'genreMatch':
          response = await fetch('/api/twins/genre-match')
          break
      }

      if (response) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        data = await response.json()
        setModalContent({title, type, data})
      }
    } catch (error) {
      console.error(`Error fetching ${type} data:`, error)

      // Log more details for debugging
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          type: type,
          url: `/api/analysis/${type === 'audioMatch' ? 'twins/audio-match' : type === 'genreMatch' ? 'twins/genre-match' : type}`
        })
      }

      // Show error in modal
      setModalContent({
        title,
        type,
        data: null
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFormGroups = async () => {
    setShowGroupFormation(true)
    setIsFormingGroups(true)
    try {
      const response = await fetch('/api/groups/create', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ groupSize: groupSize, replace: replaceFormGroups })
      })
      const data = await response.json()
      if (!response.ok || data?.success === false) {
        const msg = (data && (data.error || data.message)) || 'Failed to create groups. Please try again.'
        alert(msg)
        // Ensure groups state remains a safe array
        setGroups([])
        return
      }
      setGroups(normalizeGroups(data.groups || []))
    } catch (error) {
      console.error('Error forming groups:', error)
    } finally {
      setIsFormingGroups(false)
    }
  }

  const handleImportFromGoogle = async () => {
    if (!googleSheetsUrl) {
      alert('Please enter a Google Sheets URL')
      return
    }
    setImportingFromGoogle(true)
    try {
      const formData = new FormData()
      formData.append('sheetsUrl', googleSheetsUrl)
      formData.append('groupSize', String(groupSize))
      formData.append('replace', String(replaceExisting))
      formData.append('replaceScope', 'all')

      const response = await fetch('/api/google/process-forms', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process Google Forms data')
      }

      const normalized = normalizeGroups(data.groups || [])
      setGroups(normalized)
      alert(`Processed ${data.summary?.totalResponses ?? normalized.reduce((s: number, g: UIGroup) => s + (g.members?.length || 0), 0)} responses into ${data.summary?.totalGroups ?? normalized.length} groups`)
    } catch (error) {
      console.error('Error importing from Google Sheets:', error)
      alert('Failed to import from Google Sheets. Please check the URL and permissions.')
    } finally {
      setImportingFromGoogle(false)
    }
  }

  // Optional auto-import: periodically process forms from Google Sheets
  useEffect(() => {
    if (!autoImport || !googleSheetsUrl) return

    const interval = setInterval(async () => {
      try {
        const formData = new FormData()
        formData.append('sheetsUrl', googleSheetsUrl)
        formData.append('groupSize', String(groupSize))
        formData.append('replace', 'true')
        formData.append('replaceScope', 'user')

        const response = await fetch('/api/google/process-forms', {
          method: 'POST',
          body: formData
        })
        const data = await response.json()
        if (!response.ok) return

        setGroups(normalizeGroups(data.groups || []))
      } catch (e) {
        // Silently ignore background errors during auto-import
        console.debug('Auto-import error (ignored):', e)
      }
    }, 60000) // every 60 seconds

    return () => clearInterval(interval)
  }, [autoImport, googleSheetsUrl, groupSize])

  // Admin tools state
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminSummary, setAdminSummary] = useState<{ totalUsers: number; placeholders: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    const checkAdmin = async () => {
      try {
        const resp = await fetch('/api/admin/is-admin')
        if (!resp.ok) return
        const data = await resp.json()
        if (!cancelled) setIsAdmin(!!data.isAdmin)
      } catch {}
    }
    checkAdmin()
    return () => { cancelled = true }
  }, [])

  const refreshAdminSummary = async () => {
    setAdminError(null)
    try {
      const resp = await fetch('/api/admin/backfill-placeholders')
      if (!resp.ok) {
        setAdminError(`Failed to load summary: ${resp.status}`)
        return
      }
      const data = await resp.json()
      setAdminSummary({ totalUsers: data.totalUsers, placeholders: data.placeholders })
    } catch {
      setAdminError('Failed to load summary')
    }
  }

  const runBackfill = async () => {
    setAdminBusy(true)
    setAdminError(null)
    try {
      const resp = await fetch('/api/admin/backfill-placeholders', { method: 'POST' })
      const data = await resp.json()
      if (!resp.ok || !data.success) {
        setAdminError(data.error || `Backfill failed: ${resp.status}`)
        return
      }
      await refreshAdminSummary()
      alert(`Backfill complete: ${data.updatedUsers} users updated (scanned ${data.scannedUsers}).`)
    } catch {
      setAdminError('Backfill failed')
    } finally {
      setAdminBusy(false)
    }
  }

  // Auto-refresh saved groups by polling GET /api/groups every 10 seconds
  useEffect(() => {
    if (!autoRefreshSaved) return

    let aborted = false

    const fetchSaved = async () => {
      try {
        const resp = await fetch('/api/groups?limit=50')
        if (!resp.ok) return
        const payload = await resp.json()
        if (aborted) return
        setGroups(normalizeGroups(payload.groups || []))
      } catch (e) {
        console.debug('Auto-refresh fetch error (ignored):', e)
      }
    }

    // initial fetch immediately
    fetchSaved()
    const interval = setInterval(fetchSaved, 10000) // 10 seconds
    return () => { aborted = true; clearInterval(interval) }
  }, [autoRefreshSaved])

  const handleExportToGoogle = async () => {
    if (groups.length === 0) {
      alert('No groups to export. Please form groups first.')
      return
    }
    try {
      const response = await fetch('/api/google/export', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({groups})
      })
      const data = await response.json()

      // Create a downloadable CSV file instead of opening fake URL
      if (data.csvContent) {
        // Create blob from CSV content
        const blob = new Blob([data.csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)

        // Create temporary link and trigger download
        const link = document.createElement('a')
        link.href = url
        link.download = `music-groups-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Clean up the URL
        URL.revokeObjectURL(url)

        // Show success message
        alert(`Successfully exported ${groups.length} groups to CSV!\n\nYou can now import this file to Google Sheets:\n1. Open Google Sheets\n2. File → Import\n3. Upload the CSV file\n4. Share with your group members`)
      }
    } catch (error) {
      console.error('Error exporting groups:', error)
      alert('Failed to export groups. Please try again.')
    }
  }

  // Data fetching functions
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setLiveResponses(data.totalSubmissions)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchLiveFeed = async () => {
    try {
      const response = await fetch('/api/live-feed')
      if (response.ok) {
        const data = await response.json()
        setLiveFeed(data)
      }
    } catch (error) {
      console.error('Error fetching live feed:', error)
    }
  }

  const fetchPredictionAccuracy = async () => {
    try {
      const response = await fetch('/api/major/predict')
      if (response.ok) {
        const data = await response.json()
        setPredictionAccuracy(data)
      }
    } catch (error) {
      console.error('Error fetching prediction accuracy:', error)
    }
  }

  // Load initial data and set up auto-refresh
  useEffect(() => {
    fetchStats()
    fetchLiveFeed()
    fetchPredictionAccuracy()

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats()
      fetchLiveFeed()
      fetchPredictionAccuracy()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  // Refresh data when Google Forms are processed
  useEffect(() => {
    if (!importingFromGoogle) {
      // Refresh data after Google Forms import
      setTimeout(() => {
        fetchStats()
        fetchLiveFeed()
        fetchPredictionAccuracy()
      }, 1000)
    }
  }, [importingFromGoogle])

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
          <TabsList className="grid w-full grid-cols-6 bg-[var(--surface-tertiary)] border border-[var(--border-primary)] rounded-xl p-1 shadow-lg">
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
            <TabsTrigger value="game" className="flex items-center gap-2 data-[state=active]:bg-[var(--accent-success)]/10 data-[state=active]:text-[var(--accent-success)] data-[state=active]:shadow-md transition-all duration-200">
              <Joystick className="h-4 w-4" />
              <span className="hidden sm:inline">Mini Game</span>
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
                  <div className="text-4xl font-bold text-[var(--accent-primary)] group-hover:scale-105 transition-transform">
                    {stats.uniqueArtists}
                  </div>
                  <p className="text-sm text-[var(--text-tertiary)] mt-2">
                    {stats.topArtist ? (
                      <span className="text-[var(--text-secondary)]">{stats.topArtist.name}</span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">No data yet</span>
                    )}
                    {stats.topArtist && ` leads with ${stats.topArtist.count} mention${stats.topArtist.count !== 1 ? 's' : ''}`}
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
                  {liveFeed.recentSubmissions.length > 0 ? liveFeed.recentSubmissions.slice(0, 4).map((entry, index) => (
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
                        {entry.timeAgo}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                      <div className="text-2xl mb-2">🎵</div>
                      <p>No submissions yet</p>
                      <p className="text-sm text-[var(--text-tertiary)] mt-1">Responses will appear here as they come in</p>
                    </div>
                  )}
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

                {/* Quick Upload CTA (CSV/XLSX) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                  <input
                    id={fileInputIdTop}
                    type="file"
                    accept=".csv,.xlsx"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setUploadingFile(true)
                      setUploadError(null)
                      try {
                        const fd = new FormData()
                        fd.append('file', f)
                        fd.append('groupSize', String(groupSize))
                        const resp = await fetch('/api/google/process-forms', { method: 'POST', body: fd })
                        const payload = await resp.json()
                        if (!resp.ok) throw new Error(payload.error || 'Upload failed')
                        setGroups(normalizeGroups(payload.groups || []))
                      } catch (err) {
                        setUploadError(err instanceof Error ? err.message : 'Upload failed')
                      } finally {
                        setUploadingFile(false)
                        // Reset to allow re-selecting the same file
                        const input = document.getElementById(fileInputIdTop) as HTMLInputElement | null
                        if (input) input.value = ''
                      }
                    }}
                  />
                  <button
                    onClick={() => (document.getElementById(fileInputIdTop) as HTMLInputElement | null)?.click()}
                    disabled={uploadingFile}
                    className="px-4 py-3 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    title="Upload CSV or Excel (.xlsx) with form responses"
                  >
                    {uploadingFile ? 'Uploading…' : 'Upload CSV/XLSX'}
                  </button>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    Tip: You can also use the Import CSV card below or paste a Google Sheets URL in Group Formation.
                  </div>
                </div>
                {uploadError && (
                  <div className="-mt-2 text-xs text-red-600">{uploadError}</div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <button
                    onClick={() => window.location.href = '/forms-processor'}
                    className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--surface-elevated)] transition-all duration-300 group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-[var(--spotify-green)]/10 flex items-center justify-center">
                        <Upload className="h-4 w-4 text-[var(--spotify-green)]" />
                      </div>
                      <h4 className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--spotify-green)] transition-colors">Import CSV Data</h4>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                      Upload Google Forms responses and create optimized music groups based on preferences
                    </p>
                  </button>
                </div>

                {/* Group Formation Feature */}
                <div className="mt-8 p-6 rounded-xl bg-gradient-to-r from-[var(--spotify-green)]/10 to-[var(--accent-primary)]/10 border border-[var(--spotify-green)]/20">
                  <div className="mb-4">
                    <h3 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2 mb-2">
                      <Users2 className="h-6 w-6 text-[var(--spotify-green)]" />
                      Smart Group Formation
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)]">
                      AI-powered group creation based on music compatibility
                    </p>
                  </div>

                  {/* Group Size Selector and Controls */}
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <label className="text-sm font-medium text-[var(--text-primary)] block mb-2">
                          Group Size
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="3"
                            max="8"
                            value={groupSize}
                            onChange={(e) => setGroupSize(Number(e.target.value))}
                            className="flex-1 h-2 bg-[var(--surface-tertiary)] rounded-lg appearance-none cursor-pointer accent-[var(--spotify-green)]"
                          />
                          <div className="min-w-[60px] px-3 py-1 rounded-lg bg-[var(--surface-tertiary)] text-center">
                            <span className="text-lg font-bold text-[var(--spotify-green)]">{groupSize}</span>
                            <span className="text-xs text-[var(--text-tertiary)] block">people</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-xs text-[var(--text-tertiary)] mt-1">
                          <span>Min: 3</span>
                          <span>Optimal: 4-5</span>
                          <span>Max: 8</span>
                        </div>
                      </div>

                    <div className="flex gap-2 items-center">
                      <button
                        onClick={handleFormGroups}
                        disabled={isFormingGroups}
                        className="px-6 py-3 bg-gradient-to-r from-[var(--spotify-green)] to-[var(--accent-primary)] text-white font-semibold rounded-xl hover:scale-105 transition-transform duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isFormingGroups ? 'Forming...' : 'Form Groups'}
                      </button>
                      {/* Inline CSV/XLSX upload near Form Groups */}
                      <input
                        id={fileInputId}
                        type="file"
                        accept=".csv,.xlsx"
                        className="hidden"
                        onChange={async (e) => {
                          const f = e.target.files?.[0]
                          if (!f) return
                          setUploadingFile(true)
                          setUploadError(null)
                          try {
                            const fd = new FormData()
                            fd.append('file', f)
                            fd.append('groupSize', String(groupSize))
                            const resp = await fetch('/api/google/process-forms', { method: 'POST', body: fd })
                            const payload = await resp.json()
                            if (!resp.ok) throw new Error(payload.error || 'Upload failed')
                            setGroups(normalizeGroups(payload.groups || []))
                          } catch (err) {
                            setUploadError(err instanceof Error ? err.message : 'Upload failed')
                          } finally {
                            setUploadingFile(false)
                            // Reset the input so same file can be re-selected
                            const input = document.getElementById(fileInputId) as HTMLInputElement | null
                            if (input) input.value = ''
                          }
                        }}
                      />
                      <button
                        onClick={() => (document.getElementById(fileInputId) as HTMLInputElement | null)?.click()}
                        disabled={uploadingFile}
                        className="px-4 py-3 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                        title="Upload CSV or Excel (.xlsx) with form responses"
                      >
                        {uploadingFile ? 'Uploading…' : 'Upload CSV/XLSX'}
                      </button>
                    </div>
                  </div>
                  {uploadError && (
                    <div className="mt-2 text-xs text-red-600">{uploadError}</div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <label className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                      <input
                        type="checkbox"
                        checked={replaceFormGroups}
                        onChange={(e) => setReplaceFormGroups(e.target.checked)}
                        className="accent-[var(--accent-primary)]"
                      />
                      Replace my saved groups
                    </label>
                  </div>

                    {/* Google Integration */}
                    <div className="p-4 rounded-lg bg-[var(--surface-tertiary)]/50 border border-[var(--border-primary)]">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] mb-3">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google Integration
                      </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              placeholder="Google Sheets/Forms URL"
                              value={googleSheetsUrl}
                            onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                          />
                          <button
                            onClick={handleImportFromGoogle}
                            disabled={importingFromGoogle}
                            className="mt-2 w-full px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {importingFromGoogle ? 'Importing...' : '📥 Import + Process'}
                          </button>
                          <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                            <input
                              type="checkbox"
                              checked={replaceExisting}
                              onChange={(e) => setReplaceExisting(e.target.checked)}
                              className="accent-[var(--accent-primary)]"
                            />
                            Replace existing groups
                          </label>
                          <button
                            onClick={refreshSavedGroups}
                            disabled={isRefreshingSaved}
                            className="mt-2 w-full px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            {isRefreshingSaved ? 'Refreshing...' : '🔄 Refresh Saved Groups'}
                          </button>
                          <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                            <input
                              type="checkbox"
                              checked={autoImport}
                              onChange={(e) => setAutoImport(e.target.checked)}
                              className="accent-[var(--spotify-green)]"
                            />
                            Auto-import every 60s
                          </label>
                          <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                            <input
                              type="checkbox"
                              checked={autoRefreshSaved}
                              onChange={(e) => setAutoRefreshSaved(e.target.checked)}
                              className="accent-[var(--accent-primary)]"
                            />
                            Auto-refresh saved groups every 10s
                          </label>
                        </div>
                        <div className="flex flex-col justify-between">
                          <button
                            onClick={handleExportToGoogle}
                            disabled={groups.length === 0}
                            className="px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            📥 Download Groups CSV
                          </button>
                          <p className="text-xs text-[var(--text-tertiary)] mt-2">
                            Download groups as CSV for Google Sheets
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {showGroupFormation && (
                    <div className="text-sm text-[var(--text-tertiary)] mt-2">
                      <Sparkles className="inline h-4 w-4 mr-1 text-[var(--accent-warning)]" />
                      Analyzing music preferences and creating optimal groups...
                    </div>
                  )}
                  {groups.length > 0 ? (
                    <div className="mt-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                          <Users2 className="h-5 w-5 text-[var(--spotify-green)]" />
                          Recommended Music Groups
                        </h4>
                        <div className="text-sm text-[var(--text-secondary)]">
                          {groups.length} groups • {groups.reduce((acc, g) => acc + g.members.length, 0)} total members
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {groups.map((group: UIGroup, index: number) => (
                          <div key={group.id} className="p-4 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)] hover:border-[var(--spotify-green)]/30 transition-all duration-200">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h5 className="font-bold text-[var(--spotify-green)] flex items-center gap-2">
                                  {group.name || `Group ${index + 1}`}
                                </h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="text-xs text-[var(--text-secondary)]">
                                    Compatibility:
                                  </div>
                                  <div className="flex-1 h-1.5 bg-[var(--surface-secondary)] rounded-full max-w-[100px]">
                                    <div
                                      className="h-1.5 bg-gradient-to-r from-[var(--spotify-green)] to-[var(--accent-primary)] rounded-full"
                                      style={{width: `${Math.round(group.compatibility * 100)}%`}}
                                    ></div>
                                  </div>
                                  <span className="text-xs font-bold text-[var(--spotify-green)]">
                                    {Math.round(group.compatibility * 100)}%
                                  </span>
                                </div>
                              </div>
                              <div className="px-2 py-1 rounded-full bg-[var(--spotify-green)]/20 text-[var(--spotify-green)] text-xs font-medium">
                                {group.members.length}/{groupSize}
                              </div>
                            </div>
                            <div className="space-y-2 mb-3">
                              {group.members.map((member: UIGroupMember) => (
                                <div key={member.userId} className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-xs text-white font-bold">
                                    {(member?.username || 'M').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="text-xs flex-1">
                                    <span className="font-medium text-[var(--text-primary)]">{member.username}</span>
                                    <span className="text-[var(--text-tertiary)]"> • {member.major}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="pt-3 border-t border-[var(--border-primary)]">
                              <div className="text-xs text-[var(--text-secondary)] italic">
                                💡 {group.playlistSuggestion || 'Creating custom playlist recommendations...'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-center gap-3 mt-4">
                        <button
                          onClick={() => setGroups([])}
                          className="px-4 py-2 text-sm bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
                        >
                          Clear Groups
                        </button>
                        <button
                          onClick={handleFormGroups}
                          className="px-4 py-2 text-sm bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg transition-colors"
                        >
                          Reshuffle Groups
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 p-6 text-center rounded-xl bg-[var(--surface-tertiary)]/30 border border-[var(--border-primary)]">
                      <Users2 className="h-12 w-12 text-[var(--text-tertiary)] mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No Groups Yet</h4>
                      <p className="text-sm text-[var(--text-secondary)] mb-4">
                        Import data from Google Sheets or upload a CSV file, then click &ldquo;Form Groups&rdquo; to create optimized music groups.
                      </p>
                      <div className="text-xs text-[var(--text-tertiary)]">
                        Groups will appear here once you have music submission data to analyze.
                      </div>
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
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {stats.totalSubmissions} response{stats.totalSubmissions !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Model accuracy</span>
                        <span className="text-sm font-medium text-[var(--accent-success)]">
                          {predictionAccuracy.totalPredictions > 0 ? `${predictionAccuracy.accuracy}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-[var(--text-secondary)]">Last updated</span>
                        <span className="text-sm font-medium text-[var(--text-tertiary)]">2 minutes ago</span>
                      </div>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="mt-4 p-4 rounded-lg bg-[var(--surface-tertiary)]/50 border border-[var(--border-primary)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-[var(--text-primary)]">Admin Tools</div>
                        <button
                          onClick={refreshAdminSummary}
                          className="px-3 py-1 text-xs rounded bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)]"
                        >
                          Refresh Summary
                        </button>
                      </div>
                      {adminError && (
                        <div className="text-xs text-[var(--accent-error)] mb-2">{adminError}</div>
                      )}
                      <div className="text-xs text-[var(--text-secondary)]">
                        {adminSummary ? (
                          <div>
                            <div>Total users: {adminSummary.totalUsers}</div>
                            <div>Users with placeholders: {adminSummary.placeholders}</div>
                          </div>
                        ) : (
                          <div>Summary not loaded.</div>
                        )}
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={runBackfill}
                          disabled={adminBusy}
                          className="px-4 py-2 text-xs rounded bg-[var(--accent-warning)]/20 hover:bg-[var(--accent-warning)]/30 text-[var(--text-primary)] disabled:opacity-50"
                        >
                          {adminBusy ? 'Backfilling…' : 'Backfill Placeholder Profiles'}
                        </button>
                      </div>
                    </div>
                  )}
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

                {/* Predict Form & Results */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Try it: predict your major</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Energy (0-1)</label>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={featureForm.energy}
                          onChange={(e) => setFeatureForm({ ...featureForm, energy: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Valence (0-1)</label>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={featureForm.valence}
                          onChange={(e) => setFeatureForm({ ...featureForm, valence: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Danceability (0-1)</label>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={featureForm.danceability}
                          onChange={(e) => setFeatureForm({ ...featureForm, danceability: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Acousticness (0-1)</label>
                        <input
                          type="number"
                          min={0}
                          max={1}
                          step={0.01}
                          value={featureForm.acousticness}
                          onChange={(e) => setFeatureForm({ ...featureForm, acousticness: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[var(--text-secondary)] mb-1">Tempo (BPM)</label>
                        <input
                          type="number"
                          min={40}
                          max={220}
                          step={1}
                          value={featureForm.tempo}
                          onChange={(e) => setFeatureForm({ ...featureForm, tempo: parseFloat(e.target.value) })}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)]"
                        />
                      </div>
                    </div>
                    {predictError && (
                      <div className="mt-3 p-3 rounded-lg border border-red-400 bg-red-50/10 text-red-300 text-sm">{predictError}</div>
                    )}
                    <div className="mt-4 flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => handlePredict(false)}
                        disabled={predictLoading}
                        className="px-4 py-2 bg-[var(--accent-warning)]/20 hover:bg-[var(--accent-warning)]/30 text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {predictLoading ? 'Predicting…' : 'Predict from inputs'}
                      </button>
                      <button
                        onClick={() => handlePredict(true)}
                        disabled={predictLoading}
                        className="px-4 py-2 bg-[var(--surface-secondary)] hover:bg-[var(--surface-elevated)] text-[var(--text-primary)] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {predictLoading ? 'Predicting…' : 'Use my latest submission'}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-tertiary)]">Note: Predictions require that your Google Form responses have been processed for your account.</p>
                  </div>

                  <div className="p-6 rounded-xl bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                    <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Prediction</h4>
                    {prediction ? (
                      <div className="space-y-3">
                        <div className="text-sm text-[var(--text-secondary)]">Top prediction</div>
                        <div className="text-2xl font-bold text-[var(--accent-warning)]">{prediction.predictedMajor}</div>
                        <div className="mt-2">
                          <div className="text-xs text-[var(--text-tertiary)] mb-1">Top 3 majors</div>
                          <div className="space-y-2">
                            {prediction.top3.map((p: PredictionTop) => (
                              <div key={p.major} className="flex items-center justify-between">
                                <span className="text-sm text-[var(--text-secondary)]">{p.major}</span>
                                <span className="text-sm font-medium text-[var(--accent-success)]">{Math.round(p.probability * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 text-xs text-[var(--text-tertiary)]">
                          Trained on {prediction.datasetMajors.reduce((s: number, m: { samples: number }) => s + m.samples, 0)} samples across {prediction.datasetMajors.length} majors.
                        </div>
                      </div>
                    ) : (
                      <div className="text-[var(--text-tertiary)] text-sm">No prediction yet. Enter features or use your latest submission.</div>
                    )}
                  </div>
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
                        <div className="text-3xl font-bold text-[var(--accent-warning)]">
                          {predictionAccuracy.totalPredictions > 0 ? `${predictionAccuracy.accuracy}%` : 'N/A'}
                        </div>
                        {predictionAccuracy.totalPredictions > 0 && (
                          <span className="text-sm text-[var(--accent-success)]">Live</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">
                        {predictionAccuracy.totalPredictions > 0
                          ? `Accuracy based on ${predictionAccuracy.totalPredictions} prediction${predictionAccuracy.totalPredictions !== 1 ? 's' : ''}`
                          : 'No predictions yet'
                        }
                      </p>
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
                      {stats.extremes.mostEnergetic ? (
                        <>
                          <p className="font-semibold text-[var(--text-primary)] mb-1">
                            &quot;{stats.extremes.mostEnergetic.song}&quot; by {stats.extremes.mostEnergetic.artist}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <div className="px-2 py-1 rounded-md bg-[var(--accent-warning)]/10 text-xs font-medium text-[var(--accent-warning)]">
                              Energy: {stats.extremes.mostEnergetic.energy?.toFixed(2)}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] mt-2">
                            Submitted by {stats.extremes.mostEnergetic.user}
                          </p>
                        </>
                      ) : (
                        <p className="text-[var(--text-secondary)] text-center">No submissions yet</p>
                      )}
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
                      {stats.extremes.happiest ? (
                        <>
                          <p className="font-semibold text-[var(--text-primary)] mb-1">
                            &quot;{stats.extremes.happiest.song}&quot; by {stats.extremes.happiest.artist}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <div className="px-2 py-1 rounded-md bg-[var(--accent-success)]/10 text-xs font-medium text-[var(--accent-success)]">
                              Valence: {stats.extremes.happiest.valence?.toFixed(2)}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] mt-2">
                            Submitted by {stats.extremes.happiest.user}
                          </p>
                        </>
                      ) : (
                        <p className="text-[var(--text-secondary)] text-center">No submissions yet</p>
                      )}
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
                      {stats.extremes.mostDanceable ? (
                        <>
                          <p className="font-semibold text-[var(--text-primary)] mb-1">
                            &quot;{stats.extremes.mostDanceable.song}&quot; by {stats.extremes.mostDanceable.artist}
                          </p>
                          <div className="flex items-center justify-center gap-2">
                            <div className="px-2 py-1 rounded-md bg-[var(--accent-secondary)]/10 text-xs font-medium text-[var(--accent-secondary)]">
                              Danceability: {stats.extremes.mostDanceable.danceability?.toFixed(2)}
                            </div>
                          </div>
                          <p className="text-xs text-[var(--text-tertiary)] mt-2">
                            Submitted by {stats.extremes.mostDanceable.user}
                          </p>
                        </>
                      ) : (
                        <p className="text-[var(--text-secondary)] text-center">No submissions yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-xl font-bold text-[var(--text-primary)]">Community Statistics</h4>
                    <div className="flex-1 h-px bg-gradient-to-r from-[var(--border-primary)] to-transparent"></div>
                    <div className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-tertiary)] px-2 py-1 rounded-md">
                      {stats.totalSubmissions} submission{stats.totalSubmissions !== 1 ? 's' : ''}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(stats.totalSubmissions > 0 ? [
                      {
                        label: "Average Energy",
                        value: stats.averages.energy.toFixed(2),
                        description: stats.averages.energy > 0.7 ? "High energy community!" : stats.averages.energy > 0.4 ? "Moderate energy preferences" : "Calm music preferences",
                        color: "accent-error",
                        percentage: Math.round(stats.averages.energy * 100)
                      },
                      {
                        label: "Average Valence",
                        value: stats.averages.valence.toFixed(2),
                        description: stats.averages.valence > 0.6 ? "Generally positive vibes" : stats.averages.valence > 0.4 ? "Balanced emotional range" : "Melancholic preferences",
                        color: "accent-success",
                        percentage: Math.round(stats.averages.valence * 100)
                      },
                      {
                        label: "Average Danceability",
                        value: stats.averages.danceability.toFixed(2),
                        description: stats.averages.danceability > 0.7 ? "Very danceable community!" : stats.averages.danceability > 0.5 ? "Moderately danceable" : "Prefer non-dance music",
                        color: "accent-secondary",
                        percentage: Math.round(stats.averages.danceability * 100)
                      },
                      {
                        label: "Average Tempo",
                        value: `${Math.round(stats.averages.tempo)} BPM`,
                        description: stats.averages.tempo > 130 ? "Fast-paced music lovers" : stats.averages.tempo > 100 ? "Moderate tempo preferences" : "Slower, relaxed music",
                        color: "accent-warning",
                        percentage: Math.min(100, Math.round((stats.averages.tempo / 180) * 100))
                      },
                    ] : [
                      { label: "Average Energy", value: "N/A", description: "No data available", color: "accent-error", percentage: 0 },
                      { label: "Average Valence", value: "N/A", description: "No data available", color: "accent-success", percentage: 0 },
                      { label: "Average Danceability", value: "N/A", description: "No data available", color: "accent-secondary", percentage: 0 },
                      { label: "Average Tempo", value: "N/A", description: "No data available", color: "accent-warning", percentage: 0 },
                    ]).map((stat, index) => (
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

          {/* Mini Game Tab */}
          <TabsContent value="game" className="space-y-6">
            <Card className="bg-[var(--surface-secondary)] border-[var(--border-primary)] shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-[var(--accent-success)] flex items-center gap-2">
                  <Joystick className="h-5 w-5" />
                  Mini Game: Snake
                </CardTitle>
                <CardDescription className="text-[var(--text-secondary)]">
                  Take a quick break and play a classic. Use arrow keys or WASD.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-full">
                  <SnakeGame />
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
                    { (modalContent.data as ClustersApiResponse | undefined)?.clusters?.map((cluster: ClusterGroup, index: number) => {
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
                    K-means clustering identified {(modalContent.data as ClustersApiResponse | undefined)?.clusters?.length || 0} distinct musical taste groups with {(modalContent.data as ClustersApiResponse | undefined)?.totalUsers || 0} total users.
                  </p>
                </div>
              )}

          {modalContent.type === 'heatmap' && (
            <div>
              {(() => {
                const d = modalContent.data
                const isMajorGenre = !!d && typeof d === 'object' && 'majors' in d && 'genres' in d && 'matrix' in d
                const isFeatureCorr = !!d && typeof d === 'object' && 'features' in d && 'matrix' in d && !('majors' in d)
                if (isMajorGenre) {
                  const data = d as HeatmapMajorGenreData
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Major vs Genre Heatmap (Your Dataset)</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border-primary)]">
                              <th className="p-2 text-left text-[var(--text-secondary)]">Major</th>
                              {data.genres.map((g: string) => (
                                <th key={g} className="p-2 text-center text-[var(--text-secondary)]">{g}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.majors.map((major: string, mi: number) => (
                              <tr key={major} className="border-b border-[var(--border-primary)]">
                                <td className="p-2 font-medium text-[var(--text-primary)]">{major}</td>
                                {data.genres.map((_: string, gi: number) => {
                                  const intensity = Math.max(0, Math.min(1, data.matrix[mi][gi] || 0))
                                  const count = data.counts?.[mi]?.[gi] ?? 0
                                  const bg = `rgba(30, 215, 96, ${intensity})`
                                  return (
                                    <td key={`${major}-${gi}`} className="p-2 text-center">
                                      <div
                                        className="w-9 h-9 mx-auto rounded flex items-center justify-center text-[var(--text-primary)]"
                                        style={{ backgroundColor: bg }}
                                        title={`${count} matches`}
                                      >
                                        <span className="text-[10px] font-semibold" style={{ mixBlendMode: 'screen' }}>{count}</span>
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.insights?.length > 0 && (
                        <ul className="mt-4 text-sm text-[var(--text-tertiary)] list-disc pl-5">
                          {data.insights.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                      <p className="text-sm text-[var(--text-tertiary)] mt-2">
                        Darker cells indicate stronger major–genre concentration in your imported data.
                      </p>
                    </>
                  )
                }
                if (isFeatureCorr) {
                  const data = d as FeatureCorrelationData
                  return (
                    <>
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Audio Feature Correlation</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--border-primary)]">
                              <th className="p-2 text-left text-[var(--text-secondary)]">Feature</th>
                              {data.features.map((f: string) => (
                                <th key={f} className="p-2 text-center text-[var(--text-secondary)]">{f}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {data.features.map((rowName: string, i: number) => (
                              <tr key={rowName} className="border-b border-[var(--border-primary)]">
                                <td className="p-2 font-medium text-[var(--text-primary)]">{rowName}</td>
                                {data.features.map((_: string, j: number) => {
                                  const v = data.matrix[i][j]
                                  const intensity = Math.max(0, Math.min(1, (v + 1) / 2))
                                  const bg = `rgba(30, 215, 96, ${intensity})`
                                  return (
                                    <td key={`${i}-${j}`} className="p-2 text-center">
                                      <div className="w-9 h-9 mx-auto rounded flex items-center justify-center" style={{ backgroundColor: bg }}>
                                        <span className="text-[10px] text-[var(--background)] font-semibold">{v.toFixed(2)}</span>
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {data.insights?.length > 0 && (
                        <ul className="mt-4 text-sm text-[var(--text-tertiary)] list-disc pl-5">
                          {data.insights.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      )}
                    </>
                  )
                }
                return <div className="text-[var(--text-secondary)]">No heatmap data available.</div>
              })()}
            </div>
          )}

          {modalContent.type === 'pca' && (
            modalContent.data ? (
              <PCA3DVisualization data={modalContent.data as unknown as PCAData} />
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[var(--accent-error)]/10 flex items-center justify-center mx-auto mb-4">
                  <Network className="h-8 w-8 text-[var(--accent-error)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Unable to Load Visualization</h3>
                <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                  There was an error loading the PCA data. Please try again or check your network connection.
                </p>
              </div>
            )
          )}

              {modalContent.type === 'audioMatch' && modalContent.data && (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Your Audio Feature Compatibility</h3>
                  <div className="space-y-4">
                    {(modalContent.data as AudioMatchData | undefined)?.matches?.map((match: AudioMatchItem) => (
                      <div key={match.userId} className="p-4 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-primary)]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-[var(--text-primary)]">{match.username}</span>
                          <span className="text-[var(--accent-success)] font-bold">{Math.round(match.similarity * 100)}% Match</span>
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] mb-3">{match.matchReason}</p>
                        <div className="space-y-2 text-sm">
                          {match.sharedFeatures.slice(0, 3).map((feature: AudioMatchSharedFeature) => (
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
                    {(modalContent.data as GenreMatchData | undefined)?.matches?.map((match: GenreMatchItem) => (
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
