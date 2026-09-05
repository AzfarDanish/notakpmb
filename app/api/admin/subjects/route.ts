import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { logActivity, requireAdmin } from '@/lib/admin';
import { addSubject, deleteSubject, renameSubject } from '@/lib/subjects';
import { queryD1 } from '@/lib/d1';
import { getAllFileCounts } from '@/lib/r2';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const programmeId = req.nextUrl.searchParams.get('programmeId') ?? '';
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
  try {
    const { getProgrammes, getSubjectsForProgramme } = await import('@/lib/subjects');
    const programmes = await getProgrammes();
    const fileCounts = await getAllFileCounts().catch(() => ({} as Record<string, number>));
    const out: { id: string; title: string; code: string; programmeId: string; programmeTitle: string; fileCount: number; hidden: boolean }[] = [];
    const hiddenRows = await queryD1(`SELECT subject_id FROM subjects WHERE kind = 'hidden'`).then((r) => new Set(r.results.map((x) => String(x.subject_id ?? '')))).catch(() => new Set<string>());
    for (const p of programmes) {
      if (programmeId && p.id !== programmeId) continue;
      const subs = await getSubjectsForProgramme(p.id).catch(() => []);
      for (const s of subs) {
        if (q && !`${s.title} ${s.code} ${s.id}`.toLowerCase().includes(q)) continue;
        out.push({ id: s.id, title: s.title, code: s.code, programmeId: p.id, programmeTitle: p.title, fileCount: fileCounts[s.id] || 0, hidden: hiddenRows.has(s.id) });
      }
    }
    out.sort((a, b) => a.programmeId.localeCompare(b.programmeId) || a.code.localeCompare(b.code));
    return NextResponse.json({ subjects: out.slice(0, 200) }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin subjects list error:', e);
    return NextResponse.json({ error: 'Failed to list subjects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { programmeId?: unknown; title?: unknown; code?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof payload.programmeId !== 'string' || !payload.programmeId || payload.programmeId.length > 50) {
    return NextResponse.json({ error: 'Invalid programmeId' }, { status: 400 });
  }
  try {
    const subject = await addSubject({ programmeId: payload.programmeId, title: String(payload.title ?? ''), code: String(payload.code ?? '') });
    await logActivity('subject.created', 'subject', subject.id, `${subject.code} ${subject.title}`);
    revalidateTag('subjects', 'max');
    return NextResponse.json({ subject }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to add subject';
    const code = msg === 'Subject already exists' ? 409 : 400;
    return NextResponse.json({ error: msg }, { status: code });
  }
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  let payload: { id?: unknown; title?: unknown; code?: unknown; hidden?: unknown };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (typeof payload.id !== 'string' || !payload.id || payload.id.length > 200) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }
  try {
    if (typeof payload.hidden === 'boolean') {
      if (payload.hidden) {
        await queryD1(`INSERT INTO subjects (id, subject_id, kind) VALUES (?, ?, 'hidden') ON CONFLICT(id) DO NOTHING`, [`hidden:${payload.id}`, payload.id]);
      } else {
        await queryD1(`DELETE FROM subjects WHERE id = ? AND kind = 'hidden'`, [`hidden:${payload.id}`]);
      }
      await logActivity(payload.hidden ? 'subject.hidden' : 'subject.unhidden', 'subject', payload.id, '');
      revalidateTag('subjects', 'max');
      return NextResponse.json({ success: true });
    }
    const subject = await renameSubject({ id: payload.id, title: String(payload.title ?? ''), code: String(payload.code ?? '') });
    await logActivity('subject.edited', 'subject', payload.id, `${subject.code} ${subject.title}`);
    revalidateTag('subjects', 'max');
    return NextResponse.json({ subject });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to update subject' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  const force = req.nextUrl.searchParams.get('force') === '1';
  if (!id || id.length > 200) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  try {
    const fileCounts = await getAllFileCounts().catch(() => ({} as Record<string, number>));
    const count = fileCounts[id] || 0;
    if (count > 0 && !force) {
      return NextResponse.json({ error: `Subject has ${count} file(s). Confirm destructive delete.`, needsConfirm: true, fileCount: count }, { status: 409 });
    }
    const result = await deleteSubject(id);
    await queryD1(`DELETE FROM subjects WHERE id = ? AND kind = 'hidden'`, [`hidden:${id}`]).catch(() => undefined);
    await logActivity('subject.deleted', 'subject', id, `files:${result.deletedFiles}`);
    revalidateTag('subjects', 'max');
    revalidateTag('r2-files', 'max');
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to delete subject' }, { status: 400 });
  }
}
