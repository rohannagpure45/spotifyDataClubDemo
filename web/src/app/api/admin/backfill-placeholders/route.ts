import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type BackfillResult = {
  scannedUsers: number
  updatedUsers: number
  details: Array<{
    userId: string
    email: string
    updated: Partial<{ name: string; major: string; year: string }>
  }>
}

function parseJSONSafe<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || ''
  const defaults = ['nagpure.r@northeastern.edu']
  const parsed = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([...defaults, ...parsed]))
}

function isPlaceholder(value: string | null | undefined, placeholders: string[]): boolean {
  if (!value) return true
  return placeholders.includes(value)
}

function getCaseInsensitive<T extends object>(obj: any, key: string): any {
  if (!obj) return undefined
  const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase())
  return found ? (obj as any)[found] : undefined
}

export async function GET() {
  const totalUsers = await prisma.user.count()
  const placeholders = await prisma.user.count({
    where: {
      OR: [
        { major: { equals: 'Undeclared' } },
        { year: { equals: 'Unknown' } },
        { name: null }
      ]
    }
  })
  return NextResponse.json({ success: true, totalUsers, placeholders })
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 })
  }
  const admins = getAdminEmails()
  const caller = session.user.email.toLowerCase()
  if (!admins.includes(caller)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const users = await prisma.user.findMany()
  let updated = 0
  const details: BackfillResult['details'] = []

  for (const user of users) {
    const needsName = !user.name
    const needsMajor = isPlaceholder(user.major, ['Undeclared'])
    const needsYear = isPlaceholder(user.year, ['Unknown'])
    if (!needsName && !needsMajor && !needsYear) continue

    const latestForm = await prisma.formResponse.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    if (!latestForm) continue

    const form = parseJSONSafe<Record<string, any>>(latestForm.formData)
    if (!form) continue

    const updates: Record<string, any> = {}
    const name = getCaseInsensitive(form, 'name')
    const major = getCaseInsensitive(form, 'major')
    const year = getCaseInsensitive(form, 'year')

    if (needsName && name) updates.name = String(name)
    if (needsMajor && major) updates.major = String(major)
    if (needsYear && year) updates.year = String(year)

    if (Object.keys(updates).length > 0) {
      await prisma.user.update({ where: { id: user.id }, data: updates })
      updated++
      details.push({ userId: user.id, email: user.email, updated: updates })
    }
  }

  const result: BackfillResult = {
    scannedUsers: users.length,
    updatedUsers: updated,
    details
  }
  return NextResponse.json({ success: true, ...result })
}
