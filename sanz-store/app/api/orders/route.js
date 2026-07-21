import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/orders            -> admin.html loadOrders(): all orders + product name, newest first
// GET /api/orders?id=xxx     -> single order lookup (used by index.html order status polling / riwayat)
export async function GET(request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const ids = searchParams.get('ids'); // comma-separated, for riwayat (localStorage order id list)

  if (id) {
    const { data, error } = await supabase.from('orders').select('*, products(*)').eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (ids) {
    // Mirrors index.html syncOrderHistoryStatus(): re-checks localStorage
    // "riwayat" order ids against the server, including delivered account
    // credentials (via order_accounts for multi-qty, or the legacy single
    // accounts relation) so the UI can reveal them once status flips to
    // 'completed'.
    const idList = ids.split(',').filter(Boolean);
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_accounts(accounts(username,password)), accounts(username,password)')
      .in('id', idList);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  const { data, error } = await supabase
    .from('orders')
    .select('*, products(name)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/orders -> index.html checkout submit: creates a new pending order
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  const payload = {
    product_id: body.product_id,
    quantity: body.quantity || 1,
    user_name: body.user_name,
    user_contact: body.user_contact,
    total_amount: body.total_amount,
    selected_price: body.selected_price,
    payment_method: body.payment_method,
    payment_proof_url: body.payment_proof_url || '',
    request_gmail: body.request_gmail || null,
    request_password: body.request_password || null,
    status: 'pending',
  };

  const { data, error } = await supabase.from('orders').insert([payload]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}
