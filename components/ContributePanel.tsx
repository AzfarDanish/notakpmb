'use client';

import { useState, useRef } from 'react';
import { X, ArrowUp, Loader2, FileText, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useScrollLock } from '@/hooks/useScrollLock';

export function ContributePanel({ subjectId }: { subjectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useScrollLock(isOpen);

  const validateFile = (selectedFile: File): string | null => {
    if (selectedFile.size > 5 * 1024 * 1024) {
      return 'File size exceeds the 5MB limit.';
    }
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|doc|docx|txt)$/i)) {
      return 'Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.';
    }
    return null;
  };

  const handleFile = (selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError(null);
    setFile(selectedFile);
  };

  const handlePublish = async () => {
    if (!file || !title.trim() || !subjectId) return;
    
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', subjectId);
      formData.append('category', 'files');
      formData.append('title', title);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setIsPublished(true);
        setTimeout(() => {
          setIsOpen(false);
          setTitle('');
          setFile(null);
          setIsPublished(false);
          router.refresh();
        }, 1200);
      } else {
        let errorMessage = 'Upload failed. Is R2 configured?';
        try {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await res.json();
            if (errorData.error) errorMessage = errorData.error;
          } else {
            console.error('Non-JSON error response:', await res.text());
          }
        } catch (e) {
          console.error('Failed to parse error response', e);
        }
        setError(errorMessage);
      }
    } catch (error) {
      console.error(error);
      setError('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent"
      >
        <ArrowUp size={16} strokeWidth={1.8} />
        Contribute a file
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPublished && setIsOpen(false)}
              className="fixed inset-0 z-40 bg-ink/10 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-full flex-col bg-paper shadow-[0_24px_90px_rgba(23,20,17,0.18)] md:w-[520px]"
            >
              <div className="flex-1 overflow-y-auto p-6 md:p-10">
                <div className="mb-10 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-accent">New file</p>
                    <h2 className="mt-1 text-3xl font-black tracking-tight text-ink">Share a note</h2>
                  </div>
                  <button 
                    onClick={() => setIsOpen(false)}
                    disabled={isPublished}
                    className="rounded-full p-2 text-muted transition-colors hover:bg-sheet hover:text-ink disabled:opacity-50"
                    aria-label="Close contribution panel"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex flex-col gap-8">
                  <input 
                    type="text" 
                    placeholder="Title shown in the archive" 
                    value={title}
                    disabled={isPublished}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-3xl border border-line bg-white px-5 py-4 text-2xl font-black tracking-tight text-ink outline-none transition-colors placeholder:text-muted/50 focus:border-ink disabled:opacity-50 md:text-3xl"
                  />

                  <div 
                    onClick={() => !isPublished && fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!isPublished) fileInputRef.current?.click();
                      }
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!isPublished) setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setIsDragging(false);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (isPublished) return;
                      const droppedFile = e.dataTransfer.files?.[0];
                      if (droppedFile) handleFile(droppedFile);
                    }}
                    role="button"
                    tabIndex={0}
                    className={`relative mt-2 flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed p-8 text-center transition-colors md:p-12 ${isDragging ? 'border-ink bg-white' : error ? 'border-red-400 bg-red-50' : 'border-line bg-sheet hover:bg-white'}`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0];
                        if (!selectedFile) {
                          setFile(null);
                          setError(null);
                          return;
                        }
                        handleFile(selectedFile);
                      }}
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    {file ? (
                      <>
                        <div className="mb-2 flex h-12 w-10 items-center justify-center rounded-xl bg-accent">
                          <FileText size={18} strokeWidth={2} className="text-white" />
                        </div>
                        <p className="text-lg font-semibold text-ink">
                          {file.name}
                        </p>
                        <p className="text-sm text-muted">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mb-2 flex h-12 w-10 items-center justify-center rounded-xl bg-ink">
                          <ArrowUp size={16} strokeWidth={2.5} className="text-white" />
                        </div>
                        <p className="text-lg font-semibold text-ink">
                          {isDragging ? 'Drop to select.' : 'Drag document here or browse.'}
                        </p>
                        <p className="text-sm text-muted">
                          PDF, DOC, DOCX, TXT up to 5MB
                        </p>
                      </>
                    )}
                  </div>
                  {error && (
                    <p className="text-center text-sm text-red-600">{error}</p>
                  )}
                  {isPublished && (
                    <p className="text-center text-sm text-green-700">
                      Uploaded. Refreshing the subject page...
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-line p-6 md:p-10">
                <button 
                  onClick={handlePublish}
                  disabled={!file || !title.trim() || isUploading || isPublished}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink py-4 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isUploading ? (
                    <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                  ) : isPublished ? (
                    <><Check size={14} /> Uploaded</>
                  ) : (
                    'Upload to archive'
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
