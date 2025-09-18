// =====================================================
// Formula IHU Hub - Dashboard Page (recommended structure)
// File: src/app/dashboard/page.tsx
// =====================================================
'use client'

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DashboardPage() {
  // Any future stats/fetch logic can be added here
  
  return (
    <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto">
      <header>
        <h1 className="text-3xl font-black mb-1 text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-300">Welcome to Formula IHU Hub</p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Scrutineering Card */}
        <Card asChild className="transition hover:shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-900 focus-within:ring-2 ring-primary">
          <Link href="/scrutineering/calendar" aria-label="Scrutineering Calendar">
            <CardHeader>
              <CardTitle>Scrutineering</CardTitle>
              <CardDescription>Book inspections and view results</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Link>
        </Card>
        
        {/* Track Marshal Card */}
        <Card asChild className="transition hover:shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-900 focus-within:ring-2 ring-primary">
          <Link href="/track/marshal" aria-label="Track Marshal Hub">
            <CardHeader>
              <CardTitle>Track Marshal</CardTitle>
              <CardDescription>Manage track sessions and incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Link>
        </Card>
        
        {/* Results Card */}
        <Card asChild className="transition hover:shadow-md hover:bg-neutral-50 dark:hover:bg-neutral-900 focus-within:ring-2 ring-primary">
          <Link href="/results" aria-label="Live Results">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>View live competition results</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">Coming Soon</Badge>
            </CardContent>
          </Link>
        </Card>
      </section>

      {/* Example placeholder for future stats row (replace with live stats) */}
      {/* <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Bookings" value={0} />
          <StatCard label="Passed" value={0} />
          <StatCard label="Failed" value={0} />
          <StatCard label="Ongoing" value={0} />
        </div>
      </section> */}

    </div>
  )
}

// Example StatCard component if you want to show live stats below module cards later
// function StatCard({ label, value }: { label: string, value: React.ReactNode }) {
//   return (
//     <div className="rounded-lg border bg-white dark:bg-neutral-900 px-6 py-4 flex flex-col items-center text-center">
//       <span className="text-2xl font-bold">{value}</span>
//       <span className="text-xs text-gray-500">{label}</span>
//     </div>
//   )
// }
