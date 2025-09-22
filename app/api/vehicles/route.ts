import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { vehicleSchema } from '@/lib/validators'
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
    const teamId = searchParams.get('teamId')

    const where: any = {}

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { chassisNumber: { contains: search, mode: 'insensitive' } },
        { team: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (teamId) {
      where.teamId = teamId
    }

    // Team users can only see their team's vehicles
    if (session.user.role === UserRole.TEAM_USER) {
      const userTeams = await prisma.team.findMany({
        where: {
          members: {
            some: { id: session.user.id }
          }
        },
        select: { id: true }
      })
      
      where.teamId = {
        in: userTeams.map(team => team.id)
      }
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            country: true,
          }
        },
        scrutineerings: {
          select: {
            id: true,
            scheduledAt: true,
            overallResult: true,
            completedAt: true,
          },
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            scrutineerings: true,
            documents: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    console.error('Vehicles GET error:', error)
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

    // Only team users and admins can create vehicles
    if (!hasMinimumRole(session.user.role, UserRole.TEAM_USER)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { teamId, ...vehicleData } = body
    const validatedData = vehicleSchema.parse(vehicleData)

    // Verify team exists and user has access
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { id: true } }
      }
    })

    if (!team) {
      return NextResponse.json(
        { message: 'Team not found' },
        { status: 404 }
      )
    }

    // Check if user is member of the team (unless admin)
    if (session.user.role !== UserRole.ADMIN) {
      const isMember = team.members.some(member => member.id === session.user.id)
      if (!isMember) {
        return NextResponse.json(
          { message: 'You can only create vehicles for your own team' },
          { status: 403 }
        )
      }
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        ...validatedData,
        teamId,
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            country: true,
          }
        }
      }
    })

    return NextResponse.json(vehicle, { status: 201 })
  } catch (error) {
    console.error('Vehicles POST error:', error)
    
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