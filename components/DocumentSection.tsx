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
    <section className={scrollable ? 'flex flex-col flex-1 min-h-0' : undefined}>
      <h3 className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-6 md:mb-8 border-b border-neutral-200 pb-4 shrink-0">
        {title}
      </h3>
      {isEmpty && (
        <div className="border border-dashed border-neutral-300 rounded-sm p-8 text-center">
          <p className="font-serif text-lg text-neutral-500">
            Nothing here yet
          </p>
          <p className="text-xs text-neutral-400 mt-2">
            Every archive begins with one contribution. Be the first — the note you share might save a classmate.
          </p>
        </div>
      )}
      {!isEmpty && (
        <div className={`flex flex-col gap-6 md:gap-8 ${scrollable ? 'flex-1 min-h-0 overflow-y-auto md:pr-2 md:pb-12' : ''}`}>
        {items.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <button 
              onClick={() => setPreviewItem({
                url: `/api/download?key=${encodeURIComponent(item.key)}&action=preview`,
                title: item.title,
                downloadUrl: `/api/download?key=${encodeURIComponent(item.key)}&action=download&filename=${encodeURIComponent(item.originalName || 'download')}`,
                kind: getFileKind(item.originalName || item.title),
              })}
              className="flex-1 text-left cursor-pointer"
            >
              <h4 className="font-serif text-xl md:text-2xl group-hover:opacity-60 transition-opacity">
                {item.title}
              </h4>
              {item.originalName && (
                <p className="text-xs text-neutral-400 mt-1 font-mono">
                  {item.originalName}
                </p>
              )}
            </button>
            <div className="flex items-center gap-4 text-sm text-neutral-500 shrink-0">
              <span className="w-24 text-right hidden sm:block">{item.date}</span>
              <span className="w-16 text-right hidden sm:block">{item.size}</span>

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
              className="fixed inset-0 bg-white/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[800px] bg-paper shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 md:p-12 flex flex-col h-full">
                <div className="flex items-center justify-between gap-4 mb-6 md:mb-8 shrink-0">
                  <span className="text-[10px] tracking-widest text-neutral-500 uppercase font-medium truncate pr-2">
                    PREVIEW &middot; {previewItem.title}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={previewItem.downloadUrl}
                      className="flex items-center gap-2 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
                      title="Download"
                    >
                      <Download size={16} strokeWidth={1.5} />
                      DOWNLOAD
                    </a>
                    <button 
                      onClick={() => setPreviewItem(null)}
                      className="text-neutral-400 hover:text-neutral-900 transition-colors"
                      aria-label="Close preview"
                    >
                      <X size={20} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                <div className={`flex-1 bg-white rounded-sm border border-neutral-200 overflow-hidden relative shadow-inner ${previewItem.kind === 'native' ? '' : 'flex flex-col'}`}>
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
              className="fixed inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white border border-neutral-200 shadow-2xl rounded-sm p-8 max-w-md w-full"
              >
                <h3 className="font-serif text-2xl font-bold mb-2 text-neutral-900">Delete Document</h3>
                <p className="text-neutral-500 text-sm mb-8">
                  Are you sure you want to delete <span className="font-medium text-neutral-900">&quot;{deleteItem.title}&quot;</span>? This action cannot be undone.
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
                    className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting || deleteSuccess}
                    className="px-6 py-3 bg-red-500 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2 rounded-sm"
                  >
                    {isDeleting ? <><Loader2 size={14} className="animate-spin" /> DELETING...</> : deleteSuccess ? <><Check size={14} /> DELETED</> : 'DELETE'}
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
