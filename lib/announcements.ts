import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase';

export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementBlockType = 'text' | 'image' | 'banner' | 'download' | 'upload_request';

export type AnnouncementBlockData = Record<string, unknown>;

export type AnnouncementBlock = {
  id: string
  announcementId: string
  type: AnnouncementBlockType
  position: number
  data: AnnouncementBlockData
  createdAt: string
  updatedAt: string
};

export type Announcement = {
  id: string
  title: string
  status: AnnouncementStatus
  publishAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  blocks: AnnouncementBlock[]
};

export type AnnouncementSubmission = {
  id: string
  announcementId: string
  blockId: string
  uploaderHash: string
  message: string
  fileCount: number
  status: 'new' | 'reviewed' | 'archived'
  createdAt: string
  files: AnnouncementFile[]
};

export type AnnouncementFile = {
  key: string
  kind: 'announcement' | 'submission'
  announcementId: string | null
  blockId: string | null
  submissionId: string | null
  title: string
  originalName: string
  size: number
  contentType: string
  createdAt: string
};

const STATUS = new Set<AnnouncementStatus>(['draft', 'published', 'archived']);
const BLOCK_TYPES = new Set<AnnouncementBlockType>(['text', 'image', 'banner', 'download', 'upload_request']);

export function normalizeAnnouncementTitle(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Title is required');
  const title = value.replace(/\s+/g, ' ').trim();
  if (!title) throw new Error('Title is required');
  if (title.length > 160) throw new Error('Title is too long');
  return title;
}

export function normalizeAnnouncementStatus(value: unknown): AnnouncementStatus {
  if (typeof value !== 'string' || !STATUS.has(value as AnnouncementStatus)) throw new Error('Invalid status');
  return value as AnnouncementStatus;
}

export function normalizeBlockType(value: unknown): AnnouncementBlockType {
  if (typeof value !== 'string' || !BLOCK_TYPES.has(value as AnnouncementBlockType)) throw new Error('Invalid block type');
  return value as AnnouncementBlockType;
}

function mapBlock(row: Record<string, unknown>): AnnouncementBlock {
  return {
    id: String(row.id ?? ''),
    announcementId: String(row.announcement_id ?? ''),
    type: String(row.type ?? 'text') as AnnouncementBlockType,
    position: Number(row.position ?? 0),
    data: (row.data && typeof row.data === 'object' ? row.data : {}) as AnnouncementBlockData,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

function mapAnnouncement(row: Record<string, unknown>, blocks: AnnouncementBlock[] = []): Announcement {
  return {
    id: String(row.id ?? ''),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'draft') as AnnouncementStatus,
    publishAt: row.publish_at == null ? null : String(row.publish_at),
    expiresAt: row.expires_at == null ? null : String(row.expires_at),
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    blocks,
  };
}

export function defaultBlockData(type: AnnouncementBlockType): AnnouncementBlockData {
  if (type === 'text') return { text: '' };
  if (type === 'image') return { key: '', alt: '', credit: '', overlayText: '', overlayEnabled: false };
  if (type === 'banner') return { label: '', message: '', link: '', cta: '', tone: 'accent' };
  if (type === 'download') return { files: [] };
  return {
    title: 'Upload files', instructions: '', required: false,
    acceptedTypes: ['pdf'], maxSizeMB: 5, multiple: false, allowMessage: true,
  };
}

export function validateBlockData(type: AnnouncementBlockType, data: AnnouncementBlockData): AnnouncementBlockData {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid block data');
  const clean: AnnouncementBlockData = {};
  const text = (v: unknown, max: number) => typeof v === 'string' ? v.trim().slice(0, max) : '';
  if (type === 'text') {
    clean.text = text(data.text, 10000);
  } else if (type === 'image') {
    clean.key = text(data.key, 500);
    clean.alt = text(data.alt, 300);
    clean.credit = text(data.credit, 300);
    clean.overlayText = text(data.overlayText, 500);
    clean.overlayEnabled = data.overlayEnabled === true;
  } else if (type === 'banner') {
    clean.label = text(data.label, 80);
    clean.message = text(data.message, 2000);
    clean.link = text(data.link, 500);
    clean.cta = text(data.cta, 80);
    clean.tone = data.tone === 'info' ? 'info' : 'accent';
  } else if (type === 'download') {
    const files = Array.isArray(data.files) ? data.files : [];
    clean.files = files.slice(0, 20).map((f) => {
      const r = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
      return { key: text(r.key, 500), label: text(r.label, 200), size: Math.max(0, Number(r.size ?? 0)), contentType: text(r.contentType, 150) };
    }).filter((f) => f.key.startsWith('announcements/'));
  } else {
    const allowed = new Set(['pdf', 'doc', 'docx', 'txt', 'jpg', 'jpeg', 'png']);
    const accepted = Array.isArray(data.acceptedTypes) ? data.acceptedTypes.map((x) => String(x).toLowerCase()).filter((x) => allowed.has(x)) : [];
    clean.title = text(data.title, 160) || 'Upload files';
    clean.instructions = text(data.instructions, 3000);
    clean.required = data.required === true;
    clean.acceptedTypes = [...new Set(accepted.length ? accepted : ['pdf'])];
    clean.maxSizeMB = Math.min(Math.max(Number(data.maxSizeMB) || 5, 1), 25);
    clean.multiple = data.multiple === true;
    clean.allowMessage = data.allowMessage !== false;
  }
  return clean;
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb.from('announcements').select('*').eq('id', id).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: rows, error: blockError } = await sb.from('announcement_blocks').select('*').eq('announcement_id', id).order('position').order('id');
  if (blockError) throw blockError;
  return mapAnnouncement(data as Record<string, unknown>, (rows ?? []).map((r) => mapBlock(r as Record<string, unknown>)));
}

