'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  FaTachometerAlt, FaTrophy, FaCalendarAlt, FaCheckCircle, FaList,
  FaTasks, FaChartBar, FaClipboardCheck, FaUser, FaSignOutAlt, FaCogs,
  FaUsers, FaGavel, FaBook, FaHistory, FaUsersCog, FaCommentDots
} from 'react-icons/fa'

type NavSection = {
  label: string
  items: {
    label: string,
    href: string,
    icon: React.ReactNode,
    roles?: string[]
  }[]
}

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
    { label: 'Design Leaderboard', href: '/judged-events/engineering-design/results', icon: <FaBook /> },
    { label: 'Business Plan Leaderboard', href: '/judged-events/business-plan/results', icon: <FaCogs /> },
    { label: 'Cost & Manufacturing Leaderboard', href: '/judged-events/cost-manufacturing/results', icon: <FaHistory /> },
    { label: 'Multi-Event Summary', href: '/judged-events/summary', icon: <FaChartBar /> },
    { label: 'Design Admin', href: '/judged-events/engineering-design/admin', icon: <FaUsersCog />, roles: ['admin'] },
    { label: 'Business Admin', href: '/judged-events/business-plan/admin', icon: <FaUsersCog />, roles: ['admin'] },
    { label: 'Cost Admin', href: '/judged-events/cost-manufacturing/admin', icon: <FaUsersCog />, roles: ['admin'] },
    { label: 'Advanced Admin Panel', href: '/judged-events/engineering-design/admin/advanced', icon: <FaGavel />, roles: ['admin'] },
    // Add similar links for other event advanced panels if needed
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
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClientComponentClient()
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
  }, [supabase])
  return (
    <aside className="h-full w-64 flex-shrink-0 border-r bg-white dark:bg-neutral-900 flex flex-col">
      <div className="px-6 py-5 flex items-center gap-2 border-b">
        <span className="text-2xl"><span role="img" aria-label="flag">🏁</span></span>
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
        <div className="rounded-full h-8 w-8 bg-gray-200 flex items-center justify-center text-base font-bold">{profile?.first_name?.[0] ?? '?'}</div>
        <div>
          <div className="text-xs font-semibold">{profile?.first_name} {profile?.last_name}</div>
          <div className="text-xs text-gray-500 capitalize">{role}</div>
        </div>
      </div>
    </aside>
  )
}
