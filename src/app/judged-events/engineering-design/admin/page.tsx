'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function DesignEventAdminPage() {
  const eventId = 'e8447aed-c7a5-4fc7-b198-67ae4a410434'
  const supabase = createClientComponentClient()
  const [bookings, setBookings] = useState([])

  useEffect(() => {
    async function fetchBookings() {
      // Get all bookings for the event, with team info
      const { data } = await supabase
        .from('judged_event_bookings')
        .select('id, team_id, status, teams(name)')
        .eq('event_id', eventId)
      setBookings(data ?? [])
    }
    fetchBookings()
  }, [eventId, supabase])

  // Allows manual refresh from admin UI
  async function refreshStatuses() {
    const { data } = await supabase
      .from('judged_event_bookings')
      .select('id, team_id, status, teams(name)')
      .eq('event_id', eventId)
    setBookings(data ?? [])
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Design Event – Booking Status</h1>
      <table className="w-full border mb-8">
        <thead>
          <tr>
            <th className="border p-2">Team</th>
            <th className="border p-2">Booking ID</th>
            <th className="border p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map(b => (
            <tr key={b.id}>
              <td className="border p-2">{b.teams?.name ?? b.team_id}</td>
              <td className="border p-2 text-xs">{b.id}</td>
              <td className={`border p-2 font-semibold ${b.status === 'completed' ? 'bg-green-200' : 'bg-red-200'}`}>
                {b.status === 'completed' ? 'Completed' : 'Incomplete'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        className="bg-green-700 hover:bg-green-900 text-white px-4 py-2 rounded"
        onClick={refreshStatuses}
      >
        Refresh Statuses
      </button>
    </div>
  )
}
