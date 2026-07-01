import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-only Supabase client. Uses the SERVICE ROLE key, which bypasses Row
// Level Security — so it must NEVER be imported into a Client Component or any
// code that ships to the browser. Only import this from route handlers under
// src/app/api/.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

export const isAdminConfigured = Boolean(url && serviceKey)

// Created lazily so a missing key only fails an actual request, not the build.
let client: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!isAdminConfigured) {
    throw new Error('Supabase service role is not configured (SUPABASE_SERVICE_ROLE_KEY)')
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
