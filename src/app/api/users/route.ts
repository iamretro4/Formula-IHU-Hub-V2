import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, hasMinimumRole } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role') as UserRole | null

    const where: any = {}

    if (role) {
      where.role = role
    }

    // Only admins can see all users, others see limited info
    const select = session.user.role === UserRole.ADMIN 
      ? {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        }
      : {
          id: true,
          name: true,
          role: true,
        }

    const users = await prisma.user.findMany({
      where,
      select,
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Users GET error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}