import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || ''
  const defaults = ['nagpure.r@northeastern.edu']
  const parsed = raw
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)
  return Array.from(new Set([...defaults, ...parsed]))
}

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  const admins = getAdminEmails()
  const isAdmin = !!email && admins.includes(email)
  return NextResponse.json({ success: true, isAdmin, email })
}

