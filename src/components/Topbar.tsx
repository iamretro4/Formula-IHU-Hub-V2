'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  BellIcon,
  PlusIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { Modal } from './Modal'
import { CreateTeamModal } from './CreateTeamModal'
import { CreateVehicleModal } from './CreateVehicleModal'
import { ScheduleScrutineeringModal } from './ScheduleScrutineeringModal'

export function Topbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false)
  const [showCreateVehicleModal, setShowCreateVehicleModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)

  if (!session) return null

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const quickActions = [
    {
      name: 'Create Team',
      action: () => setShowCreateTeamModal(true),
      roles: ['ADMIN', 'TEAM_USER']
    },
    {
      name: 'Add Vehicle',
      action: () => setShowCreateVehicleModal(true),
      roles: ['ADMIN', 'TEAM_USER']
    },
    {
      name: 'Schedule Scrutineering',
      action: () => setShowScheduleModal(true),
      roles: ['ADMIN', 'SCRUTINEER']
    },
  ]

  const availableActions = quickActions.filter(action => 
    action.roles.includes(session.user.role)
  )

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-lg">
            <form onSubmit={handleSearch} className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search teams, vehicles, or scrutineering..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Quick Actions */}
            {availableActions.length > 0 && (
              <Menu as="div" className="relative">
                <Menu.Button className="btn-primary flex items-center">
                  <PlusIcon className="w-4 h-4 mr-2" />
                  Quick Actions
                  <ChevronDownIcon className="w-4 h-4 ml-2" />
                </Menu.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      {availableActions.map((action) => (
                        <Menu.Item key={action.name}>
                          {({ active }) => (
                            <button
                              onClick={action.action}
                              className={`${
                                active ? 'bg-gray-50' : ''
                              } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                            >
                              {action.name}
                            </button>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
            )}

            {/* Notifications */}
            <button className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-lg">
              <BellIcon className="w-6 h-6" />
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" />
            </button>

            {/* User Menu */}
            <Menu as="div" className="relative">
              <Menu.Button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                  </span>
                </div>
                <ChevronDownIcon className="w-4 h-4 ml-2 text-gray-400" />
              </Menu.Button>
              <Transition
                as={Fragment}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b border-gray-200">
                      <p className="font-medium text-gray-900">{session.user.name}</p>
                      <p className="text-xs">{session.user.email}</p>
                      <p className="text-xs capitalize mt-1">
                        {session.user.role.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => router.push('/profile')}
                          className={`${
                            active ? 'bg-gray-50' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          Profile Settings
                        </button>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={() => signOut()}
                          className={`${
                            active ? 'bg-gray-50' : ''
                          } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                        >
                          Sign Out
                        </button>
                      )}
                    </Menu.Item>
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>
          </div>
        </div>
      </header>

      {/* Modals */}
      <CreateTeamModal
        isOpen={showCreateTeamModal}
        onClose={() => setShowCreateTeamModal(false)}
      />
      <CreateVehicleModal
        isOpen={showCreateVehicleModal}
        onClose={() => setShowCreateVehicleModal(false)}
      />
      <ScheduleScrutineeringModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
      />
    </>
  )
}