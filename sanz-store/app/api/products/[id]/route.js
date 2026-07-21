import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// PATCH /api/products/:id -> update product fields (admin.html openEditProduct save)
export async function PATCH(request, { params }) {
  const supabase = getServerSupabase();
  const body = await request.json();
  const { id } = params;

  const allowedFields = [
    'name', 'category', 'price', 'prices', 'description', 'image_url',
    'is_active', 'is_open_request', 'request_category', 'is_alight_motion',
  ];
  const payload = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined) payload[key] = body[key];
  }

  const { data, error } = await supabase.from('products').update(payload).eq('id', id).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}

// DELETE /api/products/:id -> delete product (admin.html deleteProduct)
export async function DELETE(request, { params }) {
  const supabase = getServerSupabase();
  const { id } = params;
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
