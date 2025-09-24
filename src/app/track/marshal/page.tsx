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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Play, 
  Square, 
  AlertTriangle, 
  MapPin, 
  Clock,
  Users,
  Flag,
  Loader2
} from 'lucide-react'
import { Database } from '@/lib/types/database'

const sessionSchema = z.object({
  team_id: z.string().uuid('Please select a team'),
  sector: z.string().min(1, 'Sector is required'),
  weather_conditions: z.string().optional(),
  track_conditions: z.string().optional(),
  notes: z.string().optional()
})

const incidentSchema = z.object({
  team_id: z.string().uuid('Please select a team'),
  sector: z.string().min(1, 'Sector is required'),
  incident_type: z.enum(['DOO', 'OOC', 'OTHER']),
  severity: z.enum(['minor', 'major', 'critical']),
  description: z.string().min(1, 'Description is required'),
  action_taken: z.string().optional()
})

type SessionFormData = z.infer<typeof sessionSchema>
type IncidentFormData = z.infer<typeof incidentSchema>

type Team = Database['public']['Tables']['teams']['Row']
type TrackSession = Database['public']['Tables']['track_sessions']['Row'] & {
  teams?: Team | null
}
type TrackIncident = Database['public']['Tables']['track_incidents']['Row'] & {
  teams?: Team | null
}

