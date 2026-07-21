import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// GET /api/categories -> mirrors index.html fetchCategories()
export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from('categories').select('*');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
