import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/live-feed -> mirrors index.html pollLiveFeed():
// last 24h of orders (any status), newest 20, used to show "X baru saja membeli Y" toasts.
// De-duplication against already-seen ids is done client-side (localStorage), same as original.
export async function GET() {
  const supabase = getServerSupabase();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();

  const { data, error } = await supabase
    .from('orders')
    .select('id, user_name, total_amount, created_at, products(name)')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
