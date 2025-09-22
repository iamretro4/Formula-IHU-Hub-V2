'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { FaRegCommentDots } from 'react-icons/fa'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function ChecklistRunnerPage() {
  const { bookingId } = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [booking, setBooking] = useState(null)
  const [checklist, setChecklist] = useState([])
  const [status, setStatus] = useState({})
  const [user, setUser] = useState(null)
  const [commenting, setCommenting] = useState(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load booking/user/checklist/progress
  useEffect(() => {
    async function load() {
      try {
        setLoading(true)
        setError(null)

        // Get user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        setUser(user)

        // Fetch booking with inspection type info
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select(`
            *,
            inspection_types(name),
            teams(name, code)
          `)
          .eq('id', bookingId)
          .single()
        
        if (bookingError) throw bookingError
        setBooking(booking)

        // Fetch template items (corrected table and column names)
        const { data: items, error: itemsError } = await supabase
          .from('checklist_templates')
          .select('*')
          .eq('inspection_type_id', booking?.inspection_type_id)
          .order('section')
          .order('order_index')
        
        if (itemsError) throw itemsError
        setChecklist(items ?? [])

        // Fetch progress (per item)
        const { data: progress, error: progressError } = await supabase
          .from('inspection_progress')
          .select(`
            *,
            user_profiles!inspection_progress_user_id_fkey(first_name, last_name)
          `)
          .eq('booking_id', bookingId)
        
        if (progressError) throw progressError
        
        const s = {}
        for (const rec of progress) s[rec.item_id] = rec
        setStatus(s)

      } catch (err) {
        console.error('Error loading checklist:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    if (bookingId) load()
  }, [bookingId, supabase])

  // Auto-status to "ongoing" when loaded
  useEffect(() => {
    if (booking && booking.status && booking.status !== 'ongoing') {
      async function updateStatus() {
        try {
          const { error } = await supabase
            .from('bookings')
            .update({ status: 'ongoing' })
            .eq('id', booking.id)
          
          if (error) throw error

          // Refetch the booking to update local state
          const { data: updatedBooking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', booking.id)
            .single()
          setBooking(updatedBooking)
        } catch (err) {
          console.error('Error updating status:', err)
        }
      }
      updateStatus()
    }
  }, [booking, supabase])

  // Checkbox handler with retry logic
  async function markItem(item_id, checked) {
    const now = new Date().toISOString()
    const current = status[item_id] || {}
    const payload = {
      booking_id: bookingId,
      item_id,
      user_id: user?.id,
      checked_at: checked ? now : null,
      status: checked ? 'pass' : null,
      comment: current.comment || '',
    }

    // Optimistic update
    setStatus((prev) => ({
      ...prev,
      [item_id]: { ...current, ...payload }
    }))

    setSaving(true)
    try {
      const { error } = await supabase
        .from('inspection_progress')
        .upsert([payload], { 
          onConflict: 'booking_id,item_id',
          ignoreDuplicates: false 
        })
      
      if (error) throw error
    } catch (err) {
      console.error('Error saving item:', err)
      // Revert optimistic update
      setStatus((prev) => ({
        ...prev,
        [item_id]: current
      }))
      alert('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Comment modal handlers
  function openComment(item_id) {
    setCommenting(item_id)
    setCommentDraft(status[item_id]?.comment || '')
  }

  async function saveComment(item_id) {
    const now = status[item_id]?.checked_at || null
    const row = {
      booking_id: bookingId,
      item_id,
      user_id: user?.id,
      checked_at: now,
      status: now ? 'pass' : null,
      comment: commentDraft
    }

    setStatus(prev => ({
      ...prev,
      [item_id]: { ...(prev[item_id] || {}), ...row }
    }))

    setSaving(true)
    try {
      const { error } = await supabase
        .from('inspection_progress')
        .upsert([row], { 
          onConflict: 'booking_id,item_id',
          ignoreDuplicates: false 
        })
      
      if (error) throw error
      
      setCommenting(null)
      setCommentDraft('')
    } catch (err) {
      console.error('Error saving comment:', err)
      alert('Failed to save comment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Success: all items must be checked
  const allChecked = checklist.length > 0 && checklist.every(item => status[item.id]?.status === 'pass')
  const completionCount = checklist.filter(item => status[item.id]?.status === 'pass').length

  // Save failed/passed result
  async function markInspectionComplete(passed) {
    if (passed && !allChecked) {
      alert('All checklist items must be completed before marking as passed')
      return
    }

    setSaving(true)
    try {
      // Update booking status
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', bookingId)
      
      if (bookingError) throw bookingError

      // Update inspection result
      const { error: resultError } = await supabase
        .from('inspection_results')
        .upsert([{
          booking_id: bookingId,
          status: passed ? 'passed' : 'failed',
          completed_at: new Date().toISOString(),
          scrutineer_ids: user ? [user.id] : []
        }])

      if (resultError) throw resultError

      alert(`Inspection marked as ${passed ? 'Passed' : 'Failed'}!`)
      router.push('/scrutineering/live')
    } catch (err) {
      console.error('Error completing inspection:', err)
      alert('Failed to complete inspection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Group by section for rendering
  const itemsBySection = {}
  for (const item of checklist) {
    if (!itemsBySection[item.section]) itemsBySection[item.section] = []
    itemsBySection[item.section].push(item)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading checklist...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">Error loading checklist: {error}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold mb-1">
            {booking?.inspection_types?.name ?? 'Inspection'}
          </h1>
          <div className="text-sm text-gray-600">
            {booking?.teams?.name} ({booking?.teams?.code}) • {booking?.start_time}
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {completionCount} of {checklist.length} completed
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${checklist.length > 0 ? (completionCount / checklist.length) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-8">
        {Object.entries(itemsBySection).map(([section, items]) =>
          <fieldset key={section} className="bg-neutral-50 border rounded mb-6">
            <legend className="font-bold px-4 py-2 text-lg">{section}</legend>
            <div className="space-y-2 px-4 py-2">
              {items.map(item =>
                <div key={item.id} className="flex flex-col border-b py-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={status[item.id]?.status === 'pass'}
                      onChange={e => markItem(item.id, e.target.checked)}
                      disabled={saving}
                      className="mr-2"
                    />
                    <button
                      className="ml-4 text-gray-400 hover:text-blue-900"
                      onClick={() => openComment(item.id)}
                      title="Add/View Comment"
                      disabled={saving}
                    >
                      <FaRegCommentDots size={18}/>
                    </button>
                  </div>
                  <div className="ml-8 font-medium">{item.description}</div>
                  
                  {/* Audit trail */}
                  {(status[item.id]?.checked_at || status[item.id]?.comment) && (
                    <div className="ml-8 mt-1 text-xs text-gray-500">
                      {status[item.id]?.checked_at && (
                        <>
                          Checked by <b>
                            {status[item.id]?.user_profiles ? 
                              `${status[item.id].user_profiles.first_name} ${status[item.id].user_profiles.last_name}` :
                              user?.email || user?.id
                            }
                          </b> at {new Date(status[item.id].checked_at).toLocaleString()}<br />
                        </>
                      )}
                      {status[item.id]?.comment && (
                        <span>Note: {status[item.id].comment}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </fieldset>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end mt-10">
        <button
          className="bg-red-600 hover:bg-red-800 text-white px-5 py-2 rounded disabled:opacity-50"
          onClick={() => markInspectionComplete(false)}
          disabled={!checklist.length || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Mark as Failed
        </button>
        <button
          className="bg-green-700 hover:bg-green-900 text-white px-5 py-2 rounded disabled:opacity-50"
          onClick={() => markInspectionComplete(true)}
          disabled={!allChecked || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Mark as Passed
        </button>
      </div>

      {/* Comment Modal */}
      {commenting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow-lg p-4 min-w-[320px] max-w-sm">
            <div className="font-semibold mb-2">Note for item</div>
            <textarea
              className="w-full border rounded p-2"
              rows={4}
              value={commentDraft}
              onChange={e => setCommentDraft(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button
                className="px-3 py-1 bg-neutral-200 rounded"
                onClick={() => setCommenting(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-blue-700 text-white rounded disabled:opacity-50"
                onClick={() => saveComment(commenting)}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {saving && <div className="text-xs text-gray-500 mt-2">Saving...</div>}
    </div>
  )
}