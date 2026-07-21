import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/settings -> mirrors index.html/admin.html "select * from site_settings",
// returned as both the raw rows and a convenience key->value map.
export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('site_settings').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const map = {};
  (data || []).forEach((s) => { map[s.key] = s.value; });

  return NextResponse.json({ data, settings: map });
}

// POST /api/settings
// body: { key, value }              -> single upsert (site status form uses two of these)
// body: { entries: [{key,value},..] } -> bulk upsert (admin.html settingsForm: store_name, whatsapp_number, running_text)
export async function POST(request) {
  const supabase = getServerSupabase();
  const body = await request.json();

  let rows;
  if (Array.isArray(body.entries)) {
    rows = body.entries;
  } else {
    rows = [{ key: body.key, value: body.value }];
  }

  const { data, error } = await supabase.from('site_settings').upsert(rows, { onConflict: 'key' }).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
