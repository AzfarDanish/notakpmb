import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
import { queryD1 } from '@/lib/d1';
import {
  getProgramme,
  getSubject,
  searchArchive,
  type Subject,
  type SubjectContext,
} from '@/lib/data';

export type ManagedSubject = Subject & {
  programmeId: string
  intake?: string
}

type IntakeExclusion = {
  subjectId: string
  intake: string
}

type SubjectRename = {
  subjectId: string
  title: string
  code?: string
}

type SubjectKind = 'custom' | 'rename' | 'deletion' | 'exclusion'

type SubjectRow = {
  id: string
  subjectId: string
  kind: SubjectKind
  title: string | null
  code: string | null
  programmeId: string | null
  intake: string | null
}

function kindId(kind: SubjectKind, subjectId: string, intake?: string): string {
  if (kind === 'custom') return subjectId;
  if (kind === 'exclusion') return `${kind}:${subjectId}:${intake ?? ''}`;
  return `${kind}:${subjectId}`;
}

async function listSubjectRows(): Promise<SubjectRow[]> {
  try {
    const res = await queryD1(
      'SELECT id, subject_id, kind, title, code, programme_id, intake FROM subjects',
    );
    return res.results.map((r) => ({
      id: String(r.id ?? ''),
      subjectId: String(r.subject_id ?? ''),
      kind: String(r.kind) as SubjectKind,
      title: r.title === null || r.title === undefined ? null : String(r.title),
      code: r.code === null || r.code === undefined ? null : String(r.code),
      programmeId:
        r.programme_id === null || r.programme_id === undefined
          ? null
          : String(r.programme_id),
      intake:
        r.intake === null || r.intake === undefined ? null : String(r.intake),
    }));
  } catch (e) {
    console.warn('Failed to read D1 subjects:', e);
    return [];
  }
}

