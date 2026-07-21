import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/payment-methods            -> full list, newest first (admin.html loadPaymentMethods)
// GET /api/payment-methods?active=1   -> only active (index.html checkout payment method selector)
export async function GET(request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');

  let query = supabase.from('payment_methods').select('*').order('created_at', { ascending: false });
  if (active) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/payment-methods -> create or update (admin.html paymentMethodForm submit)
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  const payload = {
    name: body.name,
    account_number: body.account_number || '',
    account_name: body.account_name || '',
    qris_image_url: body.qris_image_url || '',
    is_active: true,
  };

  const promise = body.id
    ? supabase.from('payment_methods').update(payload).eq('id', body.id).select()
    : supabase.from('payment_methods').insert([payload]).select();

  const { data, error } = await promise;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}
