import { NextResponse } from 'next/server'

interface ImportedResponse {
  id: string
  timestamp: string
  name: string
  email: string
  major: string
  favoriteSong: string
  artist: string
  genres: string[]
  audioFeatures?: {
    energy: number
    valence: number
    danceability: number
    tempo: number
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { url } = body

    // Extract sheet ID from various Google Sheets/Forms URL formats
    let sheetId: string | null = null

    // Try to extract sheet ID from URL
    const patterns = [
      /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
      /[?&]id=([a-zA-Z0-9-_]+)/,
      /\/forms\/d\/([a-zA-Z0-9-_]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        sheetId = match[1]
        break
      }
    }

    if (!sheetId) {
      return NextResponse.json({
        success: false,
        error: 'Invalid Google Sheets/Forms URL'
      }, { status: 400 })
    }

    // Simulate importing data from Google Sheets
    // In production, this would use Google Sheets API
    const mockResponses: ImportedResponse[] = [
      {
        id: 'resp-1',
        timestamp: new Date().toISOString(),
        name: 'Emma Wilson',
        email: 'emma.w@university.edu',
        major: 'Data Science',
        favoriteSong: 'Blinding Lights',
        artist: 'The Weeknd',
        genres: ['Synthpop', 'R&B', 'Electronic'],
        audioFeatures: {
          energy: 0.79,
          valence: 0.33,
          danceability: 0.51,
          tempo: 171
        }
      },
      {
        id: 'resp-2',
        timestamp: new Date().toISOString(),
        name: 'James Chen',
        email: 'j.chen@university.edu',
        major: 'Computer Science',
        favoriteSong: 'Starboy',
        artist: 'The Weeknd ft. Daft Punk',
        genres: ['Electronic', 'R&B', 'Pop'],
        audioFeatures: {
          energy: 0.59,
          valence: 0.49,
          danceability: 0.68,
          tempo: 186
        }
      },
      {
        id: 'resp-3',
        timestamp: new Date().toISOString(),
        name: 'Sofia Rodriguez',
        email: 's.rodriguez@university.edu',
        major: 'Psychology',
        favoriteSong: 'Flowers',
        artist: 'Miley Cyrus',
        genres: ['Pop', 'Dance', 'Disco'],
        audioFeatures: {
          energy: 0.68,
          valence: 0.64,
          danceability: 0.71,
          tempo: 118
        }
      },
      {
        id: 'resp-4',
        timestamp: new Date().toISOString(),
        name: 'Michael Kim',
        email: 'm.kim@university.edu',
        major: 'Business',
        favoriteSong: 'Anti-Hero',
        artist: 'Taylor Swift',
        genres: ['Pop', 'Alternative', 'Indie'],
        audioFeatures: {
          energy: 0.64,
          valence: 0.53,
          danceability: 0.64,
          tempo: 97
        }
      },
      {
        id: 'resp-5',
        timestamp: new Date().toISOString(),
        name: 'Aisha Patel',
        email: 'a.patel@university.edu',
        major: 'Music',
        favoriteSong: 'As It Was',
        artist: 'Harry Styles',
        genres: ['Pop Rock', 'Synthpop', 'Indie'],
        audioFeatures: {
          energy: 0.52,
          valence: 0.66,
          danceability: 0.52,
          tempo: 174
        }
      }
    ]

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      success: true,
      count: mockResponses.length,
      responses: mockResponses,
      sheetId,
      message: `Successfully imported ${mockResponses.length} responses from Google Sheets`
    })
  } catch (error) {
    console.error('Error importing from Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to import from Google Sheets'
    }, { status: 500 })
  }
}