import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
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

type Manifest = {
  subjects: ManagedSubject[]
  deletedSubjectIds: string[]
  intakeExclusions: IntakeExclusion[]
  subjectRenames: SubjectRename[]
}

const MANIFEST_KEY = '_subjects.json'

const EMPTY_MANIFEST: Manifest = {
  subjects: [],
  deletedSubjectIds: [],
  intakeExclusions: [],
  subjectRenames: [],
}

async function readManifest(): Promise<Manifest> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return EMPTY_MANIFEST;

  try {
    const res = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: MANIFEST_KEY }),
    );
    const body = await res.Body?.transformToString();
    if (!body) return EMPTY_MANIFEST;
    const parsed = JSON.parse(body) as Partial<Manifest>;
    return {
      subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
      deletedSubjectIds: Array.isArray(parsed.deletedSubjectIds)
        ? parsed.deletedSubjectIds
        : [],
      intakeExclusions: Array.isArray(parsed.intakeExclusions)
        ? parsed.intakeExclusions
        : [],
      subjectRenames: Array.isArray(parsed.subjectRenames)
        ? parsed.subjectRenames
        : [],
    };
  } catch (e) {
    const isMissing = e instanceof Error && (e as { name?: string }).name === 'NoSuchKey';
    if (!isMissing) {
      console.warn('Failed to read subject manifest from R2:', e);
    }
    return EMPTY_MANIFEST;
  }
}

async function writeManifest(manifest: Manifest): Promise<void> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) throw new Error('R2 not configured');

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: MANIFEST_KEY,
      Body: JSON.stringify(manifest, null, 2),
      ContentType: 'application/json',
    }),
  );
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
  const manifest = await readManifest();
  return manifest.subjects;
}

export async function getSubjectsForProgramme(
  programmeId: string,
  intake?: string,
): Promise<(Subject & { intake?: string })[]> {
  const programme = getProgramme(programmeId);
  if (!programme) return [];

  const manifest = await readManifest();
  const deleted = new Set(manifest.deletedSubjectIds);

  const excludedForIntake = new Set(
    manifest.intakeExclusions
      .filter((e) => e.intake === intake && subjectBelongsToProgramme(manifest, e.subjectId, programmeId))
      .map((e) => e.subjectId),
  );

  const staticSubjects = programme.subjects
    .filter((s) => !deleted.has(s.id) && !(intake && excludedForIntake.has(s.id)))
    .map((s) => applyRename(s, manifest.subjectRenames));

  const customSubjects = manifest.subjects
    .filter((s) => s.programmeId === programmeId)
    .filter((s) => !intake || !s.intake || s.intake === intake)
    .map((s) => ({ id: s.id, title: s.title, code: s.code, intake: s.intake }));

  return [...staticSubjects, ...customSubjects];
}

function subjectBelongsToProgramme(
  manifest: Manifest,
  subjectId: string,
  programmeId: string,
): boolean {
  const custom = manifest.subjects.find((s) => s.id === subjectId);
  if (custom) return custom.programmeId === programmeId;
  return getSubject(subjectId)?.programme.id === programmeId;
}

export async function getIntakeOptions(programmeId: string): Promise<string[]> {
  const manifest = await readManifest();
  const intakes = new Set<string>();

  for (const s of manifest.subjects) {
    if (s.programmeId === programmeId && s.intake) intakes.add(s.intake);
  }
  for (const e of manifest.intakeExclusions) {
    if (subjectBelongsToProgramme(manifest, e.subjectId, programmeId)) {
      intakes.add(e.intake);
    }
  }

  return [...intakes];
}

export async function getSubjectWithCustom(
  id: string,
): Promise<SubjectContext | undefined> {
  const staticContext = getSubject(id);
  const manifest = await readManifest();

  if (staticContext) {
    if (manifest.deletedSubjectIds.includes(id)) return undefined;
    return {
      subject: applyRename(staticContext.subject, manifest.subjectRenames),
      programme: staticContext.programme,
    };
  }

  const managed = manifest.subjects.find((s) => s.id === id);
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

  const manifest = await readManifest();
  const subject: ManagedSubject = {
    id: `${slugify(title)}-${Date.now().toString(36)}`,
    title,
    code: (input.code ?? '').trim(),
    programmeId: input.programmeId,
  };

  const intake = input.intake?.trim();
  if (intake) subject.intake = intake;

  manifest.subjects.push(subject);
  await writeManifest(manifest);
  return subject;
}

export async function renameSubject(input: {
  id: string
  title: string
  code?: string
}): Promise<Subject> {
  const title = input.title.trim();
  if (!title) throw new Error('Subject title is required');

  const manifest = await readManifest();
  const custom = manifest.subjects.find((s) => s.id === input.id);
  if (custom) {
    custom.title = title;
    const code = input.code?.trim();
    if (code !== undefined) custom.code = code;
    await writeManifest(manifest);
    return { id: custom.id, title: custom.title, code: custom.code };
  }

  const staticContext = getSubject(input.id);
  if (!staticContext) throw new Error('Subject not found');

  const code = input.code?.trim();
  const existing = manifest.subjectRenames.find((r) => r.subjectId === input.id);
  if (existing) {
    existing.title = title;
    if (code !== undefined) existing.code = code;
  } else {
    manifest.subjectRenames.push({
      subjectId: input.id,
      title,
      ...(code !== undefined ? { code } : {}),
    });
  }
  await writeManifest(manifest);
  return { id: input.id, title, code: code ?? staticContext.subject.code };
}

export async function deleteSubject(id: string): Promise<{ deletedFiles: number }> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) throw new Error('R2 not configured');

  const manifest = await readManifest();
  const isCustom = manifest.subjects.some((s) => s.id === id);
  const isStatic = Boolean(getSubject(id));

  if (isCustom) {
    manifest.subjects = manifest.subjects.filter((s) => s.id !== id);
  } else if (isStatic) {
    manifest.deletedSubjectIds = [...new Set([...manifest.deletedSubjectIds, id])];
  } else {
    throw new Error('Subject not found');
  }

  await writeManifest(manifest);

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
  const manifest = await readManifest();

  const deleted = new Set(manifest.deletedSubjectIds);
  results.subjects = results.subjects
    .filter(({ subject }) => !deleted.has(subject.id))
    .map((ctx) => ({ ...ctx, subject: applyRename(ctx.subject, manifest.subjectRenames) }));

  const q = query.trim().toLowerCase();
  for (const managed of manifest.subjects) {
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
