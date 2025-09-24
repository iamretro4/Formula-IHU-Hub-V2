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
  Trophy, 
  Timer, 
  Battery,
  Fuel,
  Loader2,
  Plus,
  Clock,
  Users
} from 'lucide-react'
import { Database } from '@/lib/types/database'

const enduranceSchema = z.object({
  team_id: z.string().uuid('Please select a team'),
  endurance_time: z.coerce.number().min(0, 'Time must be positive'),
  energy_used: z.coerce.number().min(0, 'Energy must be positive'),
  laps_completed: z.coerce.number().min(0),
  driver_change_time: z.coerce.number().min(0).optional(),
  penalties: z.coerce.number().min(0).default(0),
  notes: z.string().optional()
})

type EnduranceFormData = z.infer<typeof enduranceSchema>

type Team = Database['public']['Tables']['teams']['Row']
type EfficiencyResult = Database['public']['Tables']['efficiency_results']['Row'] & {
  teams?: Team | null
}

export default function EnduranceEventPage() {
  const supabase = createClientComponentClient<Database>()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [results, setResults] = useState<EfficiencyResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<EnduranceFormData>({
    resolver: zodResolver(enduranceSchema),
    defaultValues: {
      penalties: 0
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

        // Load endurance results
        const { data: resultsData, error: resultsError } = await supabase
          .from('efficiency_results')
          .select(`
            *,
            teams(name, code, vehicle_class)
          `)
          .order('combined_endurance_efficiency_points', { ascending: false })

        if (resultsError) throw resultsError
        setResults(resultsData || [])

      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const onSubmit = async (data: EnduranceFormData) => {
    if (!user) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      // Calculate efficiency factor and points
      const adjustedTime = data.endurance_time + data.penalties
      const efficiencyFactor = data.energy_used / adjustedTime
      
      // Formula Student efficiency scoring (simplified)
      const maxEfficiencyPoints = 100
      const efficiencyPoints = Math.max(0, maxEfficiencyPoints - (efficiencyFactor * 10))
      
      // Combined endurance + efficiency (max 425 points)
      const endurancePoints = Math.max(0, 300 - (adjustedTime - 1200) / 10) // Simplified
      const combinedPoints = Math.min(425, endurancePoints + efficiencyPoints)

      const resultData = {
        team_id: data.team_id,
        endurance_time: adjustedTime,
        energy_used: data.energy_used,
        efficiency_factor: efficiencyFactor,
        efficiency_points: efficiencyPoints,
        combined_endurance_efficiency_points: combinedPoints,
        updated_at: new Date().toISOString()
      }

      const { error: upsertError } = await supabase
        .from('efficiency_results')
        .upsert(resultData, { onConflict: 'team_id' })

      if (upsertError) throw upsertError

      form.reset()
      
      // Refresh results
      const { data: resultsData } = await supabase
        .from('efficiency_results')
        .select(`
          *,
          teams(name, code, vehicle_class)
        `)
        .order('combined_endurance_efficiency_points', { ascending: false })

      setResults(resultsData || [])

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record result')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading endurance event...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-purple-100">
            <Trophy className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Endurance Event</h1>
            <p className="text-gray-600">22km endurance race with efficiency scoring</p>
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
        {/* Left Column - Record Result */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Record Endurance Result
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
                  <Label htmlFor="endurance_time">Total Time (seconds)</Label>
                  <Input
                    id="endurance_time"
                    type="number"
                    step="0.1"
                    placeholder="1320.5"
                    {...form.register('endurance_time', { valueAsNumber: true })}
                  />
                  {form.formState.errors.endurance_time && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.endurance_time.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="energy_used">Energy Used</Label>
                  <Input
                    id="energy_used"
                    type="number"
                    step="0.01"
                    placeholder="15.5 (kWh for EV, L for CV)"
                    {...form.register('energy_used', { valueAsNumber: true })}
                  />
                  {form.formState.errors.energy_used && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.energy_used.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="laps_completed">Laps Completed</Label>
                  <Input
                    id="laps_completed"
                    type="number"
                    min="0"
                    placeholder="44"
                    {...form.register('laps_completed', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="driver_change_time">Driver Change Time (seconds)</Label>
                  <Input
                    id="driver_change_time"
                    type="number"
                    step="0.1"
                    placeholder="45.2"
                    {...form.register('driver_change_time', { valueAsNumber: true })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penalties">Time Penalties (seconds)</Label>
                  <Input
                    id="penalties"
                    type="number"
                    min="0"
                    placeholder="0"
                    {...form.register('penalties', { valueAsNumber: true })}
                  />
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
                      Record Result
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
                Endurance + Efficiency Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No results recorded yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pos</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Energy Used</TableHead>
                      <TableHead>Efficiency</TableHead>
                      <TableHead>Total Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={result.id}>
                        <TableCell className="font-bold">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div>
                            {result.teams?.code} - {result.teams?.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {result.teams?.vehicle_class}
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.endurance_time ? 
                            `${Math.floor(result.endurance_time / 60)}:${(result.endurance_time % 60).toFixed(1).padStart(4, '0')}` :
                            '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {result.teams?.vehicle_class === 'EV' ? (
                              <Battery className="h-4 w-4 text-green-600" />
                            ) : (
                              <Fuel className="h-4 w-4 text-orange-600" />
                            )}
                            {result.energy_used?.toFixed(2)} {result.teams?.vehicle_class === 'EV' ? 'kWh' : 'L'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {result.efficiency_factor?.toFixed(4)}
                        </TableCell>
                        <TableCell className="font-bold text-lg">
                          {result.combined_endurance_efficiency_points?.toFixed(1)} pts
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Event Information */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Event Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Distance:</span>
                  <span className="ml-2">22 km (44 laps × 500m)</span>
                </div>
                <div>
                  <span className="font-medium">Max Time:</span>
                  <span className="ml-2">22 minutes</span>
                </div>
                <div>
                  <span className="font-medium">Driver Change:</span>
                  <span className="ml-2">Mandatory at halfway</span>
                </div>
                <div>
                  <span className="font-medium">Scoring:</span>
                  <span className="ml-2">Endurance (325) + Efficiency (100)</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Efficiency Formula</h4>
                <p className="text-sm text-blue-800">
                  Efficiency Factor = Energy Used / Corrected Time<br/>
                  Lower efficiency factor = better score
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}