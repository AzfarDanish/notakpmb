import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client } from '@/lib/r2';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const subjectId = formData.get('subjectId') as string;
    const category = formData.get('category') as string;
    const title = formData.get('title') as string;

    if (!file || !subjectId || !category || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = getR2Client();
    if (!client || !process.env.R2_BUCKET_NAME) {
      return NextResponse.json({ error: 'R2 is not configured' }, { status: 500 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `${subjectId}/${category.toLowerCase()}/${Date.now()}-${file.name}`;

    await client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        title: encodeURIComponent(title),
        originalName: encodeURIComponent(file.name),
      }
    }));

    revalidateTag('r2-files', 'max');

    return NextResponse.json({ success: true, key });
  } catch (error) {
    if (error instanceof Error && error.name === 'AccessDenied') {
      return NextResponse.json({ error: 'R2 Access Denied. Please check your credentials in the Secrets panel.' }, { status: 500 });
    }
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
