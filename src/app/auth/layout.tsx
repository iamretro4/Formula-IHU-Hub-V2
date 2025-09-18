// =====================================================
// Formula IHU Hub - Authentication Pages
// File: src/app/(auth)/layout.tsx
// =====================================================

import { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Formula IHU Hub
            </h1>
            <p className="text-gray-600">
              Competition Management System
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}