async function readPublishedAnnouncement(): Promise<Announcement | null> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from('announcements')
    .select('*')
    .eq('status', 'published')
    .or(`publish_at.is.null,publish_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const id = String(data.id);
  const { data: rows, error: blockError } = await supabaseAdmin().from('announcement_blocks').select('*').eq('announcement_id', id).order('position').order('id');
  if (blockError) throw blockError;
  return mapAnnouncement(data as Record<string, unknown>, (rows ?? []).map((r) => mapBlock(r as Record<string, unknown>)));
}

export const getPublishedAnnouncement = cache(
  unstable_cache(readPublishedAnnouncement, ['published-announcement'], { revalidate: 60, tags: ['announcements'] }),
);

export async function listAnnouncements(query = '', status: AnnouncementStatus | 'all' = 'all', page = 1, limit = 30) {
  const q = query.trim();
  const safeLimit = Math.min(Math.max(limit, 1), 30);
  const safePage = Math.max(page, 1);
  let builder = supabaseAdmin().from('announcements').select('*', { count: 'exact' });
  if (status !== 'all') builder = builder.eq('status', status);
  if (q) builder = builder.or(`title.ilike.%${q}%,id.ilike.%${q}%`);
  const { data, error, count } = await builder.order('updated_at', { ascending: false }).range((safePage - 1) * safeLimit, safePage * safeLimit - 1);
  if (error) throw error;
  return { items: (data ?? []).map((r) => mapAnnouncement(r as Record<string, unknown>)), total: count ?? 0, page: safePage, limit: safeLimit };
}

export async function createAnnouncement(title: string, createdBy?: string | null): Promise<Announcement> {
  const id = `ann-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await supabaseAdmin().from('announcements').insert({ id, title: normalizeAnnouncementTitle(title), created_by: createdBy ?? null }).select('*').single();
  if (error) throw error;
  return mapAnnouncement(data as Record<string, unknown>);
}

export async function updateAnnouncement(id: string, input: { title?: unknown; publishAt?: unknown; expiresAt?: unknown; status?: unknown }) {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) patch.title = normalizeAnnouncementTitle(input.title);
  if (input.publishAt !== undefined) patch.publish_at = normalizeOptionalDate(input.publishAt);
  if (input.expiresAt !== undefined) patch.expires_at = normalizeOptionalDate(input.expiresAt);
  if (input.status !== undefined) patch.status = normalizeAnnouncementStatus(input.status);
  if (patch.publish_at && patch.expires_at && Date.parse(String(patch.expires_at)) <= Date.parse(String(patch.publish_at))) throw new Error('Expiry must be after publish date');
  const { data, error } = await supabaseAdmin().from('announcements').update(patch).eq('id', id).select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Announcement not found');
  return mapAnnouncement(data as Record<string, unknown>);
}

function normalizeOptionalDate(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Invalid date');
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid date');
  return date.toISOString();
}

export async function validateAnnouncementForPublish(id: string) {
  const ann = await getAnnouncement(id);
  if (!ann) throw new Error('Announcement not found');
  if (!ann.title.trim()) throw new Error('Title is required');
  if (ann.blocks.length === 0) throw new Error('Add at least one content block');
  for (const block of ann.blocks) {
    const d = validateBlockData(block.type, block.data);
    if (block.type === 'text' && !d.text) throw new Error('Text blocks cannot be empty');
    if (block.type === 'image' && (!d.key || !d.alt)) throw new Error('Images require a file and alt text');
    if (block.type === 'banner' && !d.message) throw new Error('Banner message is required');
    if (block.type === 'download' && (!Array.isArray(d.files) || d.files.length === 0)) throw new Error('Download blocks require at least one file');
    if (block.type === 'upload_request' && !d.title) throw new Error('Upload request title is required');
  }
  return ann;
}

