'use client';

import { useState } from 'react';
import { Download, Eye, X, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import type { R2Document } from '@/lib/r2';

export function DocumentSection({ title, items }: { title: string, items: R2Document[] }) {
  const [previewItem, setPreviewItem] = useState<{url: string, title: string} | null>(null);
  const [deleteItem, setDeleteItem] = useState<{key: string, title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  if (!items || items.length === 0) return null;

  const handleDelete = async () => {
    if (!deleteItem) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/delete?key=${encodeURIComponent(deleteItem.key)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteItem(null);
        router.refresh();
      } else {
        alert('Failed to delete file');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section>
      <h3 className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium mb-6 md:mb-8 border-b border-neutral-200 pb-4">
        {title}
      </h3>
      <div className="flex flex-col gap-6 md:gap-8">
        {items.map((item) => (
          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
            <button 
              onClick={() => setPreviewItem({
                url: `/api/download?key=${encodeURIComponent(item.key)}&action=preview`,
                title: item.title
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
                <div className="flex items-center gap-2 ml-0 sm:ml-4 self-end sm:self-auto">
                  <button 
                    onClick={() => setPreviewItem({
                      url: `/api/download?key=${encodeURIComponent(item.key)}&action=preview`,
                      title: item.title
                    })}
                    className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-900 flex items-center gap-2"
                    title="Preview"
                  >
                    <Eye size={18} strokeWidth={1.5} />
                  </button>
                  <a 
                    href={`/api/download?key=${encodeURIComponent(item.key)}&action=download&filename=${encodeURIComponent(item.originalName || 'download')}`}
                    className="p-2 hover:bg-neutral-200 rounded-full transition-colors text-neutral-900 flex items-center gap-2"
                    title="Download"
                  >
                    <Download size={18} strokeWidth={1.5} />
                  </a>
                  <button 
                    onClick={() => setDeleteItem({ key: item.key, title: item.title })}
                    className="p-2 hover:bg-red-100 rounded-full transition-colors text-red-500 flex items-center gap-2"
                    title="Delete"
                  >
                    <Trash2 size={18} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

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
              className="fixed top-0 right-0 bottom-0 w-full md:w-[800px] bg-[#F9F8F6] shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 md:p-12 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6 md:mb-8 shrink-0">
                  <span className="text-[10px] tracking-widest text-neutral-500 uppercase font-medium truncate pr-4">
                    PREVIEW &middot; {previewItem.title}
                  </span>
                  <button 
                    onClick={() => setPreviewItem(null)}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors shrink-0"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex-1 bg-white rounded-sm border border-neutral-200 overflow-hidden relative shadow-inner flex items-center justify-center">
                  <iframe 
                    src={previewItem.url} 
                    className="w-full h-full border-none absolute inset-0"
                    title="Document Preview"
                  />
                  <div className="text-center p-8 text-neutral-500 pointer-events-none z-0">
                    <p className="mb-2">If the preview doesn&apos;t load automatically,</p>
                    <p>this file type might not be supported by your browser.</p>
                    <p className="mt-4 text-xs">Please use the download button instead.</p>
                  </div>
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
              onClick={() => !isDeleting && setDeleteItem(null)}
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
                
                <div className="flex items-center justify-end gap-4">
                  <button 
                    onClick={() => setDeleteItem(null)}
                    disabled={isDeleting}
                    className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-6 py-3 bg-red-500 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2 rounded-sm"
                  >
                    {isDeleting ? <><Loader2 size={14} className="animate-spin" /> DELETING...</> : 'DELETE'}
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
