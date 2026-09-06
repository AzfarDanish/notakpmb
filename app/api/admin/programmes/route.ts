import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { supabaseAdmin } from '@/lib/supabase';
import { getAllFileCounts } from '@/lib/r2';
import { getSubjectsForProgramme } from '@/lib/subjects';

function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'programme';
}

type ProgrammeRow = { id: string; code: string; title: string; description: string; is_hidden: boolean; position: number };

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 30, 1), 30);
  const page = Math.max(Number(req.nextUrl.searchParams.get('page')) || 1, 1);
  try {
    const { data, error } = await supabaseAdmin()
      .from('programmes')
      .select('id, code, title, description, is_hidden, position')
      .order('position', { ascending: true })
      .order('id', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as ProgrammeRow[];
    const fileCounts = await getAllFileCounts().catch(() => ({} as Record<string, number>));
    const out = [];
    for (const r of rows) {
      const id = String(r.id ?? '');
      const subs = await getSubjectsForProgramme(id).catch(() => []);
      const files = subs.reduce((a, s) => a + (fileCounts[s.id] || 0), 0);
      out.push({
        id, code: String(r.code ?? ''), title: String(r.title ?? ''), description: String(r.description ?? ''),
        hidden: Boolean(r.is_hidden), position: Number(r.position ?? 0),
        subjectCount: subs.length, fileCount: files,
      });
    }
    const total = out.length;
    const programmes = out.slice((page - 1) * limit, page * limit);
    return NextResponse.json({ programmes, total, page, limit }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
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
    const sb = supabaseAdmin();
    const { data: maxRow } = await sb.from('programmes').select('position').order('position', { ascending: false }).limit(1).maybeSingle();
    const nextPos = Number((maxRow as { position: number } | null)?.position ?? 0) + 1;
    const { error } = await sb.from('programmes').insert({ id, code, title, description, position: nextPos });
    if (error) throw error;
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
      const sb = supabaseAdmin();
      for (let i = 0; i < ids.length; i += 1) {
        const { error } = await sb.from('programmes').update({ position: i }).eq('id', ids[i].slice(0, 100));
        if (error) throw error;
      }
      await logActivity('programme.reordered', 'programme', '', ids.join(','));
      revalidateTag('programmes', 'max');
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json({ error: 'Reorder failed' }, { status: 400 });
    }
  }
  if (typeof payload.id !== 'string' || !payload.id || payload.id.length > 100) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    const sb = supabaseAdmin();
    if (typeof payload.hidden === 'boolean') {
      const { error } = await sb.from('programmes').update({ is_hidden: payload.hidden }).eq('id', payload.id);
      if (error) throw error;
      await logActivity(payload.hidden ? 'programme.hidden' : 'programme.unhidden', 'programme', payload.id, '');
      revalidateTag('programmes', 'max');
      return NextResponse.json({ success: true });
    }
    const patch: { title?: string; code?: string; description?: string; position?: number } = {};
    if (typeof payload.title === 'string' && payload.title.trim()) patch.title = payload.title.trim().slice(0, 120);
    if (typeof payload.code === 'string' && payload.code.trim()) patch.code = payload.code.trim().toUpperCase().slice(0, 60);
    if (typeof payload.description === 'string') patch.description = payload.description.trim().slice(0, 500);
    if (typeof payload.position === 'number') patch.position = Math.floor(payload.position);
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    const { error } = await sb.from('programmes').update(patch).eq('id', payload.id);
    if (error) throw error;
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
    const { error } = await supabaseAdmin().from('programmes').delete().eq('id', id);
    if (error) throw error;
    await logActivity('programme.deleted', 'programme', id, `subjects:${subs.length}`);
    revalidateTag('programmes', 'max');
    revalidateTag('courses', 'max');
    revalidateTag('subjects', 'max');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete programme' }, { status: 500 });
  }
}
