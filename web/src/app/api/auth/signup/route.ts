import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { email, password, name, major, year } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser && !existingUser.autoCreated) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    let user
    if (existingUser && existingUser.autoCreated) {
      // Update auto-created user with credentials
      user = await prisma.user.update({
        where: { email },
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
          email,
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
        email: user.email,
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