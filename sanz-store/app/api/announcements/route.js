import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/announcements            -> full history, newest first (admin.html loadAnnouncementHistory)
// GET /api/announcements?active=1   -> only active ones (index.html reads announcements to display)
export async function GET(request) {
  const supabase = getServerSupabase();
  const { searchParams } = new URL(request.url);
  const active = searchParams.get('active');

  let query = supabase.from('announcements').select('*').order('created_at', { ascending: false });
  if (active) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

// POST /api/announcements -> create or update (admin.html announcementForm submit)
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  const payload = {
    content: body.content,
    type: body.type || 'info',
    is_active: true,
    media_url: body.media_url || null,
    media_type: body.media_url ? (body.media_type || 'image') : null,
  };

  const promise = body.id
    ? supabase.from('announcements').update(payload).eq('id', body.id).select()
    : supabase.from('announcements').insert([payload]).select();

  const { data, error } = await promise;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data: data[0] });
}
