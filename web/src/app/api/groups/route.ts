import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.max(1, Math.min(100, parseInt(limitParam))) : 50
    const sinceParam = searchParams.get('since')
    const includeCsv = searchParams.get('includeCsv') === 'true'
    const publicScope = searchParams.get('public') === 'true'

    const where: any = publicScope ? {} : { userId: session.user.id }
    if (sinceParam) {
      const sinceDate = new Date(sinceParam)
      if (!isNaN(sinceDate.getTime())) {
        where.createdAt = { gte: sinceDate }
      }
    }

    const rows = await prisma.group.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const groups = rows.map((g) => ({
      id: g.id,
      name: g.name,
      createdAt: g.createdAt,
      compatibility: g.compatibility,
      members: safeParseJSON(g.members, []),
      commonGenres: safeParseJSON(g.commonGenres, []),
      recommendations: safeParseJSON(g.recommendations, {}),
      ...(includeCsv ? { csvContent: g.csvContent || null } : {})
    }))

    return NextResponse.json({ success: true, count: groups.length, groups })
  } catch (error) {
    console.error('GET /api/groups error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch groups' }, { status: 500 })
  }
}

function safeParseJSON<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
