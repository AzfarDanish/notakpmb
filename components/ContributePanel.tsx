'use client';

import { useState, useRef } from 'react';
import { X, ArrowUp, Loader2, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';

export function ContributePanel({ subjectId }: { subjectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState('Notes');
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handlePublish = async () => {
    if (!file || !title.trim() || !subjectId) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('subjectId', subjectId);
      formData.append('category', category);
      formData.append('title', title);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setIsOpen(false);
        setTitle('');
        setFile(null);
        router.refresh(); // Refresh the page to show new document
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
        alert(errorMessage);
      }
    } catch (error) {
      console.error(error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-[10px] tracking-widest text-neutral-900 uppercase font-bold hover:opacity-60 transition-opacity flex items-center gap-2"
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
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-white/40 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full md:w-[500px] bg-[#F9F8F6] shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 md:p-12 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-12 md:mb-24">
                  <span className="text-[10px] tracking-widest text-neutral-500 uppercase font-medium">
                    CONTRIBUTE
                  </span>
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors"
                  >
                    <X size={20} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex flex-col gap-12">
                  <input 
                    type="text" 
                    placeholder="Document Title..." 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent border-none outline-none font-serif text-4xl md:text-5xl italic placeholder:text-neutral-300 text-neutral-900"
                  />

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-1.5 h-1.5 rounded-full ${category === 'Notes' ? 'bg-[#A32A2A]' : 'bg-transparent group-hover:bg-neutral-300'} transition-colors`} />
                      <span className={`text-sm ${category === 'Notes' ? 'text-neutral-900' : 'text-neutral-500'}`}>Notes</span>
                      <input 
                        type="radio" 
                        name="category" 
                        value="Notes" 
                        checked={category === 'Notes'}
                        onChange={(e) => setCategory(e.target.value)}
                        className="hidden"
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <div className={`w-1.5 h-1.5 rounded-full ${category === 'Exercises' ? 'bg-[#A32A2A]' : 'bg-transparent group-hover:bg-neutral-300'} transition-colors`} />
                      <span className={`text-sm ${category === 'Exercises' ? 'text-neutral-900' : 'text-neutral-500'}`}>Exercises</span>
                      <input 
                        type="radio" 
                        name="category" 
                        value="Exercises" 
                        checked={category === 'Exercises'}
                        onChange={(e) => setCategory(e.target.value)}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed ${error ? 'border-red-400 bg-red-50/50' : 'border-neutral-300 hover:bg-neutral-50/50'} rounded-sm p-8 md:p-12 flex flex-col items-center justify-center gap-4 text-center cursor-pointer transition-colors mt-4 relative`}
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
                        
                        if (selectedFile.size > 5 * 1024 * 1024) {
                          setError('File size exceeds the 5MB limit.');
                          setFile(null);
                          return;
                        }
                        
                        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
                        if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(pdf|doc|docx|txt)$/i)) {
                          setError('Invalid file type. Please upload a PDF, DOC, DOCX, or TXT file.');
                          setFile(null);
                          return;
                        }

                        setError(null);
                        setFile(selectedFile);
                      }}
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.txt"
                    />
                    {file ? (
                      <>
                        <div className="w-8 h-10 bg-[#A32A2A] rounded-sm flex items-center justify-center mb-2">
                          <FileText size={18} strokeWidth={2} className="text-white" />
                        </div>
                        <p className="font-serif text-neutral-900 text-lg">
                          {file.name}
                        </p>
                        <p className="text-[10px] tracking-widest text-neutral-500 uppercase">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-6 h-8 bg-neutral-400 rounded-sm flex items-center justify-center mb-2">
                          <ArrowUp size={14} strokeWidth={3} className="text-white" />
                        </div>
                        <p className="font-serif text-neutral-600">
                          Drag document here or browse.
                        </p>
                        <p className="text-[10px] tracking-widest text-neutral-400 uppercase">
                          PDF, DOC, DOCX, TXT up to 5MB
                        </p>
                      </>
                    )}
                  </div>
                  {error && (
                    <p className="text-red-500 text-xs text-center">{error}</p>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-12 border-t border-neutral-200/50">
                <button 
                  onClick={handlePublish}
                  disabled={!file || !title.trim() || isUploading}
                  className="w-full bg-[#1A1A1A] text-white py-5 text-[10px] tracking-widest uppercase font-medium hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUploading ? <><Loader2 size={14} className="animate-spin" /> PUBLISHING...</> : 'PUBLISH'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
