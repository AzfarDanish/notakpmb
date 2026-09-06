import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';

const CONTENT_TYPES: Record<string, string> = {
  pdf:  'application/pdf',
  png:  'image/png',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  gif:  'image/gif',
  webp: 'image/webp',
  txt:  'text/plain',
  csv:  'text/csv',
};

function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

export async function GET(req: NextRequest) {
  const key      = req.nextUrl.searchParams.get('key');
  const action   = req.nextUrl.searchParams.get('action') || 'preview';
  const rawFilename = req.nextUrl.searchParams.get('filename')
    ?? key?.split('/').pop()?.replace(/^\d+-/, '')
    ?? 'download';
  const filename = rawFilename.replace(/["\r\n]/g, '_').slice(0, 200) || 'download';

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  if (key.startsWith('submissions/') || key.startsWith('_') || key.includes('..')) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  const client = getR2Client();
  if (!client || !process.env.R2_BUCKET_NAME) {
    return NextResponse.json({ error: 'R2 not configured' }, { status: 500 });
  }

  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);
    const stream = response.Body as ReadableStream;

    const stored = response.ContentType ?? '';
    const allowedPreview = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain', 'text/csv']);
    const contentType = stored && (action === 'download' || allowedPreview.has(stored) || stored.startsWith('image/'))
      ? stored
      : getContentType(filename);
    const disposition = action === 'download'
      ? `attachment; filename="${filename}"`
      : `inline; filename="${filename}"`;

    return new NextResponse(stream, {
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': disposition,
        'Cache-Control':       'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
  }
}
