import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/banners            -> full history, newest first (admin.html loadBannerHistory)
// GET /api/banners?active=1   -> only active, first one (index.html reads the promo banner)
export async function GET(request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');

  if (active) {
    const { data, error } = await supabase.from('banners').select('*').eq('is_active', true).limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data: data && data[0] ? data[0] : null });
  }

  const { data, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/banners -> create or update (admin.html bannerForm submit: update if dataset.id present, else insert)
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  const payload = {
    title: body.title || '',
    image_url: body.image_url,
    link_url: body.link_url || '',
    is_active: true,
  };

  const promise = body.id
    ? supabase.from('banners').update(payload).eq('id', body.id).select()
    : supabase.from('banners').insert([payload]).select();

  const { data, error } = await promise;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}
