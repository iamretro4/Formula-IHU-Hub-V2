'use client'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const schema = z.object({
  inspection_type_id: z.string().uuid(),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().min(1, "Start time is required"),
  resource_index: z.coerce.number().min(1, "Slot is required"),
  notes: z.string().optional()
})
type Values = z.infer<typeof schema>
type InspectionTypeCard = {
  id: string
  name: string
  duration?: string|number
  duration_minutes?: number
  slots?: number
  slot_count?: number
  can_book: boolean
  subtitle?: string
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

export default function ScrutineeringBookPage() {
  const [inspectionTypes, setInspectionTypes] = useState<InspectionTypeCard[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedInspectionType, setSelectedInspectionType] = useState<InspectionTypeCard | null>(null)
  const [reservedSlots, setReservedSlots] = useState<string[]>([])
  const supabase = createClientComponentClient()
  const {
    register, handleSubmit, setValue, watch, formState: { errors }
  } = useForm<Values>({ resolver: zodResolver(schema) })
  // --- DB Load ---
  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !active) return
      const { data: profile } = await supabase.from('user_profiles').select('team_id').eq('id', user.id).single()
      if (!profile?.team_id) return
      setTeamId(profile.team_id)
      const { data: types } = await supabase
        .from('inspection_types')
        .select('id, name, duration, duration_minutes, slot_count, requirements, sort_order, active')
        .order('sort_order')
      const uniqueTypes = Array.from(
        new Map((types ?? []).map(t => [t.id, t])).values()
      )
      setInspectionTypes(
        (uniqueTypes).map(t => ({
          id: t.id,
          name: t.name,
          duration: t.duration ?? t.duration_minutes ?? 120,
          slots: t.slot_count || 1,
          can_book: t.active,
          subtitle: t.requirements ? `Requires ${t.requirements}` : undefined
        }))
      )
    })()
    return () => { active = false }
  }, [supabase])

  // When type/date changes, fetch that day's reserved slots for that type and lane
  useEffect(() => {
    if (!selectedInspectionType) return setReservedSlots([])
    if (!watch('date')) return setReservedSlots([])
    (async () => {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('start_time')
        .eq('inspection_type_id', selectedInspectionType.id)
        .eq('date', watch('date'))
      setReservedSlots((bookings ?? []).map(b => b.start_time))
    })()
  }, [selectedInspectionType, watch('date'), supabase])

  function selectType(t: InspectionTypeCard) {
    setSelectedInspectionType(t)
    setValue('inspection_type_id', t.id)
    setValue('date', new Date().toISOString().split('T')[0]) // Set date as today
    setValue('resource_index', 1) // Default lane
  }

  async function onSubmit(values: Values) {
    setOk(false)
    setError(null)
    setLoading(true)
    const { error } = await supabase.from('bookings').insert({
      team_id: teamId,
      inspection_type_id: values.inspection_type_id,
      date: values.date,
      start_time: values.start_time,
      end_time: values.start_time,
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

  const slots = selectedInspectionType
    ? getSlots("09:00", "19:00", Number(selectedInspectionType.duration || selectedInspectionType.duration_minutes || 120))
    : []

  return (
    <div className="flex justify-center pt-12">
      <div className="bg-white w-full max-w-2xl p-8 border rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-1">Book Inspection</h1>
        <p className="text-gray-500 mb-4">
          Book an available inspection slot for today: <span className="font-semibold">{new Date().toISOString().split('T')[0]}</span>
        </p>
        {/* Card Selection */}
        <label className="block font-semibold mb-2">1. Select Inspection Type</label>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {inspectionTypes.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => selectType(t)}
              disabled={!t.can_book}
              className={`
                flex flex-col items-start border rounded-lg px-5 py-4 transition
                ${t.can_book ? "bg-white hover:border-blue-500 cursor-pointer" : "bg-neutral-100 opacity-60 cursor-not-allowed"}
                ${selectedInspectionType?.id === t.id ? "border-2 border-black" : "border-neutral-200"}
              `}
            >
              <div className="font-bold text-md mb-1">{t.name}</div>
              <div className="text-xs text-gray-600 mb-1">
                {(t.duration || t.duration_minutes || 120) + " min"} / {(t.slots || t.slot_count || 1)} slot(s)
              </div>
              {t.subtitle && (
                <div className="text-xs text-red-500">{t.subtitle}</div>
              )}
            </button>
          ))}
        </div>
        {/* Slot/Booking Controls */}
        {selectedInspectionType && (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
            <label className="block font-semibold mb-2">2. Select Time Slot</label>
            <select
              {...register('start_time')}
              className="w-full border rounded px-3 py-2 bg-neutral-50 focus:bg-white focus:border-blue-300"
              required
            >
              <option value="">Select an available time slot...</option>
              {slots.map(time => (
                <option key={time} value={time} disabled={reservedSlots.includes(time)}>
                  {time} {reservedSlots.includes(time) ? ' (Reserved)' : ''}
                </option>
              ))}
            </select>
            <Button
              disabled={loading}
              type="submit"
              className="w-full mt-2 py-2 text-base font-bold rounded-lg"
            >
              {loading ? 'Booking…' : 'Confirm Booking'}
            </Button>
            <Button
              variant="outline"
              type="button"
              className="w-full mt-2"
              onClick={() => setSelectedInspectionType(null)}
            >
              Change Inspection Type
            </Button>
            {error && <div className="text-center mt-3 text-red-600 font-semibold">{error}</div>}
          </form>
        )}
      </div>
    </div>
  )
}
