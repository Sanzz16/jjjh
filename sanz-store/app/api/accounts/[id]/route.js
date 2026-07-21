import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// PATCH /api/accounts/:id -> admin.html updateAccountStatus(id, newStatus)
export async function PATCH(request, { params }) {
  const supabase = getServerSupabase();
  const body = await request.json();
  const { id } = params;
  const { data, error } = await supabase.from('accounts').update({ status: body.status }).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}

// DELETE /api/accounts/:id -> admin.html deleteAccount(id)
export async function DELETE(request, { params }) {
  const supabase = getServerSupabase();
  const { id } = params;
  const { error } = await supabase.from('accounts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
