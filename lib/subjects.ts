import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { getR2Client } from '@/lib/r2';
import { dbOr, supabaseAdmin } from '@/lib/supabase';

import {
  getProgramme as getStaticProgramme,
  getProgrammes as getStaticProgrammes,
  getSubject as getStaticSubject,
  searchArchive as staticSearchArchive,
  type Programme,
  type Subject,
  type SubjectContext,
} from '@/lib/data';
import {
  getCourse as getCloudCourse,
  searchCourses as searchCloudCourses,
  getProgrammesWithCourses as getCloudProgrammesWithCourses,
} from '@/lib/courses';

export type ManagedSubject = Subject & {
  programmeId: string
}

type SubjectKind = 'custom' | 'rename' | 'deletion' | 'hidden'

type SubjectRow = {
  subjectId: string
  kind: SubjectKind
  title: string | null
  code: string | null
  programmeId: string | null
}

const D1_CACHE_SECONDS = 60;

function kindId(kind: SubjectKind, subjectId: string): string {
  return kind === 'custom' ? subjectId : `${kind}:${subjectId}`
}

async function readSubjectRows(): Promise<SubjectRow[]> {
  const { data, error } = await supabaseAdmin()
    .from('subjects')
    .select('subject_id, kind, title, code, programme_id');
  if (error) throw error;
  return ((data ?? []) as { subject_id: string; kind: string; title: string | null; code: string | null; programme_id: string | null }[]).map((r) => ({
    subjectId: String(r.subject_id ?? ''),
    kind: String(r.kind) as SubjectKind,
    title: r.title === null || r.title === undefined ? null : String(r.title),
    code: r.code === null || r.code === undefined ? null : String(r.code),
    programmeId:
      r.programme_id === null || r.programme_id === undefined
        ? null
        : String(r.programme_id),
  }));
}

const listSubjectRows = cache(
  unstable_cache(readSubjectRows, ['subject-delta-rows'], {
    revalidate: D1_CACHE_SECONDS,
    tags: ['subjects'],
  }),
);

function partitionRows(rows: SubjectRow[]): {
  customSubjects: ManagedSubject[]
  renames: Map<string, { title: string; code?: string }>
  deletedIds: Set<string>
  hiddenIds: Set<string>
} {
  const customSubjects: ManagedSubject[] = []
  const renames = new Map<string, { title: string; code?: string }>()
  const deletedIds = new Set<string>()
  const hiddenIds = new Set<string>()

  for (const row of rows) {
    if (row.kind === 'custom' && row.programmeId) {
      customSubjects.push({
        id: row.subjectId,
        title: row.title ?? '',
        code: row.code ?? '',
        programmeId: row.programmeId,
      });
    } else if (row.kind === 'rename') {
      renames.set(row.subjectId, {
        title: row.title ?? '',
        ...(row.code ? { code: row.code } : {}),
      });
    } else if (row.kind === 'deletion') {
      deletedIds.add(row.subjectId);
    } else if ((row.kind as string) === 'hidden') {
      hiddenIds.add(row.subjectId);
    }
  }

  return { customSubjects, renames, deletedIds, hiddenIds };
}

function applyRename<T extends Subject>(subject: T, renames: Map<string, { title: string; code?: string }>): T {
  const rename = renames.get(subject.id);
  if (!rename) return subject;
  return {
    ...subject,
    title: rename.title,
    code: rename.code ?? subject.code,
  };
}

function withDeltas(programme: Programme, rows: SubjectRow[]): Programme {
  const { customSubjects, renames, deletedIds, hiddenIds } = partitionRows(rows);

  const subjects = programme.subjects
    .filter((s) => !deletedIds.has(s.id) && !hiddenIds.has(s.id))
    .map((s) => applyRename(s, renames));

  const custom = customSubjects
    .filter((s) => s.programmeId === programme.id && !deletedIds.has(s.id) && !hiddenIds.has(s.id))
    .map((s) => ({ id: s.id, title: s.title, code: s.code }));

  return { ...programme, subjects: [...subjects, ...custom] };
}

async function loadDeltas() {
  return listSubjectRows();
}

async function getHiddenProgrammeIds(): Promise<Set<string>> {
  try {
    const { data, error } = await supabaseAdmin().from('programmes').select('id').eq('is_hidden', true);
    if (error) throw error;
    return new Set(((data ?? []) as { id: string }[]).map((r) => String(r.id ?? '')));
  } catch {
    return new Set();
  }
}

