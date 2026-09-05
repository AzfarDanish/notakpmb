import { randomBytes } from 'node:crypto';
import { queryD1 } from '@/lib/d1';

export type AdminNote = { id: string; entityType: string; entityId: string; body: string; createdAt: string; updatedAt: string };

export async function listAdminNotes(entityType: string, entityId: string): Promise<AdminNote[]> {
  try {
    const res = await queryD1(
      `SELECT id, entity_type, entity_id, body, created_at, updated_at FROM admin_notes WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT 20`,
      [entityType, entityId],
    );
    return res.results.map((r) => ({
      id: String(r.id ?? ''),
      entityType: String(r.entity_type ?? ''),
      entityId: String(r.entity_id ?? ''),
      body: String(r.body ?? ''),
      createdAt: String(r.created_at ?? ''),
      updatedAt: String(r.updated_at ?? ''),
    }));
  } catch {
    return [];
  }
}

export async function upsertAdminNote(entityType: string, entityId: string, body: string): Promise<AdminNote | null> {
  const clean = body.replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!clean) throw new Error('Note is empty');
  if (!entityType || !entityId) throw new Error('Missing target');
  const id = `note-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  try {
    await queryD1(
      `INSERT INTO admin_notes (id, entity_type, entity_id, body, updated_at) VALUES (?, ?, ?, ?, datetime('now'))`,
      [id, entityType.slice(0, 40), entityId.slice(0, 200), clean],
    );
    const res = await queryD1(`SELECT id, entity_type, entity_id, body, created_at, updated_at FROM admin_notes WHERE id = ? LIMIT 1`, [id]);
    const r = res.results[0];
    if (!r) return null;
    return {
      id: String(r.id ?? ''), entityType: String(r.entity_type ?? ''), entityId: String(r.entity_id ?? ''),
      body: String(r.body ?? ''), createdAt: String(r.created_at ?? ''), updatedAt: String(r.updated_at ?? ''),
    };
  } catch {
    return null;
  }
}

export async function deleteAdminNote(id: string) {
  await queryD1(`DELETE FROM admin_notes WHERE id = ?`, [id]);
}

export async function isPinned(entityType: string, entityId: string): Promise<boolean> {
  try {
    const res = await queryD1(`SELECT entity_id FROM pins WHERE entity_type = ? AND entity_id = ? LIMIT 1`, [entityType, entityId]);
    return res.results.length > 0;
  } catch {
    return false;
  }
}

export async function setPinned(entityType: string, entityId: string, pinned: boolean) {
  if (pinned) {
    await queryD1(
      `INSERT INTO pins (entity_type, entity_id, position) VALUES (?, ?, ?) ON CONFLICT(entity_type, entity_id) DO NOTHING`,
      [entityType.slice(0, 40), entityId.slice(0, 200), Date.now()],
    );
  } else {
    await queryD1(`DELETE FROM pins WHERE entity_type = ? AND entity_id = ?`, [entityType, entityId]);
  }
}

export async function listPins(entityType: string): Promise<string[]> {
  try {
    const res = await queryD1(`SELECT entity_id FROM pins WHERE entity_type = ? ORDER BY position DESC LIMIT 100`, [entityType]);
    return res.results.map((r) => String(r.entity_id ?? ''));
  } catch {
    return [];
  }
}

export async function recordStatusChange(feedbackId: string, oldStatus: string, newStatus: string, reason = '') {
  const id = `sh-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`;
  try {
    await queryD1(
      `INSERT INTO status_history (id, feedback_id, old_status, new_status, reason) VALUES (?, ?, ?, ?, ?)`,
      [id, feedbackId.slice(0, 200), oldStatus.slice(0, 40), newStatus.slice(0, 40), reason.slice(0, 500)],
    );
  } catch {
    // ignore
  }
}
