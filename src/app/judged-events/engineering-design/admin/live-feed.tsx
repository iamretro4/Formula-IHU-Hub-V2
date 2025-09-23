'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Loader2, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react' // Import MessageSquare
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert' // Import Alert and AlertDescription
import { Database, JudgedEventScore, ScoreStatus } from '@/lib/types/database'

type JudgedEventScoreWithRelations = JudgedEventScore & {
  judged_event_criteria?: { title: string } | null;
  judged_event_bookings?: { team_id: string | null } | null;
  teams?: { name: string } | null;
  user_profiles?: { first_name: string | null; last_name: string | null } | null;
};

export default function LiveFeedPage() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434' // Engineering Design Event UUID (corrected from original)
  const supabase = createClientComponentClient<Database>()
  const [feed, setFeed] = useState<JudgedEventScoreWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadFeed() {
      setIsLoading(true)
      setError(null)
      try {
        // Get recent score submissions for event
        const { data: criteriaData, error: criteriaError } = await supabase.from('judged_event_criteria').select('id').eq('event_id', eventId);
        if (criteriaError) throw criteriaError;
        const criterionIds = criteriaData?.map(c => c.id) || [];

        let feedQuery = supabase
          .from('judged_event_scores')
          .select(`
            id, submitted_at, score, comment, judge_id, booking_id, criterion_id, status,
            judged_event_criteria(title),
            judged_event_bookings(team_id),
            teams(name),
            user_profiles:user_profiles_judge_id_fkey(first_name, last_name)
          `);
        
        if (criterionIds.length > 0) {
          feedQuery = feedQuery.in('criterion_id', criterionIds);
        }

        const { data, error: fetchError } = await feedQuery
          .order('submitted_at', { ascending: false })
          .limit(20);

        if (fetchError) throw fetchError;
        setFeed(data as JudgedEventScoreWithRelations[] || []);
      } catch (err) {
        console.error('Error loading live feed:', err);
        setError(err instanceof Error ? err.message : 'Failed to load live feed.');
      } finally {
        setIsLoading(false);
      }
    }

    loadFeed();
    // Optionally: use interval or Supabase Realtime subscription
    const interval = setInterval(loadFeed, 5000);
    return () => clearInterval(interval);
  }, [eventId, supabase]);

  const getStatusBadgeVariant = (status: ScoreStatus) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'pending': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Live Judge Activity – Design Event</CardTitle>
          <CardDescription>Recent score submissions for the Engineering Design Event.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading live feed...</span>
            </div>
          ) : feed.length === 0 ? (
            <p className="text-center text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-4">
              {feed.map((item, i) => (
                <li key={item.id || i} className="border-b pb-4 pt-2 last:border-b-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-lg">{item.teams?.name ?? 'Unknown Team'}</div>
                    <Badge variant={getStatusBadgeVariant(item.status)}>{item.status.toUpperCase()}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-1">
                    Criterion: {item.judged_event_criteria?.title ?? 'N/A'}
                  </div>
                  <div className="text-sm mb-1">
                    Score: <span className="font-bold text-blue-700">{item.score ?? '-'}</span>
                  </div>
                  {item.comment && (
                    <div className="text-sm text-gray-600 italic mb-1">
                      <MessageSquare className="inline-block h-3 w-3 mr-1" />
                      "{item.comment}"
                    </div>
                  )}
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Judge: {item.user_profiles?.first_name} {item.user_profiles?.last_name ?? 'N/A'} at {new Date(item.submitted_at!).toLocaleTimeString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}