'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  HomeIcon,
  UserGroupIcon,
  TruckIcon,
  ClipboardDocumentCheckIcon,
  ScaleIcon,
  DocumentChartBarIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { hasMinimumRole } from '@/lib/auth'
import { UserRole } from '@prisma/client'

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon, roles: ['VIEWER', 'TEAM_USER', 'SCRUTINEER', 'JUDGE', 'ADMIN'] },
  { name: 'Teams', href: '/teams', icon: UserGroupIcon, roles: ['VIEWER', 'TEAM_USER', 'SCRUTINEER', 'JUDGE', 'ADMIN'] },
  { name: 'Vehicles', href: '/vehicles', icon: TruckIcon, roles: ['VIEWER', 'TEAM_USER', 'SCRUTINEER', 'JUDGE', 'ADMIN'] },
  { name: 'Scrutineering', href: '/scrutineering', icon: ClipboardDocumentCheckIcon, roles: ['SCRUTINEER', 'JUDGE', 'ADMIN'] },
  { name: 'Judging', href: '/judging', icon: ScaleIcon, roles: ['JUDGE', 'ADMIN'] },
  { name: 'Reports', href: '/reports', icon: DocumentChartBarIcon, roles: ['JUDGE', 'ADMIN'] },
  { name: 'Admin', href: '/admin', icon: CogIcon, roles: ['ADMIN'] },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) return null

  const userRole = session.user.role

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  )

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!collapsed && (
            <div className="flex items-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <ClipboardDocumentCheckIcon className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-lg font-semibold text-gray-900">
                Scrutineer Hub
              </span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 border-r-2 border-indigo-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className={`flex-shrink-0 w-5 h-5 ${
                  isActive ? 'text-indigo-700' : 'text-gray-400'
                }`} />
                {!collapsed && (
                  <span className="ml-3">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {session.user.name?.charAt(0) || session.user.email?.charAt(0)}
                </span>
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userRole.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}