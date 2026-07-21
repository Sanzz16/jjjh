import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/all-transactions -> mirrors index.html openAllTransactionsModal():
// latest 50 orders with product name, for the public "semua transaksi" feed.
export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('orders')
    .select('id, user_name, quantity, total_amount, status, created_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
