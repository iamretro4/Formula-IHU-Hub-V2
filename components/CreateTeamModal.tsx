'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import toast from 'react-hot-toast'
import { Modal } from './Modal'
import { teamSchema, TeamInput } from '@/lib/validators'

interface CreateTeamModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateTeamModal({ isOpen, onClose }: CreateTeamModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TeamInput>({
    resolver: zodResolver(teamSchema),
  })

  const onSubmit = async (data: TeamInput) => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create team')
      }

      const team = await response.json()
      
      toast.success('Team created successfully!')
      reset()
      onClose()
      router.push(`/teams/${team.id}`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Team">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="form-label">Team Name *</label>
          <input
            type="text"
            {...register('name')}
            className="form-input"
            placeholder="Enter team name"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Country</label>
          <input
            type="text"
            {...register('country')}
            className="form-input"
            placeholder="Enter country"
          />
          {errors.country && (
            <p className="text-sm text-red-600 mt-1">{errors.country.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Contact Email *</label>
          <input
            type="email"
            {...register('contactEmail')}
            className="form-input"
            placeholder="team@example.com"
          />
          {errors.contactEmail && (
            <p className="text-sm text-red-600 mt-1">{errors.contactEmail.message}</p>
          )}
        </div>

        <div>
          <label className="form-label">Contact Phone</label>
          <input
            type="tel"
            {...register('contactPhone')}
            className="form-input"
            placeholder="+1 (555) 123-4567"
          />
          {errors.contactPhone && (
            <p className="text-sm text-red-600 mt-1">{errors.contactPhone.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="spinner mr-2" />
                Creating...
              </>
            ) : (
              'Create Team'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}