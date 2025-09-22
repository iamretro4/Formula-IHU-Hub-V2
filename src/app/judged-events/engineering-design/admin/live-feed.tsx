'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LiveFeedPage() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434'
  const supabase = createClientComponentClient()
  const [feed, setFeed] = useState([])

  useEffect(() => {
    async function loadFeed() {
      // Get recent score submissions for event
      const { data } = await supabase
        .from('judged_event_scores')
        .select(`
          submitted_at,
          score,
          comment,
          judge_id,
          booking_id,
          criterion_id,
          judged_event_criteria(title),
          judged_event_bookings(team_id),
          teams(name)
        `)
        .eq('judged_event_criteria.event_id', eventId)
        .order('submitted_at', { ascending: false })
        .limit(20)

      setFeed(data ?? [])
    }

    loadFeed()
    // Optionally: use interval or Supabase Realtime subscription
    const interval = setInterval(loadFeed, 5000)
    return () => clearInterval(interval)
  }, [eventId, supabase])

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-xl font-bold mb-4">Live Judge Activity – Design Event</h1>
      <ul>
        {feed.map((item, i) => (
          <li key={i} className="border-b py-2 text-sm">
            <strong>{item.teams?.name}</strong>: {item.judged_event_criteria?.title}
            <span className="mx-2 font-bold text-blue-900">Score: {item.score ?? '-'}</span>
            <span className="mx-2">Judge: {item.judge_id}</span>
            <span className="mx-2 text-gray-600">{item.comment ? `“${item.comment}”` : ''}</span>
            <span className="mx-2 text-xs text-gray-400">{new Date(item.submitted_at).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
