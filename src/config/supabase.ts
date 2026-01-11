import { createClient } from '@supabase/supabase-js';
import { config } from './env';

// Client for user-facing operations (uses anon key)
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey
);