import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// PATCH /api/payment-methods/:id -> admin.html togglePaymentMethodActive(id, newState)
export async function PATCH(request, { params }) {
  const supabase = getServerSupabase();
  const body = await request.json();
  const { id } = params;

  const allowedFields = ['name', 'account_number', 'account_name', 'qris_image_url', 'is_active'];
  const payload = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  const { data, error } = await supabase.from('payment_methods').update(payload).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}

// DELETE /api/payment-methods/:id -> admin.html deletePaymentMethod(id)
export async function DELETE(request, { params }) {
  const supabase = getServerSupabase();
  const { id } = params;
  const { error } = await supabase.from('payment_methods').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
