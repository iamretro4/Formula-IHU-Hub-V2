'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'


export default function DesignEventScore() {
  const { bookingId } = useParams()
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434'
  const supabase = createClientComponentClient()
  const [criteria, setCriteria] = useState([])
  const [team, setTeam] = useState(null)
  const [booking, setBooking] = useState(null)
  const [scores, setScores] = useState({})
  const [judge, setJudge] = useState(null)
  const [saving, setSaving] = useState(false)

  // Load judge, booking, team, criteria, current scores
  useEffect(() => {
    async function load() {
      // Get judge
      const { data: { user } } = await supabase.auth.getUser()
      setJudge(user)

      // Booking & team (details)
      const { data: booking } = await supabase.from('judged_event_bookings').select('*').eq('id', bookingId).single()
      setBooking(booking)
      const { data: team } = await supabase.from('teams').select('*').eq('id', booking?.team_id).single()
      setTeam(team)

      // Load criteria for event
      const { data: crit } = await supabase.from('judged_event_criteria').select('*').eq('event_id', eventId).order('criterion_index')
      setCriteria(crit)

      // Current scores for this judge/team/booking
      const { data: scrs } = await supabase
        .from('judged_event_scores')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('judge_id', user?.id)
      const scoreState = {}
      for (const row of scrs) scoreState[row.criterion_id] = row
      setScores(scoreState)
    }
    if (eventId && bookingId) load()
  }, [eventId, bookingId, supabase])

  // Score handler (upsert per criterion)
  async function saveScore(criterion_id, score, comment) {
    const payload = {
      booking_id: bookingId,
      criterion_id,
      judge_id: judge?.id,
      score,
      comment,
      submitted_at: new Date().toISOString()
    }
    setScores(prev => ({ ...prev, [criterion_id]: { ...payload } }))
    setSaving(true)
    // Upsert to DB: judge, booking, criterion
    await supabase.from('judged_event_scores').upsert([payload], { onConflict: ['booking_id', 'criterion_id', 'judge_id'] })
    setSaving(false)
  }

  // All scores validity
  const allScored = criteria.length && criteria.every(c => typeof scores[c.id]?.score === 'number')

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-2">Judging: {team?.name} <span className="text-gray-500 text-base">({booking?.scheduled_time?.slice(0,16)})</span></h1>
      <div className="mb-3 text-lg font-semibold text-blue-900">Event: {booking?.event_id}</div>

      <div className="space-y-6">
        {criteria.map((c, idx) =>
          <div key={c.id} className="border-t pt-4 pb-2">
            <div className="font-semibold">{idx+1}. {c.title} (Max: {c.max_score})</div>
            <div className="flex gap-4 items-center mt-2">
              <input
                type="number"
                min={0}
                max={c.max_score}
                value={scores[c.id]?.score ?? ''}
                onChange={e => saveScore(c.id, parseInt(e.target.value), scores[c.id]?.comment ?? '')}
                className="border rounded w-24 px-2 py-1"
                placeholder="Score"
              />
              <input
                type="text"
                value={scores[c.id]?.comment ?? ''}
                onChange={e => saveScore(c.id, scores[c.id]?.score ?? null, e.target.value)}
                className="border rounded px-2 py-1 w-full"
                placeholder="Comment (optional)"
              />
            </div>
            {scores[c.id]?.submitted_at &&
              <div className="text-xs text-gray-400 mt-1">
                Last saved at {new Date(scores[c.id].submitted_at).toLocaleTimeString()}
              </div>
            }
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-end mt-8">
        <button
          className="bg-green-700 hover:bg-green-900 text-white px-5 py-2 rounded"
          disabled={!allScored}
          onClick={() => alert('Scores submitted!')}
        >
          Submit All Scores
        </button>
        {saving && <div className="text-xs text-gray-500">Saving...</div>}
      </div>
    </div>
  )
}
