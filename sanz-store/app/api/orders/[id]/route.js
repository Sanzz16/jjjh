import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// PATCH /api/orders/:id -> generic order update.
// Used for:
//  - user submitting/resubmitting their Alight Motion link (request_link)
//  - any other direct field update admin.html performs via supabaseClient.from('orders').update(...)
export async function PATCH(request, { params }) {
  const supabase = getServerSupabase();
  const body = await request.json();
  const { id } = params;

  const allowedFields = [
    'status', 'admin_note', 'admin_message', 'request_link',
    'link_rejected_count', 'account_id',
  ];
  const payload = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  const { data, error } = await supabase.from('orders').update(payload).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}