function partitionRows(rows: SubjectRow[]): {
  customSubjects: ManagedSubject[]
  renames: SubjectRename[]
  deletedIds: string[]
  exclusions: IntakeExclusion[]
} {
  const customSubjects: ManagedSubject[] = []
  const renames: SubjectRename[] = []
  const deletedIds: string[] = []
  const exclusions: IntakeExclusion[] = []

  for (const row of rows) {
    if (row.kind === 'custom' && row.programmeId) {
      customSubjects.push({
        id: row.subjectId,
        title: row.title ?? '',
        code: row.code ?? '',
        programmeId: row.programmeId,
        ...(row.intake ? { intake: row.intake } : {}),
      });
    } else if (row.kind === 'rename') {
      renames.push({
        subjectId: row.subjectId,
        title: row.title ?? '',
        ...(row.code ? { code: row.code } : {}),
      });
    } else if (row.kind === 'deletion') {
      deletedIds.push(row.subjectId);
    } else if (row.kind === 'exclusion' && row.intake) {
      exclusions.push({ subjectId: row.subjectId, intake: row.intake });
    }
  }

  return { customSubjects, renames, deletedIds, exclusions };
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function applyRename<T extends Subject>(subject: T, renames: SubjectRename[]): T {
  const rename = renames.find((r) => r.subjectId === subject.id);
  if (!rename) return subject;
  return {
    ...subject,
    title: rename.title,
    code: rename.code ?? subject.code,
  };
}

export async function getCustomSubjects(): Promise<ManagedSubject[]> {
  const { customSubjects } = partitionRows(await listSubjectRows());
  return customSubjects;
}

export async function getSubjectsForProgramme(
  programmeId: string,
  intake?: string,
): Promise<(Subject & { intake?: string })[]> {
  const programme = getProgramme(programmeId);
  if (!programme) return [];

  const { customSubjects, renames, deletedIds, exclusions } = partitionRows(
    await listSubjectRows(),
  );
  const deleted = new Set(deletedIds);

  const excludedForIntake = new Set(
    exclusions
      .filter(
        (e) =>
          e.intake === intake &&
          subjectBelongsToProgramme(customSubjects, e.subjectId, programmeId),
      )
      .map((e) => e.subjectId),
  );

  const staticSubjects = programme.subjects
    .filter((s) => !deleted.has(s.id) && !(intake && excludedForIntake.has(s.id)))
    .map((s) => applyRename(s, renames));

  const custom = customSubjects
    .filter((s) => s.programmeId === programmeId)
    .filter((s) => !intake || !s.intake || s.intake === intake)
    .map((s) => ({ id: s.id, title: s.title, code: s.code, intake: s.intake }));

  return [...staticSubjects, ...custom];
}

function subjectBelongsToProgramme(
  customSubjects: ManagedSubject[],
  subjectId: string,
  programmeId: string,
): boolean {
  const custom = customSubjects.find((s) => s.id === subjectId);
  if (custom) return custom.programmeId === programmeId;
  return getSubject(subjectId)?.programme.id === programmeId;
}

export async function getIntakeOptions(programmeId: string): Promise<string[]> {
  const { customSubjects, exclusions } = partitionRows(await listSubjectRows());
  const intakes = new Set<string>();

  for (const s of customSubjects) {
    if (s.programmeId === programmeId && s.intake) intakes.add(s.intake);
  }
  for (const e of exclusions) {
    if (subjectBelongsToProgramme(customSubjects, e.subjectId, programmeId)) {
      intakes.add(e.intake);
    }
  }

  return [...intakes];
}

export async function getSubjectWithCustom(
  id: string,
): Promise<SubjectContext | undefined> {
  const staticContext = getSubject(id);
  const { customSubjects, renames, deletedIds } = partitionRows(
    await listSubjectRows(),
  );

  if (staticContext) {
    if (deletedIds.includes(id)) return undefined;
    return {
      subject: applyRename(staticContext.subject, renames),
      programme: staticContext.programme,
    };
  }

  const managed = customSubjects.find((s) => s.id === id);
  if (!managed) return undefined;

  const programme = getProgramme(managed.programmeId);
  if (!programme) return undefined;

  return {
    subject: { id: managed.id, title: managed.title, code: managed.code },
    programme,
  };
}

export async function addSubject(input: {
  programmeId: string
  title: string
  code?: string
  intake?: string
}): Promise<ManagedSubject> {
  const programme = getProgramme(input.programmeId);
  if (!programme) throw new Error('Unknown programme');

  const title = input.title.trim();
  if (!title) throw new Error('Subject title is required');

  const subject: ManagedSubject = {
    id: `${slugify(title)}-${Date.now().toString(36)}`,
    title,
    code: (input.code ?? '').trim(),
    programmeId: input.programmeId,
  };

  const intake = input.intake?.trim();
  if (intake) subject.intake = intake;

  const res = await queryD1(
    `INSERT INTO subjects (id, subject_id, kind, title, code, programme_id, intake)
     VALUES (?, ?, 'custom', ?, ?, ?, ?)
     ON CONFLICT(id) DO NOTHING`,
    [
      subject.id,
      subject.id,
      subject.title,
      subject.code,
      subject.programmeId,
      intake ?? null,
    ],
  );
  if ((res.meta.changes ?? 0) === 0) {
    throw new Error('Subject already exists');
  }
  return subject;
}

export async function renameSubject(input: {
  id: string
  title: string
  code?: string
}): Promise<Subject> {
  const title = input.title.trim();
  if (!title) throw new Error('Subject title is required');
  const code = input.code?.trim();
  const codeClean = code === undefined ? undefined : code;

  const rows = await listSubjectRows();

  const custom = rows.find(
    (r) => r.kind === 'custom' && r.subjectId === input.id,
  );
  if (custom) {
    await queryD1(
      `UPDATE subjects SET title = ?, code = ? WHERE id = ? AND kind = 'custom'`,
      [title, codeClean ?? custom.code ?? '', input.id],
    );
    return { id: input.id, title, code: codeClean ?? custom.code ?? '' };
  }

  const staticContext = getSubject(input.id);
  if (!staticContext) throw new Error('Subject not found');

  if (codeClean !== undefined) {
    await queryD1(
      `INSERT INTO subjects (id, subject_id, kind, title, code)
       VALUES (?, ?, 'rename', ?, ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, code = excluded.code`,
      [kindId('rename', input.id), input.id, title, codeClean],
    );
  } else {
    await queryD1(
      `INSERT INTO subjects (id, subject_id, kind, title)
       VALUES (?, ?, 'rename', ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title`,
      [kindId('rename', input.id), input.id, title],
    );
  }
  return { id: input.id, title, code: codeClean ?? staticContext.subject.code };
}

export async function deleteSubject(id: string): Promise<{ deletedFiles: number }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) throw new Error('R2 not configured');

  const rows = await listSubjectRows();
  const isCustom = rows.some((r) => r.kind === 'custom' && r.subjectId === id);
  const isStatic = Boolean(getSubject(id));

  if (isCustom) {
    await queryD1(
      `DELETE FROM subjects WHERE id = ? AND kind = 'custom'`,
      [id],
    );
  } else if (isStatic) {
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
  const results = searchArchive(query);
  const { customSubjects, renames, deletedIds } = partitionRows(
    await listSubjectRows(),
  );

  const deleted = new Set(deletedIds);
  results.subjects = results.subjects
    .filter(({ subject }) => !deleted.has(subject.id))
    .map((ctx) => ({ ...ctx, subject: applyRename(ctx.subject, renames) }));

  const q = query.trim().toLowerCase();
  for (const managed of customSubjects) {
    if (!q) continue;
    const programme = getProgramme(managed.programmeId);
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

  return results;
}
