import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Demo Mode: Auto-resolve email conflicts by generating unique variations
const generateUniqueEmail = async (baseEmail: string): Promise<string> => {
  let testEmail = baseEmail
  let counter = 1

  while (true) {
    const existing = await prisma.user.findUnique({ where: { email: testEmail } })
    if (!existing || existing.autoCreated) {
      return testEmail
    }

    // Generate demo email with number suffix
    const [localPart, domain] = baseEmail.split('@')
    testEmail = `${localPart}+${counter}@${domain}`
    counter++

    // Safety limit to prevent infinite loops
    if (counter > 100) {
      testEmail = `demo_${Date.now()}@${domain}`
      break
    }
  }

  return testEmail
}

export async function POST(request: Request) {
  try {
    const { email, password, name, major, year } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Demo Mode: Generate unique email to prevent conflicts in demo environment
    const finalEmail = await generateUniqueEmail(email)

    // Check if user already exists (should now be auto-created or non-existent)
    const existingUser = await prisma.user.findUnique({
      where: { email: finalEmail }
    })

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    let user
    if (existingUser && existingUser.autoCreated) {
      // Update auto-created user with credentials
      user = await prisma.user.update({
        where: { email: finalEmail },
        data: {
          password: hashedPassword,
          name: name || existingUser.name,
          major: major || existingUser.major,
          year: year || existingUser.year,
          autoCreated: false
        }
      })
    } else {
      // Create new user (major and year will be populated from Google Forms)
      user = await prisma.user.create({
        data: {
          email: finalEmail,
          password: hashedPassword,
          name,
          major: major || null,
          year: year || null,
          autoCreated: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        email: finalEmail, // Return actual stored email for proper authentication
        name: user.name,
        major: user.major,
        year: user.year
      }
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}