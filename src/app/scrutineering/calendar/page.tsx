'use client'
console.log('SCRUTINEERING CALENDAR COMPONENT MOUNTED');

// =====================================================
// Formula IHU Hub - Scrutineering Calendar Page
// File: src/app/scrutineering/calendar/page.tsx
// =====================================================


import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Map status to color
const statusColor: Record<string, string> = {
  'upcoming': 'bg-blue-100 text-blue-700 border-blue-400',
  'ongoing': 'bg-yellow-100 text-yellow-800 border-yellow-400',
  'completed': 'bg-green-100 text-green-900 border-green-400',
  'cancelled': 'bg-gray-100 text-gray-500 border-gray-400',
  'no_show': 'bg-red-50 text-red-700 border-red-400'
}

type BookingRow = {
  id: string
  inspection_type: { name: string }
  date: string
  start_time: string
  end_time: string
  status: string
  resource_index: number
}

export default function ScrutineeringCalendarPage() {
  const [rows, setRows] = useState<BookingRow[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
  console.log('Effect running in Scrutineering Calendar');
    let active = true
    ;(async () => {
  console.log('Async useEffect inner executing');
      // Get logged-in user's team id
      const { data: { user } } = await supabase.auth.getUser()
console.log('USER:', user); // Log user object
      if (!user || !active) return
      const { data: profile } = await supabase.from('user_profiles').select('team_id').eq('id', user.id).single()
console.log('PROFILE FETCHED:', profile); // Log profile object
      if (!profile?.team_id) {
        setTeamId(null)
        setRows([]) // No team, so nothing to show
        return
      }

console.log('PROFILE FETCHED:', profile);
console.log('USER ID (from auth):', user.id);


      setTeamId(profile.team_id)
      // Fetch bookings for this team
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('id, date, start_time, end_time, status, resource_index, inspection_type:inspection_types(name)')
        .eq('team_id', profile.team_id)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
      if (!active) return
      setRows(bookings ?? [])
    })()
    return () => { active = false }
  }, [supabase])

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-black mb-4">Scrutineering Calendar</h1>
      {teamId === null ? (
        <p className="text-red-600">No team profile found — please complete your profile.</p>
      ) : (
        <>
          <div className="space-y-4">
            {rows.length === 0 && (
              <div className="rounded border p-8 text-center text-gray-500 bg-white dark:bg-neutral-900">
                You have no current scrutineering bookings.
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/scrutineering/book">
                      Book Inspection Slot
                    </Link>
                  </Button>
                </div>
              </div>
            )}
            {rows.map(b => (
              <Card key={b.id} className="flex flex-col md:flex-row md:items-center md:justify-between p-4">
                <CardHeader className="p-0 mb-3 md:mb-0">
                  <CardTitle className="mb-1">{b.inspection_type?.name}</CardTitle>
                  <div className="text-sm text-gray-500">
                    {b.date} {b.start_time} – {b.end_time} | Lane {b.resource_index}
                  </div>
                </CardHeader>
                <CardContent className="p-0 flex flex-col md:items-end gap-2">
                  <Badge className={`px-2 py-1 border ${statusColor[(b.status as string) || 'upcoming'] ?? ''}`}>
                    {b.status}
                  </Badge>
                  {/* Allow rescheduling, cancellation etc based on status/RLS in future */}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button asChild>
              <Link href="/scrutineering/book">Book Another Inspection</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}