import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getProgrammes, getSubjectsForProgramme } from '@/lib/subjects';
import { getAllFileCounts } from '@/lib/r2';
import { getFeedbackCounts, listFeedback } from '@/lib/feedback';
import { listActivity } from '@/lib/admin';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  try {
    const [programmes, fileCounts, fbCounts] = await Promise.all([
      getProgrammes(),
      getAllFileCounts(),
      getFeedbackCounts().catch(() => ({ total: 0, votes: 0 })),
    ]);
    let totalSubjects = 0;
    for (const p of programmes) {
      try {
        const subs = await getSubjectsForProgramme(p.id);
        totalSubjects += subs.length;
      } catch {
        // ignore per-programme failure
      }
    }
    const totalFiles = Object.values(fileCounts).reduce((a, b) => a + (b || 0), 0);
    const [recentFeedback, recentActivity] = await Promise.all([
      listFeedback({ sort: 'newest' }).then((items) => items.slice(0, 5)).catch(() => []),
      listActivity(8).catch(() => []),
    ]);
    let recentUploads: { key: string; subjectId: string }[] = [];
    try {
      // R2 is the source of truth: derive recent uploads from object listing.
      const { getR2Client } = await import('@/lib/r2');
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const r2 = getR2Client();
      const bucket = process.env.R2_BUCKET_NAME;
      if (r2 && bucket) {
        const seen: { key: string; subjectId: string; at: string }[] = [];
        let token: string | undefined;
        for (let pages = 0; pages < 5; pages += 1) {
          const res = await r2.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token, MaxKeys: 200 }));
          for (const obj of res.Contents ?? []) {
            if (!obj.Key) continue;
            const sid = obj.Key.split('/')[0] ?? '';
            if (!sid || sid.startsWith('_') || sid === 'announcements' || sid === 'submissions') continue;
            seen.push({ key: obj.Key, subjectId: sid, at: obj.LastModified ? obj.LastModified.toISOString() : '' });
          }
          if (!res.IsTruncated) break;
          token = res.NextContinuationToken;
        }
        recentUploads = seen.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map(({ key, subjectId }) => ({ key, subjectId }));
      }
    } catch {
      recentUploads = [];
    }
    return NextResponse.json({
      programmes: programmes.length,
      subjects: totalSubjects,
      files: totalFiles,
      feedback: fbCounts.total,
      votes: fbCounts.votes,
      recentFeedback,
      recentActivity,
      recentUploads,
    }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
  } catch (e) {
    console.error('Admin stats error:', e);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
