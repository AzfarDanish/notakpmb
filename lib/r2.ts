import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

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

  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
};

export async function getAllFileCounts(): Promise<Record<string, number>> {
  const client = getR2Client();
  if (!client || !process.env.R2_BUCKET_NAME) return {};

  try {
    const listCmd = new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
    });
    const { Contents } = await client.send(listCmd);
    
    if (!Contents) return {};

    const counts: Record<string, number> = {};
    for (const item of Contents) {
      if (!item.Key) continue;
      const subjectId = item.Key.split('/')[0];
      if (subjectId && !subjectId.startsWith('_')) {
        counts[subjectId] = (counts[subjectId] || 0) + 1;
      }
    }
    return counts;
  } catch (e) {
    console.error('Failed to fetch all file counts from R2:', e);
    return {};
  }
}

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
      if (!subjectId || subjectId.startsWith('_')) continue;

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

export async function getSubjectDocuments(
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

    const docs = await Promise.all(keyedContents.map(async (item) => {
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
    }));

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

function isR2AccessDenied(e: unknown): boolean {
  if (e instanceof Error && e.name === 'AccessDenied') return true;
  if (e && typeof e === 'object' && '$metadata' in e) {
    const meta = (e as { $metadata?: { httpStatusCode?: number } }).$metadata;
    return meta?.httpStatusCode === 403;
  }
  return false;
}