export const getProgrammes = cache(async (): Promise<Programme[]> => {
  const fallback = getStaticProgrammes().map((p) => ({ ...p, subjects: [] }));
  return dbOr(async () => {
    const [cloudProgrammes, deltaRows, hidden] = await Promise.all([
      getCloudProgrammesWithCourses(),
      loadDeltas(),
      getHiddenProgrammeIds(),
    ]);
    return cloudProgrammes.filter((p) => !hidden.has(p.id)).map((p) => withDeltas(p, deltaRows));
  }, fallback);
});

export const getProgramme = cache(async (id: string): Promise<Programme | undefined> => {
  const fallback = getStaticProgramme(id);
  return dbOr(async () => {
    const [cloudProgrammes, deltaRows, hidden] = await Promise.all([
      getCloudProgrammesWithCourses(),
      loadDeltas(),
      getHiddenProgrammeIds(),
    ]);
    if (hidden.has(id)) return undefined;
    const programme = cloudProgrammes.find((p) => p.id === id);
    if (!programme) return fallback ? withDeltas(fallback, deltaRows) : undefined;
    return withDeltas(programme, deltaRows);
  }, fallback ? withDeltas(fallback, []) : undefined);
});

export const getSubjectsForProgramme = cache(async (
  programmeId: string,
): Promise<Subject[]> => {
  // START EMPTY: programme subjects come only from ledger (custom adds via UI), not from catalog.
  // Catalog (courses) is pick-list for the picker, not auto-enrolled.
  const fallback: Subject[] = [];
  return dbOr(async () => {
    const deltaRows = await loadDeltas();
    const base: Programme = {
      id: programmeId,
      code: getStaticProgramme(programmeId)?.code ?? programmeId,
      title: getStaticProgramme(programmeId)?.title ?? programmeId,
      description: getStaticProgramme(programmeId)?.description ?? '',
      subjects: [],
    };
    return withDeltas(base, deltaRows).subjects;
  }, fallback);
});

export const getSubjectWithCustom = cache(async (
  id: string,
): Promise<SubjectContext | undefined> => {
  const fallback = getStaticSubject(id);
  return dbOr(async () => {
    const [deltaRows, cloudCtx] = await Promise.all([
      loadDeltas(),
      getCloudCourse(id),
    ]);
    const { customSubjects, renames, deletedIds, hiddenIds } = partitionRows(deltaRows);
    if (deletedIds.has(id) || hiddenIds.has(id)) return undefined;

    if (cloudCtx) {
      return {
        subject: applyRename(cloudCtx.subject, renames),
        programme: cloudCtx.programme,
      };
    }

    const staticContext = getStaticSubject(id);
    if (staticContext) {
      return {
        subject: applyRename(staticContext.subject, renames),
        programme: staticContext.programme,
      };
    }

    const managed = customSubjects.find((s) => s.id === id);
    if (!managed) return undefined;

    const programme = getStaticProgramme(managed.programmeId);
    if (!programme) return undefined;

    return {
      subject: { id: managed.id, title: managed.title, code: managed.code },
      programme,
    };
  }, fallback);
});

export async function addSubject(input: {
  programmeId: string
  title: string
  code: string
}): Promise<ManagedSubject> {
  const title = input.title.trim();
  if (!title) throw new Error('Subject title is required');
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error('Course code is required');

  const subject: ManagedSubject = {
    id: `${slugify(title)}-${Date.now().toString(36)}`,
    title,
    code,
    programmeId: input.programmeId,
  };

  const { data: progExists, error: progErr } = await supabaseAdmin()
    .from('programmes')
    .select('id')
    .eq('id', input.programmeId)
    .limit(1);
  if (progErr) throw progErr;
  if (!progExists || progExists.length === 0) throw new Error('Unknown programme');

  // Duplicate guard: prevent same code or id already in cloud catalog or custom ledger for this programme
  const existing = await getSubjectsForProgramme(input.programmeId);
  const dup = existing.find(
    (s) => s.code.trim().toUpperCase() === code || s.title.trim().toLowerCase() === title.toLowerCase(),
  );
  if (dup) throw new Error('Subject already exists');

  const { error: insErr } = await supabaseAdmin().from('subjects').insert({
    id: subject.id, subject_id: subject.id, kind: 'custom',
    title: subject.title, code: subject.code, programme_id: subject.programmeId,
  });
  if (insErr) throw insErr;
  return subject;
}

