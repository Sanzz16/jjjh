import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Browser-side client (used by client components for realtime-ish polling
// reads where going through our own API route isn't necessary). Kept for
// parity with the original index.html/admin.html which called Supabase
// directly from the browser using the anon key.
export function getBrowserSupabase() {
  if (typeof window === 'undefined') return null;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!window.__sanzSupabase) {
    window.__sanzSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return window.__sanzSupabase;
}

// Server-side client used inside API routes. Prefers the service role key
// (kept only in server env, never sent to the browser) so RLS is bypassed
// safely from trusted server code; falls back to anon key so behavior
// matches the original app out-of-the-box if no service key is configured.
export function getServerSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
}
