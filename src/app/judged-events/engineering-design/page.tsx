'use client'
import { useEffect, useState, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useForm, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Database, JudgedEventBooking, JudgedEventCriterion, JudgedEventScore, ScoreStatus, Team, UserProfile } from '@/lib/types/database'

const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434' // Engineering Design Event UUID

// Define Zod schema for a single score entry
const scoreEntrySchema = z.object({
  criterion_id: z.string().uuid(),
  score: z.coerce.number().min(0, 'Score cannot be negative').nullable(), // Max score will be dynamically checked
  comment: z.string().optional(),
});

// Define Zod schema for the entire form
const scoringFormSchema = z.object({
  teamId: z.string().uuid('Please select a team.'),
  scores: z.array(scoreEntrySchema),
});

type ScoringFormData = z.infer<typeof scoringFormSchema>;

export default function DesignEventScoringPage() {
  const supabase = createClientComponentClient<Database>();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [bookings, setBookings] = useState<JudgedEventBooking[]>([]);
  const [criteria, setCriteria] = useState<JudgedEventCriterion[]>([]);
  const [submittedScores, setSubmittedScores] = useState<JudgedEventScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ScoringFormData>({
    resolver: zodResolver(scoringFormSchema),
    defaultValues: {
      teamId: '',
      scores: [],
    },
  });

  const selectedTeamId = watch('teamId');
  const formScores = watch('scores');

  // Fetch initial data: user, teams, bookings, criteria
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        setCurrentUser(user as UserProfile);

        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select('*')
          .order('name');
        if (teamsError) throw teamsError;
        setTeams(teamsData || []);

        const { data: bookingsData, error: bookingsError } = await supabase
          .from('judged_event_bookings')
          .select('*')
          .eq('event_id', eventId);
        if (bookingsError) throw bookingsError;
        setBookings(bookingsData || []);

        const { data: criteriaData, error: criteriaError } = await supabase
          .from('judged_event_criteria')
          .select('*')
          .eq('event_id', eventId)
          .order('criterion_index');
        if (criteriaError) throw criteriaError;
        setCriteria(criteriaData || []);

        // Fetch all submitted scores for the right panel
        // Filter by event_id through the criteria table
        const criterionIds = criteriaData?.map(c => c.id) || [];
        let allScoresQuery = supabase
          .from('judged_event_scores')
          .select(`
            id, score, comment, judge_id, criterion_id, status, submitted_at,
            teams(name),
            user_profiles(first_name, last_name)
          `);
        
        if (criterionIds.length > 0) {
          allScoresQuery = allScoresQuery.in('criterion_id', criterionIds);
        }
        
        const { data: allScores, error: allScoresError } = await allScoresQuery
          .order('submitted_at', { ascending: false });

        if (allScoresError) throw allScoresError;
        setSubmittedScores(allScores || []);

      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load initial data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [supabase]);

  // Update form fields when selectedTeamId or criteria change
  useEffect(() => {
    if (selectedTeamId && criteria.length > 0 && currentUser) {
      const teamBooking = bookings.find(b => b.team_id === selectedTeamId);
      if (!teamBooking) {
        reset({ teamId: selectedTeamId, scores: [] });
        setError('No booking found for this team in the Design Event.');
        return;
      }
      setError(null);

      async function loadScoresForTeam() {
        const { data: existingScores, error: scoresError } = await supabase
          .from('judged_event_scores')
          .select('*')
          .eq('booking_id', teamBooking.id)
          .eq('judge_id', currentUser.id);

        if (scoresError) throw scoresError;

        const initialScores = criteria.map(criterion => {
          const existing = existingScores?.find(s => s.criterion_id === criterion.id);
          return {
            criterion_id: criterion.id,
            score: existing?.score ?? null,
            comment: existing?.comment ?? '',
          };
        });
        reset({ teamId: selectedTeamId, scores: initialScores });
      }
      loadScoresForTeam();
    } else {
      reset({ teamId: selectedTeamId, scores: [] });
    }
  }, [selectedTeamId, criteria, bookings, currentUser, reset, supabase]);

  const totalScore = useMemo(() => {
    return formScores.reduce((sum, entry) => sum + (entry.score || 0), 0);
  }, [formScores]);

  const onSubmit: SubmitHandler<ScoringFormData> = async (data) => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const teamBooking = bookings.find(b => b.team_id === data.teamId);
      if (!teamBooking) {
        throw new Error('No booking found for the selected team.');
      }

      const payload = data.scores.map(scoreEntry => {
        const criterion = criteria.find(c => c.id === scoreEntry.criterion_id);
        if (!criterion) {
          throw new Error(`Criterion not found for ID: ${scoreEntry.criterion_id}`);
        }
        // Validate score against max_score
        if (scoreEntry.score !== null && scoreEntry.score > criterion.max_score) {
          throw new Error(`Score for ${criterion.title} cannot exceed ${criterion.max_score}.`);
        }

        return {
          booking_id: teamBooking.id,
          criterion_id: scoreEntry.criterion_id,
          judge_id: currentUser?.id,
          score: scoreEntry.score,
          comment: scoreEntry.comment,
          submitted_at: new Date().toISOString(),
          status: 'pending' as ScoreStatus, // Default to pending
        };
      });

      const { error: upsertError } = await supabase
        .from('judged_event_scores')
        .upsert(payload as Database['public']['Tables']['judged_event_scores']['Insert'][], { onConflict: 'booking_id,criterion_id,judge_id' });

      if (upsertError) throw upsertError;

      setSuccessMessage('Scores saved successfully!');
      // Refresh submitted scores list
      const criterionIds = criteria?.map(c => c.id) || [];
      let updatedScoresQuery = supabase
        .from('judged_event_scores')
        .select(`
          id, score, comment, judge_id, criterion_id, status, submitted_at,
          teams(name),
          user_profiles(first_name, last_name)
        `);
      
      if (criterionIds.length > 0) {
        updatedScoresQuery = updatedScoresQuery.in('criterion_id', criterionIds);
      }

      const { data: updatedSubmittedScores, error: fetchError } = await updatedScoresQuery
        .order('submitted_at', { ascending: false });
      if (fetchError) throw fetchError;
      setSubmittedScores(updatedSubmittedScores || []);

      reset(data); // Keep form data but mark as pristine
    } catch (err) {
      console.error('Error saving scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to save scores.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading event data...</span>
      </div>
    );
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil-ruler"><path d="M15.29 17.29 18 20l2-2c.6-.6.9-1.4.9-2.3V7.6c0-.4-.2-.8-.4-1.1l-1.9-2.3c-.9-1.1-2.4-1.4-3.7-.7L7.29 6.71c-.6.6-.9 1.4-.9 2.3v9.4c0 .4.2.8.4 1.1l1.9 2.3c.9 1.1 2.4 1.4 3.7-.7L17 15M18 20l-2.5-2.5M15 15l-2.5-2.5M12 12l-2.5-2.5M9 9 6.5 6.5M17 17l-2.9-2.9M14.1 14.1l-2.9-2.9M11.2 11.2l-2.9-2.9M8.3 8.3 5.4 5.4"/></svg>
            Design Event Scoring
          </CardTitle>
          <CardDescription>
            Submit and review Engineering Design Event scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert variant="default" className="bg-green-100 border-green-500 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="teamId">Select a team to score:</Label>
              <Select onValueChange={(value) => setValue('teamId', value)} value={selectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your team" />
                </SelectTrigger>
                <SelectContent>
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

            {selectedTeamId && criteria.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criteria.map((criterion, index) => (
                    <div key={criterion.id} className="space-y-2">
                      <Label htmlFor={`scores.${index}.score`}>
                        {criterion.title} (Max: {criterion.max_score})
                      </Label>
                      <Input
                        id={`scores.${index}.score`}
                        type="number"
                        min={0}
                        max={criterion.max_score}
                        placeholder="0"
                        {...register(`scores.${index}.score`, { valueAsNumber: true })}
                      />
                      {errors.scores?.[index]?.score && (
                        <p className="text-sm text-red-600">
                          {errors.scores[index]?.score?.message}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Comments</Label>
                  <Textarea
                    id="comments"
                    placeholder="Provide detailed feedback for the team..."
                    {...register(`scores.${criteria.length - 1}.comment`)} // Assuming last criterion's comment field is for overall comments
                  />
                  {errors.scores?.[criteria.length - 1]?.comment && (
                    <p className="text-sm text-red-600">
                      {errors.scores[criteria.length - 1]?.comment?.message}
                    </p>
                  )}
                </div>

                <div className="text-2xl font-bold text-center py-4 border-t border-b">
                  Total Score: {totalScore} / 150
                </div>

                <Button type="submit" className="w-full" disabled={isSaving || !isDirty}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Scores...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Score
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Please select a team to begin scoring.</p>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Submitted Scores Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Submitted Scores</CardTitle>
          <CardDescription>Review all submitted scores for the Design Event.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {submittedScores.length === 0 ? (
            <p className="text-center text-muted-foreground">No scores submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {submittedScores.map((scoreEntry) => (
                <div key={scoreEntry.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{scoreEntry.teams?.name ?? 'Unknown Team'}</div>
                    <div className="text-sm text-muted-foreground">
                      Judge: {scoreEntry.user_profiles?.first_name} {scoreEntry.user_profiles?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Score: <span className="font-bold">{scoreEntry.score ?? '-'}</span>
                    </div>
                  </div>
                  <Badge variant={scoreEntry.status === 'approved' ? 'default' : scoreEntry.status === 'rejected' ? 'destructive' : 'secondary'}>
                    {scoreEntry.status?.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}