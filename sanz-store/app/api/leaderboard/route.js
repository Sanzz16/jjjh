import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/leaderboard -> mirrors index.html openLeaderboardModal():
// aggregates completed orders by (masked) buyer name, ranks by total spend, top 20.
// Masking is done here (server) instead of client so raw names never leave the DB layer
// unnecessarily, matching the same maskName() logic used elsewhere in the original app.
function maskName(name) {
  if (!name) return 'Seseorang';
  const trimmed = name.trim().split(' ')[0];
  if (trimmed.length <= 2) return trimmed.charAt(0) + '***';
  return trimmed.substring(0, 3) + '***';
}

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('user_name, total_amount, status')
    .eq('status', 'completed');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const totals = {};
  (data || []).forEach((o) => {
    const key = maskName(o.user_name);
    if (!totals[key]) totals[key] = { name: key, total: 0, count: 0 };
    totals[key].total += Number(o.total_amount) || 0;
    totals[key].count += 1;
  });

  const ranked = Object.values(totals)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  return NextResponse.json({ data: ranked });
}
