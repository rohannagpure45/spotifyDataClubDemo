import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Admin endpoint to reset database for demo purposes
export async function POST() {
  try {
    // Check if user is admin (you can add more sophisticated admin checks)
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Only allow specific admin emails (add your email here)
    const adminEmails = ['nagpure.r@northeastern.edu', 'admin@university.edu']
    if (!adminEmails.includes(session.user.email)) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Clear all data except the admin user account
    const results = {
      groups: 0,
      submissions: 0,
      formResponses: 0,
      analysisResults: 0,
      autoCreatedUsers: 0
    }

    // Delete all groups
    const deleteGroups = await prisma.group.deleteMany()
    results.groups = deleteGroups.count

    // Delete all music submissions
    const deleteSubmissions = await prisma.musicSubmission.deleteMany()
    results.submissions = deleteSubmissions.count

    // Delete all form responses
    const deleteFormResponses = await prisma.formResponse.deleteMany()
    results.formResponses = deleteFormResponses.count

    // Delete all analysis results
    const deleteAnalysis = await prisma.analysisResult.deleteMany()
    results.analysisResults = deleteAnalysis.count

    // Delete auto-created users (keep admin accounts)
    const deleteUsers = await prisma.user.deleteMany({
      where: {
        autoCreated: true
      }
    })
    results.autoCreatedUsers = deleteUsers.count

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully',
      deleted: results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Database reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset database' },
      { status: 500 }
    )
  }
}

// GET endpoint to check reset status
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false })
    }

    const adminEmails = ['nagpure.r@northeastern.edu', 'admin@university.edu']
    const isAdmin = adminEmails.includes(session.user.email)

    // Get current data counts
    const counts = {
      users: await prisma.user.count(),
      groups: await prisma.group.count(),
      submissions: await prisma.musicSubmission.count(),
      formResponses: await prisma.formResponse.count()
    }

    return NextResponse.json({
      isAdmin,
      currentData: counts,
      canReset: isAdmin && (counts.groups > 0 || counts.submissions > 0)
    })

  } catch (error) {
    console.error('Admin check error:', error)
    return NextResponse.json({ isAdmin: false })
  }
}