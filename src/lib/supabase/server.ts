// src/lib/supabase/server.ts
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

// Import from @supabase/ssr (new package replacing auth-helpers)
import { 
  createBrowserClient, 
  createServerClient, 
  createMiddlewareClient 
} from '@supabase/ssr'

// ----------
// Client-side (for components)
// ----------
export function createClientSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// ----------
// Server-side (for RSC, API routes)
// ----------
export function createServerSupabase() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  )
}

// ----------
// Middleware (for edge/middleware.ts)
// ----------
export function createMiddlewareSupabaseClient(req: NextRequest, res: any) {
  return createMiddlewareClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { req, res }
  )
}
