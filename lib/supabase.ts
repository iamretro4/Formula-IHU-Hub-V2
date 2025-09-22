import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side client with service role key for admin operations
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_KEY!
)

// Helper function to get signed upload URL
export async function getSignedUploadUrl(fileName: string, fileType: string) {
  const { data, error } = await supabase.storage
    .from('scrutineer-files')
    .createSignedUploadUrl(`uploads/${Date.now()}-${fileName}`)

  if (error) {
    throw new Error(`Failed to get upload URL: ${error.message}`)
  }

  return data
}

// Helper function to get signed download URL
export async function getSignedDownloadUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from('scrutineer-files')
    .createSignedUrl(filePath, 3600) // 1 hour expiry

  if (error) {
    throw new Error(`Failed to get download URL: ${error.message}`)
  }

  return data.signedUrl
}