'use client'
// =====================================================
// Formula IHU Hub - Complete Profile Page
// =====================================================
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { z } from 'zod'
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
const supabase = createClientComponentClient();
import { Database } from '@/lib/types/database'
// -- Validation: teamId required as UUID --
const profileCompletionSchema = z.object({
  teamId: z
    .string()
    .uuid({ message: 'Please select your team.' }),
  additionalInfo: z.string().optional()
})
type ProfileCompletionData = z.infer<typeof profileCompletionSchema>
type Team = Database['public']['Tables']['teams']['Row']
export default function CompleteProfilePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<ProfileCompletionData>({
    resolver: zodResolver(profileCompletionSchema),
  })
  // Load user, teams, and profile status (no auto-complete until actually submitted!)
  useEffect(() => {
    const loadData = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }
        setCurrentUser(user)
        const { data: teamsData } = await supabase
          .from('teams')
          .select('*')
          .order('name')
        if (teamsData) setTeams(teamsData)
        // Only redirect if profile is completed (user has submitted form)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('profile_completed, team_id')
          .eq('id', user.id)
          .single()
        if (profile?.profile_completed && profile?.team_id) {
          router.push('/dashboard')
        } else if (profile?.team_id) {
          setValue('teamId', profile.team_id)
        }
      } catch (err) {
        setError('Failed to load profile data')
        console.error('Load data error:', err)
      }
    }
    loadData()
    // eslint-disable-next-line
  }, [])
  const onSubmit = async (data: ProfileCompletionData) => {
    if (!currentUser) return
    setIsLoading(true)
    setError(null)
    try {
      // Save team and mark as completed on submit only
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          team_id: data.teamId,
          profile_completed: true,
        })
        .eq('id', currentUser.id)
      if (updateError) {
        setError(updateError.message)
        return
      }
      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      console.error('Profile completion error:', err)
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Check className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Complete Your Profile
          </CardTitle>
          <CardDescription>Final step to access the Formula IHU Hub</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="teamId">
                Team <span className="text-red-600">*</span>
              </Label>
              <Select onValueChange={(value) => setValue('teamId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your team" />
                </SelectTrigger>
                <SelectContent>
                  {/* No "No team" option */}
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.code} - {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.teamId && (
                <p className="text-sm text-red-600">{errors.teamId.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalInfo">
                Additional Information (Optional)
              </Label>
              <Textarea
                id="additionalInfo"
                placeholder="Any additional information or special requirements..."
                {...register('additionalInfo')}
              />
              {errors.additionalInfo && (
                <p className="text-sm text-red-600">
                  {errors.additionalInfo.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Completing Profile...
                </>
              ) : (
                'Complete Profile'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center">
          <p className="text-sm text-muted-foreground">
            You can update your team assignment later from your dashboard
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
