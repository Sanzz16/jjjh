import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// POST /api/orders/:id/confirm
// Mirrors admin.html confirmOrder(oid, pid, qty) exactly:
//  - is_alight_motion product -> status becomes 'waiting_link', admin_note = link/instructions sent to buyer
//  - is_open_request product  -> status becomes 'completed', admin_note = note/gmail sent to buyer
//  - normal stock product     -> pulls `qty` available accounts, marks them sold, links via order_accounts,
//                                 sets order.account_id to the first one, status -> 'completed'
export async function POST(request, { params }) {
  const supabase = getServerSupabase();
  const { id: oid } = params;
  const body = await request.json();
  const qty = body.quantity || 1;

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, products(*)')
    .eq('id', oid)
    .single();
  if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 400 });

  const prod = order.products;

  // --- Alight Motion flow: admin sends link/instructions, order -> waiting_link ---
  if (prod.is_alight_motion) {
    const linkMsg = body.link_message;
    if (linkMsg === undefined || linkMsg === null) {
      return NextResponse.json({ error: 'link_message is required for Alight Motion products' }, { status: 400 });
    }
    const { error } = await supabase
      .from('orders')
      .update({ status: 'waiting_link', admin_note: linkMsg })
      .eq('id', oid);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, flow: 'alight_motion_waiting_link' });
  }

  // --- Open request flow (e.g. Gmail request): admin sends note, order -> completed ---
  if (prod.is_open_request) {
    const adminNote = body.admin_note;
    if (adminNote === undefined || adminNote === null) {
      return NextResponse.json({ error: 'admin_note is required for open-request products' }, { status: 400 });
    }
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed', admin_note: adminNote })
      .eq('id', oid);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ success: true, flow: 'open_request_completed' });
  }

  // --- Normal stock flow: pull available accounts, mark sold, link to order ---
  const { data: accs, error: accsErr } = await supabase
    .from('accounts')
    .select('*')
    .eq('product_id', order.product_id)
    .eq('status', 'available')
    .limit(qty);
  if (accsErr) return NextResponse.json({ error: accsErr.message }, { status: 400 });

  if (!accs || accs.length < qty) {
    return NextResponse.json(
      { error: `Stok tidak cukup: tersisa ${accs ? accs.length : 0} dari ${qty} akun yang dibutuhkan.` },
      { status: 400 },
    );
  }

  const accountIds = accs.map((a) => a.id);

  const { error: updErr } = await supabase
    .from('orders')
    .update({ status: 'completed', account_id: accountIds[0] })
    .eq('id', oid);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  const orderAccRows = accountIds.map((aid) => ({ order_id: oid, account_id: aid }));

  try {
    await Promise.all([
      supabase.from('order_accounts').insert(orderAccRows),
      ...accountIds.map((aid) => supabase.from('accounts').update({ status: 'sold' }).eq('id', aid)),
    ]);
  } catch (err) {
    // Mirrors original behavior: order is already completed even if the
    // account-linking/mark-sold step partially fails; surface a warning.
    return NextResponse.json({
      success: true,
      flow: 'stock_completed_partial',
      warning: 'Sebagian proses gagal, cek tab Stok Akun.',
    });
  }

  return NextResponse.json({ success: true, flow: 'stock_completed' });
}
