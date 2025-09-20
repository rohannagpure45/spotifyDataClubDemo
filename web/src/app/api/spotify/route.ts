import { NextRequest, NextResponse } from 'next/server';

// Mock data for demonstration
const mockSongs = [
  {
    id: '1',
    name: 'Anti-Hero',
    artist: 'Taylor Swift',
    energy: 0.73,
    valence: 0.67,
    danceability: 0.74,
    tempo: 97,
    genre: 'Pop',
    user: { name: 'Alex', major: 'Computer Science', timestamp: new Date().toISOString() }
  },
  {
    id: '2',
    name: 'As It Was',
    artist: 'Harry Styles',
    energy: 0.58,
    valence: 0.69,
    danceability: 0.75,
    tempo: 109,
    genre: 'Pop Rock',
    user: { name: 'Sarah', major: 'Psychology', timestamp: new Date(Date.now() - 15000).toISOString() }
  },
  {
    id: '3',
    name: 'Unholy',
    artist: 'Sam Smith',
    energy: 0.81,
    valence: 0.33,
    danceability: 0.88,
    tempo: 132,
    genre: 'Pop',
    user: { name: 'Mike', major: 'Business', timestamp: new Date(Date.now() - 32000).toISOString() }
  },
  {
    id: '4',
    name: 'Flowers',
    artist: 'Miley Cyrus',
    energy: 0.70,
    valence: 0.84,
    danceability: 0.71,
    tempo: 96,
    genre: 'Pop',
    user: { name: 'Emma', major: 'Art', timestamp: new Date(Date.now() - 45000).toISOString() }
  }
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'recent':
        // Return recent submissions
        return NextResponse.json({
          success: true,
          data: mockSongs.slice(0, 4),
          count: mockSongs.length
        });

      case 'stats':
        // Return aggregated statistics
        const stats = {
          totalResponses: 42,
          uniqueArtists: 28,
          topGenre: 'Pop',
          genrePercentage: 45,
          averageEnergy: 0.67,
          averageValence: 0.58,
          averageDanceability: 0.72,
          mostCommonTempo: 120,
          topArtist: 'Taylor Swift',
          topArtistCount: 6
        };
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'analysis':
        // Return clustering/analysis data
        const analysisData = {
          clusters: [
            { name: 'Pop Enthusiasts', count: 15, averageEnergy: 0.75, color: '#ff6b6b' },
            { name: 'Chill Vibes', count: 12, averageEnergy: 0.45, color: '#4ecdc4' },
            { name: 'Dance Floor', count: 10, averageEnergy: 0.85, color: '#45b7d1' },
            { name: 'Alternative Mix', count: 5, averageEnergy: 0.60, color: '#f9ca24' }
          ],
          heatmap: [
            { major: 'Computer Science', genre: 'Electronic', value: 8 },
            { major: 'Computer Science', genre: 'Pop', value: 12 },
            { major: 'Psychology', genre: 'Indie', value: 9 },
            { major: 'Psychology', genre: 'Pop', value: 7 },
            { major: 'Business', genre: 'Hip Hop', value: 6 },
            { major: 'Art', genre: 'Alternative', value: 11 }
          ]
        };
        return NextResponse.json({
          success: true,
          data: analysisData
        });

      case 'leaderboard':
        // Return awards and leaderboard data
        const leaderboardData = {
          awards: {
            mostEnergetic: { song: 'HUMBLE.', artist: 'Kendrick Lamar', value: 0.89 },
            happiest: { song: 'Good as Hell', artist: 'Lizzo', value: 0.95 },
            mostDanceable: { song: 'Levitating', artist: 'Dua Lipa', value: 0.88 }
          },
          communityStats: [
            { label: 'Average Energy', value: '0.67', description: 'We like moderately energetic music' },
            { label: 'Average Valence', value: '0.58', description: 'Slightly more positive than negative' },
            { label: 'Average Danceability', value: '0.72', description: 'Our music is quite danceable!' },
            { label: 'Most Common Tempo', value: '120 BPM', description: 'Perfect for jogging' }
          ]
        };
        return NextResponse.json({
          success: true,
          data: leaderboardData
        });

      default:
        return NextResponse.json({
          success: true,
          data: mockSongs
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { song, artist, major, name } = body;

    // In a real app, this would:
    // 1. Call Spotify API to get audio features
    // 2. Store in database
    // 3. Trigger ML analysis updates

    const newEntry = {
      id: String(Date.now()),
      name: song,
      artist,
      energy: Math.random() * 0.5 + 0.5, // Mock values
      valence: Math.random() * 0.5 + 0.4,
      danceability: Math.random() * 0.4 + 0.6,
      tempo: Math.floor(Math.random() * 60) + 90,
      genre: 'Pop', // Would be determined by Spotify API
      user: {
        name,
        major,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json({
      success: true,
      data: newEntry,
      message: 'Song added successfully'
    });
  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add song' },
      { status: 500 }
    );
  }
}