'use client'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/lib/types/database'

type InspectionType = Database['public']['Tables']['inspection_types']['Row']
type Booking = Database['public']['Tables']['bookings']['Row'] & {
  team?: { name: string }[] | null; // Changed to array
  inspection_type?: { name: string }[] | null; // Changed to array
}

function getSlots(startTime: string, endTime: string, duration: number) {
  const slots: string[] = []
  let [h, m] = startTime.split(':').map(Number)
  let end = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1])
  let minutes = h * 60 + m
  while (minutes + duration <= end) {
    let hours = String(Math.floor(minutes / 60)).padStart(2, '0')
    let mins = String(minutes % 60).padStart(2, '0')
    slots.push(`${hours}:${mins}`)
    minutes += duration
  }
  return slots
}

export default function ScrutineeringCalendarGrid() {
  const [inspectionTypes, setInspectionTypes] = useState<InspectionType[]>([])
  const [allBookings, setAllBookings] = useState<Booking[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [today, setToday] = useState(() => new Date().toISOString().split('T')[0])
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    let active = true
    ;(async () => {
      // Get current user + profile (role/team)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('app_role, team_id')
        .eq('id', user.id)
        .single()
      setUserRole(profile?.app_role || '')
      setTeamId(profile?.team_id || null)
      // Inspection types
      const { data: types } = await supabase
        .from('inspection_types')
        .select('id, name, duration, duration_minutes, slot_count, requirements, sort_order, active, description, concurrent_slots, prerequisites, created_at, key') // Fetch all fields
        .order('sort_order')
      setInspectionTypes(types ?? [])
      // All bookings (with team+type name)
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, inspection_type_id, team_id, start_time, end_time, resource_index, status, date, is_rescrutineering,
          priority_level, notes, created_by, created_at, updated_at, inspection_status, assigned_scrutineer_id, started_at, completed_at,
          team:teams(name), inspection_type:inspection_types(name)
        `) // Fetch all fields
        .eq('date', today)
      setAllBookings(bookings ?? [])
    })()
    return () => { active = false }
  }, [supabase, today])

  // Build grid
  const gridByType: Record<string, { time: string; booking: Booking | undefined }[]> = inspectionTypes.reduce((acc: Record<string, { time: string; booking: Booking | undefined }[]>, type: InspectionType) => {
    const dur = Number(type.duration ?? type.duration_minutes ?? 120)
    acc[type.id] = getSlots('09:00', '19:00', dur).map(time => {
      const found = allBookings.find(
        b => b.inspection_type_id === type.id && b.start_time === time
      )
      return {
        time,
        booking: found
      }
    })
    return acc
  }, {})

  return (
    <div className="overflow-x-auto p-6">
      <h1 className="text-2xl font-black mb-4">Scrutineering Day Grid ({today})</h1>
      <div className="mb-3">
        <input
          type="date"
          value={today}
          onChange={e => setToday(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      <table className="min-w-full border-collapse border bg-white shadow">
        <thead>
          <tr>
            <th className="border px-2 py-1 bg-gray-100 text-sm sticky left-0 z-10">Time Slot</th>
            {inspectionTypes.map(type => (
              <th key={type.id} className="border px-3 py-1 bg-gray-100 text-sm">{type.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(inspectionTypes.length > 0 ?
            gridByType[inspectionTypes[0].id].map((_, rowIdx) => (
              <tr key={rowIdx}>
                <td className="border px-2 py-1 bg-gray-50 font-mono sticky left-0 z-10">
                  {gridByType[inspectionTypes[0].id][rowIdx].time}
                </td>
                {inspectionTypes.map(type => {
                  const slot = gridByType[type.id]?.[rowIdx]
                  const isBooked = !!slot?.booking
                  return (
                    <td key={type.id} className="border px-3 py-2 text-center align-middle">
                      {isBooked ? (
                        <Badge className="bg-red-50 text-red-800 border border-red-300 whitespace-pre-line">
                          Reserved
                          {(userRole === 'admin' || slot.booking?.team_id === teamId) && (
                            <span className="block text-xs font-normal">
                              {" "}
                              {userRole === "admin"
                                ? `(${slot.booking?.team?.[0]?.name ?? "Team"})` // Access first element
                                : slot.booking?.team_id === teamId
                                ? " (Your team)" : ""}
                            </span>
                          )}
                        </Badge>
                      ) : (
                        <Badge className="bg-green-50 text-green-700 border border-green-300">
                          Available
                        </Badge>
                      )}
                    </td>
                  )
                })}
              </tr>
            )) : null
          )}
        </tbody>
      </table>

      {/* All booked inspections agenda */}
      <div className="max-w-3xl mx-auto mt-10 space-y-2">
        <h2 className="text-xl font-bold mb-3">All Booked Inspections ({today}):</h2>
        {allBookings.length === 0 && (
          <div className="rounded border p-8 text-center text-gray-500 bg-white dark:bg-neutral-900">
            No bookings on this day.
          </div>
        )}
        {allBookings.map(b => (
          <div key={b.id} className="border rounded-lg bg-white p-4 flex justify-between items-center shadow">
            <div>
              <div className="font-bold">
                {b.inspection_type?.[0]?.name ?? "Inspection"} {/* Access first element */}
                <span className="font-medium text-gray-600 ml-2">({b.team?.[0]?.name})</span> {/* Access first element */}
              </div>
              <div className="text-gray-500 text-sm">
                {b.start_time} – {b.end_time}, Lane {b.resource_index}
              </div>
            </div>
            <Badge>{b.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}