import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { getProgrammes, getSubjectsForProgramme } from '@/lib/subjects';
import { getAllFileCounts } from '@/lib/r2';
import { getFeedbackCounts, listFeedback } from '@/lib/feedback';
import { listActivity } from '@/lib/admin';
import { queryD1 } from '@/lib/d1';

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
      const res = await queryD1(`SELECT key, subject_id FROM files WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5`);
      recentUploads = res.results.map((r) => ({ key: String(r.key ?? ''), subjectId: String(r.subject_id ?? '') }));
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
