'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Flag, 
  Timer, 
  Trophy, 
  Loader2,
  Plus,
  Clock,
  MapPin
} from 'lucide-react'
import { Database } from '@/lib/types/database'

const runSchema = z.object({
  team_id: z.string().uuid('Please select a team'),
  driver_id: z.string().uuid().optional(),
  run_number: z.coerce.number().min(1).max(4),
  raw_time: z.coerce.number().min(0, 'Time must be positive'),
  cones_hit: z.coerce.number().min(0).default(0),
  off_course: z.boolean().default(false),
  wrong_direction: z.boolean().default(false),
  notes: z.string().optional()
})

type RunFormData = z.infer<typeof runSchema>

type Team = Database['public']['Tables']['teams']['Row']
type DynamicEventRun = Database['public']['Tables']['dynamic_event_runs']['Row'] & {
  teams?: Team | null
}

export default function AutocrossEventPage() {
  const supabase = createClientComponentClient<Database>()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [runs, setRuns] = useState<DynamicEventRun[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<RunFormData>({
    resolver: zodResolver(runSchema),
    defaultValues: {
      run_number: 1,
      cones_hit: 0,
      off_course: false,
      wrong_direction: false
    }
  })

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        
        // Get current user
        const { data: { user: authUser } } = await supabase.auth.getUser()
        setUser(authUser)

        // Load teams
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('name')

        if (teamsError) throw teamsError
        setTeams(teamsData || [])

        // Load autocross runs for today
        const today = new Date().toISOString().split('T')[0]
        const { data: runsData, error: runsError } = await supabase
          .from('dynamic_event_runs')
          .select(`
            *,
            teams(name, code)
          `)
          .eq('event_type', 'autocross')
          .gte('recorded_at', today)
          .order('recorded_at', { ascending: false })

        if (runsError) throw runsError
        setRuns(runsData || [])

      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const onSubmit = async (data: RunFormData) => {
    if (!user) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      // Calculate penalties
      const conePenalty = data.cones_hit * 2 // 2 seconds per cone
      const offCoursePenalty = data.off_course ? 10 : 0 // 10 seconds for off course
      const wrongDirectionPenalty = data.wrong_direction ? 10 : 0 // 10 seconds for wrong direction
      const totalPenalty = conePenalty + offCoursePenalty + wrongDirectionPenalty
      const correctedTime = data.raw_time + totalPenalty

      const runData = {
        team_id: data.team_id,
        driver_id: data.driver_id || null,
        event_type: 'autocross' as const,
        run_number: data.run_number,
        raw_time: data.raw_time,
        penalties: {
          cones: data.cones_hit,
          off_course: data.off_course ? 1 : 0,
          wrong_direction: data.wrong_direction ? 1 : 0,
          dsq: false
        },
        corrected_time: correctedTime,
        status: 'completed' as const,
        recorded_by: user.id,
        recorded_at: new Date().toISOString(),
        notes: data.notes,
        weather_conditions: 'Clear'
      }

      const { error: insertError } = await supabase
        .from('dynamic_event_runs')
        .insert(runData)

      if (insertError) throw insertError

      form.reset()
      
      // Refresh runs
      const today = new Date().toISOString().split('T')[0]
      const { data: runsData } = await supabase
        .from('dynamic_event_runs')
        .select(`
          *,
          teams(name, code)
        `)
        .eq('event_type', 'autocross')
        .gte('recorded_at', today)
        .order('recorded_at', { ascending: false })

      setRuns(runsData || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record run')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getBestTimeForTeam = (teamId: string) => {
    const teamRuns = runs.filter(run => run.team_id === teamId && run.corrected_time)
    if (teamRuns.length === 0) return null
    return Math.min(...teamRuns.map(run => run.corrected_time!))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'dsq': return 'bg-red-100 text-red-800'
      case 'dnf': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading autocross event...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-green-100">
            <Flag className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Autocross Event</h1>
            <p className="text-gray-600">Technical course testing overall vehicle dynamics</p>
          </div>
        </div>
        <Badge className="bg-green-100 text-green-800">
          <Clock className="h-4 w-4 mr-1" />
          Event Active
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Record Run */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Record New Run
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="team">Team</Label>
                  <Select onValueChange={(value) => form.setValue('team_id', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.code} - {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.team_id && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.team_id.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="run_number">Run Number</Label>
                  <Select onValueChange={(value) => form.setValue('run_number', parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select run" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Run 1</SelectItem>
                      <SelectItem value="2">Run 2</SelectItem>
                      <SelectItem value="3">Run 3</SelectItem>
                      <SelectItem value="4">Run 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="raw_time">Raw Time (seconds)</Label>
                  <Input
                    id="raw_time"
                    type="number"
                    step="0.001"
                    placeholder="65.432"
                    {...form.register('raw_time', { valueAsNumber: true })}
                  />
                  {form.formState.errors.raw_time && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.raw_time.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cones_hit">Cones Hit</Label>
                  <Input
                    id="cones_hit"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...form.register('cones_hit', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-gray-500">+2 seconds penalty per cone</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="off_course"
                      {...form.register('off_course')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="off_course" className="text-sm">
                      Off Course (+10 seconds)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="wrong_direction"
                      {...form.register('wrong_direction')}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="wrong_direction" className="text-sm">
                      Wrong Direction (+10 seconds)
                    </Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional notes..."
                    {...form.register('notes')}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <Timer className="h-4 w-4 mr-2" />
                      Record Run
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Today's Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No runs recorded yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Run #</TableHead>
                      <TableHead>Raw Time</TableHead>
                      <TableHead>Penalties</TableHead>
                      <TableHead>Final Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">
                          {run.teams?.code} - {run.teams?.name}
                        </TableCell>
                        <TableCell>{run.run_number}</TableCell>
                        <TableCell>{run.raw_time?.toFixed(3)}s</TableCell>
                        <TableCell>
                          {run.penalties && typeof run.penalties === 'object' ? (
                            <div className="text-xs">
                              {(run.penalties as any).cones > 0 && (
                                <div>Cones: +{(run.penalties as any).cones * 2}s</div>
                              )}
                              {(run.penalties as any).off_course > 0 && (
                                <div>Off Course: +10s</div>
                              )}
                              {(run.penalties as any).wrong_direction > 0 && (
                                <div>Wrong Dir: +10s</div>
                              )}
                              {(run.penalties as any).cones === 0 && 
                               (run.penalties as any).off_course === 0 && 
                               (run.penalties as any).wrong_direction === 0 && (
                                <div>None</div>
                              )}
                            </div>
                          ) : (
                            'None'
                          )}
                        </TableCell>
                        <TableCell className="font-bold">
                          {run.corrected_time?.toFixed(3)}s
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(run.status)}>
                            {run.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {new Date(run.recorded_at!).toLocaleTimeString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Best Times Summary */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Best Times by Team</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {teams.map((team) => {
                  const bestTime = getBestTimeForTeam(team.id)
                  return (
                    <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <span className="font-medium">{team.code}</span>
                        <span className="text-gray-600 ml-2">{team.name}</span>
                      </div>
                      <div className="text-right">
                        {bestTime ? (
                          <span className="font-bold text-lg">{bestTime.toFixed(3)}s</span>
                        ) : (
                          <span className="text-gray-400">No runs</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Course Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Course Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Course Length:</span>
                  <span className="ml-2">~1000m</span>
                </div>
                <div>
                  <span className="font-medium">Max Speed:</span>
                  <span className="ml-2">~80 km/h</span>
                </div>
                <div>
                  <span className="font-medium">Turns:</span>
                  <span className="ml-2">15-25</span>
                </div>
                <div>
                  <span className="font-medium">Surface:</span>
                  <span className="ml-2">Asphalt</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}