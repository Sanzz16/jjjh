import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/stats -> mirrors admin.html loadStats(): total orders, completed count, total revenue
export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('orders').select('total_amount, status');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const orders = data || [];
  const completed = orders.filter((o) => o.status === 'completed');
  const revenue = completed.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  return NextResponse.json({
    totalOrders: orders.length,
    completedOrders: completed.length,
    revenue,
  });
}
