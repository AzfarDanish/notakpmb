import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';
import {
  getProgramme,
  getProgrammeSemester,
  getSubject,
  searchArchive,
  type Subject,
  type SubjectContext,
} from '@/lib/data';

export type ManagedSubject = Subject & {
  programmeId: string
  semesterId: string
}

type Manifest = {
  subjects: ManagedSubject[]
  deletedSubjectIds: string[]
}

const MANIFEST_KEY = '_subjects.json'

const EMPTY_MANIFEST: Manifest = { subjects: [], deletedSubjectIds: [] }

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

export async function getCustomSubjects(): Promise<ManagedSubject[]> {
  const manifest = await readManifest();
  return manifest.subjects;
}

export async function getSubjectsForSemester(
  programmeId: string,
  semesterId: string,
): Promise<Subject[]> {
  const semester = getProgrammeSemester(programmeId, semesterId);
  if (!semester) return [];

  const manifest = await readManifest();
  const deleted = new Set(manifest.deletedSubjectIds);
  const staticSubjects = semester.subjects.filter((s) => !deleted.has(s.id));
  const customSubjects = manifest.subjects.filter(
    (s) => s.programmeId === programmeId && s.semesterId === semesterId,
  );
  return [...staticSubjects, ...customSubjects];
}

export async function getSubjectWithCustom(
  id: string,
): Promise<SubjectContext | undefined> {
  const staticContext = getSubject(id);
  const manifest = await readManifest();

  if (staticContext) {
    if (manifest.deletedSubjectIds.includes(id)) return undefined;
    return staticContext;
  }

  const managed = manifest.subjects.find((s) => s.id === id);
  if (!managed) return undefined;

  const programme = getProgramme(managed.programmeId);
  const semester = getProgrammeSemester(managed.programmeId, managed.semesterId);
  if (!programme || !semester) return undefined;

  return {
    subject: { id: managed.id, title: managed.title, code: managed.code },
    programme,
    semester,
  };
}

export async function addSubject(input: {
  programmeId: string
  semesterId: string
  title: string
  code?: string
}): Promise<ManagedSubject> {
  const semester = getProgrammeSemester(input.programmeId, input.semesterId);
  if (!semester) throw new Error('Unknown programme or semester');

  const title = input.title.trim();
  if (!title) throw new Error('Subject title is required');

  const manifest = await readManifest();
  const subject: ManagedSubject = {
    id: `${slugify(title)}-${Date.now().toString(36)}`,
    title,
    code: (input.code ?? '').trim(),
    programmeId: input.programmeId,
    semesterId: input.semesterId,
  };

  manifest.subjects.push(subject);
  await writeManifest(manifest);
  return subject;
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
  results.subjects = results.subjects.filter(({ subject }) => !deleted.has(subject.id));

  const q = query.trim().toLowerCase();
  for (const managed of manifest.subjects) {
    if (!q) continue;
    const programme = getProgramme(managed.programmeId);
    const semester = getProgrammeSemester(managed.programmeId, managed.semesterId);
    if (!programme || !semester) continue;
    if (
      managed.title.toLowerCase().includes(q) ||
      managed.code.toLowerCase().includes(q)
    ) {
      results.subjects.push({
        subject: { id: managed.id, title: managed.title, code: managed.code },
        programme,
        semester,
      });
    }
  }

  return results;
}
