'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { SearchResultsSkeleton } from '@/components/Skeleton';
import { AdminEmpty, AdminError } from '@/components/admin/ui';
import { notifyLiveSync } from '@/hooks/useLiveSync';

type Row = { id: string; code: string; title: string; description: string; hidden: boolean; position: number; subjectCount: number; fileCount: number };

export function ProgrammesAdminClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fCode, setFCode] = useState('');
  const [fDesc, setFDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDone, setDeleteDone] = useState(false);
  const [confirmSubs, setConfirmSubs] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/programmes');
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Failed to list programmes');
      setRows(((await res.json()) as { programmes: Row[] }).programmes ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list programmes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function submitAdd() {
    if (busy || !fTitle.trim() || !fCode.trim()) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/programmes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: fTitle.trim(), code: fCode.trim(), description: fDesc.trim() }),
      });
      if (!res.ok) throw new Error('Create failed');
      setFTitle('');
      setFCode('');
      setFDesc('');
      setShowAdd(false);
      notifyLiveSync('programmes');
      load();
    } catch {
      setFormError('Create failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submitEdit() {
    if (!editTarget || busy) return;
    setBusy(true);
    setFormError('');
    try {
      const res = await fetch('/api/admin/programmes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, title: fTitle.trim(), code: fCode.trim(), description: fDesc.trim() }),
      });
      if (!res.ok) throw new Error('Update failed');
      setEditTarget(null);
      notifyLiveSync('programmes');
      load();
    } catch {
      setFormError('Update failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function toggleHide(row: Row) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      await fetch('/api/admin/programmes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, hidden: !row.hidden }),
      });
      notifyLiveSync('programmes');
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function move(row: Row, dir: -1 | 1) {
    const ordered = [...rows].sort((a, b) => a.position - b.position);
    const idx = ordered.findIndex((x) => x.id === row.id);
    const swapWith = ordered[idx + dir];
    if (!swapWith) return;
    const next = [...ordered];
    next[idx] = swapWith;
    next[idx + dir] = row;
    setRows(next);
    try {
      await fetch('/api/admin/programmes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorder: next.map((x) => x.id) }),
      });
      notifyLiveSync('programmes');
    } catch {
      load();
    }
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleting(false);
    setDeleteError('');
    setDeleteDone(false);
    setConfirmSubs(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting || deleteDone) return;
    if (deleteTarget.subjectCount > 0 && !confirmSubs) {
      setDeleteError(`This programme has ${deleteTarget.subjectCount} subject(s). Tick confirm to proceed.`);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/admin/programmes?id=${encodeURIComponent(deleteTarget.id)}${deleteTarget.subjectCount > 0 ? '&force=1' : ''}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      setRows((cur) => cur.filter((x) => x.id !== deleteTarget.id));
      setDeleteDone(true);
      notifyLiveSync('programmes');
      setTimeout(closeDelete, 1200);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="rounded-[1.75rem] bg-sheet p-3 md:p-4">
        <button onClick={() => { setShowAdd(true); setFTitle(''); setFCode(''); setFDesc(''); setFormError(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-ink px-5 py-2 text-sm font-semibold text-paper hover:bg-accent">
          <Plus size={15} /> Add programme
        </button>
      </div>

      {loading && <SearchResultsSkeleton />}
      {!loading && error && <AdminError message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && <AdminEmpty title="No programmes" hint="Create the first programme." />}

      {!loading && !error && rows.length > 0 && (
        <div className="divide-y divide-line/70">
          {rows.map((r) => (
            <div key={r.id} className="min-w-0 rounded-2xl px-2 py-4 md:px-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-accent">{r.code}</span>
                {r.hidden && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600">Hidden</span>}
                <span className="ml-auto font-mono text-xs text-muted">{r.subjectCount} subjects · {r.fileCount} files</span>
              </div>
              <p className="text-dynamic mt-1 text-lg font-black text-ink">{r.title}</p>
              {r.description && <p className="mt-1 text-sm text-muted">{r.description}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => { setEditTarget(r); setFTitle(r.title); setFCode(r.code); setFDesc(r.description); setFormError(''); }} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold hover:bg-sheet"><Pencil size={15} /> Edit</button>
                <button onClick={() => toggleHide(r)} disabled={busyId === r.id} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold hover:bg-sheet disabled:opacity-50">
                  {r.hidden ? <Eye size={15} /> : <EyeOff size={15} />} {r.hidden ? 'Unhide' : 'Hide'}
                </button>
                <button onClick={() => move(r, -1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white hover:bg-sheet" aria-label="Move up"><ArrowUp size={15} /></button>
                <button onClick={() => move(r, 1)} className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white hover:bg-sheet" aria-label="Move down"><ArrowDown size={15} /></button>
                <button onClick={() => { setDeleteTarget(r); setDeleteError(''); setDeleteDone(false); setConfirmSubs(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"><Trash2 size={15} /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add programme" onClose={() => !busy && setShowAdd(false)}>
          <Field label="Title" value={fTitle} set={setFTitle} placeholder="Diploma in …" />
          <Field label="Code" value={fCode} set={(v: string) => setFCode(v.toUpperCase())} placeholder="COMPUTER SCIENCE" mono />
          <label className="mb-2 mt-3 block text-sm font-semibold">Description</label>
          <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value.slice(0, 500))} rows={3} className="w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:border-ink" />
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} disabled={busy} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            <button onClick={submitAdd} disabled={busy || !fTitle.trim() || !fCode.trim()} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">{busy && <Loader2 size={14} className="animate-spin" />} Add</button>
          </div>
        </Modal>
      )}

      {editTarget && (
        <Modal title="Edit programme" onClose={() => !busy && setEditTarget(null)}>
          <Field label="Title" value={fTitle} set={setFTitle} />
          <Field label="Code" value={fCode} set={(v: string) => setFCode(v.toUpperCase())} mono />
          <label className="mb-2 mt-3 block text-sm font-semibold">Description</label>
          <textarea value={fDesc} onChange={(e) => setFDesc(e.target.value.slice(0, 500))} rows={3} className="w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:border-ink" />
          {formError && <p className="mt-2 text-sm text-red-600">{formError}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditTarget(null)} disabled={busy} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
            <button onClick={submitEdit} disabled={busy} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">{busy && <Loader2 size={14} className="animate-spin" />} Save</button>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal title="Delete programme" onClose={() => { if (!deleting && !deleteDone) closeDelete(); }}>
          {deleteDone ? (
            <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"><Check size={18} className="text-green-700" /></div><p className="font-bold">Deleted</p></div>
          ) : (
            <>
              <p className="text-sm text-muted">Delete “{deleteTarget.title}”? {deleteTarget.subjectCount > 0 ? `Contains ${deleteTarget.subjectCount} subject(s) — files stay in storage unless subjects are deleted.` : 'Empty programme.'}</p>
              {deleteTarget.subjectCount > 0 && (
                <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmSubs} onChange={(e) => setConfirmSubs(e.target.checked)} className="mt-1 h-4 w-4" /><span>I understand this removes the programme record{(deleteTarget.subjectCount > 0) ? ' (subjects/files are NOT cascade-deleted)' : ''}.</span></label>
              )}
              {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={closeDelete} disabled={deleting} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
                <button onClick={confirmDelete} disabled={deleting} className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{deleting && <Loader2 size={14} className="animate-spin" />} Delete</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[85dvh] w-full max-w-[400px] overflow-y-auto rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-xl font-black text-ink">{title}</h3>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, set, placeholder, mono }: { label: string; value: string; set: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <>
      <label className="mb-2 mt-3 block text-sm font-semibold">{label}</label>
      <input value={value} onChange={(e) => set(e.target.value)} placeholder={placeholder} className={`w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:border-ink ${mono ? 'uppercase font-mono' : ''}`} />
    </>
  );
}
