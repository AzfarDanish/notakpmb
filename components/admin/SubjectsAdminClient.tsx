'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { SearchResultsSkeleton } from '@/components/Skeleton';
import { AdminEmpty, AdminError } from '@/components/admin/ui';
import { ADMIN_PAGE_SIZE, Pagination } from '@/components/admin/Pagination';
import { MoreMenu } from '@/components/MoreMenu';
import { notifyLiveSync } from '@/hooks/useLiveSync';

type Row = { id: string; title: string; code: string; programmeId: string; programmeTitle: string; fileCount: number; hidden: boolean };

export function SubjectsAdminClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addProg, setAddProg] = useState('dcs');
  const [addTitle, setAddTitle] = useState('');
  const [addCode, setAddCode] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDone, setDeleteDone] = useState(false);
  const [confirmFiles, setConfirmFiles] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(ADMIN_PAGE_SIZE) });
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/admin/subjects?${params.toString()}`);
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Failed to list subjects');
      const data = (await res.json()) as { subjects: Row[]; total: number };
      setRows(data.subjects ?? []);
      setTotal(Number(data.total ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list subjects');
    } finally {
      setLoading(false);
    }
  }, [q, page]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  async function submitAdd() {
    if (addBusy || !addTitle.trim() || !addCode.trim()) return;
    setAddBusy(true);
    setAddError('');
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programmeId: addProg, title: addTitle.trim(), code: addCode.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Add failed');
      setAddTitle('');
      setAddCode('');
      setShowAdd(false);
      notifyLiveSync('subjects');
      load();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setAddBusy(false);
    }
  }

  async function submitEdit() {
    if (!editTarget || editBusy) return;
    setEditBusy(true);
    setEditError('');
    setBusyId(editTarget.id);
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editTarget.id, title: editTitle.trim(), code: editCode.trim() }),
      });
      if (!res.ok) throw new Error('Rename failed');
      setEditTarget(null);
      notifyLiveSync('subjects');
      load();
    } catch {
      setEditError('Rename failed. Try again.');
    } finally {
      setEditBusy(false);
      setBusyId(null);
    }
  }

  async function toggleHide(row: Row) {
    if (busyId) return;
    setBusyId(row.id);
    try {
      const res = await fetch('/api/admin/subjects', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, hidden: !row.hidden }),
      });
      if (!res.ok) throw new Error('Hide failed');
      notifyLiveSync('subjects');
      load();
    } catch {
      setError('Hide toggle failed.');
    } finally {
      setBusyId(null);
    }
  }

  function closeDelete() {
    setDeleteTarget(null);
    setDeleting(false);
    setDeleteError('');
    setDeleteDone(false);
    setConfirmFiles(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting || deleteDone) return;
    if (deleteTarget.fileCount > 0 && !confirmFiles) {
      setDeleteError(`This subject has ${deleteTarget.fileCount} file(s). Tick confirm to cascade-delete them.`);
      return;
    }
    setDeleting(true);
    setDeleteError('');
    setBusyId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/subjects?id=${encodeURIComponent(deleteTarget.id)}${deleteTarget.fileCount > 0 ? '&force=1' : ''}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || 'Delete failed');
      const wasLastOnPage = rows.length === 1 && page > 1;
      setRows((cur) => cur.filter((x) => x.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteDone(true);
      notifyLiveSync('subjects');
      notifyLiveSync('r2-files');
      setTimeout(() => {
        closeDelete();
        if (wasLastOnPage) setPage((p) => Math.max(1, p - 1));
      }, 1200);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed.');
    } finally {
      setDeleting(false);
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex min-w-0 flex-col gap-2 rounded-[1.75rem] bg-sheet p-3 sm:flex-row md:p-4">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search subjects…" className="min-h-11 w-full flex-1 rounded-2xl border border-line bg-white px-4 py-2 text-sm outline-none focus:border-ink" />
        <button onClick={() => setShowAdd(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-2 text-sm font-semibold text-paper hover:bg-accent">
          <Plus size={15} /> Add subject
        </button>
      </div>

      {loading && <SearchResultsSkeleton />}
      {!loading && error && <AdminError message={error} onRetry={load} />}
      {!loading && !error && rows.length === 0 && <AdminEmpty title="No subjects" hint="Add the first subject to start the shelf." />}

      {!loading && !error && rows.length > 0 && (
        <div className="divide-y divide-line/70">
          {rows.map((r) => (
            <div key={r.id} className="flex min-w-0 items-start gap-2 rounded-2xl px-2 py-4 md:px-4">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-accent">{r.code}</span>
                  {r.hidden && <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-bold text-neutral-600">Hidden</span>}
                  <span className="ml-auto font-mono text-xs text-muted">{r.fileCount} files</span>
                </div>
                <p className="text-dynamic mt-1 truncate text-lg font-black text-ink">{r.title}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted">{r.id} · {r.programmeTitle}</p>
              </div>
              <span className="shrink-0">
                <MoreMenu
                  label={`Actions for ${r.title}`}
                  items={[
                    {
                      key: 'edit',
                      label: 'Edit',
                      icon: <Pencil size={16} strokeWidth={1.5} />,
                      onClick: () => {
                        if (busyId === r.id) return;
                        setEditTarget(r);
                        setEditTitle(r.title);
                        setEditCode(r.code);
                        setEditError('');
                      },
                    },
                    {
                      key: 'hide',
                      label: r.hidden ? 'Unhide' : 'Hide',
                      icon: r.hidden ? <Eye size={16} strokeWidth={1.5} /> : <EyeOff size={16} strokeWidth={1.5} />,
                      onClick: () => toggleHide(r),
                    },
                    {
                      key: 'delete',
                      label: 'Delete',
                      danger: true,
                      icon: <Trash2 size={16} strokeWidth={1.5} />,
                      onClick: () => {
                        if (busyId === r.id) return;
                        setDeleteTarget(r);
                        setDeleteError('');
                        setDeleteDone(false);
                        setConfirmFiles(false);
                      },
                    },
                  ]}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && (
        <Pagination page={page} totalPages={Math.ceil(total / ADMIN_PAGE_SIZE)} onChange={setPage} />
      )}

      {showAdd && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => !addBusy && setShowAdd(false)}>
          <div className="w-full max-w-[400px] rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="text-xl font-black text-ink">Add subject</h3>
            <label className="mb-2 mt-4 block text-sm font-semibold">Programme</label>
            <select value={addProg} onChange={(e) => setAddProg(e.target.value)} className="min-h-11 w-full rounded-2xl border border-line px-4 py-2 text-sm outline-none focus:border-ink">
              <option value="dcs">dcs — Computer Science</option>
              <option value="dbs">dbs — Business</option>
              <option value="dia">dia — Accounting</option>
              <option value="cfab">cfab — Certificate</option>
            </select>
            <label className="mb-2 mt-3 block text-sm font-semibold">Title</label>
            <input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} className="w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:border-ink" placeholder="e.g. Machine Learning" />
            <label className="mb-2 mt-3 block text-sm font-semibold">Code</label>
            <input value={addCode} onChange={(e) => setAddCode(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-line px-4 py-3 text-sm uppercase outline-none focus:border-ink" placeholder="e.g. CSC 2853" />
            {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} disabled={addBusy} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
              <button onClick={submitAdd} disabled={addBusy || !addTitle.trim() || !addCode.trim()} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">
                {addBusy && <Loader2 size={14} className="animate-spin" />} Add
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => !editBusy && setEditTarget(null)}>
          <div className="w-full max-w-[400px] rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="text-xl font-black text-ink">Edit subject</h3>
            <p className="mt-1 truncate font-mono text-xs text-muted">{editTarget.id}</p>
            <label className="mb-2 mt-3 block text-sm font-semibold">Title</label>
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:border-ink" />
            <label className="mb-2 mt-3 block text-sm font-semibold">Code</label>
            <input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-line px-4 py-3 text-sm uppercase outline-none focus:border-ink" />
            {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditTarget(null)} disabled={editBusy} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
              <button onClick={submitEdit} disabled={editBusy || !editTitle.trim() || !editCode.trim()} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">
                {editBusy && <Loader2 size={14} className="animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => { if (!deleting && !deleteDone) closeDelete(); }}>
          <div className="w-full max-w-[380px] rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {deleteDone ? (
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"><Check size={18} className="text-green-700" /></div><p className="text-base font-bold">Deleted</p></div>
            ) : (
              <>
                <h3 className="text-xl font-black text-ink">Delete subject</h3>
                <p className="mt-1 text-sm text-muted">Delete “{deleteTarget.title}” ({deleteTarget.code})? {deleteTarget.fileCount > 0 ? `This will also delete ${deleteTarget.fileCount} file(s).` : 'No files attached.'}</p>
                {deleteTarget.fileCount > 0 && (
                  <label className="mt-3 flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={confirmFiles} onChange={(e) => setConfirmFiles(e.target.checked)} className="mt-1 h-4 w-4" />
                    <span>I understand {deleteTarget.fileCount} file(s) will be permanently deleted.</span>
                  </label>
                )}
                {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={closeDelete} disabled={deleting} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
                  <button onClick={confirmDelete} disabled={deleting} className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    {deleting && <Loader2 size={14} className="animate-spin" />} Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
