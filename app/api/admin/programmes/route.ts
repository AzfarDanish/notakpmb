import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { queryD1 } from '@/lib/d1';
import { getAllFileCounts } from '@/lib/r2';
import { getSubjectsForProgramme } from '@/lib/subjects';

function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'programme';
}

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    let rows: Record<string, unknown>[] = [];
    try {
      const res = await queryD1(`SELECT id, code, title, description, is_hidden, position FROM programmes ORDER BY position ASC, id ASC`);
      rows = res.results;
    } catch {
      const res = await queryD1(`SELECT id, code, title, description FROM programmes ORDER BY id ASC`);
      rows = res.results.map((r) => ({ ...r, is_hidden: 0, position: 0 }));
    }
    const fileCounts = await getAllFileCounts().catch(() => ({} as Record<string, number>));
    const out = [];
    for (const r of rows) {
      const id = String(r.id ?? '');
      const subs = await getSubjectsForProgramme(id).catch(() => []);
      const files = subs.reduce((a, s) => a + (fileCounts[s.id] || 0), 0);
      out.push({
        id, code: String(r.code ?? ''), title: String(r.title ?? ''), description: String(r.description ?? ''),
        hidden: Number(r.is_hidden ?? 0) === 1, position: Number(r.position ?? 0),
        subjectCount: subs.length, fileCount: files,
      });
    }
    return NextResponse.json({ programmes: out }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin programmes list error:', e);
    return NextResponse.json({ error: 'Failed to list programmes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { title?: unknown; code?: unknown; description?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const title = typeof payload.title === 'string' ? payload.title.trim().slice(0, 120) : '';
  const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase().slice(0, 60) : '';
  const description = typeof payload.description === 'string' ? payload.description.trim().slice(0, 500) : '';
  if (!title || !code) return NextResponse.json({ error: 'Title and code required' }, { status: 400 });
  const id = `${slugify(title)}-${Date.now().toString(36)}`;
  try {
    await queryD1(`INSERT INTO programmes (id, code, title, description) VALUES (?, ?, ?, ?)`, [id, code, title, description]);
    try {
      await queryD1(`UPDATE programmes SET position = (SELECT COALESCE(MAX(position),0)+1 FROM programmes) WHERE id = ?`, [id]);
    } catch { /* pre-migration */ }
    await logActivity('programme.created', 'programme', id, `${code} ${title}`);
    revalidateTag('programmes', 'max');
    revalidateTag('courses', 'max');
    return NextResponse.json({ programme: { id, code, title, description } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create programme' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { id?: unknown; title?: unknown; code?: unknown; description?: unknown; hidden?: unknown; position?: unknown; reorder?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (Array.isArray(payload.reorder)) {
    const ids = (payload.reorder as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 50);
    try {
      for (let i = 0; i < ids.length; i += 1) {
        await queryD1(`UPDATE programmes SET position = ? WHERE id = ?`, [i, ids[i].slice(0, 100)]);
      }
      await logActivity('programme.reordered', 'programme', '', ids.join(','));
      revalidateTag('programmes', 'max');
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Reorder not supported yet (run migration 0007)' }, { status: 400 });
    }
  }
  if (typeof payload.id !== 'string' || !payload.id || payload.id.length > 100) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    if (typeof payload.hidden === 'boolean') {
      await queryD1(`UPDATE programmes SET is_hidden = ? WHERE id = ?`, [payload.hidden ? 1 : 0, payload.id]);
      await logActivity(payload.hidden ? 'programme.hidden' : 'programme.unhidden', 'programme', payload.id, '');
      revalidateTag('programmes', 'max');
      return NextResponse.json({ success: true });
    }
    const sets: string[] = [];
    const params: (string | number)[] = [];
    if (typeof payload.title === 'string' && payload.title.trim()) { sets.push('title = ?'); params.push(payload.title.trim().slice(0, 120)); }
    if (typeof payload.code === 'string' && payload.code.trim()) { sets.push('code = ?'); params.push(payload.code.trim().toUpperCase().slice(0, 60)); }
    if (typeof payload.description === 'string') { sets.push('description = ?'); params.push(payload.description.trim().slice(0, 500)); }
    if (typeof payload.position === 'number') { sets.push('position = ?'); params.push(Math.floor(payload.position)); }
    if (!sets.length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    params.push(payload.id);
    await queryD1(`UPDATE programmes SET ${sets.join(', ')} WHERE id = ?`, params);
    await logActivity('programme.edited', 'programme', payload.id, '');
    revalidateTag('programmes', 'max');
    revalidateTag('courses', 'max');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to update programme' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!id || id.length > 100) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const subs = await getSubjectsForProgramme(id).catch(() => []);
    if (subs.length > 0 && !force) {
      return NextResponse.json({ error: `Programme has ${subs.length} subject(s). Confirm destructive delete.`, needsConfirm: true, subjectCount: subs.length }, { status: 409 });
    }
    await queryD1(`DELETE FROM programmes WHERE id = ?`, [id]);
    await logActivity('programme.deleted', 'programme', id, `subjects:${subs.length}`);
    revalidateTag('programmes', 'max');
    revalidateTag('courses', 'max');
    revalidateTag('subjects', 'max');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete programme' }, { status: 500 });
  }
}
