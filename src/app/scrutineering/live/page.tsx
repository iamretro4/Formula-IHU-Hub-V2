'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Badge } from '@/components/ui/badge'
import { FaPlay } from 'react-icons/fa'
import { Database } from '@/lib/types/database'

type Booking = Database['public']['Tables']['bookings']['Row'] & {
  team?: { name: string }[] | null; // Changed to array
  inspection_type?: { name: string }[] | null; // Changed to array
}

export default function LiveInspectionsQueue() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [role, setRole] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [today, setToday] = useState('')
  const [tab, setTab] = useState<'upcoming' | 'ongoing'>('upcoming')
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    setToday(new Date().toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (!today) return
    let cancelled = false
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('app_role, team_id')
        .eq('id', user.id).single()
      if (!profile || cancelled) return
      setRole(profile.app_role)
      setTeamId(profile.team_id)
    })()
    return () => { cancelled = true }
  }, [supabase, today])

  useEffect(() => {
    if (!today) return
    let cancelled = false
    let intervalId: NodeJS.Timeout
    async function loadQueue() {
      let query = supabase
        .from('bookings')
        .select(`
          id, inspection_type_id, team_id, date, start_time, end_time, resource_index, status, is_rescrutineering, priority_level, notes, created_by, created_at, updated_at, inspection_status, assigned_scrutineer_id, started_at, completed_at,
          team:teams(name), inspection_type:inspection_types(name)
        `)
        .eq('date', today)
        .in('status', ['upcoming', 'ongoing'])
        .order('start_time')
      if (role === 'team_leader' || role === 'team_member') {
        query = query.eq('team_id', teamId)
      }
      const { data } = await query
      if (!cancelled) setBookings(data ?? [])
    }
    loadQueue()
    intervalId = setInterval(loadQueue, 12000)
    return () => { cancelled = true; clearInterval(intervalId) }
  }, [supabase, today, role, teamId])

  if (!today) return null

  const byStatus = (statusFilter: 'upcoming' | 'ongoing') => bookings.filter(b => b.status === statusFilter)

  // Optional: mapping for type/teamIDs to known names
const knownInspectionTypes: Record<string, string> = {
  '8d226f72-d860-4950-a6b4-f6871ad6f8bd': 'Pre-Inspection',
  '4bdabce0-bdcc-41a9-a671-fc640b55e8d0': 'Mechanical',
  'bc71e416-e3cb-48d4-844e-9e1cf3aa27d9': 'Accumulator',
  'ff175c8c-373e-4d23-8882-05c674eaeba6': 'Electrical',
  '81f8202d-2dd7-40ee-b663-db1a64c875e0': 'Tilt Test',
  'b17a42bf-0e15-4acb-b0a4-fe84b2d3f5a9': 'Rain Test',
  'a54eb26f-89cc-4be1-a972-6f7b75c178d3': 'Brake Test'
}

const knownTeams: Record<string, string> = {
  '211c3377-b2b5-4c77-b67f-eae6d5a30a4b': 'FUF Racing',
  '3929d2e2-a89d-485b-85cc-0f6438194fe7': 'Poseidon Racing Team',
  '4ee7e73b-f319-49a5-a53f-87db0833dcfa': 'Aristotle Racing Team',
  '83cc921f-4bfd-4859-b824-b803da2bf698': 'Kingston Formula',
  '87692359-e2af-4d78-9e7c-f9518b2f9c03': 'TUIASI Racing',
  '9de9e061-dc40-430b-a495-6fb1b31e811e': 'UCY Racing',
  'c7140872-dae8-41c0-9a67-32b2a6cfe10b': 'Perseus Racing Team',
  'd0c8e110-423a-40fd-b943-de9312ea7082': 'FS TUC',
  'ec797554-d9ee-4751-ab76-be32ca9cd4a4': 'Aristurtle',
  'f21a3608-ae9d-488e-bd12-881864c7f072': 'Pelops Racing',
  'f7f62e41-c896-4ad0-8dc5-d78b3e307cdd': 'Democritus Racing Team',
  'ff1106ac-1474-4b66-b661-5612d211eb9a': 'Centaurus Racing Team'
}


  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-black mb-1">Live Inspections Queue</h1>
      <p className="text-gray-500 mb-5">View and manage today’s inspections.</p>
      <div className="flex bg-neutral-100 rounded overflow-hidden max-w-md mx-auto text-sm font-semibold mb-6">
        <button
          onClick={() => setTab('upcoming')}
          className={`w-1/2 transition py-2 ${tab === 'upcoming' ? 'bg-white' : 'text-gray-500'}`}
        >
          Upcoming ({byStatus('upcoming').length})
        </button>
        <button
          onClick={() => setTab('ongoing')}
          className={`w-1/2 transition py-2 ${tab === 'ongoing' ? 'bg-white' : 'text-gray-500'}`}
        >
          Ongoing ({byStatus('ongoing').length})
        </button>
      </div>
      <div>
        {byStatus(tab).length === 0 ? (
          <div className="rounded border p-8 text-center text-gray-500 bg-white dark:bg-neutral-900">
            No {tab} inspections for today.
          </div>
        ) : (
          <div className="space-y-3">
            {byStatus(tab).map(b => (
              <div key={b.id} className="border rounded-lg px-5 py-4 bg-white shadow flex items-center justify-between">
                <div>
                  <div className="font-bold">
                    {knownInspectionTypes[b.inspection_type_id] ?? b.inspection_type?.[0]?.name ?? "Inspection"} {/* Access first element */}
                  </div>
                  <div className="text-xs text-gray-500">
                    {knownTeams[b.team_id] ?? b.team?.[0]?.name} {/* Access first element */}
                  </div>
                  <div className="text-xs">
                    Slot: {b.start_time}
                    {b.is_rescrutineering && (
                      <span className="ml-2 px-2 bg-purple-100 text-purple-800 rounded-full border border-purple-300">Reinspection</span>
                    )}
                  </div>
                </div>
                <div className="ml-3 flex flex-col items-end">
                  {tab === 'upcoming' && (
                    <Badge className="mb-2 bg-gray-100 text-gray-600">Upcoming</Badge>
                  )}
                  {tab === 'ongoing' && (
                    <Badge className="mb-2 bg-yellow-100 text-yellow-800">Ongoing</Badge>
                  )}
                  {(role === 'admin' || role === 'scrutineer') && (
                    <Link
                      href={`/scrutineering/live/${b.id}`}
                      className="inline-flex items-center gap-1 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded font-semibold shadow text-sm transition"
                    >
                      <FaPlay className="mr-1" />
                      {tab === 'upcoming' ? 'Start' : 'Enter'}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}