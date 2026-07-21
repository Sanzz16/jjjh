import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// DELETE /api/banners/:id -> admin.html deleteBannerFromHistory(id)
export async function DELETE(request, { params }) {
  const supabase = getServerSupabase();
  const { id } = params;
  const { error } = await supabase.from('banners').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