export async function publishAnnouncement(id: string) {
  await validateAnnouncementForPublish(id);
  const { error } = await supabaseAdmin().rpc('publish_announcement', { target_id: id });
  if (error) throw error;
  return getAnnouncement(id);
}

export async function addBlock(announcementId: string, type: AnnouncementBlockType, data?: AnnouncementBlockData) {
  const sb = supabaseAdmin();
  const { data: max } = await sb.from('announcement_blocks').select('position').eq('announcement_id', announcementId).order('position', { ascending: false }).limit(1).maybeSingle();
  const position = Number((max as { position?: number } | null)?.position ?? -10) + 10;
  const id = `blk-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
  const clean = validateBlockData(type, data ?? defaultBlockData(type));
  const { data: row, error } = await sb.from('announcement_blocks').insert({ id, announcement_id: announcementId, type, position, data: clean }).select('*').single();
  if (error) throw error;
  return mapBlock(row as Record<string, unknown>);
}

export async function updateBlock(id: string, data: AnnouncementBlockData) {
  const { data: existing, error: readError } = await supabaseAdmin().from('announcement_blocks').select('*').eq('id', id).limit(1).maybeSingle();
  if (readError) throw readError;
  if (!existing) throw new Error('Block not found');
  const type = normalizeBlockType(existing.type);
  const clean = validateBlockData(type, data);
  const { data: row, error } = await supabaseAdmin().from('announcement_blocks').update({ data: clean, updated_at: new Date().toISOString() }).eq('id', id).select('*').single();
  if (error) throw error;
  return mapBlock(row as Record<string, unknown>);
}

export async function reorderBlocks(announcementId: string, ids: string[]) {
  const unique = [...new Set(ids)];
  const { data, error } = await supabaseAdmin().from('announcement_blocks').select('id').eq('announcement_id', announcementId);
  if (error) throw error;
  const existing = new Set((data ?? []).map((r) => String(r.id)));
  if (unique.length !== existing.size || unique.some((id) => !existing.has(id))) throw new Error('Invalid block order');
  for (let i = 0; i < unique.length; i += 1) {
    const { error: updateError } = await supabaseAdmin().from('announcement_blocks').update({ position: i * 10, updated_at: new Date().toISOString() }).eq('id', unique[i]).eq('announcement_id', announcementId);
    if (updateError) throw updateError;
  }
}

export async function deleteBlock(id: string) {
  const sb = supabaseAdmin();
  const { data: files } = await sb.from('files').select('key').eq('block_id', id).is('deleted_at', null);
  if (files?.length) {
    const { getR2Client } = await import('@/lib/r2');
    const client = getR2Client(); const bucket = process.env.R2_BUCKET_NAME;
    if (client && bucket) {
      const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
      await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: files.map((f) => ({ Key: String(f.key) })) } }));
    }
  }
  const { error } = await sb.from('announcement_blocks').delete().eq('id', id);
  if (error) throw error;
}

export async function getSubmissionGroups(announcementId: string) {
  const { data: blocks, error: blockError } = await supabaseAdmin().from('announcement_blocks').select('id, data, position').eq('announcement_id', announcementId).eq('type', 'upload_request').order('position');
  if (blockError) throw blockError;
  const groups = [];
  for (const block of blocks ?? []) {
    const { data: submissions, error } = await supabaseAdmin().from('announcement_submissions').select('*').eq('block_id', block.id).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    const mapped: AnnouncementSubmission[] = [];
    for (const row of submissions ?? []) {
      const { data: files } = await supabaseAdmin().from('files').select('*').eq('submission_id', row.id).is('deleted_at', null).order('created_at');
      mapped.push({
        id: String(row.id), announcementId: String(row.announcement_id), blockId: String(row.block_id), uploaderHash: String(row.uploader_hash), message: String(row.message ?? ''), fileCount: Number(row.file_count ?? 0), status: String(row.status ?? 'new') as AnnouncementSubmission['status'], createdAt: String(row.created_at),
        files: (files ?? []).map((f) => ({ key: String(f.key), kind: 'submission', announcementId: f.announcement_id ? String(f.announcement_id) : null, blockId: f.block_id ? String(f.block_id) : null, submissionId: f.submission_id ? String(f.submission_id) : null, title: String(f.title ?? ''), originalName: String(f.original_name ?? ''), size: Number(f.size ?? 0), contentType: String(f.content_type ?? ''), createdAt: String(f.created_at ?? '') })),
      });
    }
    groups.push({ blockId: String(block.id), title: String((block.data as Record<string, unknown>)?.title ?? 'Upload request'), submissions: mapped });
  }
  return groups;
}
