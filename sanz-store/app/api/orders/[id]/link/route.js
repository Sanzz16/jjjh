import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// POST /api/orders/:id/link
// body: { action: 'verify', message?: string }  -> mirrors onOk(): status -> completed, optional admin_message
// body: { action: 'return', message?: string }  -> mirrors onReturn(): request_link cleared, admin_message set,
//                                                   link_rejected_count incremented, user must resend
export async function POST(request, { params }) {
  const supabase = getServerSupabase();
  const { id: oid } = params;
  const body = await request.json();
  const action = body.action;
  const msg = (body.message || '').trim();

  if (action === 'verify') {
    const updateData = { status: 'completed' };
    if (msg) updateData.admin_message = msg;
    const { error } = await supabase.from('orders').update(updateData).eq('id', oid);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  if (action === 'return') {
    const { data: cur, error: curErr } = await supabase
      .from('orders')
      .select('link_rejected_count')
      .eq('id', oid)
      .single();
    if (curErr) return NextResponse.json({ error: curErr.message }, { status: 400 });

    const curCount = cur?.link_rejected_count || 0;
    const updateData = {
      request_link: null,
      admin_message: msg || 'Link yang kamu kirim belum valid/salah. Silakan kirim ulang link Alight Motion yang benar ya.',
      link_rejected_count: curCount + 1,
    };
    const { error } = await supabase.from('orders').update(updateData).eq('id', oid);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action, expected "verify" or "return"' }, { status: 400 });
}