export default function TrackMarshalPage() {
  const supabase = createClientComponentClient<Database>()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [activeSessions, setActiveSessions] = useState<TrackSession[]>([])
  const [recentIncidents, setRecentIncidents] = useState<TrackIncident[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'session' | 'incident'>('session')

  const sessionForm = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema)
  })

  const incidentForm = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema)
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

        // Load active sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('track_sessions')
          .select(`
            *,
            teams(name, code)
          `)
          .eq('status', 'active')
          .order('entry_time', { ascending: false })

        if (sessionsError) throw sessionsError
        setActiveSessions(sessionsData || [])

        // Load recent incidents (last 24 hours)
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        
        const { data: incidentsData, error: incidentsError } = await supabase
          .from('track_incidents')
          .select(`
            *,
            teams(name, code)
          `)
          .gte('occurred_at', yesterday.toISOString())
          .order('occurred_at', { ascending: false })
          .limit(10)

        if (incidentsError) throw incidentsError
        setRecentIncidents(incidentsData || [])

      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const onSessionSubmit = async (data: SessionFormData) => {
    if (!user) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('track_sessions')
        .insert({
          ...data,
          marshal_id: user.id,
          entry_time: new Date().toISOString(),
          status: 'active'
        })

      if (insertError) throw insertError

      sessionForm.reset()
      // Refresh active sessions
      const { data: sessionsData } = await supabase
        .from('track_sessions')
        .select(`
          *,
          teams(name, code)
        `)
        .eq('status', 'active')
        .order('entry_time', { ascending: false })

      setActiveSessions(sessionsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onIncidentSubmit = async (data: IncidentFormData) => {
    if (!user) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('track_incidents')
        .insert({
          ...data,
          marshal_id: user.id,
          occurred_at: new Date().toISOString()
        })

      if (insertError) throw insertError

      incidentForm.reset()
      // Refresh incidents
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const { data: incidentsData } = await supabase
        .from('track_incidents')
        .select(`
          *,
          teams(name, code)
        `)
        .gte('occurred_at', yesterday.toISOString())
        .order('occurred_at', { ascending: false })
        .limit(10)

      setRecentIncidents(incidentsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report incident')
    } finally {
      setIsSubmitting(false)
    }
  }

  const endSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('track_sessions')
        .update({
          status: 'completed',
          exit_time: new Date().toISOString()
        })
        .eq('id', sessionId)

      if (error) throw error

      // Refresh active sessions
      const { data: sessionsData } = await supabase
        .from('track_sessions')
        .select(`
          *,
          teams(name, code)
        `)
        .eq('status', 'active')
        .order('entry_time', { ascending: false })

      setActiveSessions(sessionsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end session')
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'minor': return 'bg-yellow-100 text-yellow-800'
      case 'major': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading track marshal data...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Track Marshal Console</h1>
        <p className="text-gray-600">Manage track sessions and report incidents</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Forms */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tab Selector */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('session')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === 'session' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Play className="h-4 w-4 mr-2 inline" />
              Start Session
            </button>
            <button
              onClick={() => setActiveTab('incident')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
                activeTab === 'incident' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="h-4 w-4 mr-2 inline" />
              Report Incident
            </button>
          </div>

          {/* Session Form */}
          {activeTab === 'session' && (
            <Card>
              <CardHeader>
                <CardTitle>Start Track Session</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={sessionForm.handleSubmit(onSessionSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="session-team">Team</Label>
                    <Select onValueChange={(value) => sessionForm.setValue('team_id', value)}>
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
                    {sessionForm.formState.errors.team_id && (
                      <p className="text-sm text-red-600">
                        {sessionForm.formState.errors.team_id.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-sector">Sector</Label>
                    <Select onValueChange={(value) => sessionForm.setValue('sector', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acceleration">Acceleration</SelectItem>
                        <SelectItem value="skidpad">Skidpad</SelectItem>
                        <SelectItem value="autocross">Autocross</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                        <SelectItem value="practice">Practice Area</SelectItem>
                      </SelectContent>
                    </Select>
                    {sessionForm.formState.errors.sector && (
                      <p className="text-sm text-red-600">
                        {sessionForm.formState.errors.sector.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weather">Weather Conditions</Label>
                    <Input
                      id="weather"
                      placeholder="Sunny, 22°C, light wind"
                      {...sessionForm.register('weather_conditions')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="track">Track Conditions</Label>
                    <Input
                      id="track"
                      placeholder="Dry, clean, good grip"
                      {...sessionForm.register('track_conditions')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="session-notes">Notes</Label>
                    <Textarea
                      id="session-notes"
                      placeholder="Additional notes..."
                      {...sessionForm.register('notes')}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting Session...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Session
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Incident Form */}
          {activeTab === 'incident' && (
            <Card>
              <CardHeader>
                <CardTitle>Report Incident</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={incidentForm.handleSubmit(onIncidentSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="incident-team">Team</Label>
                    <Select onValueChange={(value) => incidentForm.setValue('team_id', value)}>
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
                    {incidentForm.formState.errors.team_id && (
                      <p className="text-sm text-red-600">
                        {incidentForm.formState.errors.team_id.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incident-sector">Sector</Label>
                    <Select onValueChange={(value) => incidentForm.setValue('sector', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acceleration">Acceleration</SelectItem>
                        <SelectItem value="skidpad">Skidpad</SelectItem>
                        <SelectItem value="autocross">Autocross</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                        <SelectItem value="practice">Practice Area</SelectItem>
                      </SelectContent>
                    </Select>
                    {incidentForm.formState.errors.sector && (
                      <p className="text-sm text-red-600">
                        {incidentForm.formState.errors.sector.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incident-type">Incident Type</Label>
                    <Select onValueChange={(value) => incidentForm.setValue('incident_type', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOO">DOO (Driving Outside of Boundaries)</SelectItem>
                        <SelectItem value="OOC">OOC (Out of Control)</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {incidentForm.formState.errors.incident_type && (
                      <p className="text-sm text-red-600">
                        {incidentForm.formState.errors.incident_type.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select onValueChange={(value) => incidentForm.setValue('severity', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="major">Major</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    {incidentForm.formState.errors.severity && (
                      <p className="text-sm text-red-600">
                        {incidentForm.formState.errors.severity.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what happened..."
                      {...incidentForm.register('description')}
                    />
                    {incidentForm.formState.errors.description && (
                      <p className="text-sm text-red-600">
                        {incidentForm.formState.errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="action">Action Taken</Label>
                    <Textarea
                      id="action"
                      placeholder="What action was taken..."
                      {...incidentForm.register('action_taken')}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reporting...
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Report Incident
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Active Sessions & Incidents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Track Sessions ({activeSessions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No active sessions</p>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-semibold">
                          {session.teams?.code} - {session.teams?.name}
                        </div>
                        <div className="text-sm text-gray-600">
                          Sector: {session.sector} • Started: {new Date(session.entry_time!).toLocaleTimeString()}
                        </div>
                        {session.weather_conditions && (
                          <div className="text-xs text-gray-500">
                            Weather: {session.weather_conditions}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => endSession(session.id)}
                        >
                          <Square className="h-4 w-4 mr-1" />
                          End Session
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Recent Incidents (24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentIncidents.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No recent incidents</p>
              ) : (
                <div className="space-y-3">
                  {recentIncidents.map((incident) => (
                    <div key={incident.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold">
                          {incident.teams?.code} - {incident.teams?.name}
                        </div>
                        <Badge className={getSeverityColor(incident.severity)}>
                          {incident.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">{incident.incident_type}</span> in {incident.sector}
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{incident.description}</p>
                      {incident.action_taken && (
                        <p className="text-xs text-gray-600">
                          Action: {incident.action_taken}
                        </p>
                      )}
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(incident.occurred_at!).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}