export async function renameSubject(input: {
  id: string
  title: string
  code: string
}): Promise<Subject> {
  const title = input.title.trim();
  if (!title) throw new Error('Subject title is required');
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error('Course code is required');

  const rows = await loadDeltas();
  const { customSubjects, deletedIds } = partitionRows(rows);

  const custom = customSubjects.find((s) => s.id === input.id);
  if (custom) {
    const { error } = await supabaseAdmin()
      .from('subjects')
      .update({ title, code })
      .eq('id', input.id)
      .eq('kind', 'custom');
    if (error) throw error;
    return { id: input.id, title, code };
  }

  if (deletedIds.has(input.id)) throw new Error('Subject not found');
  const staticContext = getStaticSubject(input.id);
  if (!staticContext) throw new Error('Subject not found');

  const { error } = await supabaseAdmin().from('subjects').upsert(
    { id: kindId('rename', input.id), subject_id: input.id, kind: 'rename', title, code },
    { onConflict: 'id' },
  );
  if (error) throw error;
  return { id: input.id, title, code };
}

export async function deleteSubject(id: string): Promise<{ deletedFiles: number }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) throw new Error('R2 not configured');

  const rows = await loadDeltas();
  const { customSubjects, deletedIds } = partitionRows(rows);

  const isCustom = customSubjects.some((s) => s.id === id);
  const isStatic = Boolean(getStaticSubject(id));

  if (isCustom) {
    const { error } = await supabaseAdmin().from('subjects').delete().eq('id', id).eq('kind', 'custom');
    if (error) throw error;
  } else if (isStatic && !deletedIds.has(id)) {
    const { error } = await supabaseAdmin().from('subjects').upsert(
      { id: kindId('deletion', id), subject_id: id, kind: 'deletion' },
      { onConflict: 'id', ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    throw new Error('Subject not found');
  }

  // R2 objects are deleted by prefix below; R2 is the source of truth, so no
  // index cleanup is needed.
  let deletedFiles = 0;  const { Contents } = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: `${id}/` }),
  );
  if (Contents && Contents.length > 0) {
    const keys = Contents.filter(
      (item): item is typeof item & { Key: string } => !!item.Key,
    ).map((item) => item.Key);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
    deletedFiles = keys.length;
  }

  return { deletedFiles };
}

export const searchArchiveWithCustom = cache(async (query: string): Promise<{
  programmes: SubjectContext['programme'][]
  subjects: SubjectContext[]
}> => {
  const fallbackStatic = staticSearchArchive(query);
  const fallback: { programmes: Programme[]; subjects: SubjectContext[] } = {
    programmes: fallbackStatic.programmes,
    subjects: [...fallbackStatic.subjects],
  };
  const q = query.trim().toLowerCase();
  if (!q) return { programmes: [], subjects: [] };

  return dbOr(async () => {
    const [deltaRows, cloudSubjects, cloudProgrammes] = await Promise.all([
      loadDeltas(),
      searchCloudCourses(query, 20),
      getCloudProgrammesWithCourses(),
    ]);
    const { customSubjects, renames, deletedIds } = partitionRows(deltaRows);

    const subjects = cloudSubjects
      .filter(({ subject }) => !deletedIds.has(subject.id))
      .map((ctx) => ({ ...ctx, subject: applyRename(ctx.subject, renames) }));

    // Include renamed courses that now match but original didn't
    const renamedMatches = await Promise.all(
      Array.from(renames.entries()).map(async ([subjectId, rename]) => {
        if (deletedIds.has(subjectId)) return null;
        if (
          !rename.title.toLowerCase().includes(q) &&
          !(rename.code ?? '').toLowerCase().includes(q)
        ) return null;
        if (subjects.some((s) => s.subject.id === subjectId)) return null;
        return (await getCloudCourse(subjectId)) ?? getStaticSubject(subjectId) ?? null;
      }),
    );
    for (const ctx of renamedMatches) {
      if (!ctx) continue;
      subjects.push({
        subject: applyRename(ctx.subject, renames),
        programme: ctx.programme,
      });
    }

    // Add legacy static results not in cloud
    const staticResults = staticSearchArchive(query);
    for (const ctx of staticResults.subjects) {
      if (deletedIds.has(ctx.subject.id)) continue;
      if (subjects.some((s) => s.subject.id === ctx.subject.id)) continue;
      subjects.push({ ...ctx, subject: applyRename(ctx.subject, renames) });
    }

    for (const managed of customSubjects) {
      const programme = getStaticProgramme(managed.programmeId);
      if (!programme) continue;
      if (
        managed.title.toLowerCase().includes(q) ||
        managed.code.toLowerCase().includes(q)
      ) {
        if (subjects.some((s) => s.subject.id === managed.id)) continue;
        subjects.push({
          subject: { id: managed.id, title: managed.title, code: managed.code },
          programme,
        });
      }
    }

    const { programmes: programmeMatches } = staticResults;
    const programmesWithDeltas = cloudProgrammes.map((p) => withDeltas(p, deltaRows));
    const programmes = programmesWithDeltas.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        programmeMatches.some((m) => m.id === p.id),
    );

    return { programmes, subjects };
  }, fallback);
});

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
