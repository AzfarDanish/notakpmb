import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { searchFeedbackAdmin } from '@/lib/feedback';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) return NextResponse.json({ programmes: [], subjects: [], files: [], feedback: [] });
  try {
    const [{ getProgrammes }, { searchCourses }, { searchArchiveWithCustom }] = await Promise.all([
      import('@/lib/subjects'), import('@/lib/courses'), import('@/lib/subjects'),
    ]);
    const [programmes, courses, archive, feedback] = await Promise.all([
      getProgrammes().then((ps) => ps.filter((p) => `${p.title} ${p.code} ${p.id}`.toLowerCase().includes(q.toLowerCase())).slice(0, 5)).catch(() => []),
      searchCourses(q, 5).catch(() => []),
      searchArchiveWithCustom(q).catch(() => ({ programmes: [], subjects: [] })),
      searchFeedbackAdmin(q, 'newest', 'all', 5).catch(() => []),
    ]);
    const { getR2Client } = await import('@/lib/r2');
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    let files: { key: string; subjectId: string; title: string }[] = [];
    if (client && bucket) {
      try {
        const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
        const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 100 }));
        const ql = q.toLowerCase();
        files = (res.Contents ?? [])
          .filter((o) => o.Key && o.Key.toLowerCase().includes(ql))
          .slice(0, 5)
          .map((o) => ({ key: o.Key as string, subjectId: (o.Key as string).split('/')[0] ?? '', title: (o.Key as string).split('/').pop() ?? '' }));
      } catch {
        files = [];
      }
    }
    return NextResponse.json({
      programmes: programmes.map((p) => ({ id: p.id, title: p.title, code: p.code, href: `/admin/programmes` })),
      subjects: [...courses.map((c) => ({ id: c.subject.id, title: c.subject.title, code: c.subject.code, href: `/admin/subjects` })), ...archive.subjects.slice(0, 5).map((s) => ({ id: s.subject.id, title: s.subject.title, code: s.subject.code, href: `/admin/subjects` }))].slice(0, 8),
      files: files.map((f) => ({ ...f, href: `/admin/files` })),
      feedback: feedback.map((f) => ({ id: f.id, title: f.body.slice(0, 80), code: `${f.votesCount} votes`, href: `/admin/feedback` })),
    }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin search error:', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
