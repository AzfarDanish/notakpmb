import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';

export async function DELETE(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  const client = getR2Client();
  if (!client || !process.env.R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);

    // Best-effort index cleanup (never fails the delete).
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      await supabaseAdmin().from('files').upsert({
        key,
        subject_id: key.split('/')[0] ?? '',
        deleted_at: new Date().toISOString(),
      }, { onConflict: 'key' });
      const { logActivity } = await import('@/lib/admin');
      await logActivity('file.deleted', 'file', key, '');
    } catch {
      // index/activity writes must never break deletes
    }

    revalidateTag('r2-files', 'max');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
