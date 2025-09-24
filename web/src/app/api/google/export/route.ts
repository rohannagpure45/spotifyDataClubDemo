import { NextResponse } from 'next/server'

interface GroupMember {
  userId: string
  username: string
  major: string
  topGenres: string[]
  role: string
}

interface MusicGroup {
  id: string
  name: string
  members: GroupMember[]
  compatibility: number
  sharedInterests: string[]
  playlistSuggestion: string
  meetingIdeas: string[]
}

function generateCSVContent(groups: MusicGroup[]): string {
  const headers = [
    'Group Name',
    'Group ID',
    'Compatibility Score',
    'Member Name',
    'Major',
    'Top Genres',
    'Role',
    'Shared Interests',
    'Playlist Suggestion',
    'Meeting Ideas'
  ]

  const rows: string[][] = [headers]

  groups.forEach(group => {
    group.members.forEach((member, index) => {
      rows.push([
        index === 0 ? group.name : '', // Only show group name for first member
        index === 0 ? group.id : '',
        index === 0 ? `${Math.round(group.compatibility * 100)}%` : '',
        member.username,
        member.major,
        member.topGenres.join('; '),
        member.role,
        index === 0 ? group.sharedInterests.join('; ') : '',
        index === 0 ? group.playlistSuggestion : '',
        index === 0 ? group.meetingIdeas.join('; ') : ''
      ])
    })
    // Add empty row between groups
    rows.push(['', '', '', '', '', '', '', '', '', ''])
  })

  // Convert to CSV format
  return rows.map(row =>
    row.map(cell =>
      cell.includes(',') || cell.includes('"') || cell.includes('\n')
        ? `"${cell.replace(/"/g, '""')}"`
        : cell
    ).join(',')
  ).join('\n')
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { groups } = body

    if (!groups || groups.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No groups to export'
      }, { status: 400 })
    }

    // Generate CSV content
    const csvContent = generateCSVContent(groups)

    // In a real implementation, this would:
    // 1. Use Google Sheets API to create a new spreadsheet
    // 2. Populate it with the group data
    // 3. Return the shareable link

    // Create a summary for the sheet
    const summary = {
      totalGroups: groups.length,
      totalMembers: groups.reduce((sum: number, g: MusicGroup) => sum + g.members.length, 0),
      averageCompatibility: Math.round(
        (groups.reduce((sum: number, g: MusicGroup) => sum + g.compatibility, 0) / groups.length) * 100
      ),
      timestamp: new Date().toISOString()
    }

    // In production, you would actually create the Google Sheet here
    // For now, only return the CSV content and summary
    return NextResponse.json({
      success: true,
      summary,
      csvContent: csvContent, // Include CSV for download option
      message: `Generated CSV for ${groups.length} groups`
    })
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to export to Google Sheets'
    }, { status: 500 })
  }
}
