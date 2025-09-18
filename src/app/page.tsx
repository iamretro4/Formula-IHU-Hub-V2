// =====================================================
// Formula IHU Hub - Landing & Dashboard Pages
// File: src/app/page.tsx
// =====================================================

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Formula IHU Hub
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          The official competition management system for Formula IHU 2025. 
          Access scrutineering schedules, track marshal tools, and real-time results.
        </p>
        
        <div className="space-x-4">
          <Button asChild size="lg">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Register</Link>
          </Button>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <p>Formula IHU 2025 • July 24-27 • Athens, Greece</p>
        </div>
      </div>
    </div>
  )
}