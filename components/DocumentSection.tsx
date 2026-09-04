'use client';

import { useState } from 'react';
import { X, Trash2, Loader2, Eye, Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { MoreMenu } from '@/components/MoreMenu';
import { DocxPreview } from '@/components/DocxPreview';
import { CodeViewer } from '@/components/CodeViewer';
import { SpreadsheetViewer } from '@/components/SpreadsheetViewer';
import { ImageViewer } from '@/components/ImageViewer';
import { useScrollLock } from '@/hooks/useScrollLock';
import { getFileKind, type FileKind } from '@/lib/fileKinds';
import type { R2Document } from '@/lib/r2';

function NativePreview({ url }: { url: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <div className="relative w-full h-full">
      <iframe
        src={url}
        className="absolute inset-0 w-full h-full border-none"
        title="Document Preview"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400 pointer-events-none z-10">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-sm">Loading preview&hellip;</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-center p-8 text-neutral-500">
          <p className="mb-2">Unable to load this preview.</p>
        </div>
      )}
    </div>
  );
}

export function DocumentSection({ title, items, scrollable = false }: { title: string, items: R2Document[], scrollable?: boolean }) {
  const [previewItem, setPreviewItem] = useState<{url: string, title: string, downloadUrl: string, kind: FileKind} | null>(null);
  const [deleteItem, setDeleteItem] = useState<{key: string, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const router = useRouter();

  useScrollLock(Boolean(previewItem));

  const isEmpty = !items || items.length === 0;

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/delete?key=${encodeURIComponent(deleteItem.key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteSuccess(true);
        setTimeout(() => {
          setDeleteItem(null);
          router.refresh();
        }, 1200);
      } else {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setDeleteError('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className={scrollable ? 'flex min-h-0 flex-1 flex-col' : undefined}>
      <h3 className="mb-5 text-xl font-black tracking-tight text-ink md:mb-6">
        {title}
      </h3>
      {isEmpty && (
        <div className="rounded-[2rem] bg-sheet p-8 text-center">
          <p className="text-xl font-semibold tracking-tight text-ink">
            Nothing here yet
          </p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Be the first to share a useful note for this subject.
          </p>
        </div>
      )}
      {!isEmpty && (
        <div className={`divide-y divide-line/70 ${scrollable ? 'min-h-0 flex-1 overflow-y-auto md:pr-2 md:pb-12' : ''}`}>
          {items.map((item) => (
            <div key={item.id} className="group flex items-center justify-between gap-4 py-4 transition-colors hover:px-4 hover:bg-soft md:py-5">
              <button
                onClick={() => setPreviewItem({
                  url: `/api/download?key=${encodeURIComponent(item.key)}&action=preview`,
                  title: item.title,
                  downloadUrl: `/api/download?key=${encodeURIComponent(item.key)}&action=download&filename=${encodeURIComponent(item.originalName || 'download')}`,
                  kind: getFileKind(item.originalName || item.title),
                })}
                className="min-w-0 flex-1 text-left"
              >
                <h4 className="text-xl font-black tracking-tight text-ink text-balance md:text-2xl">
                  {item.title}
                </h4>
                {item.originalName && (
                  <p className="mt-1 truncate font-mono text-xs text-muted">
                    {item.originalName}
                  </p>
                )}
              </button>
              <div className="flex shrink-0 items-center gap-4 text-sm text-muted">
                <span className="hidden w-24 text-right sm:block">{item.date}</span>
                <span className="hidden w-16 text-right sm:block">{item.size}</span>

                {item.key && (
                  <MoreMenu
                    label={`Actions for ${item.title}`}
                    items={[
                      {
                        key: 'preview',
                        label: 'Preview',
                        icon: <Eye size={16} strokeWidth={1.5} />,
                        onClick: () =>
                          setPreviewItem({
                            url: `/api/download?key=${encodeURIComponent(item.key)}&action=preview`,
                            title: item.title,
                            downloadUrl: `/api/download?key=${encodeURIComponent(item.key)}&action=download&filename=${encodeURIComponent(item.originalName || 'download')}`,
                            kind: getFileKind(item.originalName || item.title),
                          }),
                      },
                      {
                        key: 'download',
                        label: 'Download',
                        icon: <Download size={16} strokeWidth={1.5} />,
                        onClick: () => {
                          window.location.href = `/api/download?key=${encodeURIComponent(item.key)}&action=download&filename=${encodeURIComponent(item.originalName || 'download')}`;
                        },
                      },
                      {
                        key: 'delete',
                        label: 'Delete',
                        danger: true,
                        icon: <Trash2 size={16} strokeWidth={1.5} />,
                        onClick: () => setDeleteItem({ key: item.key, title: item.title }),
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {previewItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewItem(null)}
              className="fixed inset-0 z-40 bg-ink/10 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-paper shadow-[0_24px_90px_rgba(23,20,17,0.18)] md:w-[min(900px,78vw)]"
            >
              <div className="flex h-full flex-col p-4 md:p-8">
                <div className="mb-5 flex shrink-0 items-center justify-between gap-4">
                  <span className="truncate pr-2 text-lg font-black tracking-tight text-ink">
                    {previewItem.title}
                  </span>
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={previewItem.downloadUrl}
                      className="flex items-center gap-2 rounded-full bg-sheet px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-white"
                      title="Download"
                    >
                      <Download size={16} strokeWidth={1.5} />
                      Download
                    </a>
                    <button 
                      onClick={() => setPreviewItem(null)}
                      className="rounded-full p-2 text-muted transition-colors hover:bg-sheet hover:text-ink"
                      aria-label="Close preview"
                    >
                      <X size={20} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <div className={`relative flex-1 overflow-hidden rounded-[1.5rem] border border-line bg-white ${previewItem.kind === 'native' ? '' : 'flex flex-col'}`}>
                  {previewItem.kind === 'docx' && (
                    <DocxPreview url={previewItem.url} title={previewItem.title} />
                  )}
                  {previewItem.kind === 'code' && <CodeViewer url={previewItem.url} />}
                  {(previewItem.kind === 'excel' || previewItem.kind === 'csv') && (
                    <SpreadsheetViewer url={previewItem.url} />
                  )}
                  {previewItem.kind === 'image' && (
                    <ImageViewer url={previewItem.url} title={previewItem.title} />
                  )}
                  {previewItem.kind === 'native' && (
                    <NativePreview key={previewItem.url} url={previewItem.url} />
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && !deleteSuccess && setDeleteItem(null)}
              className="fixed inset-0 z-50 flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-[2rem] border border-line bg-white p-6 shadow-[0_24px_90px_rgba(23,20,17,0.16)] md:p-8"
              >
                <h3 className="mb-2 text-2xl font-black tracking-tight text-ink">Delete document</h3>
                <p className="mb-8 text-sm leading-6 text-muted">
                  Delete <span className="font-semibold text-ink">&quot;{deleteItem.title}&quot;</span>? This cannot be undone.
                </p>

                {deleteError && (
                  <p className="text-sm text-red-500 -mt-4 mb-4">{deleteError}</p>
                )}
                {deleteSuccess && (
                  <p className="text-sm text-green-600 -mt-4 mb-4">Document deleted successfully.</p>
                )}

                <div className="flex items-center justify-end gap-4">
                  <button 
                    onClick={() => setDeleteItem(null)}
                    disabled={isDeleting || deleteSuccess}
                    className="px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting || deleteSuccess}
                    className="flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : deleteSuccess ? <><Check size={14} /> Deleted</> : 'Delete'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
}
