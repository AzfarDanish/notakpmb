'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { MoreMenu } from '@/components/MoreMenu';
import { CoursePickerModal } from '@/components/CoursePickerModal';
import type { Subject } from '@/lib/data';

export function SubjectList({
  subjects,
  programmeId,
  programmeTitle,
  canManage,
}: {
  subjects: Subject[]
  programmeId: string
  programmeTitle: string
  canManage: boolean
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [renameSubject, setRenameSubject] = useState<Subject | null>(null);

  return (
    <>
      {subjects.length === 0 && (
        <EmptyState
          title={`No subjects yet for ${programmeTitle}`}
          hint={
            canManage
              ? 'Every shelf begins with one subject. Add the first and start the collection. Someone out there is waiting for it.'
              : 'No subjects here yet. Check back soon, or be the one to start the shelf.'
          }
        />
      )}

      {subjects.length > 0 && (
        <div className="flex flex-col">
          {Array.from(
            { length: Math.ceil(subjects.length / 3) },
            (_, rowIndex) => {
              const row = subjects.slice(rowIndex * 3, rowIndex * 3 + 3);
              return (
                <div
                  key={rowIndex}
                  className="flex flex-col md:flex-row md:items-stretch gap-12 md:gap-x-12 border-b border-neutral-200"
                >
                  {row.map((subject, cardIndex) => (
                    <div
                      key={subject.id}
                      className={`group flex flex-col gap-2 relative md:flex-1 md:min-w-0 ${
                        rowIndex > 0 ? 'pt-6 md:pt-12' : ''
                      } pb-6 md:pb-12 ${
                        cardIndex < row.length - 1 ? 'md:border-r md:border-neutral-200' : ''
                      }`}
                    >
                      <Link href={`/subject/${subject.id}`} className="flex flex-col gap-2 pr-8">
                        <p className="text-[10px] tracking-widest text-accent uppercase font-bold">
                          {subject.code}
                        </p>
                        <h3 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
                          {subject.title}
                        </h3>
                      </Link>
                      {canManage && (
                        <div className="absolute top-0 right-0">
                          <MoreMenu
                            label={`Actions for ${subject.title}`}
                            items={[
                              {
                                key: 'rename',
                                label: 'Rename Subject',
                                icon: <Pencil size={16} strokeWidth={1.5} />,
                                onClick: () => setRenameSubject(subject),
                              },
                              {
                                key: 'delete',
                                label: 'Delete Subject',
                                danger: true,
                                icon: <Trash2 size={16} strokeWidth={1.5} />,
                                onClick: () => setDeleteSubject(subject),
                              },
                            ]}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            },
          )}
        </div>
      )}

      {canManage && (
        <div className="mt-8 md:mt-12">
          <button
            onClick={() => setAddOpen(true)}
            className="group flex items-center gap-4 text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <Plus size={18} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform" />
            <span className="font-serif text-2xl md:text-3xl font-bold">
              Add Subject
            </span>
          </button>
        </div>
      )}

      <AnimatePresence>
        {addOpen && programmeId === 'dcs' && (
          <CoursePickerModal
            onClose={() => setAddOpen(false)}
            onAdded={() => {
              setAddOpen(false);
              router.refresh();
            }}
            programmeId={programmeId}
            existingSubjects={subjects}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {addOpen && programmeId !== 'dcs' && (
          <AddSubjectModal
            onClose={() => setAddOpen(false)}
            onAdded={() => {
              setAddOpen(false);
              router.refresh();
            }}
            programmeId={programmeId}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteSubject && (
          <DeleteSubjectModal
            subject={deleteSubject}
            onClose={() => setDeleteSubject(null)}
            onDeleted={() => {
              setDeleteSubject(null);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {renameSubject && (
          <RenameSubjectModal
            subject={renameSubject}
            onClose={() => setRenameSubject(null)}
            onRenamed={() => {
              setRenameSubject(null);
              router.refresh();
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function ModalCard({
  children,
  onClose,
  disableClose,
}: {
  children: React.ReactNode
  onClose: () => void
  disableClose?: boolean
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !disableClose && onClose()}
        className="fixed inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white border border-neutral-200 shadow-2xl rounded-sm p-8 max-w-md w-full"
        >
          {children}
        </motion.div>
      </motion.div>
    </>
  );
}

function AddSubjectModal({
  onClose,
  onAdded,
  programmeId,
}: {
  onClose: () => void
  onAdded: () => void
  programmeId: string
}) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          title: title.trim(),
          code: code.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to add subject');
        return;
      }
      setSuccess(true);
      setTimeout(onAdded, 1200);
    } catch (err) {
      console.error('Add subject error:', err);
      setError('Failed to add subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isSubmitting || success}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-serif text-2xl font-bold text-neutral-900">
            Add Subject
          </h3>
        </div>
        <button
          onClick={onClose}
          disabled={isSubmitting || success}
          className="text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="subject-title"
            className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
          >
            Subject title
          </label>
          <input
            id="subject-title"
            type="text"
            value={title}
            disabled={success}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Machine Learning"
            autoFocus
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="subject-code"
            className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
          >
            Course code
          </label>
          <input
id="subject-code"
            type="text"
            value={code}
            disabled={success}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. CSC 2853"
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors disabled:opacity-50"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Subject added successfully.</p>}

        <div className="flex items-center justify-end gap-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || success}
            className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !code.trim() || isSubmitting || success}
            className="px-6 py-3 bg-neutral-900 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40 rounded-sm flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> ADDING...</>
            ) : success ? (
              <><Check size={14} /> ADDED</>
            ) : (
              'ADD SUBJECT'
            )}
          </button>
        </div>
      </form>
    </ModalCard>
  );
}

function DeleteSubjectModal({
  subject,
  onClose,
  onDeleted,
}: {
  subject: Subject
  onClose: () => void
  onDeleted: () => void
}) {
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const matches = typed === subject.title;

  const handleDelete = async () => {
    if (!matches || isDeleting) return;
    setIsDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/subjects?id=${encodeURIComponent(subject.id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to delete subject');
        return;
      }
      setSuccess(true);
      setTimeout(onDeleted, 1200);
    } catch (err) {
      console.error('Delete subject error:', err);
      setError('Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isDeleting || success}>
      <h3 className="font-serif text-2xl font-bold mb-2 text-neutral-900">
        Delete Subject
      </h3>
      <p className="text-neutral-500 text-sm mb-2">
        Are you sure you want to delete{' '}
        <span className="font-medium text-neutral-900">&quot;{subject.title}&quot;</span>?
      </p>
      <p className="text-neutral-500 text-sm mb-6">
        This will also permanently delete its uploaded files. This action cannot
        be undone.
      </p>

      <label
        htmlFor="delete-subject-confirm"
        className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
      >
        Type <span className="text-neutral-900">&quot;{subject.title}&quot;</span> to confirm
      </label>
      <input
        id="delete-subject-confirm"
        type="text"
        value={typed}
        disabled={success}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={subject.title}
        autoFocus
        className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 transition-colors disabled:opacity-50"
      />

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mt-3">Subject deleted successfully.</p>}

      <div className="flex items-center justify-end gap-4 mt-6">
        <button
          onClick={onClose}
          disabled={isDeleting || success}
          className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
        >
          CANCEL
        </button>
        <button
          onClick={handleDelete}
          disabled={!matches || isDeleting || success}
          className="px-6 py-3 bg-red-500 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-red-600 transition-colors disabled:opacity-40 rounded-sm flex items-center gap-2 cursor-pointer"
        >
          {isDeleting ? (
            <><Loader2 size={14} className="animate-spin" /> DELETING...</>
          ) : success ? (
            <><Check size={14} /> DELETED</>
          ) : (
            'DELETE SUBJECT'
          )}
        </button>
      </div>
    </ModalCard>
  );
}

function RenameSubjectModal({
  subject,
  onClose,
  onRenamed,
}: {
  subject: Subject
  onClose: () => void
  onRenamed: () => void
}) {
  const [title, setTitle] = useState(subject.title);
  const [code, setCode] = useState(subject.code.toUpperCase());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !code.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/subjects?id=${encodeURIComponent(subject.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          code: code.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to rename subject');
        return;
      }
      setSuccess(true);
      setTimeout(onRenamed, 1200);
    } catch (err) {
      console.error('Rename subject error:', err);
      setError('Failed to rename subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isSubmitting || success}>
      <div className="flex items-start justify-between mb-6">
        <h3 className="font-serif text-2xl font-bold text-neutral-900">
          Rename Subject
        </h3>
        <button
          onClick={onClose}
          disabled={isSubmitting || success}
          className="text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
          aria-label="Close"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="rename-subject-title"
            className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
          >
            Subject title
          </label>
          <input
            id="rename-subject-title"
            type="text"
            value={title}
            disabled={success}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={subject.title}
            autoFocus
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="rename-subject-code"
            className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
          >
            Course code
          </label>
          <input
            id="rename-subject-code"
            type="text"
            value={code}
            disabled={success}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={subject.code && subject.code.toUpperCase()}
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm uppercase placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors disabled:opacity-50"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Subject renamed successfully.</p>}

        <div className="flex items-center justify-end gap-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || success}
            className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !code.trim() || isSubmitting || success}
            className="px-6 py-3 bg-neutral-900 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40 rounded-sm flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> RENAMING...</>
            ) : success ? (
              <><Check size={14} /> RENAMED</>
            ) : (
              'RENAME SUBJECT'
            )}
          </button>
        </div>
      </form>
    </ModalCard>
  );
}
