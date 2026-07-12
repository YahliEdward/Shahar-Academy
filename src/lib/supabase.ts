import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Public (anon-key) Supabase client, used only for public reads of the
// schedule. Created lazily — createClient throws on an empty URL, so a
// module-level client would crash every importer (and the build) whenever the
// env vars are missing. Mirrors getSupabaseAdmin() in supabaseAdmin.ts.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) client = createClient(url, key)
  return client
}
