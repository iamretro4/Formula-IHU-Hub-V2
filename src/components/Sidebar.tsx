// components/Sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

type NavSection = {
  label: string
  items: {
    label: string
    href: string
    icon: React.ReactNode
    roles?: string[] // restrict to specific roles
  }[]
}

const navConfig: NavSection[] = [
  {
    label: '',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: <span className="material-icons">dashboard</span> },
      { label: 'Results', href: '/results', icon: <span className="material-icons">leaderboard</span> },
    ]
  },
  {
    label: 'SCRUTINEERING',
    items: [
      { label: 'Calendar', href: '/scrutineering/calendar', icon: <span className="material-icons">calendar_today</span> },
      { label: 'Book Inspection', href: '/scrutineering/book', icon: <span className="material-icons">event</span> },
      { label: 'Live Inspections', href: '/scrutineering/live', icon: <span className="material-icons">checklist</span> },
    ]
  },
  {
    label: 'TRACK EVENTS',
    items: [
      { label: 'Track Marshal', href: '/track/marshal', icon: <span className="material-icons">timer</span> },
      { label: 'Live Track Data', href: '/track/data', icon: <span className="material-icons">show_chart</span> },
    ]
  },
  {
    label: 'JUDGED EVENTS',
    items: [
      { label: 'Design Event', href: '/judged/design', icon: <span className="material-icons">emoji_objects</span> },
      { label: 'Business Plan', href: '/judged/business', icon: <span className="material-icons">domain</span> },
      { label: 'Cost & Manufacturing', href: '/judged/cost', icon: <span className="material-icons">request_quote</span> },
    ]
  },
  {
    label: 'TEAM FEATURES',
    items: [
      { label: 'Feedback Booking', href: '/team/feedback', icon: <span className="material-icons">feedback</span> },
    ]
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Admin Panel', href: '/admin', icon: <span className="material-icons">admin_panel_settings</span>, roles: ['admin'] },
      { label: 'User Management', href: '/admin/users', icon: <span className="material-icons">group</span>, roles: ['admin'] },
      { label: 'System Reports', href: '/admin/reports', icon: <span className="material-icons">description</span>, roles: ['admin', 'scrutineer'] },
      { label: 'Penalty Management', href: '/admin/penalties', icon: <span className="material-icons">gavel</span>, roles: ['admin', 'scrutineer'] },
    ]
  },
  {
    label: 'ACCOUNT',
    items: [
      { label: 'My Profile', href: '/settings/profile', icon: <span className="material-icons">person</span> },
      { label: 'Logout', href: '/logout', icon: <span className="material-icons">logout</span> }
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
                      {item.icon}{item.label}
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
