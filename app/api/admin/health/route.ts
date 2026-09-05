import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { isSupabaseConfigured, supabaseAdmin } from '@/lib/supabase';
import { getR2Client } from '@/lib/r2';
import { ListObjectsV2Command } from '@aws-sdk/client-s3';

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req);
  if (denied) return denied;
  const started = Date.now();
  let database: { ok: boolean; latencyMs: number; detail: string } = { ok: false, latencyMs: 0, detail: 'Not configured' };
  if (isSupabaseConfigured()) {
    const t = Date.now();
    try {
      const { error } = await supabaseAdmin().from('programmes').select('id', { head: true, count: 'exact' }).limit(1);
      if (error) throw error;
      database = { ok: true, latencyMs: Date.now() - t, detail: 'Supabase PostgreSQL reachable' };
    } catch (e) {
      database = { ok: false, latencyMs: Date.now() - t, detail: e instanceof Error ? e.message.slice(0, 200) : 'Database failed' };
    }
  }
  let storage: { ok: boolean; latencyMs: number; detail: string } = { ok: false, latencyMs: 0, detail: 'Not configured' };
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;
  if (client && bucket) {
    const t = Date.now();
    try {
      await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 }));
      storage = { ok: true, latencyMs: Date.now() - t, detail: 'R2 reachable' };
    } catch (e) {
      storage = { ok: false, latencyMs: Date.now() - t, detail: e instanceof Error ? `${e.name}`.slice(0, 200) : 'R2 failed' };
    }
  }
  let recentFailures: { id: string; action: string; meta: string; createdAt: string }[] = [];
  try {
    const { data, error } = await supabaseAdmin()
      .from('activity_log')
      .select('id, action, meta, created_at')
      .or('action.ilike.%fail%,meta.ilike.%fail%,meta.ilike.%error%')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) throw error;
    recentFailures = ((data ?? []) as { id: string; action: string; meta: string; created_at: string }[]).map((r) => ({
      id: String(r.id ?? ''), action: String(r.action ?? ''), meta: String(r.meta ?? '').slice(0, 300), createdAt: String(r.created_at ?? ''),
    }));
  } catch {
    recentFailures = [];
  }
  return NextResponse.json({
    app: { ok: true, latencyMs: Date.now() - started, detail: 'Next.js API reachable' },
    database, storage,
    processing: { ok: true, latencyMs: 0, detail: 'Synchronous PutObject; no queue' },
    recentFailures,
  }, { headers: { 'Cache-Control': 'private, max-age=0, must-revalidate' } });
}
