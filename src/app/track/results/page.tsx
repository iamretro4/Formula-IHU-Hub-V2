'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy, 
  Download, 
  Zap, 
  RotateCcw, 
  Flag, 
  Battery,
  Loader2,
  Medal,
  TrendingUp
} from 'lucide-react'
import { Database } from '@/lib/types/database'

type Team = Database['public']['Tables']['teams']['Row']
type DynamicEventRun = Database['public']['Tables']['dynamic_event_runs']['Row'] & {
  teams?: Team | null
}
type EfficiencyResult = Database['public']['Tables']['efficiency_results']['Row'] & {
  teams?: Team | null
}

interface EventResults {
  acceleration: DynamicEventRun[]
  skidpad: DynamicEventRun[]
  autocross: DynamicEventRun[]
  endurance: EfficiencyResult[]
}

export default function TrackResultsPage() {
  const supabase = createClientComponentClient<Database>()
  const [results, setResults] = useState<EventResults>({
    acceleration: [],
    skidpad: [],
    autocross: [],
    endurance: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResults() {
      try {
        setIsLoading(true)
        
        // Load all dynamic event runs
        const { data: runsData, error: runsError } = await supabase
          .from('dynamic_event_runs')
          .select(`
            *,
            teams(name, code, vehicle_class)
          `)
          .order('corrected_time')

        if (runsError) throw runsError

        // Load endurance/efficiency results
        const { data: enduranceData, error: enduranceError } = await supabase
          .from('efficiency_results')
          .select(`
            *,
            teams(name, code, vehicle_class)
          `)
          .order('combined_endurance_efficiency_points', { ascending: false })

        if (enduranceError) throw enduranceError

        // Group runs by event type and get best times
        const groupedRuns = (runsData || []).reduce((acc, run) => {
          if (!acc[run.event_type]) acc[run.event_type] = []
          acc[run.event_type].push(run)
          return acc
        }, {} as Record<string, DynamicEventRun[]>)

        // Get best time per team for each event
        const getBestTimes = (runs: DynamicEventRun[]) => {
          const teamBestTimes = new Map<string, DynamicEventRun>()
          
          runs.forEach(run => {
            if (!run.corrected_time) return
            const existing = teamBestTimes.get(run.team_id)
            if (!existing || run.corrected_time < existing.corrected_time!) {
              teamBestTimes.set(run.team_id, run)
            }
          })
          
          return Array.from(teamBestTimes.values()).sort((a, b) => 
            (a.corrected_time || 0) - (b.corrected_time || 0)
          )
        }

        setResults({
          acceleration: getBestTimes(groupedRuns.acceleration || []),
          skidpad: getBestTimes(groupedRuns.skidpad || []),
          autocross: getBestTimes(groupedRuns.autocross || []),
          endurance: enduranceData || []
        })

      } catch (err) {
        console.error('Error loading results:', err)
        setError(err instanceof Error ? err.message : 'Failed to load results')
      } finally {
        setIsLoading(false)
      }
    }

    loadResults()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadResults, 30000)
    return () => clearInterval(interval)
  }, [supabase])

  const exportResults = () => {
    // Simple CSV export
    const csvData = []
    csvData.push(['Event', 'Position', 'Team', 'Code', 'Class', 'Time/Points', 'Status'])
    
    // Add acceleration results
    results.acceleration.forEach((run, index) => {
      csvData.push([
        'Acceleration',
        (index + 1).toString(),
        run.teams?.name || '',
        run.teams?.code || '',
        run.teams?.vehicle_class || '',
        `${run.corrected_time?.toFixed(3)}s`,
        run.status
      ])
    })

    // Add other events...
    
    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `track-results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Medal className="h-4 w-4 text-yellow-500" />
    if (position === 2) return <Medal className="h-4 w-4 text-gray-400" />
    if (position === 3) return <Medal className="h-4 w-4 text-orange-600" />
    return <span className="text-sm font-bold">{position}</span>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading results...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-100">
            <TrendingUp className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Live Track Results</h1>
            <p className="text-gray-600">Real-time results from all dynamic events</p>
          </div>
        </div>
        <Button onClick={exportResults}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Tabs defaultValue="acceleration" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="acceleration" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Acceleration
          </TabsTrigger>
          <TabsTrigger value="skidpad" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Skidpad
          </TabsTrigger>
          <TabsTrigger value="autocross" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Autocross
          </TabsTrigger>
          <TabsTrigger value="endurance" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Endurance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="acceleration">
          <Card>
            <CardHeader>
              <CardTitle>Acceleration Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Best Time</TableHead>
                    <TableHead>Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.acceleration.map((run, index) => (
                    <TableRow key={run.id}>
                      <TableCell className="flex items-center gap-2">
                        {getPositionBadge(index + 1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {run.teams?.code} - {run.teams?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={run.teams?.vehicle_class === 'EV' ? 'default' : 'secondary'}>
                          {run.teams?.vehicle_class}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {run.corrected_time?.toFixed(3)}s
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {index === 0 ? '-' : 
                          `+${((run.corrected_time || 0) - (results.acceleration[0]?.corrected_time || 0)).toFixed(3)}s`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skidpad">
          <Card>
            <CardHeader>
              <CardTitle>Skidpad Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Best Time</TableHead>
                    <TableHead>Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.skidpad.map((run, index) => (
                    <TableRow key={run.id}>
                      <TableCell className="flex items-center gap-2">
                        {getPositionBadge(index + 1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {run.teams?.code} - {run.teams?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={run.teams?.vehicle_class === 'EV' ? 'default' : 'secondary'}>
                          {run.teams?.vehicle_class}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {run.corrected_time?.toFixed(3)}s
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {index === 0 ? '-' : 
                          `+${((run.corrected_time || 0) - (results.skidpad[0]?.corrected_time || 0)).toFixed(3)}s`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="autocross">
          <Card>
            <CardHeader>
              <CardTitle>Autocross Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Best Time</TableHead>
                    <TableHead>Gap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.autocross.map((run, index) => (
                    <TableRow key={run.id}>
                      <TableCell className="flex items-center gap-2">
                        {getPositionBadge(index + 1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {run.teams?.code} - {run.teams?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={run.teams?.vehicle_class === 'EV' ? 'default' : 'secondary'}>
                          {run.teams?.vehicle_class}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {run.corrected_time?.toFixed(3)}s
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {index === 0 ? '-' : 
                          `+${((run.corrected_time || 0) - (results.autocross[0]?.corrected_time || 0)).toFixed(3)}s`
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endurance">
          <Card>
            <CardHeader>
              <CardTitle>Endurance + Efficiency Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Energy</TableHead>
                    <TableHead>Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.endurance.map((result, index) => (
                    <TableRow key={result.id}>
                      <TableCell className="flex items-center gap-2">
                        {getPositionBadge(index + 1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {result.teams?.code} - {result.teams?.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={result.teams?.vehicle_class === 'EV' ? 'default' : 'secondary'}>
                          {result.teams?.vehicle_class}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.endurance_time ? 
                          `${Math.floor(result.endurance_time / 60)}:${(result.endurance_time % 60).toFixed(1).padStart(4, '0')}` :
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Battery className="h-4 w-4 text-green-600" />
                          {result.energy_used?.toFixed(2)} {result.teams?.vehicle_class === 'EV' ? 'kWh' : 'L'}
                        </div>
                      </TableCell>
                      <TableCell className="font-bold text-lg">
                        {result.combined_endurance_efficiency_points?.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Overall Championship Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Overall Championship Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Championship standings will be calculated when all events are completed
          </p>
        </CardContent>
      </Card>
    </div>
  )
}