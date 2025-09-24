'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

import {
  FaTachometerAlt, FaTrophy, FaCalendarAlt, FaCheckCircle, FaList,
  FaTasks, FaChartBar, FaClipboardCheck, FaUser, FaSignOutAlt, FaCogs,
  FaUsers, FaGavel, FaBook, FaHistory, FaUsersCog, FaCommentDots
} from 'react-icons/fa'

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
  roles?: string[]
}

type NavSection = {
  label: string
  items: NavItem[]
}

// ✅ create supabase browser client once
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const navConfig: NavSection[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <FaTachometerAlt /> },
      { label: 'Results', href: '/results', icon: <FaTrophy /> }
    ]
  },
  {
    label: 'SCRUTINEERING',
    items: [
      { label: 'Calendar', href: '/scrutineering/calendar', icon: <FaCalendarAlt /> },
      { label: 'Book Inspection', href: '/scrutineering/book', icon: <FaCheckCircle /> },
      { label: 'Live Inspections', href: '/scrutineering/live', icon: <FaList /> }
    ]
  },
  {
    label: 'TRACK EVENTS',
    items: [
      { label: 'Track Marshal', href: '/track/marshal', icon: <FaTasks /> },
      { label: 'Live Track Data', href: '/track/data', icon: <FaChartBar /> }
    ]
  },
  {
    label: 'JUDGED EVENTS',
    items: [
      { label: 'Design Event', href: '/judged-events/engineering-design', icon: <FaBook />, roles: ['admin', 'design_judge_software', 'design_judge_mechanical', 'design_judge_electronics', 'design_judge_overall'] },
      { label: 'Business Plan', href: '/judged-events/business-plan', icon: <FaCogs />, roles: ['admin', 'bp_judge'] },
      { label: 'Cost & Manufacturing', href: '/judged-events/cost-manufacturing', icon: <FaHistory />, roles: ['admin', 'cm_judge'] },
    ]
  },
  {
    label: 'TEAM FEATURES',
    items: [
      { label: 'Feedback Booking', href: '/team/feedback', icon: <FaCommentDots /> }
    ]
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Admin Panel', href: '/admin', icon: <FaUsersCog />, roles: ['admin'] },
      { label: 'User Management', href: '/admin/users', icon: <FaUsers />, roles: ['admin'] },
      { label: 'System Reports', href: '/admin/reports', icon: <FaClipboardCheck />, roles: ['admin', 'scrutineer'] },
      { label: 'Penalty Management', href: '/admin/penalties', icon: <FaGavel />, roles: ['admin', 'scrutineer'] }
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'My Profile', href: '/account/profile', icon: <FaUser /> },
      { label: 'Logout', href: '/account/logout', icon: <FaSignOutAlt /> }
    ]
  }
]

export default function Sidebar() {
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ first_name?: string, last_name?: string } | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('app_role, first_name, last_name')
          .eq('id', user.id)
          .single()
        if (active && data) {
          setRole(data.app_role)
          setProfile(data)
        }
      }
    })()
    return () => { active = false }
  }, [])

  return (
    <aside className="h-full w-64 flex-shrink-0 border-r bg-white dark:bg-neutral-900 flex flex-col">
      <div className="px-6 py-5 flex items-center gap-2 border-b">
        <span className="text-2xl">🏁</span>
        <div>
          <div className="font-bold text-lg">Formula IHU</div>
          <div className="text-xs text-gray-500">Competition Hub</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {navConfig.map((section, i) => (
          <div key={i} className="mb-4">
            {section.label && <div className="px-3 text-xs font-bold text-gray-400 uppercase mb-2">{section.label}</div>}
            <ul>
              {section.items
                .filter(item => !item.roles || (role && item.roles.includes(role)))
                .map(item => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 rounded px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:hover:bg-neutral-800 ${pathname.startsWith(item.href) ? 'bg-gray-100 dark:bg-neutral-900' : ''}`}>
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-4 mt-auto flex items-center gap-2 border-t">
        <div className="rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center text-base font-bold">
          {profile?.first_name?.[0] ?? '?'}
        </div>
        <div>
          <div className="text-xs font-semibold">{profile?.first_name} {profile?.last_name}</div>
          <div className="text-xs text-gray-500 capitalize">{role}</div>
        </div>
      </div>
    </aside>
  )
}
