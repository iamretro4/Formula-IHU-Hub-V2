// src/lib/supabase/server.ts
import { createRouteHandlerClient, createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'
import type { Database } from '@/lib/types/database'

// For API route handlers (e.g., callback)
export function createRouteHandlerSupabaseClient() {
  return createRouteHandlerClient<Database>({ cookies })
}

// For middleware
export function createMiddlewareSupabaseClient(req: NextRequest, res: any) {
  return createMiddlewareClient<Database>({ req, res })
}
