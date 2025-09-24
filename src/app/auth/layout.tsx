import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sign in to Scrutineer Hub',
  description: 'Authentication page for Scrutineer Hub',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100`}>
        <main className="flex flex-col items-center justify-center min-h-screen p-4">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
