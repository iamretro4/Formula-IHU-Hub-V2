'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Database, JudgedEventScore, ScoreStatus } from '@/lib/types/database'

type JudgedEventScoreWithRelations = JudgedEventScore & {
  judged_event_bookings?: { team_id: string | null } | null;
  teams?: { name: string | null } | null;
  judged_event_criteria?: { title: string | null } | null;
  user_profiles?: { first_name: string | null; last_name: string | null } | null;
};

export default function DesignEventAdminPage() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434' // Engineering Design Event UUID
  const supabase = createClientComponentClient<Database>()
  const [scores, setScores] = useState<JudgedEventScoreWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchScores = async () => {
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
          user_profiles:user_profiles_judge_id_fkey(first_name, last_name)
        `);
      
      if (criterionIds.length > 0) {
        scoresQuery = scoresQuery.in('criterion_id', criterionIds);
      }

      const { data, error: fetchError } = await scoresQuery
        .order('submitted_at', { ascending: false }); // Order by submission time
      
      if (fetchError) throw fetchError;
      setScores(data as JudgedEventScoreWithRelations[] || []);
    } catch (err) {
      console.error('Error fetching scores:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch scores.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [eventId, supabase]);

  const handleStatusChange = async (scoreId: string, newStatus: ScoreStatus) => {
    setIsUpdating(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('judged_event_scores')
        .update({ status: newStatus })
        .eq('id', scoreId);

      if (updateError) throw updateError;

      setScores(prevScores => 
        prevScores.map(score => 
          score.id === scoreId ? { ...score, status: newStatus } : score
        )
      );
    } catch (err) {
      console.error('Error updating score status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update score status.');
    } finally {
      setIsUpdating(false);
    }
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
    <div className="max-w-4xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Design Event – Score Approval</CardTitle>
          <CardDescription>Review and approve submitted scores for the Engineering Design Event.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex justify-end mb-4">
            <Button onClick={fetchScores} disabled={isLoading || isUpdating}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh Scores
            </Button>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading scores...</span>
            </div>
          ) : scores.length === 0 ? (
            <p className="text-center text-muted-foreground">No scores submitted for this event yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Criterion</TableHead>
                  <TableHead>Judge</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scores.map((score) => (
                  <TableRow key={score.id}>
                    <TableCell className="font-medium">{score.teams?.name ?? 'N/A'}</TableCell>
                    <TableCell>{score.judged_event_criteria?.title ?? 'N/A'}</TableCell>
                    <TableCell>{score.user_profiles?.first_name} {score.user_profiles?.last_name ?? 'N/A'}</TableCell>
                    <TableCell>{score.score ?? '-'}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(score.status)}>{score.status.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select 
                        onValueChange={(value: ScoreStatus) => handleStatusChange(score.id, value)}
                        value={score.status}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}