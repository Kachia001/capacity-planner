import { createClient } from '@supabase/supabase-js'

export function useSupabaseAdmin() {
  const config = useRuntimeConfig()

  if (!config.public.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase admin credentials are not configured.',
    })
  }

  return createClient(config.public.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
