'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Timer, 
  Trophy, 
  Flag, 
  Zap, 
  RotateCcw, 
  MapPin,
  Users,
  Clock,
  TrendingUp
} from 'lucide-react'

interface EventStats {
  totalRuns: number
  activeEvents: number
  teamsParticipating: number
  averageTime: number
}

export default function TrackEventsPage() {
  const [stats, setStats] = useState<EventStats>({
    totalRuns: 0,
    activeEvents: 0,
    teamsParticipating: 0,
    averageTime: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadStats() {
      try {
        // Get total runs today
        const { data: runs } = await supabase
          .from('dynamic_event_runs')
          .select('*')
          .gte('recorded_at', new Date().toISOString().split('T')[0])

        // Get active track sessions
        const { data: sessions } = await supabase
          .from('track_sessions')
          .select('*')
          .eq('status', 'active')

        // Get unique teams participating today
        const { data: teams } = await supabase
          .from('dynamic_event_runs')
          .select('team_id')
          .gte('recorded_at', new Date().toISOString().split('T')[0])

        const uniqueTeams = new Set(teams?.map(t => t.team_id) || [])
        const avgTime = runs?.length ? 
          runs.reduce((sum, run) => sum + (run.corrected_time || 0), 0) / runs.length : 0

        setStats({
          totalRuns: runs?.length || 0,
          activeEvents: sessions?.length || 0,
          teamsParticipating: uniqueTeams.size,
          averageTime: avgTime
        })
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
    const interval = setInterval(loadStats, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [supabase])

  const eventTypes = [
    {
      id: 'acceleration',
      name: 'Acceleration',
      description: '75m straight line acceleration test',
      icon: <Zap className="h-6 w-6" />,
      color: 'bg-yellow-100 text-yellow-800',
      href: '/track/acceleration'
    },
    {
      id: 'skidpad',
      name: 'Skidpad',
      description: 'Figure-8 handling test on 15.25m diameter circles',
      icon: <RotateCcw className="h-6 w-6" />,
      color: 'bg-blue-100 text-blue-800',
      href: '/track/skidpad'
    },
    {
      id: 'autocross',
      name: 'Autocross',
      description: 'Technical course testing overall vehicle dynamics',
      icon: <Flag className="h-6 w-6" />,
      color: 'bg-green-100 text-green-800',
      href: '/track/autocross'
    },
    {
      id: 'endurance',
      name: 'Endurance',
      description: '22km endurance race with driver change',
      icon: <Trophy className="h-6 w-6" />,
      color: 'bg-purple-100 text-purple-800',
      href: '/track/endurance'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Track Events</h1>
          <p className="text-gray-600">Manage dynamic events and track sessions</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/track/marshal">
              <MapPin className="h-4 w-4 mr-2" />
              Track Marshal
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/track/results">
              <TrendingUp className="h-4 w-4 mr-2" />
              Live Results
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-blue-100">
                <Timer className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Runs Today</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : stats.totalRuns}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-green-100">
                <Flag className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : stats.activeEvents}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Teams Participating</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : stats.teamsParticipating}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-lg bg-orange-100">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {isLoading ? '...' : `${stats.averageTime.toFixed(2)}s`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {eventTypes.map((event) => (
          <Card key={event.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${event.color}`}>
                  {event.icon}
                </div>
                <Badge variant="outline">Active</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-2">{event.name}</CardTitle>
              <p className="text-sm text-gray-600 mb-4">{event.description}</p>
              <Button asChild className="w-full">
                <Link href={event.href}>
                  Manage Event
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Track Marshal Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/track/marshal/session">
                <Timer className="h-4 w-4 mr-2" />
                Start Track Session
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/track/marshal/incident">
                <Flag className="h-4 w-4 mr-2" />
                Report Incident
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/track/marshal/weather">
                <Clock className="h-4 w-4 mr-2" />
                Update Conditions
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full justify-start">
              <Link href="/track/scoring">
                <Trophy className="h-4 w-4 mr-2" />
                Live Scoring
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/track/penalties">
                <Flag className="h-4 w-4 mr-2" />
                Penalty Management
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link href="/track/results/export">
                <TrendingUp className="h-4 w-4 mr-2" />
                Export Results
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}