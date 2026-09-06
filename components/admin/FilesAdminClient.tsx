'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Download, Eye, Loader2, Pencil, Trash2, Upload } from 'lucide-react';
import { SearchResultsSkeleton } from '@/components/Skeleton';
import { AdminEmpty, AdminError } from '@/components/admin/ui';
import { ADMIN_PAGE_SIZE, Pagination } from '@/components/admin/Pagination';
import { MoreMenu } from '@/components/MoreMenu';
import { notifyLiveSync } from '@/hooks/useLiveSync';
import { getFileKind } from '@/lib/fileKinds';

type Item = { key: string; subjectId: string; title: string; originalName: string; date: string; size: string };

export function FilesAdminClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteDone, setDeleteDone] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Item | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ sort, page: String(page), limit: String(ADMIN_PAGE_SIZE) });
      if (q.trim()) params.set('q', q.trim());
      if (subjectId.trim()) params.set('subjectId', subjectId.trim());
      const res = await fetch(`/api/admin/files?${params.toString()}`);
      if (res.status === 403) throw new Error('Not authorized');
      if (!res.ok) throw new Error('Failed to list files');
      const data = (await res.json()) as { items: Item[]; total: number };
      setItems(data.items ?? []);
      setTotal(Number(data.total ?? 0));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to list files');
    } finally {
      setLoading(false);
    }
  }, [q, subjectId, sort, page]);

  useEffect(() => {
    const t = setTimeout(load, q || subjectId ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q, subjectId]);

  function closeDelete() {
    setDeleteTarget(null);
    setDeleting(false);
    setDeleteError('');
    setDeleteDone(false);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting || deleteDone) return;
    setDeleting(true);
    setDeleteError('');
    setBusyKey(deleteTarget.key);
    try {
      const res = await fetch(`/api/admin/files?key=${encodeURIComponent(deleteTarget.key)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      const wasLastOnPage = items.length === 1 && page > 1;
      setItems((cur) => cur.filter((x) => x.key !== deleteTarget.key));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteDone(true);
      notifyLiveSync('r2-files');
      setTimeout(() => {
        closeDelete();
        if (wasLastOnPage) setPage((p) => Math.max(1, p - 1));
      }, 1200);
    } catch {
      setDeleteError('Delete failed. Try again.');
    } finally {
      setDeleting(false);
      setBusyKey(null);
    }
  }

  async function saveRename() {
    if (!renameTarget || renameBusy || !renameTitle.trim()) return;
    setRenameBusy(true);
    setRenameError('');
    setBusyKey(renameTarget.key);
    try {
      const res = await fetch('/api/admin/files', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: renameTarget.key, title: renameTitle.trim() }),
      });
      if (!res.ok) throw new Error('Rename failed');
      setItems((cur) => cur.map((x) => (x.key === renameTarget.key ? { ...x, title: renameTitle.trim() } : x)));
      setRenameTarget(null);
      notifyLiveSync('r2-files');
    } catch {
      setRenameError('Could not update title.');
    } finally {
      setRenameBusy(false);
      setBusyKey(null);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 grid-cols-1 gap-2 rounded-[1.75rem] bg-sheet p-3 sm:grid-cols-[1fr_10rem_9rem] md:p-4">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search title, filename, key…" className="min-h-11 w-full rounded-2xl border border-line bg-white px-4 py-2 text-sm outline-none focus:border-ink" />
        <input value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPage(1); }} placeholder="Subject ID" className="min-h-11 w-full rounded-2xl border border-line bg-white px-4 py-2 font-mono text-sm outline-none focus:border-ink" />
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="min-h-11 rounded-2xl border border-line bg-white px-4 py-2 text-sm font-semibold outline-none focus:border-ink" aria-label="Sort files">
          <option value="newest">Newest</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
      </div>

      {loading && <SearchResultsSkeleton />}
      {!loading && error && <AdminError message={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <AdminEmpty title="No files" hint="Nothing matches. Uploads appear here live from storage." />}

      {!loading && !error && items.length > 0 && (
        <div className="divide-y divide-line/70">
          {items.map((it) => (
            <div key={it.key} className="flex min-w-0 items-start gap-2 rounded-2xl px-2 py-4 md:px-4">
              <div className="min-w-0 flex-1">
                <p className="text-dynamic truncate text-base font-bold text-ink">{it.title}</p>
                <p className="mt-1 truncate font-mono text-xs text-muted">{it.key}</p>
                <p className="mt-1 text-xs text-muted">{it.subjectId} · {it.date} · {it.size} · {getFileKind(it.originalName || it.title)}</p>
              </div>
              <span className="shrink-0">
                <MoreMenu
                  label={`Actions for ${it.title}`}
                  items={[
                    {
                      key: 'preview',
                      label: 'Preview',
                      icon: <Eye size={16} strokeWidth={1.5} />,
                      onClick: () => setPreviewUrl(`/api/download?key=${encodeURIComponent(it.key)}&action=preview`),
                    },
                    {
                      key: 'download',
                      label: 'Download',
                      icon: <Download size={16} strokeWidth={1.5} />,
                      onClick: () => {
                        window.location.href = `/api/download?key=${encodeURIComponent(it.key)}&action=download`;
                      },
                    },
                    {
                      key: 'rename',
                      label: 'Rename',
                      icon: <Pencil size={16} strokeWidth={1.5} />,
                      onClick: () => {
                        if (busyKey === it.key) return;
                        setRenameTarget(it);
                        setRenameTitle(it.title);
                        setRenameError('');
                      },
                    },
                    {
                      key: 'delete',
                      label: 'Delete',
                      danger: true,
                      icon: <Trash2 size={16} strokeWidth={1.5} />,
                      onClick: () => {
                        if (busyKey === it.key) return;
                        setDeleteTarget(it);
                        setDeleteError('');
                        setDeleteDone(false);
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

      {previewUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/20 p-4 backdrop-blur-sm" onClick={() => setPreviewUrl(null)}>
          <div className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-line p-4">
              <p className="truncate text-sm font-bold">Preview</p>
              <button onClick={() => setPreviewUrl(null)} className="rounded-full px-4 py-2 text-sm font-semibold text-muted hover:bg-sheet hover:text-ink">Close</button>
            </div>
            <iframe src={previewUrl} title="File preview" className="min-h-[60dvh] w-full flex-1 border-0" />
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => { if (!deleting && !deleteDone) closeDelete(); }}>
          <div className="w-full max-w-[360px] rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            {deleteDone ? (
              <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100"><Check size={18} className="text-green-700" /></div><p className="text-base font-bold">Deleted</p></div>
            ) : (
              <>
                <h3 className="text-xl font-black text-ink">Delete file</h3>
                <p className="mt-1 break-all font-mono text-xs text-muted">{deleteTarget.key}</p>
                {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
                <div className="mt-5 flex justify-end gap-2">
                  <button onClick={closeDelete} disabled={deleting} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink disabled:opacity-50">Cancel</button>
                  <button onClick={confirmDelete} disabled={deleting} className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">{deleting && <Loader2 size={14} className="animate-spin" />} Delete</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {renameTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm" onClick={() => !renameBusy && setRenameTarget(null)}>
          <div className="w-full max-w-[400px] rounded-[2rem] border border-line bg-white p-5" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="text-xl font-black text-ink">Edit title</h3>
            <p className="mt-1 break-all font-mono text-xs text-muted">{renameTarget.key}</p>
            <input value={renameTitle} onChange={(e) => setRenameTitle(e.target.value.slice(0, 200))} className="mt-3 w-full rounded-2xl border border-line px-4 py-3 text-sm outline-none focus:border-ink" placeholder="Display title" autoFocus />
            {renameError && <p className="mt-2 text-sm text-red-600">{renameError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRenameTarget(null)} disabled={renameBusy} className="px-5 py-2.5 text-sm font-semibold text-muted hover:text-ink">Cancel</button>
              <button onClick={saveRename} disabled={renameBusy || !renameTitle.trim()} className="flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">{renameBusy && <Loader2 size={14} className="animate-spin" />} Save</button>
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-muted"><Upload size={13} /> Replace: re-upload with the same subject via the public Contribute panel, then delete the old key here. Direct overwrite is intentionally not exposed to avoid silent data loss.</p>
    </div>
  );
}
