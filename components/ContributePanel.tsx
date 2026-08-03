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
        className="text-sm tracking-widest text-neutral-900 uppercase font-bold hover:opacity-60 transition-opacity flex items-center gap-2"
      >
        <span>+</span> CONTRIBUTE
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isPublished && setIsOpen(false)}
              className="fixed inset-0 bg-white/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[500px] bg-paper shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 md:p-12 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-12 md:mb-24">
                  <span className="text-sm tracking-widest text-neutral-500 uppercase font-medium">
                    CONTRIBUTE
                  </span>
                  <button 
                    onClick={() => setIsOpen(false)}
                    disabled={isPublished}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex flex-col gap-12">
                  <input 
                    type="text" 
                    placeholder="Your note needs a title..." 
                    value={title}
                    disabled={isPublished}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-serif text-4xl md:text-5xl italic placeholder:text-neutral-300 text-neutral-900 disabled:opacity-50"
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
                    className={`border border-dashed ${isDragging ? 'border-neutral-900 bg-neutral-50/50' : error ? 'border-red-400 bg-red-50/50' : 'border-neutral-300 hover:bg-neutral-50/50'} rounded-sm p-8 md:p-12 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-colors mt-4 relative`}
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
                        <div className="w-8 h-10 bg-accent rounded-sm flex items-center justify-center mb-2">
                          <FileText size={18} strokeWidth={2} className="text-white" />
                        </div>
                        <p className="font-serif text-neutral-900 text-2xl">
                          {file.name}
                        </p>
                        <p className="text-sm tracking-widest text-neutral-500 uppercase">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-8 bg-neutral-400 rounded-sm flex items-center justify-center mb-2">
                          <ArrowUp size={14} strokeWidth={3} className="text-white" />
                        </div>
                        <p className="font-serif text-neutral-600">
                          {isDragging ? 'Drop to select.' : 'Drag document here or browse.'}
                        </p>
                        <p className="text-sm tracking-widest text-neutral-400 uppercase">
                          PDF, DOC, DOCX, TXT up to 5MB
                        </p>
                      </>
                    )}
                  </div>
                  {error && (
                    <p className="text-red-500 text-base text-center">{error}</p>
                  )}
                  {isPublished && (
                    <p className="text-green-600 text-base text-center">
                      Contributed! The archive just grew. Thank you for sharing.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-12 border-t border-neutral-200/50">
                <button 
                  onClick={handlePublish}
                  disabled={!file || !title.trim() || isUploading || isPublished}
                  className="w-full bg-ink text-white py-5 text-sm tracking-widest uppercase font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <><Loader2 size={14} className="animate-spin" /> CONTRIBUTING...</>
                  ) : isPublished ? (
                    <><Check size={14} /> CONTRIBUTED</>
                  ) : (
                    'CONTRIBUTE TO THE ARCHIVE'
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
