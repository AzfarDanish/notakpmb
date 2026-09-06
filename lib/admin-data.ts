import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';

export type AdminNote = { id: string; entityType: string; entityId: string; body: string; createdAt: string; updatedAt: string };

export async function listAdminNotes(entityType: string, entityId: string): Promise<AdminNote[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('admin_notes')
      .select('id, entity_type, entity_id, body, created_at, updated_at')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    return ((data ?? []) as { id: string; entity_type: string; entity_id: string; body: string; created_at: string; updated_at: string }[]).map((r) => ({
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
    const { error } = await supabaseAdmin().from('admin_notes').insert({
      id,
      entity_type: entityType.slice(0, 40),
      entity_id: entityId.slice(0, 200),
      body: clean,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    const { data, error: selErr } = await supabaseAdmin()
      .from('admin_notes')
      .select('id, entity_type, entity_id, body, created_at, updated_at')
      .eq('id', id)
      .limit(1)
      .maybeSingle();
    if (selErr) throw selErr;
    const r = data as { id: string; entity_type: string; entity_id: string; body: string; created_at: string; updated_at: string } | null;
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
  const { error } = await supabaseAdmin().from('admin_notes').delete().eq('id', id);
  if (error) throw error;
}

export async function isPinned(entityType: string, entityId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('pins')
      .select('entity_id')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .limit(1);
    if (error) throw error;
    return (data ?? []).length > 0;
  } catch {
    return false;
  }
}

export async function setPinned(entityType: string, entityId: string, pinned: boolean) {
  const sb = supabaseAdmin();
  if (pinned) {
    const { error } = await sb.from('pins').upsert(
      { entity_type: entityType.slice(0, 40), entity_id: entityId.slice(0, 200), position: Date.now() },
      { onConflict: 'entity_type,entity_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  } else {
    const { error } = await sb.from('pins').delete().eq('entity_type', entityType).eq('entity_id', entityId);
    if (error) throw error;
  }
}

export async function listPins(entityType: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin()
      .from('pins')
      .select('entity_id')
      .eq('entity_type', entityType)
      .order('position', { ascending: false })
      .limit(100);
    if (error) throw error;
    return ((data ?? []) as { entity_id: string }[]).map((r) => String(r.entity_id ?? ''));
  } catch {
    return [];
  }
}

