'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { saveAs } from 'file-saver'

// Helper function for CSV download
function exportToCSV(data, filename = "results.csv") {
  const header = Object.keys(data[0]).join(",")
  const rows = data.map(obj => Object.values(obj).map(val => `"${(val||"").toString().replace(/"/g, '""')}"`).join(","))
  const csv = [header, ...rows].join("\r\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  saveAs(blob, filename)
}

export default function LeaderboardPage() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434' // DESIGN EVENT UUID
  const supabase = createClientComponentClient()
  const [rows, setRows] = useState([]) // leaderboard display
  const [csvRows, setCsvRows] = useState([]) // flattens row data for CSV

  useEffect(() => {
    async function loadResults() {
      // If you have a Supabase function get_leaderboard, this fetches full event results
      const { data } = await supabase.rpc('get_leaderboard', { event: eventId })

      // If not, you can aggregate here, or fetch from judged_event_scores and process in JS
      setRows(data ?? [])

      // Flatten for CSV export
      if (data && data.length) {
        const flat = []
        for (const row of data) {
          for (const cb of row.criterion_breakdown) {
            flat.push({
              team: row.team_name,
              total_score: row.total_score,
              criterion: cb.criterion,
              avg_score: cb.avg_score,
              judges_list: row.judges_list.join(', ')
            })
          }
        }
        setCsvRows(flat)
      }
    }
    loadResults()
  }, [eventId, supabase])

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Design Event Leaderboard</h1>
      <table className="w-full border mb-8">
        <thead>
          <tr>
            <th className="border p-2">Team</th>
            <th className="border p-2">Total Score</th>
            <th className="border p-2">Breakdown by Criterion (Avg)</th>
            <th className="border p-2">Judges</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.team_id}>
              <td className="border p-2 font-semibold">{row.team_name}</td>
              <td className="border p-2 font-bold text-lg">{row.total_score}</td>
              <td className="border p-2">
                {row.criterion_breakdown.map(cb => (
                  <div key={cb.criterion}>{cb.criterion}: <b>{cb.avg_score}</b></div>
                ))}
              </td>
              <td className="border p-2">
                {row.judges_list.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded mb-2"
        onClick={() => exportToCSV(csvRows, "design_event_results.csv")}
        disabled={!csvRows.length}
      >
        Export to CSV
      </button>
    </div>
  )
}
