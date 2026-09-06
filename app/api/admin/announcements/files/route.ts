import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { logActivity, requireAdmin } from '@/lib/admin';
import { getR2Client } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const FILE_TYPES = new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','image/jpeg','image/png']);

function cleanName(name: string) { return name.replace(/[^\w.\-]+/g, '_').slice(0, 120) || 'file'; }

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req); if (denied) return denied;
  const form = await req.formData(); const file = form.get('file');
  const announcementId = String(form.get('announcementId') ?? ''); const blockId = String(form.get('blockId') ?? '');
  const purpose = String(form.get('purpose') ?? 'file');
  if (!(file instanceof File) || !announcementId || !blockId) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  const allowed = purpose === 'image' ? IMAGE_TYPES : FILE_TYPES;
  const max = purpose === 'image' ? 10 : 25;
  if (!allowed.has(file.type) || file.size > max * 1024 * 1024) return NextResponse.json({ error: `Invalid file (max ${max}MB)` }, { status: 400 });
  const { data: block } = await supabaseAdmin().from('announcement_blocks').select('id,type').eq('id', blockId).eq('announcement_id', announcementId).limit(1).maybeSingle();
  if (!block) return NextResponse.json({ error: 'Block not found' }, { status: 404 });
  const client = getR2Client(); const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return NextResponse.json({ error: 'R2 not configured' }, { status: 503 });
  const key = `announcements/${announcementId}/${blockId}/${Date.now()}-${cleanName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: buffer, ContentType: file.type, Metadata: { title: encodeURIComponent(file.name), originalName: encodeURIComponent(file.name) } }));
    const { error } = await supabaseAdmin().from('files').insert({ key, kind:'announcement', announcement_id: announcementId, block_id: blockId, size:file.size, content_type:file.type, title:file.name, original_name:file.name });
    if (error) { await client.send(new DeleteObjectCommand({ Bucket:bucket, Key:key })); throw error; }
    // Persist the new key into the block immediately so re-opening the editor
    // cannot lose an upload that succeeded before the local form was saved.
    const blockData = ((await supabaseAdmin().from('announcement_blocks').select('data').eq('id', blockId).limit(1).maybeSingle()).data?.data ?? {}) as Record<string, unknown>;
    const nextData = purpose === 'image'
      ? { ...blockData, key }
      : { ...blockData, files: [...(Array.isArray(blockData.files) ? blockData.files : []), { key, label: file.name, size: file.size, contentType: file.type }] };
    await supabaseAdmin().from('announcement_blocks').update({ data: nextData, updated_at: new Date().toISOString() }).eq('id', blockId);
    await logActivity('announcement.file.added','announcement',announcementId,key); revalidateTag('announcements','max');
    return NextResponse.json({ file:{ key,label:file.name,size:file.size,contentType:file.type } }, { status:201 });
  } catch (e) { return NextResponse.json({ error:e instanceof Error?e.message:'Upload failed' },{status:500}); }
}

export async function DELETE(req: NextRequest) {
  const denied=await requireAdmin(req); if(denied)return denied;
  const key=req.nextUrl.searchParams.get('key'); if(!key?.startsWith('announcements/'))return NextResponse.json({error:'Invalid key'},{status:400});
  const client=getR2Client(); const bucket=process.env.R2_BUCKET_NAME; if(!client||!bucket)return NextResponse.json({error:'R2 not configured'},{status:503});
  const { data: row }=await supabaseAdmin().from('files').select('announcement_id').eq('key',key).eq('kind','announcement').limit(1).maybeSingle();
  if(!row)return NextResponse.json({error:'File not found'},{status:404});
  await client.send(new DeleteObjectCommand({Bucket:bucket,Key:key})); await supabaseAdmin().from('files').delete().eq('key',key);
  const { data: block } = await supabaseAdmin().from('announcement_blocks').select('id,type,data').eq('id', key.split('/')[2] ?? '').limit(1).maybeSingle();
  if (block) {
    const current = (block.data ?? {}) as Record<string, unknown>;
    const next = block.type === 'image'
      ? { ...current, key: '' }
      : { ...current, files: (Array.isArray(current.files) ? current.files : []).filter((f) => String((f as { key?: unknown }).key) !== key) };
    await supabaseAdmin().from('announcement_blocks').update({ data: next, updated_at: new Date().toISOString() }).eq('id', block.id);
  }
  await logActivity('announcement.file.removed','announcement',String(row.announcement_id),key); revalidateTag('announcements','max');
  return NextResponse.json({success:true});
}
