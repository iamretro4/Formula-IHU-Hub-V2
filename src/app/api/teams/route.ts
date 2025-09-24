import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { teamSchema } from '@/lib/validators'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const country = searchParams.get('country')

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (country) {
      where.country = country
    }

    // Team users can only see their own teams
    if (session.user.role === UserRole.TEAM_USER) {
      where.members = {
        some: { id: session.user.id }
      }
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        vehicles: {
          select: {
            id: true,
            name: true,
            status: true,
          }
        },
        _count: {
          select: {
            vehicles: true,
            members: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Teams GET error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Only team users and admins can create teams
    if (!hasMinimumRole(session.user.role, UserRole.TEAM_USER)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = teamSchema.parse(body)

    // Check if team name already exists
    const existingTeam = await prisma.team.findFirst({
      where: { name: validatedData.name }
    })

    if (existingTeam) {
      return NextResponse.json(
        { message: 'Team with this name already exists' },
        { status: 400 }
      )
    }

    const team = await prisma.team.create({
      data: {
        ...validatedData,
        members: {
          connect: { id: session.user.id }
        }
      },
      include: {
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          }
        },
        vehicles: true,
      }
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    console.error('Teams POST error:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { message: 'Invalid input data' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}