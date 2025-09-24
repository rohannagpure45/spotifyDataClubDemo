'use client'

import { useState } from 'react'
import { Upload, Link, Users, Download, Loader2, AlertCircle } from 'lucide-react'

type ProcessedMember = {
  userId?: string
  username?: string
  major?: string
  topGenres?: string[]
  role?: string
}

interface ProcessedGroup {
  id: string
  name: string
  members: ProcessedMember[]
  groupCompatibility: number
  commonGenres: string[]
  groupDynamics: {
    diversity: number
    cohesion: number
    balance: number
  }
  recommendations: {
    playlist: string
    activities: string[]
    meetingTimes: string[]
  }
}

interface ProcessingSummary {
  totalResponses: number
  totalGroups: number
  averageGroupSize: number
  averageCompatibility: number
  topGenres: string[]
  timestamp: string
}

export default function GroupFormProcessor() {
  const [activeTab, setActiveTab] = useState<'upload' | 'sheets'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [sheetsUrl, setSheetsUrl] = useState('')
  const [groupSize, setGroupSize] = useState(4)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [filePreview, setFilePreview] = useState<string[][] | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [results, setResults] = useState<{
    groups: ProcessedGroup[]
    summary: ProcessingSummary
    csvContent: string
  } | null>(null)

  const validateAndSetFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a valid CSV file')
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB')
      return
    }

    try {
      // Read and preview first few rows
      const text = await selectedFile.text()
      const lines = text.split('\n').slice(0, 6) // Header + 5 rows
      const preview = lines.map(line => {
        // Simple CSV parsing for preview
        const cells = []
        let current = ''
        let inQuotes = false

        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            cells.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        cells.push(current.trim())
        return cells
      })

      setFile(selectedFile)
      setFilePreview(preview)
      setError(null)
      setShowPreview(true)
    } catch {
      setError('Failed to read CSV file')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      const formData = new FormData()

      if (activeTab === 'upload' && file) {
        formData.append('file', file)
      } else if (activeTab === 'sheets' && sheetsUrl) {
        formData.append('sheetsUrl', sheetsUrl)
      } else {
        throw new Error('Please provide either a CSV file or Google Sheets URL')
      }

      formData.append('groupSize', groupSize.toString())

      const response = await fetch('/api/google/process-forms', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process forms')
      }

      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadCSV = () => {
    if (!results?.csvContent) return

    const blob = new Blob([results.csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `music-groups-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Music Group Formation Tool
          </h1>
          <p className="text-gray-600 mb-8">
            Process Google Forms responses and create optimized music groups based on preferences
          </p>

          {/* Input Section */}
          <div className="mb-8">
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'upload'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="inline w-5 h-5 mr-2" />
                Upload CSV
              </button>
              <button
                onClick={() => setActiveTab('sheets')}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'sheets'
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Link className="inline w-5 h-5 mr-2" />
                Google Sheets
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {activeTab === 'upload' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File
                  </label>
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                      isDragOver
                        ? 'border-purple-500 bg-purple-50'
                        : file
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-300 hover:border-purple-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer flex flex-col items-center"
                    >
                      <Upload className={`w-12 h-12 mb-3 transition-colors ${
                        isDragOver
                          ? 'text-purple-500'
                          : file
                          ? 'text-green-500'
                          : 'text-gray-400'
                      }`} />
                      {file ? (
                        <div className="space-y-2">
                          <span className="text-green-600 font-medium">{file.name}</span>
                          <div className="text-sm text-gray-600">
                            {(file.size / 1024).toFixed(1)} KB
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowPreview(true)}
                            className="text-sm text-purple-600 hover:text-purple-700 underline"
                          >
                            Preview Data
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className={`text-lg font-medium ${
                            isDragOver ? 'text-purple-700' : 'text-gray-600'
                          }`}>
                            {isDragOver ? 'Drop your CSV file here' : 'Click to upload or drag and drop'}
                          </span>
                          <span className="text-sm text-gray-500 mt-1">
                            CSV files with form responses (Max 10MB)
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                  <div className="mt-3 flex items-center justify-center">
                    <a
                      href="/sample-music-form-template.csv"
                      download
                      className="text-sm text-purple-600 hover:text-purple-700 underline flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download sample CSV template
                    </a>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Sheets URL
                  </label>
                  <input
                    type="url"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Paste the URL of your Google Forms responses spreadsheet
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Group Size
                </label>
                <select
                  value={groupSize}
                  onChange={(e) => setGroupSize(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="2">2 members</option>
                  <option value="3">3 members</option>
                  <option value="4">4 members</option>
                  <option value="5">5 members</option>
                  <option value="6">6 members</option>
                  <option value="8">8 members</option>
                </select>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                  <span className="text-red-800">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing || (activeTab === 'upload' ? !file : !sheetsUrl)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="inline w-5 h-5 mr-2 animate-spin" />
                    Processing Forms...
                  </>
                ) : (
                  <>
                    <Users className="inline w-5 h-5 mr-2" />
                    Create Groups
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Results Section */}
          {results && (
            <div className="border-t pt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Group Formation Results
                </h2>
                <button
                  onClick={downloadCSV}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                >
                  <Download className="inline w-5 h-5 mr-2" />
                  Download CSV
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-purple-600 font-medium">Total Responses</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {results.summary.totalResponses}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-600 font-medium">Groups Created</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {results.summary.totalGroups}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">Avg Group Size</p>
                  <p className="text-2xl font-bold text-green-900">
                    {results.summary.averageGroupSize.toFixed(1)}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-yellow-600 font-medium">Avg Compatibility</p>
                  <p className="text-2xl font-bold text-yellow-900">
                    {Math.round(results.summary.averageCompatibility * 100)}%
                  </p>
                </div>
              </div>

              {/* Top Genres */}
              {results.summary.topGenres.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">
                    Popular Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {results.summary.topGenres.map((genre, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 text-purple-800 rounded-full text-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Groups Display */}
              <div className="space-y-6">
                {results.groups.slice(0, 5).map((group) => (
                  <div
                    key={group.id}
                    className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {group.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {group.members.length} members • {Math.round(group.groupCompatibility * 100)}% compatibility
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <span className="px-2 py-1 bg-purple-200 text-purple-800 rounded text-xs font-medium">
                          Diversity: {Math.round(group.groupDynamics.diversity * 100)}%
                        </span>
                        <span className="px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-medium">
                          Cohesion: {Math.round(group.groupDynamics.cohesion * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Common Genres */}
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Common Interests:</p>
                      <div className="flex flex-wrap gap-2">
                        {group.commonGenres.map((genre, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-white text-purple-700 rounded text-xs font-medium border border-purple-300"
                          >
                            {genre}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        🎵 {group.recommendations.playlist}
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {group.recommendations.activities.slice(0, 2).map((activity, index) => (
                          <li key={index}>• {activity}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {results.groups.length > 5 && (
                <p className="text-center text-gray-600 mt-6">
                  ... and {results.groups.length - 5} more groups
                </p>
              )}
            </div>
          )}
        </div>

        {/* Data Preview Modal */}
        {showPreview && filePreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-4xl max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-900">CSV Data Preview</h3>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  File: <span className="font-medium">{file?.name}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Size: <span className="font-medium">{file ? (file.size / 1024).toFixed(1) : 0} KB</span>
                </p>
                <p className="text-sm text-gray-600">
                  Showing first 5 rows
                </p>
              </div>

              {filePreview.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {filePreview[0].map((header, index) => (
                          <th key={index} className="px-4 py-2 border-b text-left text-sm font-medium text-gray-900">
                            {header || `Column ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filePreview.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 border-b text-sm text-gray-700">
                              {cell || '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <div className="text-sm text-gray-600">
                  Make sure your CSV includes Email, First Name, and Last Name columns
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false)
                      // Auto-trigger form submission if file looks good
                      const form = document.querySelector('form') as HTMLFormElement
                      if (form) form.requestSubmit()
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Process Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
