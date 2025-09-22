import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardStats } from '@/components/DashboardStats'
import { ActivityFeed } from '@/components/ActivityFeed'
import { UpcomingScrutineering } from '@/components/UpcomingScrutineering'
import { QuickActions } from '@/components/QuickActions'
import { PassRateChart } from '@/components/PassRateChart'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  // Fetch dashboard data
  const [
    totalTeams,
    totalVehicles,
    todayScrutineering,
    pendingReviews,
    recentActivity,
    upcomingScrutineering,
    passRateData
  ] = await Promise.all([
    prisma.team.count(),
    prisma.vehicle.count(),
    prisma.scrutineering.count({
      where: {
        scheduledAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        }
      }
    }),
    prisma.scrutineering.count({
      where: {
        overallResult: 'PENDING'
      }
    }),
    prisma.comment.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, role: true } },
        vehicle: { select: { name: true } },
        scrutineering: { 
          select: { 
            vehicle: { select: { name: true } }
          } 
        }
      }
    }),
    prisma.scrutineering.findMany({
      take: 5,
      where: {
        scheduledAt: {
          gte: new Date()
        }
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        vehicle: { 
          select: { 
            name: true, 
            team: { select: { name: true } }
          } 
        },
        scrutineer: { select: { name: true } }
      }
    }),
    // Pass rate data for the last 30 days
    prisma.scrutineering.findMany({
      where: {
        completedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        },
        overallResult: {
          in: ['PASS', 'FAIL']
        }
      },
      select: {
        overallResult: true,
        completedAt: true
      }
    })
  ])

  const stats = {
    totalTeams,
    totalVehicles,
    todayScrutineering,
    pendingReviews
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name}
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your scrutineering operations today.
        </p>
      </div>

      {/* Stats Cards */}
      <DashboardStats stats={stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Upcoming Scrutineering */}
        <div className="lg:col-span-2 space-y-6">
          <UpcomingScrutineering scrutineering={upcomingScrutineering} />
          <PassRateChart data={passRateData} />
        </div>

        {/* Right Column - Activity Feed & Quick Actions */}
        <div className="space-y-6">
          <QuickActions userRole={session.user.role} />
          <ActivityFeed activities={recentActivity} />
        </div>
      </div>
    </div>
  )
}