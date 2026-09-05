'use client';

import { useState } from 'react';
import { X, Trash2, Loader2, Eye, Download, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { MoreMenu } from '@/components/MoreMenu';
import { OverlayPortal } from '@/components/OverlayPortal';
import { PreviewSkeleton } from '@/components/Skeleton';
import { useScrollLock } from '@/hooks/useScrollLock';
import { getFileKind, type FileKind } from '@/lib/fileKinds';
import type { R2Document } from '@/lib/r2';

const DocxPreview = dynamic(() => import('@/components/DocxPreview').then((mod) => mod.DocxPreview), {
  loading: () => <PreviewSkeleton label="Loading document preview" />,
});
const CodeViewer = dynamic(() => import('@/components/CodeViewer').then((mod) => mod.CodeViewer), {
  loading: () => <PreviewSkeleton label="Loading file preview" />,
});
const SpreadsheetViewer = dynamic(() => import('@/components/SpreadsheetViewer').then((mod) => mod.SpreadsheetViewer), {
  loading: () => <PreviewSkeleton label="Loading spreadsheet preview" />,
});
const ImageViewer = dynamic(() => import('@/components/ImageViewer').then((mod) => mod.ImageViewer), {
  loading: () => <PreviewSkeleton label="Loading image preview" />,
});

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
        <div className="pointer-events-none absolute inset-0 z-10 flex"><PreviewSkeleton label="Loading preview" /></div>
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

  useScrollLock(Boolean(previewItem) || Boolean(deleteItem));

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
    <section className={scrollable ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'min-w-0'}>
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
        <div className={`min-w-0 divide-y divide-line/70 ${scrollable ? 'min-h-0 flex-1 overflow-y-auto md:pr-2 md:pb-12' : ''}`}>
          {items.map((item) => (
          <div key={item.id} className="group flex min-w-0 items-center justify-between gap-3 rounded-2xl px-2 py-4 transition-colors hover:bg-soft sm:gap-4 md:px-4 md:py-5">
              <button
                onClick={() => setPreviewItem({
                  url: `/api/download?key=${encodeURIComponent(item.key)}&action=preview`,
                  title: item.title,
                  downloadUrl: `/api/download?key=${encodeURIComponent(item.key)}&action=download&filename=${encodeURIComponent(item.originalName || 'download')}`,
                  kind: getFileKind(item.originalName || item.title),
                })}
                className="min-w-0 flex-1 text-left"
              >
              <h4 className="text-dynamic text-xl font-black tracking-tight text-ink text-balance md:text-2xl">
                {item.title}
              </h4>
                {item.originalName && (
                  <p className="text-dynamic mt-1 font-mono text-xs text-muted sm:truncate">
                    {item.originalName}
                  </p>
                )}
              </button>
              <div className="flex shrink-0 items-center gap-2 text-sm text-muted sm:gap-4">
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
          <OverlayPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewItem(null)}
              className="fixed inset-0 z-[80] bg-ink/10 backdrop-blur-sm"
            />
            <motion.div
              data-overlay-panel
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-4 z-[90] flex max-h-[calc(100dvh-2rem)] w-auto max-w-full flex-col overflow-hidden rounded-[1.5rem] bg-paper shadow-[0_24px_90px_rgba(23,20,17,0.18)] md:inset-y-0 md:right-0 md:left-auto md:top-0 md:bottom-0 md:m-0 md:max-h-none md:h-auto md:max-h-none md:w-[min(900px,78vw)] md:rounded-none md:rounded-l-[1.5rem]"
            >
              <div className="safe-x safe-y flex h-full flex-col overflow-hidden p-4 md:p-8">
                <div className="mb-4 flex shrink-0 items-center justify-between gap-3 sm:mb-5 sm:gap-4">
                  <span className="min-w-0 flex-1 truncate pr-2 text-base font-black tracking-tight text-ink sm:text-lg">
                    {previewItem.title}
                  </span>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <a
                      href={previewItem.downloadUrl}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sheet text-ink transition-colors hover:bg-white sm:h-auto sm:w-auto sm:gap-2 sm:px-3 sm:py-2 sm:text-sm sm:font-semibold"
                      title="Download"
                      aria-label="Download"
                    >
                      <Download size={16} strokeWidth={1.5} />
                      <span className="hidden sm:inline">Download</span>
                    </a>
                    <button 
                      onClick={() => setPreviewItem(null)}
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-sheet hover:text-ink"
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
          </OverlayPortal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteItem && (
          <OverlayPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && !deleteSuccess && setDeleteItem(null)}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm sm:p-6"
            >
              <motion.div
                data-overlay-panel
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                className="relative z-[110] flex max-h-[min(85dvh,640px)] min-h-[min(60dvh,420px)] w-full max-w-[380px] flex-col overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_90px_rgba(23,20,17,0.16)] sm:max-w-[400px]"
              >
                <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6 md:p-7">
                <h3 className="text-dynamic mb-2 text-2xl font-black tracking-tight text-ink">Delete document</h3>
                <p className="text-dynamic mb-8 text-sm leading-6 text-muted">
                  Delete <span className="font-semibold text-ink">&quot;{deleteItem.title}&quot;</span>? This cannot be undone.
                </p>

                {deleteError && (
                  <p className="text-sm text-red-500 -mt-4 mb-4">{deleteError}</p>
                )}
                {deleteSuccess && (
                  <p className="text-sm text-green-600 -mt-4 mb-4">Document deleted successfully.</p>
                )}

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
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
                    className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : deleteSuccess ? <><Check size={14} /> Deleted</> : 'Delete'}
                  </button>
                </div>
                </div>
              </motion.div>
            </motion.div>
          </OverlayPortal>
        )}
      </AnimatePresence>
    </section>
  );
}
