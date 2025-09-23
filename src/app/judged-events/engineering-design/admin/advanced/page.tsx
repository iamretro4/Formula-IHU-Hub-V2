'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, JudgedEventScore, ScoreStatus, UserProfile, Team } from '@/lib/types/database'

type JudgedEventScoreWithRelations = JudgedEventScore & {
  judged_event_bookings?: { team_id: string | null } | null;
  teams?: { name: string | null } | null;
  judged_event_criteria?: { title: string | null } | null;
  user_profiles?: { email: string | null; first_name: string | null; last_name: string | null } | null;
};

export default function AdvancedAdminPanel() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434' // Engineering Design Event UUID
  const supabase = createClientComponentClient<Database>()
  const [scores, setScores] = useState<JudgedEventScoreWithRelations[]>([])
  const [auditRows, setAuditRows] = useState<Database['public']['Tables']['judge_score_audit']['Row'][]>([])
  const [judgeMap, setJudgeMap] = useState<UserProfile[]>([])
  const [teamMap, setTeamMap] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [adminUser, setAdminUser] = useState<UserProfile | null>(null)

  useEffect(() => {
    async function loadAdminUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setAdminUser(user as UserProfile);
    }
    loadAdminUser();
  }, [supabase]);

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const { data: criteriaData, error: criteriaError } = await supabase.from('judged_event_criteria').select('id').eq('event_id', eventId);
      if (criteriaError) throw criteriaError;
      const criterionIds = criteriaData?.map(c => c.id) || [];

      let scoresQuery = supabase
        .from('judged_event_scores')
        .select(`
          id, score, comment, judge_id, criterion_id, status, submitted_at, booking_id,
          judged_event_bookings(team_id),
          teams(name),
          judged_event_criteria(title),
          user_profiles:user_profiles_judge_id_fkey(email, first_name, last_name)
        `);
      
      if (criterionIds.length > 0) {
        scoresQuery = scoresQuery.in('criterion_id', criterionIds);
      }

      const { data: scoresData, error: scoresError } = await scoresQuery
        .order('submitted_at', { ascending: false });
      if (scoresError) throw scoresError;
      setScores(scoresData as JudgedEventScoreWithRelations[] || []);

      const { data: audits, error: auditError } = await supabase
        .from('judge_score_audit')
        .select('*')
        .order('changed_at', { ascending: false });
      if (auditError) throw auditError;
      setAuditRows(audits || []);

      const { data: judges, error: judgesError } = await supabase.from('user_profiles').select('id, email, first_name, last_name');
      if (judgesError) throw judgesError;
      setJudgeMap(judges || []);

      const { data: teams, error: teamsError } = await supabase.from('teams').select('id, name, code'); // Select code as well
      if (teamsError) throw teamsError;
      setTeamMap(teams || []);

    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventId, supabase]);

  const updateScore = async (
    scoreId: string, 
    newScore: number | null, 
    newComment: string | null, 
    newStatus: ScoreStatus
  ) => {
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    const oldScoreEntry = scores.find(s => s.id === scoreId);
    if (!oldScoreEntry || !adminUser) {
      setError('Could not find old score entry or admin user.');
      setIsUpdating(false);
      return;
    }

    try {
      // Insert into audit log
      const { error: auditError } = await supabase
        .from('judge_score_audit')
        .insert({
          score_id: scoreId,
          admin_id: adminUser.id,
          old_score: oldScoreEntry.score,
          old_comment: oldScoreEntry.comment,
          new_score: newScore,
          new_comment: newComment,
          old_judge_id: oldScoreEntry.judge_id,
          new_judge_id: oldScoreEntry.judge_id, // Judge not changed in this panel
          changed_at: new Date().toISOString(),
        });
      if (auditError) throw auditError;

      // Update the score in the main table
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({
          score: newScore,
          comment: newComment,
          status: newStatus,
        })
        .eq('id', scoreId);

      if (updateError) throw updateError;

      setScores(prevScores => 
        prevScores.map(score => 
          score.id === scoreId ? { ...score, score: newScore, comment: newComment, status: newStatus } : score
        )
      );
      setSuccessMessage('Score updated successfully!');
    } catch (err) {
      console.error('Error updating score:', err);
      setError(err instanceof Error ? err.message : 'Failed to update score.');
    } finally {
      setIsUpdating(false);
    }
  };

  const reassignJudge = async (scoreId: string, newJudgeId: string) => {
    setIsUpdating(true);
    setError(null);
    setSuccessMessage(null);

    const oldScoreEntry = scores.find(s => s.id === scoreId);
    if (!oldScoreEntry || !adminUser) {
      setError('Could not find old score entry or admin user.');
      setIsUpdating(false);
      return;
    }

    try {
      // Insert into audit log
      const { error: auditError } = await supabase
        .from('judge_score_audit')
        .insert({
          score_id: scoreId,
          admin_id: adminUser.id,
          old_score: oldScoreEntry.score,
          old_comment: oldScoreEntry.comment,
          new_score: oldScoreEntry.score,
          new_comment: oldScoreEntry.comment,
          old_judge_id: oldScoreEntry.judge_id,
          new_judge_id: newJudgeId,
          changed_at: new Date().toISOString(),
        });
      if (auditError) throw auditError;

      // Update the judge in the main table
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({ judge_id: newJudgeId })
        .eq('id', scoreId);

      if (updateError) throw updateError;

      setScores(prevScores => 
        prevScores.map(score => 
          score.id === scoreId ? { ...score, judge_id: newJudgeId } : score
        )
      );
      setSuccessMessage('Judge reassigned successfully!');
    } catch (err) {
      console.error('Error reassigning judge:', err);
      setError(err instanceof Error ? err.message : 'Failed to reassign judge.');
    } finally {
      setIsUpdating(false);
    }
  };

  const getScoresForTeam = (teamId: string) => {
    return scores.filter(s => s.judged_event_bookings?.team_id === teamId);
  };

  const getStatusBadgeVariant = (status: ScoreStatus) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Design Event Advanced Admin Panel</CardTitle>
          <CardDescription>Comprehensive control over scores, comments, statuses, and judge assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default" className="bg-green-100 border-green-500 text-green-800 mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end mb-4">
            <Button onClick={loadData} disabled={isLoading || isUpdating}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh All Data
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading data...</span>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-xl mb-4">Score Management</h2>
              <Table className="w-full border mb-8">
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Criterion</TableHead>
                    <TableHead>Judge</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{teamMap.find(t => t.id === s.judged_event_bookings?.team_id)?.name ?? 'N/A'}</TableCell>
                      <TableCell>{s.judged_event_criteria?.title ?? 'N/A'}</TableCell>
                      <TableCell>{judgeMap.find(j => j.id === s.judge_id)?.email ?? 'N/A'}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={s.score ?? ''}
                          onChange={e => updateScore(s.id, parseInt(e.target.value), s.comment, s.status)}
                          className="w-20"
                          disabled={isUpdating}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={s.comment ?? ''}
                          onChange={e => updateScore(s.id, s.score, e.target.value, s.status)}
                          className="w-full"
                          disabled={isUpdating}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(s.status)}>{s.status.toUpperCase()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          onValueChange={(value: ScoreStatus) => updateScore(s.id, s.score, s.comment, value)}
                          value={s.status}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Change Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approve</SelectItem>
                            <SelectItem value="rejected">Reject</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <h2 className="font-bold text-xl mt-10 mb-4">Judge Reassignment</h2>
              <Table className="w-full border mb-8">
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Criterion</TableHead>
                    <TableHead>Current Judge</TableHead>
                    <TableHead className="text-right">Reassign To</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{teamMap.find(t => t.id === s.judged_event_bookings?.team_id)?.name ?? 'N/A'}</TableCell>
                      <TableCell>{s.judged_event_criteria?.title ?? 'N/A'}</TableCell>
                      <TableCell>{judgeMap.find(j => j.id === s.judge_id)?.email ?? 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Select 
                          onValueChange={(value: string) => reassignJudge(s.id, value)}
                          value={s.judge_id || ''}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select new judge" />
                          </SelectTrigger>
                          <SelectContent>
                            {judgeMap.map(j =>
                              <SelectItem key={j.id} value={j.id}>
                                {j.email}
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <h2 className="font-bold text-xl mt-10 mb-4">Audit Log</h2>
              <Table className="w-full border">
                <TableHeader>
                  <TableRow>
                    <TableHead>Score ID</TableHead>
                    <TableHead>Old Score</TableHead>
                    <TableHead>New Score</TableHead>
                    <TableHead>Old Judge</TableHead>
                    <TableHead>New Judge</TableHead>
                    <TableHead>Changed At</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Comment Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditRows.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs">{a.score_id}</TableCell>
                      <TableCell>{a.old_score ?? '-'}</TableCell>
                      <TableCell>{a.new_score ?? '-'}</TableCell>
                      <TableCell>{judgeMap.find(j => j.id === a.old_judge_id)?.email || a.old_judge_id}</TableCell>
                      <TableCell>{judgeMap.find(j => j.id === a.new_judge_id)?.email || a.new_judge_id}</TableCell>
                      <TableCell className="text-xs">{new Date(a.changed_at!).toLocaleString()}</TableCell>
                      <TableCell>{judgeMap.find(j => j.id === a.admin_id)?.email || a.admin_id}</TableCell>
                      <TableCell className="text-xs">{a.old_comment} → {a.new_comment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <h2 className="font-bold text-xl mt-10 mb-4">Team Score Extraction</h2>
              <div className="space-y-4">
                {teamMap.map(t =>
                  <div key={t.id} className="border rounded-lg p-4 bg-gray-50 dark:bg-neutral-800">
                    <h3 className="font-bold text-lg mb-2">{t.name}</h3>
                    <pre className="bg-gray-100 dark:bg-neutral-900 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(getScoresForTeam(t.id), null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}