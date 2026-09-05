import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
import { logActivity, requireAdmin } from '@/lib/admin';
import { queryD1 } from '@/lib/d1';

const MAX_LIST = 100;

function safeKey(key: unknown): string | null {
  if (typeof key !== 'string' || !key || key.length > 500) return null;
  if (key.includes('..') || key.startsWith('/') || key.startsWith('_')) return null;
  if (!key.includes('/')) return null;
  return key;
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  const subjectId = (req.nextUrl.searchParams.get('subjectId') ?? '').trim();
  const programmeId = (req.nextUrl.searchParams.get('programmeId') ?? '').trim();
  const sort = req.nextUrl.searchParams.get('sort') ?? 'newest';
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  try {
    let subjectFilter: Set<string> | null = null;
    if (programmeId) {
      const { getSubjectsForProgramme } = await import('@/lib/subjects');
      const subs = await getSubjectsForProgramme(programmeId).catch(() => []);
      subjectFilter = new Set(subs.map((s) => s.id));
    }
    const items: { key: string; subjectId: string; title: string; originalName: string; date: string; size: string; sizeBytes: number; lastModified: string }[] = [];
    let token: string | undefined;
    let pages = 0;
    while (pages < 5 && items.length < MAX_LIST * 2) {
      const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 200 }));
      for (const obj of res.Contents ?? []) {
        if (!obj.Key) continue;
        const sid = obj.Key.split('/')[0] ?? '';
        if (!sid || sid.startsWith('_')) continue;
        if (subjectId && sid !== subjectId) continue;
        if (subjectFilter && !subjectFilter.has(sid)) continue;
        const fileName = obj.Key.split('/').pop() ?? '';
        let title = fileName;
        let originalName = fileName.replace(/^\d+-/, '');
        try {
          const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: obj.Key }));
          if (head.Metadata?.title) title = decodeURIComponent(head.Metadata.title);
          if (head.Metadata?.originalname) originalName = decodeURIComponent(head.Metadata.originalname);
        } catch {
          // keep filename fallback
        }
        if (q && !`${title} ${originalName} ${fileName} ${obj.Key}`.toLowerCase().includes(q)) continue;
        const sizeBytes = obj.Size ?? 0;
        items.push({
          key: obj.Key, subjectId: sid, title, originalName,
          date: obj.LastModified ? obj.LastModified.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
          size: sizeBytes < 1024 * 1024 ? `${Math.round(sizeBytes / 1024)} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
          sizeBytes, lastModified: obj.LastModified ? obj.LastModified.toISOString() : '',
        });
        if (items.length >= MAX_LIST) break;
      }
      if (!res.IsTruncated || items.length >= MAX_LIST) break;
      token = res.NextContinuationToken;
      pages += 1;
    }
    if (sort === 'name') items.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'size') items.sort((a, b) => b.sizeBytes - a.sizeBytes);
    else items.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
    return NextResponse.json({ items: items.slice(0, MAX_LIST) }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin files list error:', e);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { key?: unknown; title?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const key = safeKey(payload.key);
  const title = typeof payload.title === 'string' ? payload.title.replace(/\s+/g, ' ').trim().slice(0, 200) : '';
  if (!key) return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const originalName = head.Metadata?.originalname ?? encodeURIComponent(key.split('/').pop() ?? 'file');
    const contentType = head.ContentType ?? 'application/octet-stream';
    await client.send(new CopyObjectCommand({
      Bucket: bucket, Key: key, CopySource: `${bucket}/${key}`,
      ContentType: contentType, MetadataDirective: 'REPLACE',
      Metadata: { title: encodeURIComponent(title), originalname: originalName },
    }));
    await queryD1(`INSERT INTO files (key, subject_id, title) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET title = excluded.title`, [key, key.split('/')[0] ?? '', title]).catch(() => undefined);
    await logActivity('file.metadata', 'file', key, title);
    revalidateTag('r2-files', 'max');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin file rename error:', e);
    return NextResponse.json({ error: 'Failed to update metadata' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const key = safeKey(req.nextUrl.searchParams.get('id') ?? req.nextUrl.searchParams.get('key'));
  if (!key) return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    await queryD1(`INSERT INTO files (key, subject_id, deleted_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET deleted_at = datetime('now')`, [key, key.split('/')[0] ?? '']).catch(() => undefined);
    await logActivity('file.deleted', 'file', key, '');
    revalidateTag('r2-files', 'max');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin file delete error:', e);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
