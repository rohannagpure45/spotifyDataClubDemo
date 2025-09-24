import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  buildMembersFromUsers,
  calculateCompatibilities,
  formOptimizedGroups,
  generateCSV,
  type OptimizedGroup,
  type ProcessedMember,
  
} from '@/lib/music-utils'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const groupSize = typeof body.groupSize === 'number' && body.groupSize > 1 ? Math.min(8, Math.max(3, body.groupSize)) : 4
    const replace = Boolean(body.replace)

    let members: ProcessedMember[] = []

    // Load real users with music submissions
    const usersWithMusic = await prisma.user.findMany({
      where: { submissions: { some: {} } },
      include: { submissions: true }
    })

    if (usersWithMusic.length > 0) {
      members = buildMembersFromUsers(usersWithMusic)
    } else {
      return NextResponse.json({
        success: false,
        error: 'No users with music submissions found. Import data via Google Sheets or submit music first.',
        hint: 'Process your Google Forms data first to create groups from real submissions.'
      }, { status: 400 })
    }

    // Compute compatibilities and form groups
    calculateCompatibilities(members)
    const groups = formOptimizedGroups(members, groupSize)

    // Persist groups (always use real data)
    try {
      if (replace) {
        await prisma.group.deleteMany({ where: { userId: session.user.id } })
      }
      for (const g of groups) {
        const serializedMembers = g.members.map(m => ({
          userId: m.userId || m.id,
          name: m.name,
          major: m.major,
          musicProfile: {
            topGenres: m.musicProfile.topGenres,
            listeningStyle: m.musicProfile.listeningStyle
          }
        }))
        await prisma.group.create({
          data: {
            userId: session.user.id,
            name: g.name,
            members: JSON.stringify(serializedMembers),
            compatibility: g.groupCompatibility,
            commonGenres: JSON.stringify(g.commonGenres),
            recommendations: JSON.stringify(g.recommendations)
          }
        })
      }
    } catch (e) {
      throw e
    }

    // Prepare response payload similar to Google Forms processing
    const csvContent = generateCSV(groups)
    const responsePayload = {
      success: true,
      groups,
      totalGroups: groups.length,
      averageCompatibility: groups.reduce((s, g) => s + g.groupCompatibility, 0) / (groups.length || 1),
      csvContent,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('POST /api/groups/create error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create groups' }, { status: 500 })
  }
}
