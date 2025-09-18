// =====================================================
// Formula IHU Hub - Auth Callback & Middleware
// File: src/app/api/auth/callback/route.ts
// =====================================================

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Database } from '@/lib/types/database'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    await supabase.auth.exchangeCodeForSession(code)
    
    // Get the user after exchange
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Upsert user profile from auth metadata
      const metadata = user.user_metadata as any
      
      await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email!,
          first_name: metadata.first_name || '',
          last_name: metadata.last_name || '',
          father_name: metadata.father_name || '',
          phone: metadata.phone || '',
          emergency_contact: metadata.emergency_contact || '',
          campsite_staying: metadata.campsite_staying || false,
          ehic_number: metadata.ehic_number || '',
          app_role: metadata.app_role || 'viewer',
          profile_completed: false, // Always set to false initially
        }, { 
          onConflict: 'id',
          ignoreDuplicates: false
        })
    }
  }

  // Redirect to complete profile or dashboard
  return NextResponse.redirect(new URL('/complete-profile', request.url))
}