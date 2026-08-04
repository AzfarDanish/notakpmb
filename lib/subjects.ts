import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
import { d1Or, queryD1 } from '@/lib/d1';
import {
  getProgramme as getStaticProgramme,
  getSubject as getStaticSubject,
  getProgrammes as getStaticProgrammes,
  searchArchive as staticSearchArchive,
  type Programme,
  type Subject,
  type SubjectContext,
} from '@/lib/data';

export type ManagedSubject = Subject & {
  programmeId: string
}

type SubjectKind = 'custom' | 'rename' | 'deletion'

type SubjectRow = {
  subjectId: string
  kind: SubjectKind
  title: string | null
  code: string | null
  programmeId: string | null
}

function kindId(kind: SubjectKind, subjectId: string): string {
  return kind === 'custom' ? subjectId : `${kind}:${subjectId}`
}

async function listSubjectRows(): Promise<SubjectRow[]> {
  const res = await queryD1(
    'SELECT id, subject_id, kind, title, code, programme_id FROM subjects',
  );
  return res.results.map((r) => ({
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

function partitionRows(rows: SubjectRow[]): {
  customSubjects: ManagedSubject[]
  renames: Map<string, { title: string; code?: string }>
  deletedIds: Set<string>
} {
  const customSubjects: ManagedSubject[] = []
  const renames = new Map<string, { title: string; code?: string }>()
  const deletedIds = new Set<string>()

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
    }
  }

  return { customSubjects, renames, deletedIds };
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
  const { customSubjects, renames, deletedIds } = partitionRows(rows);

  const subjects = programme.subjects
    .filter((s) => !deletedIds.has(s.id))
    .map((s) => applyRename(s, renames));

  const custom = customSubjects
    .filter((s) => s.programmeId === programme.id)
    .map((s) => ({ id: s.id, title: s.title, code: s.code }));

  return { ...programme, subjects: [...subjects, ...custom] };
}

async function loadDeltas() {
  return listSubjectRows();
}

export async function getProgrammes(): Promise<Programme[]> {
  const fallback = getStaticProgrammes();
  return d1Or(async () => {
    const [programmeRows, deltaRows] = await Promise.all([
      queryD1('SELECT id, code, title, description FROM programmes ORDER BY id'),
      loadDeltas(),
    ]);
    const programmeIds = new Set(programmeRows.results.map((r) => String(r.id ?? '')));
    const programmesFromD1: Programme[] = programmeRows.results.map((r) => ({
      id: String(r.id ?? ''),
      code: String(r.code ?? ''),
      title: String(r.title ?? ''),
      description: String(r.description ?? ''),
      subjects: [],
    }));
    const merged = programmesFromD1.map((p) => withDeltas(p, deltaRows));
    for (const staticProgramme of fallback) {
      if (!programmeIds.has(staticProgramme.id)) merged.push(staticProgramme);
    }
    return merged;
  }, fallback);
}

export async function getProgramme(id: string): Promise<Programme | undefined> {
  const fallback = getStaticProgramme(id);
  return d1Or(async () => {
    const [programmeRows, deltaRows] = await Promise.all([
      queryD1('SELECT id, code, title, description FROM programmes WHERE id = ?', [id]),
      loadDeltas(),
    ]);
    if (programmeRows.results.length === 0) return undefined;
    const row = programmeRows.results[0];
    const programme: Programme = {
      id: String(row.id ?? ''),
      code: String(row.code ?? ''),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      subjects: [],
    };
    return withDeltas(programme, deltaRows);
  }, fallback);
}

export async function getSubjectsForProgramme(
  programmeId: string,
): Promise<Subject[]> {
  const fallback = getStaticProgramme(programmeId)?.subjects ?? [];
  return d1Or(async () => {
    const deltaRows = await loadDeltas();
    const staticProgramme = getStaticProgramme(programmeId);
    if (!staticProgramme) return [];
    return withDeltas(staticProgramme, deltaRows).subjects;
  }, fallback);
}

export async function getSubjectWithCustom(
  id: string,
): Promise<SubjectContext | undefined> {
  const fallback = getStaticSubject(id);
  return d1Or(async () => {
    const deltaRows = await loadDeltas();
    const { customSubjects, renames, deletedIds } = partitionRows(deltaRows);

    const staticContext = getStaticSubject(id);
    if (staticContext) {
      if (deletedIds.has(id)) return undefined;
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
}

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

  const exists = await queryD1('SELECT id FROM programmes WHERE id = ?', [
    input.programmeId,
  ]);
  if (exists.results.length === 0) throw new Error('Unknown programme');

  await queryD1(
    `INSERT INTO subjects (id, subject_id, kind, title, code, programme_id)
     VALUES (?, ?, 'custom', ?, ?, ?)`,
    [subject.id, subject.id, subject.title, subject.code, subject.programmeId],
  );
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
    await queryD1(
      `UPDATE subjects SET title = ?, code = ? WHERE id = ? AND kind = 'custom'`,
      [title, code, input.id],
    );
    return { id: input.id, title, code };
  }

  if (deletedIds.has(input.id)) throw new Error('Subject not found');
  const staticContext = getStaticSubject(input.id);
  if (!staticContext) throw new Error('Subject not found');

  await queryD1(
    `INSERT INTO subjects (id, subject_id, kind, title, code)
     VALUES (?, ?, 'rename', ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, code = excluded.code`,
    [kindId('rename', input.id), input.id, title, code],
  );
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
    await queryD1(`DELETE FROM subjects WHERE id = ? AND kind = 'custom'`, [id]);
  } else if (isStatic && !deletedIds.has(id)) {
    await queryD1(
      `INSERT INTO subjects (id, subject_id, kind)
       VALUES (?, ?, 'deletion')
       ON CONFLICT(id) DO NOTHING`,
      [kindId('deletion', id), id],
    );
  } else {
    throw new Error('Subject not found');
  }

  let deletedFiles = 0;
  const { Contents } = await client.send(
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

export async function searchArchiveWithCustom(query: string): Promise<{
  programmes: SubjectContext['programme'][]
  subjects: SubjectContext[]
}> {
  const fallback = staticSearchArchive(query);
  const q = query.trim().toLowerCase();
  if (!q) return { programmes: [], subjects: [] };

  return d1Or(async () => {
    const deltaRows = await loadDeltas();
    const { customSubjects, renames, deletedIds } = partitionRows(deltaRows);

    const results = staticSearchArchive(query);
    results.subjects = results.subjects
      .filter(({ subject }) => !deletedIds.has(subject.id))
      .map((ctx) => ({ ...ctx, subject: applyRename(ctx.subject, renames) }));

    for (const [subjectId, rename] of renames) {
      if (deletedIds.has(subjectId)) continue;
      if (
        rename.title.toLowerCase().includes(q) ||
        (rename.code ?? '').toLowerCase().includes(q)
      ) {
        if (results.subjects.some((s) => s.subject.id === subjectId)) continue;
        const ctx = getStaticSubject(subjectId);
        if (ctx) {
          results.subjects.push({
            subject: applyRename(ctx.subject, renames),
            programme: ctx.programme,
          });
        }
      }
    }

    const { programmes: programmeMatches } = results;
    for (const managed of customSubjects) {
      const programme = getStaticProgramme(managed.programmeId);
      if (!programme) continue;
      if (
        managed.title.toLowerCase().includes(q) ||
        managed.code.toLowerCase().includes(q)
      ) {
        results.subjects.push({
          subject: { id: managed.id, title: managed.title, code: managed.code },
          programme,
        });
      }
    }

    const programmesD1 = await getProgrammes();
    const programmes = programmesD1.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        programmeMatches.some((m) => m.id === p.id),
    );

    return { programmes, subjects: results.subjects };
  }, fallback);
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
