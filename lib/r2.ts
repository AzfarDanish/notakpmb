import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';

const R2_CACHE_SECONDS = 60;
const HEAD_BATCH_SIZE = 8;
const RESERVED_PREFIXES = new Set(['announcements', 'submissions']);
let r2Client: S3Client | null | undefined;

export const isR2Configured = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  return Boolean(
    accountId && accessKeyId && secretAccessKey &&
    !accountId.includes('TODO') && process.env.R2_BUCKET_NAME,
  );
};

export const getR2Client = () => {
  if (!isR2Configured()) {
    return null;
  }

  if (r2Client !== undefined) return r2Client;

  r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return r2Client;
};

async function readAllFileCounts(): Promise<Record<string, number>> {
  const client = getR2Client();
  if (!client || !process.env.R2_BUCKET_NAME) return {};

  try {
    const counts: Record<string, number> = {};
    let nextToken: string | undefined = undefined;
    while (true) {
      const cmd: ListObjectsV2Command = new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME as string,
        ContinuationToken: nextToken,
      });
      const res = await client.send(cmd);
      const Contents = res.Contents ?? [];
      for (const item of Contents) {
        if (!item.Key) continue;
        const subjectId = item.Key.split('/')[0];
        if (subjectId && !subjectId.startsWith('_') && !RESERVED_PREFIXES.has(subjectId)) {
          counts[subjectId] = (counts[subjectId] || 0) + 1;
        }
      }
      if (!res.IsTruncated) break;
      nextToken = res.NextContinuationToken;
    }
    return counts;
  } catch (e) {
    console.error('Failed to fetch all file counts from R2:', e);
    return {};
  }
}

export const getAllFileCounts = cache(
  unstable_cache(readAllFileCounts, ['r2-file-counts'], {
    revalidate: R2_CACHE_SECONDS,
    tags: ['r2-files'],
  }),
);

export type R2Document = {
  id: string
  key: string
  title: string
  date: string
  size: string
  originalName: string
}

export type FileSearchResult = {
  subjectId: string
  key: string
  title: string
  originalName: string
}

export async function searchFiles(query: string): Promise<FileSearchResult[]> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (!client || !bucket) return [];

  const q = query.trim().toLowerCase();
  if (!q) return [];

  try {
    const listCmd = new ListObjectsV2Command({ Bucket: bucket });
    const { Contents } = await client.send(listCmd);
    if (!Contents) return [];

    const results: FileSearchResult[] = [];
    for (const item of Contents) {
      if (!item.Key) continue;
      const subjectId = item.Key.split('/')[0];
      if (!subjectId || subjectId.startsWith('_') || RESERVED_PREFIXES.has(subjectId)) continue;

      const fileName = item.Key.split('/').pop() || '';
      const head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: item.Key }),
      );
      const title = head.Metadata?.title
        ? decodeURIComponent(head.Metadata.title)
        : fileName;
      const originalName = head.Metadata?.originalname
        ? decodeURIComponent(head.Metadata.originalname)
        : fileName.replace(/^\d+-/, '');

      if (
        title.toLowerCase().includes(q) ||
        originalName.toLowerCase().includes(q) ||
        fileName.toLowerCase().includes(q)
      ) {
        results.push({ subjectId, key: item.Key, title, originalName });
      }
    }
    return results;
  } catch (e) {
    console.error('Failed to search files in R2:', e);
    return [];
  }
}

async function readSubjectDocuments(
  subjectId: string,
): Promise<R2Document[] | null> {
  const client = getR2Client();
  if (!client || !process.env.R2_BUCKET_NAME) return null;

  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      Prefix: `${subjectId}/`,
    });
    const { Contents } = await client.send(listCmd);
    
    if (!Contents) return [];

    const keyedContents = Contents.filter(
      (item): item is typeof item & { Key: string } => !!item.Key,
    ).sort(
      (a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0),
    );

    const docs: R2Document[] = [];
    for (let i = 0; i < keyedContents.length; i += HEAD_BATCH_SIZE) {
      const batch = keyedContents.slice(i, i + HEAD_BATCH_SIZE);
      docs.push(...await Promise.all(batch.map(async (item) => {
        const headCmd = new HeadObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: item.Key,
        });
        const head = await client.send(headCmd);
        
        const title = head.Metadata?.title ? decodeURIComponent(head.Metadata.title) : item.Key?.split('/').pop() || 'Untitled';
        
        const date = item.LastModified ? item.LastModified.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '';
        
        let sizeStr = '';
        if (item.Size) {
          if (item.Size < 1024 * 1024) {
            sizeStr = Math.round(item.Size / 1024) + ' KB';
          } else {
            sizeStr = (item.Size / (1024 * 1024)).toFixed(1) + ' MB';
          }
        }

        const originalName = head.Metadata?.originalname 
          ? decodeURIComponent(head.Metadata.originalname) 
          : item.Key?.split('/').pop()?.replace(/^\d+-/, '') || 'document';

        return {
          id: item.Key,
          key: item.Key,
          title,
          date,
          size: sizeStr,
          originalName,
        };
      })));
    }

    return docs;
  } catch (e) {
    if (isR2AccessDenied(e)) {
      console.warn('R2 Access Denied: Please check your Cloudflare R2 credentials in the Secrets panel.');
      return null;
    }
    console.error('Failed to fetch from R2:', e);
    return null;
  }
}

export const getSubjectDocuments = cache(
  unstable_cache(readSubjectDocuments, ['r2-subject-documents'], {
    revalidate: R2_CACHE_SECONDS,
    tags: ['r2-files'],
  }),
);

function isR2AccessDenied(e: unknown): boolean {
  if (e instanceof Error && e.name === 'AccessDenied') return true;
  if (e && typeof e === 'object' && '$metadata' in e) {
    const meta = (e as { $metadata?: { httpStatusCode?: number } }).$metadata;
    return meta?.httpStatusCode === 403;
  }
  return false;
}
