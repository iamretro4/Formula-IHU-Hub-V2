import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scrutineeringSchema } from '@/lib/validators'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    // Only scrutineers, judges, and admins can view scrutineering
    if (!hasMinimumRole(session.user.role, UserRole.SCRUTINEER)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const vehicleId = searchParams.get('vehicleId')
    const scrutineerId = searchParams.get('scrutineerId')

    const where: any = {}

    if (status) {
      where.overallResult = status
    }

    if (vehicleId) {
      where.vehicleId = vehicleId
    }

    if (scrutineerId) {
      where.scrutineerId = scrutineerId
    }

    const scrutineerings = await prisma.scrutineering.findMany({
      where,
      include: {
        vehicle: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                country: true,
              }
            }
          }
        },
        scrutineer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        items: {
          select: {
            id: true,
            key: true,
            label: true,
            status: true,
          }
        },
        _count: {
          select: {
            items: true,
            comments: true,
          }
        }
      },
      orderBy: { scheduledAt: 'desc' }
    })

    return NextResponse.json(scrutineerings)
  } catch (error) {
    console.error('Scrutineering GET error:', error)
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

    // Only scrutineers and admins can create scrutineering sessions
    if (!hasMinimumRole(session.user.role, UserRole.SCRUTINEER)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { scrutineerId, ...scrutineeringData } = body
    const validatedData = scrutineeringSchema.parse(scrutineeringData)

    // Verify vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: validatedData.vehicleId }
    })

    if (!vehicle) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Check for scheduling conflicts
    const conflictingSession = await prisma.scrutineering.findFirst({
      where: {
        scheduledAt: new Date(validatedData.scheduledAt),
        location: validatedData.location,
        overallResult: {
          in: ['PENDING', 'IN_PROGRESS']
        }
      }
    })

    if (conflictingSession) {
      return NextResponse.json(
        { message: 'Time slot already booked for this location' },
        { status: 400 }
      )
    }

    // Create scrutineering session
    const scrutineering = await prisma.scrutineering.create({
      data: {
        ...validatedData,
        scheduledAt: new Date(validatedData.scheduledAt),
        scrutineerId: scrutineerId || null,
      },
      include: {
        vehicle: {
          include: {
            team: {
              select: {
                id: true,
                name: true,
                country: true,
              }
            }
          }
        },
        scrutineer: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    })

    // Create default checklist items from templates
    const checklistTemplates = await prisma.checklistTemplate.findMany({
      where: { active: true },
      orderBy: { order: 'asc' }
    })

    const checklistItems = checklistTemplates.map(template => ({
      scrutineeringId: scrutineering.id,
      key: template.key,
      label: template.label,
      description: template.description,
      category: template.category,
      requiredEvidence: template.requiresEvidence,
    }))

    await prisma.scrutineerItem.createMany({
      data: checklistItems
    })

    return NextResponse.json(scrutineering, { status: 201 })
  } catch (error) {
    console.error('Scrutineering POST error:', error)
    
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