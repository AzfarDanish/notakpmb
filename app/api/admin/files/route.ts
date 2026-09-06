import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
import { logActivity, requireAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';

const MAX_LIST = 30;
// Safety caps so a huge bucket can never force an unbounded scan.
const MAX_SCAN_KEYS = 2000;
const MAX_SEARCH_HEADS = 500;

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
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || MAX_LIST, 1), MAX_LIST);
  const page = Math.max(Number(req.nextUrl.searchParams.get('page')) || 1, 1);
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  const s3 = client;
  const bucketName = bucket;
  try {
    let subjectFilter: Set<string> | null = null;
    if (programmeId) {
      const { getSubjectsForProgramme } = await import('@/lib/subjects');
      const subs = await getSubjectsForProgramme(programmeId).catch(() => []);
      subjectFilter = new Set(subs.map((s) => s.id));
    }
    type Listed = { key: string; sid: string; sizeBytes: number; lastModified: string };
    // Phase 1: list keys only (no per-object Heads) with prefix/set filters.
    // A subjectId filter becomes an R2 Prefix so the bucket scan stays narrow.
    const listed: Listed[] = [];
    let token: string | undefined;
    let scanned = 0;
    let exhausted = false;
    const prefix = subjectId ? `${subjectId}/` : undefined;
    while (scanned < MAX_SCAN_KEYS) {
      const res = await s3.send(new ListObjectsV2Command({ Bucket: bucketName, Prefix: prefix, ContinuationToken: token, MaxKeys: 200 }));
      for (const obj of res.Contents ?? []) {
        if (!obj.Key) continue;
        const sid = obj.Key.split('/')[0] ?? '';
        if (!sid || sid.startsWith('_')) continue;
        if (subjectFilter && !subjectFilter.has(sid)) continue;
        listed.push({
          key: obj.Key, sid,
          sizeBytes: obj.Size ?? 0,
          lastModified: obj.LastModified ? obj.LastModified.toISOString() : '',
        });
        scanned += 1;
        if (scanned >= MAX_SCAN_KEYS) break;
      }
      if (!res.IsTruncated) {
        exhausted = true;
        break;
      }
      token = res.NextContinuationToken;
    }

    async function enrich(rows: Listed[]) {
      // Small batches to avoid throttling; failures keep filename fallbacks.
      const out: { key: string; subjectId: string; title: string; originalName: string; date: string; size: string; sizeBytes: number; lastModified: string }[] = [];
      for (let i = 0; i < rows.length; i += 8) {
        const batch = await Promise.all(rows.slice(i, i + 8).map(async (row) => {
          const fileName = row.key.split('/').pop() ?? '';
          let title = fileName;
          let originalName = fileName.replace(/^\d+-/, '');
          try {
            const head = await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: row.key }));
            if (head.Metadata?.title) title = decodeURIComponent(head.Metadata.title);
            if (head.Metadata?.originalname) originalName = decodeURIComponent(head.Metadata.originalname);
          } catch {
            // keep filename fallback
          }
          const d = row.lastModified ? new Date(row.lastModified) : null;
          return {
            key: row.key, subjectId: row.sid, title, originalName,
            date: d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
            size: row.sizeBytes < 1024 * 1024 ? `${Math.round(row.sizeBytes / 1024)} KB` : `${(row.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
            sizeBytes: row.sizeBytes, lastModified: row.lastModified,
          };
        }));
        out.push(...batch);
      }
      return out;
    }

    if (!q) {
      // Fast path: order from listing metadata, Head only the visible page.
      const ordered = [...listed];
      if (sort === 'name') ordered.sort((a, b) => a.key.localeCompare(b.key));
      else if (sort === 'size') ordered.sort((a, b) => b.sizeBytes - a.sizeBytes);
      else ordered.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
      const total = ordered.length; // exact when `complete` is true (scan finished)
      const slice = ordered.slice((page - 1) * limit, page * limit);
      const items = await enrich(slice);
      if (sort === 'name') items.sort((a, b) => a.title.localeCompare(b.title));
      return NextResponse.json({ items, total, page, limit, complete: exhausted }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
    }

    // Search path: titles live in object metadata, so Head a bounded set, then filter.
    const candidates = listed.slice(0, MAX_SEARCH_HEADS);
    const enriched = await enrich(candidates);
    const matched = enriched.filter((it) => {
      const fileName = it.key.split('/').pop() ?? '';
      return `${it.title} ${it.originalName} ${fileName} ${it.key}`.toLowerCase().includes(q);
    });
    if (sort === 'name') matched.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'size') matched.sort((a, b) => b.sizeBytes - a.sizeBytes);
    else matched.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
    const total = matched.length;
    const items = matched.slice((page - 1) * limit, page * limit);
    return NextResponse.json({ items, total, page, limit, complete: exhausted && listed.length <= MAX_SEARCH_HEADS }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
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
    await supabaseAdmin().from('files').upsert({ key, subject_id: key.split('/')[0] ?? '', title }, { onConflict: 'key' }).then(() => undefined, () => undefined);
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
    await supabaseAdmin().from('files').upsert({ key, subject_id: key.split('/')[0] ?? '', deleted_at: new Date().toISOString() }, { onConflict: 'key' }).then(() => undefined, () => undefined);
    await logActivity('file.deleted', 'file', key, '');
    revalidateTag('r2-files', 'max');
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Admin file delete error:', e);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
