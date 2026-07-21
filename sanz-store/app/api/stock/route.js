import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/stock -> mirrors index.html fetchStock(): count of 'available' accounts per product_id
export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('accounts').select('product_id').eq('status', 'available');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const stockByProduct = {};
  (data || []).forEach((a) => {
    stockByProduct[a.product_id] = (stockByProduct[a.product_id] || 0) + 1;
  });

  return NextResponse.json({ data: stockByProduct });
}
