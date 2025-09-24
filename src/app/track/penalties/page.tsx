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
  AlertTriangle, 
  Plus,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react'
import { Database } from '@/lib/types/database'

const penaltySchema = z.object({
  team_id: z.string().uuid('Please select a team'),
  event_type: z.enum(['acceleration', 'skidpad', 'autocross', 'endurance']),
  penalty_type: z.enum(['time_penalty', 'points_deduction', 'dsq']),
  penalty_value: z.coerce.number().min(0),
  reason: z.string().min(1, 'Reason is required'),
  applied_by: z.string().optional()
})

type PenaltyFormData = z.infer<typeof penaltySchema>

type Team = Database['public']['Tables']['teams']['Row']
type PenaltyRule = Database['public']['Tables']['penalty_rules']['Row']

interface AppliedPenalty {
  id: string
  team_id: string
  event_type: string
  penalty_type: string
  penalty_value: number
  reason: string
  applied_by: string
  applied_at: string
  teams?: Team | null
}

export default function PenaltyManagementPage() {
  const supabase = createClientComponentClient<Database>()
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [penaltyRules, setPenaltyRules] = useState<PenaltyRule[]>([])
  const [appliedPenalties, setAppliedPenalties] = useState<AppliedPenalty[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<PenaltyFormData>({
    resolver: zodResolver(penaltySchema)
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

        // Load penalty rules
        const { data: rulesData, error: rulesError } = await supabase
          .from('penalty_rules')
          .select('*')
          .eq('active', true)
          .order('event_type')

        if (rulesError) throw rulesError
        setPenaltyRules(rulesData || [])

        // Note: Applied penalties would need a separate table in production
        // For now, we'll show penalty rules as reference

      } catch (err) {
        console.error('Error loading data:', err)
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const onSubmit = async (data: PenaltyFormData) => {
    if (!user) return
    
    setIsSubmitting(true)
    setError(null)

    try {
      // In a real implementation, you'd apply the penalty to the specific run
      // For now, we'll just show a success message
      console.log('Penalty applied:', data)
      
      form.reset()
      // Here you would refresh the applied penalties list

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply penalty')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getPenaltyTypeColor = (type: string) => {
    switch (type) {
      case 'time_penalty': return 'bg-yellow-100 text-yellow-800'
      case 'points_deduction': return 'bg-orange-100 text-orange-800'
      case 'dsq': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading penalty management...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-lg bg-red-100">
          <Flag className="h-6 w-6 text-red-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Penalty Management</h1>
          <p className="text-gray-600">Apply and manage penalties for track events</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Apply Penalty */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Apply Penalty
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
                  <Label htmlFor="event_type">Event</Label>
                  <Select onValueChange={(value) => form.setValue('event_type', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acceleration">Acceleration</SelectItem>
                      <SelectItem value="skidpad">Skidpad</SelectItem>
                      <SelectItem value="autocross">Autocross</SelectItem>
                      <SelectItem value="endurance">Endurance</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.event_type && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.event_type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penalty_type">Penalty Type</Label>
                  <Select onValueChange={(value) => form.setValue('penalty_type', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select penalty type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_penalty">Time Penalty</SelectItem>
                      <SelectItem value="points_deduction">Points Deduction</SelectItem>
                      <SelectItem value="dsq">Disqualification</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.penalty_type && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.penalty_type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="penalty_value">Penalty Value</Label>
                  <Input
                    id="penalty_value"
                    type="number"
                    step="0.1"
                    placeholder="2.0"
                    {...form.register('penalty_value', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-gray-500">
                    Seconds for time penalty, points for deduction
                  </p>
                  {form.formState.errors.penalty_value && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.penalty_value.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    placeholder="Describe the reason for this penalty..."
                    {...form.register('reason')}
                  />
                  {form.formState.errors.reason && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.reason.message}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Flag className="h-4 w-4 mr-2" />
                      Apply Penalty
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Penalty Rules */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Standard Penalty Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {penaltyRules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No penalty rules configured</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Rule Type</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penaltyRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium capitalize">
                          {rule.event_type}
                        </TableCell>
                        <TableCell>
                          <Badge className={getPenaltyTypeColor(rule.rule_type)}>
                            {rule.rule_type.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {typeof rule.condition === 'object' ? 
                            JSON.stringify(rule.condition) : 
                            rule.condition
                          }
                        </TableCell>
                        <TableCell className="font-bold">
                          {rule.penalty_value}
                        </TableCell>
                        <TableCell>{rule.penalty_unit}</TableCell>
                        <TableCell>
                          <Badge variant={rule.active ? 'default' : 'secondary'}>
                            {rule.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Quick Reference */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Standard Penalties Quick Reference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">Time Penalties</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>• Cone hit: +2 seconds</div>
                    <div>• Off course: +10 seconds</div>
                    <div>• Wrong direction: +10 seconds</div>
                    <div>• Unsafe driving: +20 seconds</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Disqualifications</h4>
                  <div className="space-y-1 text-gray-600">
                    <div>• Dangerous driving</div>
                    <div>• Technical non-compliance</div>
                    <div>• Unsportsmanlike conduct</div>
                    <div>• Safety violation</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}