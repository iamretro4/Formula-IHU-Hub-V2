// =====================================================
// Formula IHU Hub - Scrutineering Booking Form
// File: src/app/scrutineering/book/page.tsx
// =====================================================
'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const schema = z.object({
  inspection_type_id: z.string().uuid(),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  resource_index: z.coerce.number().min(1, "Slot is required"),
  notes: z.string().optional()
})
type Values = z.infer<typeof schema>

export default function ScrutineeringBookPage() {
  const [inspectionTypes, setInspectionTypes] = useState<{ id: string, name: string }[]>([])
  const [slots, setSlots] = useState<number[]>([1])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClientComponentClient()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema)
  })

  // On load, get available inspection types
  useEffect(() => {
    let active = true
    ;(async () => {
      // Get user's team
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      const { data: profile } = await supabase.from('user_profiles').select('team_id').eq('id', user.id).single()
      if (!profile?.team_id) return
      setTeamId(profile.team_id)
      // Get inspection types
      const { data: types } = await supabase.from('inspection_types').select('id, name').eq('active', true).order('sort_order')
      setInspectionTypes(types ?? [])
    })()
    return () => { active = false }
  }, [supabase])

  // Load allowable slots for the selected inspection type (just [1] unless you have concurrency)
  useEffect(() => {
    // TODO: If you have concurrency > 1, fetch concurrent slot count for this type
    setSlots([1,2]) // e.g., up to two parallel lanes if wanted (or just [1])
  }, [watch('inspection_type_id')])

  async function onSubmit(values: Values) {
    setOk(false)
    setError(null)
    setLoading(true)
    // check if duplicate booking exists for team/type/date
    const { data: existing } = await supabase
      .from('bookings')
      .select('*')
      .eq('team_id', teamId)
      .eq('inspection_type_id', values.inspection_type_id)
      .eq('date', values.date)
      .eq('start_time', values.start_time)
      .eq('resource_index', values.resource_index)
      .single()
    if (existing) {
      setError('You already have a booking for this slot.')
      setLoading(false)
      return
    }
    const { error } = await supabase.from('bookings').insert({
      team_id: teamId,
      inspection_type_id: values.inspection_type_id,
      date: values.date,
      start_time: values.start_time,
      end_time: values.start_time, // (can auto-calc later: add duration)
      resource_index: values.resource_index,
      status: 'upcoming',
      notes: values.notes,
      created_by: (await supabase.auth.getUser()).data.user.id
    })
    setLoading(false)
    if (error) setError(error.message)
    else setOk(true)
  }

  if (!teamId) {
    return <div className="p-8 text-center text-red-600">No team profile found. Please complete your profile first.</div>
  }
  if (ok) {
    return <div className="max-w-lg mx-auto p-8 text-center text-green-700 font-bold">Booking successful!</div>
  }
  return (
    <div className="max-w-lg mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-black mb-4">Book Scrutineering Slot</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Inspection Type</label>
          <select {...register('inspection_type_id')} className="w-full border rounded p-2">
            <option value="">Select…</option>
            {inspectionTypes.map(t =>
              <option key={t.id} value={t.id}>{t.name}</option>
            )}
          </select>
          {errors.inspection_type_id && <div className="text-sm text-red-600">{errors.inspection_type_id.message}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <Input {...register('date')} type="date" className="w-full"/>
          {errors.date && <div className="text-sm text-red-600">{errors.date.message}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <Input {...register('start_time')} type="time" className="w-full"/>
          {errors.start_time && <div className="text-sm text-red-600">{errors.start_time.message}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slot/Lane</label>
          <select {...register('resource_index')} className="w-full border rounded p-2">
            {slots.map(n => <option key={n} value={n}>Lane {n}</option>)}
          </select>
          {errors.resource_index && <div className="text-sm text-red-600">{errors.resource_index.message}</div>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <Input {...register('notes')} type="text" className="w-full"/>
        </div>
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        <Button disabled={loading} type="submit" className="w-full mt-2">
          {loading ? 'Booking…' : 'Book Slot'}
        </Button>
      </form>
    </div>
  )
}
