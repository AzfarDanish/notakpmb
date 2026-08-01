'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import type { Subject } from '@/lib/data';

export function SubjectList({
  subjects,
  programmeId,
  semesterId,
  semesterTitle,
  canManage,
  intakeOptions,
}: {
  subjects: (Subject & { intake?: string })[]
  programmeId: string
  semesterId: string
  semesterTitle: string
  canManage: boolean
  intakeOptions: string[]
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [selectedIntake, setSelectedIntake] = useState('ALL');

  const visibleSubjects = subjects.filter(
    (s) => selectedIntake === 'ALL' || !s.intake || s.intake === selectedIntake,
  );
  const hasFilteredOut = visibleSubjects.length === 0 && subjects.length > 0;

  return (
    <>
      {intakeOptions.length > 0 && (
        <div className="mb-10 md:mb-14">
          <p className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium mb-3">
            Intake
          </p>
          <div role="group" aria-label="Filter by intake" className="flex flex-wrap gap-2">
            {['ALL', ...intakeOptions].map((intake) => (
              <button
                key={intake}
                onClick={() => setSelectedIntake(intake)}
                aria-pressed={selectedIntake === intake}
                className={`rounded-full px-4 py-2 text-[10px] tracking-widest uppercase font-medium transition-colors cursor-pointer ${
                  selectedIntake === intake
                    ? 'bg-ink text-paper'
                    : 'border border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900'
                }`}
              >
                {intake}
              </button>
            ))}
          </div>
        </div>
      )}

      {subjects.length === 0 && (
        <EmptyState
          title={`No subjects published for ${semesterTitle} yet`}
          hint={
            canManage
              ? 'Add the first subject below.'
              : 'Subjects will appear here once they are added.'
          }
        />
      )}

      {hasFilteredOut && (
        <EmptyState
          title={`No subjects for ${selectedIntake} in ${semesterTitle}`}
          hint="Try a different intake or view all subjects."
        />
      )}

      {visibleSubjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-12 md:gap-y-24">
          {visibleSubjects.map((subject) => (
            <div key={subject.id} className="group flex flex-col gap-2 relative">
              <Link href={`/subject/${subject.id}`} className="flex flex-col gap-2 pr-8">
                <p className="text-[10px] tracking-widest text-accent uppercase font-bold">
                  {subject.code}
                </p>
                <h3 className="font-serif text-2xl md:text-3xl font-bold group-hover:opacity-60 transition-opacity">
                  {subject.title}
                </h3>
                {subject.intake && (
                  <p className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium mt-1">
                    Intake {subject.intake}
                  </p>
                )}
              </Link>
              {canManage && (
                <button
                  onClick={() => setDeleteSubject(subject)}
                  className="absolute top-0 right-0 p-2 rounded-full transition-colors text-neutral-300 hover:text-red-500 hover:bg-red-100 cursor-pointer"
                  title={`Delete ${subject.title}`}
                  aria-label={`Delete ${subject.title}`}
                >
                  <Trash2 size={18} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-12 md:mt-16">
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
        {addOpen && (
          <AddSubjectModal
            onClose={() => setAddOpen(false)}
            onAdded={() => {
              setAddOpen(false);
              router.refresh();
            }}
            programmeId={programmeId}
            semesterId={semesterId}
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
  semesterId,
}: {
  onClose: () => void
  onAdded: () => void
  programmeId: string
  semesterId: string
}) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [intake, setIntake] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          semesterId,
          title: title.trim(),
          code: code.trim() || undefined,
          intake: intake.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || 'Failed to add subject');
        return;
      }
      onAdded();
    } catch (err) {
      console.error('Add subject error:', err);
      setError('Failed to add subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isSubmitting}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-serif text-2xl font-bold text-neutral-900">
            Add Subject
          </h3>
          <p className="text-xs text-neutral-500 mt-1 uppercase tracking-widest">
            Semester {semesterId}
          </p>
        </div>
        <button
          onClick={onClose}
          disabled={isSubmitting}
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
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Machine Learning"
            autoFocus
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="subject-code"
            className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
          >
            Course code <span className="normal-case text-neutral-400">(optional)</span>
          </label>
          <input
            id="subject-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. CSC 2953"
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="subject-intake"
            className="block text-[10px] tracking-widest uppercase font-medium text-neutral-500 mb-2"
          >
            Intake <span className="normal-case text-neutral-400">(optional, e.g. 2025)</span>
          </label>
          <input
            id="subject-intake"
            type="text"
            value={intake}
            onChange={(e) => setIntake(e.target.value)}
            placeholder="e.g. 2025"
            className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-4 mt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            CANCEL
          </button>
          <button
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="px-6 py-3 bg-neutral-900 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40 rounded-sm flex items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> ADDING...</>
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
      onDeleted();
    } catch (err) {
      console.error('Delete subject error:', err);
      setError('Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isDeleting}>
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
        onChange={(e) => setTyped(e.target.value)}
        placeholder={subject.title}
        autoFocus
        className="w-full bg-transparent border border-neutral-300 rounded-sm px-4 py-3 text-sm placeholder:text-neutral-300 focus:outline-none focus:border-neutral-900 transition-colors"
      />

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

      <div className="flex items-center justify-end gap-4 mt-6">
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
        >
          CANCEL
        </button>
        <button
          onClick={handleDelete}
          disabled={!matches || isDeleting}
          className="px-6 py-3 bg-red-500 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-red-600 transition-colors disabled:opacity-40 rounded-sm flex items-center gap-2 cursor-pointer"
        >
          {isDeleting ? (
            <><Loader2 size={14} className="animate-spin" /> DELETING...</>
          ) : (
            'DELETE SUBJECT'
          )}
        </button>
      </div>
    </ModalCard>
  );
}
