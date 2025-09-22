'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const EVENTS = [
  { id: 'e8447aed-c7a5-4fc7-b198-67ae4a410434', name: 'Engineering Design' },
  { id: 'c583211f-3831-4696-9ad6-5dc23bce91a8', name: 'Business Plan' },
  { id: '7543e778-18f0-495c-ba5d-5e4a3b48e73c', name: 'Cost & Manufacturing' }
]

export default function MultiEventSummaryPage() {
  const supabase = createClientComponentClient()
  const [results, setResults] = useState([])

  useEffect(() => {
    async function loadMerged() {
      const all = []
      for (const event of EVENTS) {
        // If you have the same RPC for each event, use event.id
        const { data } = await supabase.rpc('get_leaderboard', { event: event.id })
        if (data && data.length) {
          for (const row of data) {
            all.push({
              team: row.team_name,
              event: event.name,
              total_score: row.total_score
            })
          }
        }
      }
      setResults(all)
    }
    loadMerged()
  }, [supabase])

  // Aggregate by team for scoring across all events
  const summary = []
  const teams = [...new Set(results.map(r => r.team))]
  for (const team of teams) {
    const teamRows = results.filter(r => r.team === team)
    summary.push({
      team,
      ...Object.fromEntries(teamRows.map(row => [row.event, row.total_score])),
      total: teamRows.map(row => row.total_score || 0).reduce((a, b) => a + b, 0)
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Full Judged Event Results</h1>
      <table className="w-full border mb-8">
        <thead>
          <tr>
            <th className="border p-2">Team</th>
            {EVENTS.map(e => <th key={e.id} className="border p-2">{e.name}</th>)}
            <th className="border p-2">Total Points</th>
          </tr>
        </thead>
        <tbody>
          {summary.map(row => (
            <tr key={row.team}>
              <td className="border p-2 font-semibold">{row.team}</td>
              {EVENTS.map(e => <td className="border p-2">{row[e.name] ?? '-'}</td>)}
              <td className="border p-2 font-bold text-lg">{row.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
