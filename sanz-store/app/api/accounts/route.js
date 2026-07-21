import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/accounts -> admin.html loadAccounts(): all accounts with product name joined
export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('accounts')
    .select('*, products(name)')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/accounts
// body: { product_id, username, password }              -> single add (admin.html accountForm submit)
// body: { rows: [{product_id, username, password}, ...] } -> bulk add (admin.html submitBulkAccounts)
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  let rows;
  if (Array.isArray(body.rows)) {
    rows = body.rows.map((r) => ({
      product_id: r.product_id,
      username: r.username,
      password: r.password,
      status: 'available',
    }));
  } else {
    rows = [{
      product_id: body.product_id,
      username: body.username,
      password: body.password,
      status: 'available',
    }];
  }

  const { data, error } = await supabase.from('accounts').insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// DELETE /api/accounts?status=sold -> admin.html clearSoldAccounts()
export async function DELETE(request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  if (!status) {
    return NextResponse.json({ error: 'status query param required' }, { status: 400 });
  }
  const { error } = await supabase.from('accounts').delete().eq('status', status);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
