import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/products            -> public: only is_active = true (matches index.html fetchProducts)
// GET /api/products?all=1      -> admin: all products regardless of is_active (matches admin.html loadProducts)
export async function GET(request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all');

  let query = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (!all) {
    query = supabase.from('products').select('*').eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/products -> create a new product (admin.html "Tambah Produk")
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  const payload = {
    name: body.name,
    category: body.category,
    price: body.price,
    prices: body.prices || [],
    description: body.description || '',
    image_url: body.image_url || '',
    is_active: body.is_active !== undefined ? body.is_active : true,
    is_open_request: !!body.is_open_request,
    request_category: body.request_category || 'TIDAK OPEN REQUEST',
    is_alight_motion: !!body.is_alight_motion,
  };

  const { data, error } = await supabase.from('products').insert([payload]).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}
