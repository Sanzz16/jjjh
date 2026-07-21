import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

// POST /api/upload
// multipart/form-data: { file: File, folder?: 'proofs' | 'products' | 'announcements' }
// Mirrors the original app's client-side upload calls:
//   supabaseClient.storage.from('payment-proofs').upload(path, file)
// but done server-side so the service role key (if configured) can be used
// without ever reaching the browser. Returns { url } (public URL), matching
// getPublicUrl(path).data.publicUrl used throughout index.html/admin.html.
export async function POST(request) {
  const supabase = getServerSupabase();
  const formData = await request.formData();
  const file = formData.get('file');
  const folder = formData.get('folder') || 'proofs';

  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const path = `${folder}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-proofs')
    .upload(path, buffer, { contentType: file.type || 'application/octet-stream' });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
