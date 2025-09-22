'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AdminEditPanel() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434'
  const supabase = createClientComponentClient()
  const [scores, setScores] = useState([])

  useEffect(() => {
    async function loadScores() {
      const { data } = await supabase
        .from('judged_event_scores')
        .select(`
          id, score, comment, judge_id, criterion_id,
          judged_event_bookings(team_id),
          teams(name),
          judged_event_criteria(title)
        `)
        .eq('judged_event_criteria.event_id', eventId)
      setScores(data ?? [])
    }
    loadScores()
  }, [eventId, supabase])

  // Admin override logic
  async function updateScore(id, newScore, newComment) {
    await supabase
      .from('judged_event_scores')
      .update({
        score: newScore,
        comment: newComment
      })
      .eq('id', id)
    // Reload view
    const { data } = await supabase.from('judged_event_scores').select('*').eq('id', id)
    setScores(scores => scores.map(s => s.id === id ? { ...s, ...data[0] } : s))
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Design Event Admin Override</h1>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Team</th>
            <th>Criterion</th>
            <th>Judge</th>
            <th>Score</th>
            <th>Comment</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody>
          {scores.map(s => (
            <tr key={s.id}>
              <td>{s.teams?.name}</td>
              <td>{s.judged_event_criteria?.title}</td>
              <td>{s.judge_id}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={s.score ?? ''}
                  onChange={e => updateScore(s.id, parseInt(e.target.value), s.comment)}
                  className="border rounded px-2 py-1 w-20"
                />
              </td>
              <td>
                <input
                  type="text"
                  value={s.comment ?? ''}
                  onChange={e => updateScore(s.id, s.score, e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td>
                {/* Additional admin controls here if needed */}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
