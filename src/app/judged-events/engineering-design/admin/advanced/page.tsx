'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function AdvancedAdminPanel() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434'
  const supabase = createClientComponentClient()
  const [scores, setScores] = useState([])
  const [auditRows, setAuditRows] = useState([])
  const [judgeMap, setJudgeMap] = useState([])
  const [teamMap, setTeamMap] = useState([])
  const adminId = 'ADMIN_UUID' // Replace with logged-in admin

  useEffect(() => {
    async function load() {
      const { data: scoresData } = await supabase
        .from('judged_event_scores')
        .select('*')
      setScores(scoresData ?? [])
      const { data: audits } = await supabase
        .from('judge_score_audit').select('*').order('changed_at', { ascending: false })
      setAuditRows(audits ?? [])
      const { data: judges } = await supabase.from('user_profiles').select('id,email')
      setJudgeMap(judges ?? [])
      const { data: teams } = await supabase.from('teams').select('id,name')
      setTeamMap(teams ?? [])
    }
    load()
  }, [eventId, supabase])

  async function updateScore(s, newScore, newComment) {
    await supabase.from('judge_score_audit').insert({
      score_id: s.id,
      admin_id,
      old_score: s.score,
      old_comment: s.comment,
      new_score: newScore,
      new_comment: newComment,
      old_judge_id: s.judge_id,
      new_judge_id: s.judge_id
    })
    await supabase.from('judged_event_scores').update({ score: newScore, comment: newComment }).eq('id', s.id)
  }

  async function reassignJudge(s, newJudgeId) {
    await supabase.from('judge_score_audit').insert({
      score_id: s.id,
      admin_id,
      old_score: s.score,
      old_comment: s.comment,
      new_score: s.score,
      new_comment: s.comment,
      old_judge_id: s.judge_id,
      new_judge_id: newJudgeId
    })
    await supabase.from('judged_event_scores').update({ judge_id: newJudgeId }).eq('id', s.id)
  }

  function getScoresForTeam(teamId) {
    return scores.filter(s => s.team_id === teamId)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="font-bold text-xl mb-4">Admin Edit/Override</h2>
      <table className="w-full border mb-8">
        <thead>
          <tr>
            <th>Team</th>
            <th>Score</th>
            <th>Comment</th>
            <th>Judge</th>
            <th>Reassign Judge</th>
          </tr>
        </thead>
        <tbody>
          {scores.map(s => (
            <tr key={s.id}>
              <td>{teamMap.find(t=>t.id===s.team_id)?.name || s.team_id}</td>
              <td>
                <input type="number" min={0} value={s.score ?? ''}
                  onChange={e => updateScore(s, parseInt(e.target.value), s.comment)}
                  className="border rounded px-2 py-1 w-20"
                />
              </td>
              <td>
                <input type="text" value={s.comment ?? ''}
                  onChange={e => updateScore(s, s.score, e.target.value)}
                  className="border rounded px-2 py-1 w-full"
                />
              </td>
              <td>{judgeMap.find(j=>j.id===s.judge_id)?.email || s.judge_id}</td>
              <td>
                <select value={s.judge_id}
                    onChange={e => reassignJudge(s, e.target.value)}
                    className="border px-2 py-1">
                  {judgeMap.map(j =>
                    <option key={j.id} value={j.id}>{j.email}</option>
                  )}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="font-bold text-lg mt-10 mb-2">Audit Log</h2>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Score ID</th>
            <th>Old Score</th>
            <th>New Score</th>
            <th>Old Judge</th>
            <th>New Judge</th>
            <th>Changed At</th>
            <th>Admin</th>
            <th>Comment Change</th>
          </tr>
        </thead>
        <tbody>
          {auditRows.map(a => (
            <tr key={a.id}>
              <td>{a.score_id}</td>
              <td>{a.old_score}</td>
              <td>{a.new_score}</td>
              <td>{judgeMap.find(j=>j.id===a.old_judge_id)?.email || a.old_judge_id}</td>
              <td>{judgeMap.find(j=>j.id===a.new_judge_id)?.email || a.new_judge_id}</td>
              <td>{a.changed_at}</td>
              <td>{a.admin_id}</td>
              <td>{a.old_comment}→{a.new_comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="font-bold text-lg mt-10 mb-2">Team Extraction</h2>
      <ul>
        {teamMap.map(t =>
          <li key={t.id} className="mb-2">
            <b>{t.name}</b>
            <pre className="bg-gray-100 p-2">{JSON.stringify(getScoresForTeam(t.id), null, 2)}</pre>
          </li>)}
      </ul>
    </div>
  )
}
