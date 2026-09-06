'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { MoreMenu } from '@/components/MoreMenu';
import dynamic from 'next/dynamic';
import { OverlayPortal } from '@/components/OverlayPortal';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useRefreshWithTransition } from '@/hooks/useRefreshWithTransition';
import { notifyLiveSync } from '@/hooks/useLiveSync';
import { SubjectListSkeleton } from '@/components/Skeleton';
import type { Subject } from '@/lib/data';

const CoursePickerModal = dynamic(
  () => import('@/components/CoursePickerModal').then((mod) => mod.CoursePickerModal),
  { ssr: false },
);

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
  const { refresh, isPending } = useRefreshWithTransition();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [renameSubject, setRenameSubject] = useState<Subject | null>(null);

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 z-10 bg-paper/70 backdrop-blur-[1px]">
          <SubjectListSkeleton />
        </div>
      )}
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
        <div className="divide-y divide-line/70">
          {subjects.map((subject) => (
            <div key={subject.id} className="group flex min-w-0 items-center gap-3 rounded-2xl px-2 py-4 transition-colors hover:bg-soft sm:gap-4 md:px-4 md:py-5">
              <Link href={`/subject/${subject.id}`} className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-baseline">
                <p className="text-dynamic text-sm font-bold text-accent">{subject.code}</p>
                <h3 className="text-dynamic text-xl font-black tracking-tight text-ink text-balance md:text-2xl">
                  {subject.title}
                </h3>
              </Link>
              <ArrowRight size={18} strokeWidth={1.7} className="hidden text-muted/50 transition-transform group-hover:translate-x-1 group-hover:text-ink sm:block" />
              {canManage && (
                <MoreMenu
                  label={`Actions for ${subject.title}`}
                  items={[
                    {
                      key: 'rename',
                      label: 'Rename subject',
                      icon: <Pencil size={16} strokeWidth={1.7} />,
                      onClick: () => setRenameSubject(subject),
                    },
                    {
                      key: 'delete',
                      label: 'Delete subject',
                      danger: true,
                      icon: <Trash2 size={16} strokeWidth={1.7} />,
                      onClick: () => setDeleteSubject(subject),
                    },
                  ]}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="mt-8">
          <button
            onClick={() => setAddOpen(true)}
            className="group inline-flex items-center gap-3 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent"
          >
            <Plus size={18} strokeWidth={1.7} className="transition-transform group-hover:rotate-90" />
            Add subject
          </button>
        </div>
      )}
      <AnimatePresence>
        {addOpen && programmeId === 'dcs' && (
          <CoursePickerModal
            onClose={() => setAddOpen(false)}
            onAdded={() => {
              setAddOpen(false);
              refresh();
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
              refresh();
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
              refresh();
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
              refresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
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
  useScrollLock(true);

  return (
    <OverlayPortal>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => !disableClose && onClose()}
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
          className="relative z-[110] flex max-h-[min(85dvh,640px)] w-full max-w-[380px] flex-col overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_90px_rgba(23,20,17,0.16)] sm:max-w-[400px]"
        >
          <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6 md:p-7">{children}</div>
        </motion.div>
      </motion.div>
    </OverlayPortal>
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
      notifyLiveSync('subjects');
      onAdded();
    } catch (err) {
      console.error('Add subject error:', err);
      setError('Failed to add subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isSubmitting || success}>
      <div className="mb-6 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-dynamic text-2xl font-black tracking-tight text-ink">
            Add subject
          </h3>
        </div>
        <button
          onClick={onClose}
          disabled={isSubmitting || success}
            className="text-muted transition-colors hover:text-ink disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="subject-title"
            className="mb-2 block text-sm font-semibold text-ink"
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
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base transition-colors placeholder:text-muted/60 focus:border-ink focus:outline-none disabled:opacity-50 md:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="subject-code"
            className="mb-2 block text-sm font-semibold text-ink"
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
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base uppercase transition-colors placeholder:text-muted/60 focus:border-ink focus:outline-none disabled:opacity-50 md:text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Subject added successfully.</p>}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || success}
            className="px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !code.trim() || isSubmitting || success}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-40"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Adding...</>
            ) : success ? (
              <><Check size={14} /> Added</>
            ) : (
              'Add subject'
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
      notifyLiveSync('subjects');
      notifyLiveSync('r2-files');
      onDeleted();
    } catch (err) {
      console.error('Delete subject error:', err);
      setError('Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isDeleting || success}>
      <h3 className="text-dynamic mb-2 text-2xl font-black tracking-tight text-ink">
        Delete subject
      </h3>
      <p className="text-dynamic mb-2 text-sm text-muted">
        Are you sure you want to delete{' '}
        <span className="font-semibold text-ink">&quot;{subject.title}&quot;</span>?
      </p>
      <p className="text-dynamic mb-6 text-sm text-muted">
        This will also permanently delete its uploaded files. This action cannot
        be undone.
      </p>

      <label
        htmlFor="delete-subject-confirm"
        className="text-dynamic mb-2 block text-sm font-semibold text-ink"
      >
        Type <span className="text-ink">&quot;{subject.title}&quot;</span> to confirm
      </label>
      <input
        id="delete-subject-confirm"
        type="text"
        value={typed}
        disabled={success}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={subject.title}
        autoFocus
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base transition-colors placeholder:text-muted/50 focus:border-ink focus:outline-none disabled:opacity-50 md:text-sm"
      />

      {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
      {success && <p className="text-sm text-green-600 mt-3">Subject deleted successfully.</p>}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
        <button
          onClick={onClose}
          disabled={isDeleting || success}
          className="px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={!matches || isDeleting || success}
          className="flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
        >
          {isDeleting ? (
            <><Loader2 size={14} className="animate-spin" /> Deleting...</>
          ) : success ? (
            <><Check size={14} /> Deleted</>
          ) : (
            'Delete subject'
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
      notifyLiveSync('subjects');
      onRenamed();
    } catch (err) {
      console.error('Rename subject error:', err);
      setError('Failed to rename subject');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalCard onClose={onClose} disableClose={isSubmitting || success}>
        <div className="mb-6 flex min-w-0 items-start justify-between gap-4">
        <h3 className="text-dynamic text-2xl font-black tracking-tight text-ink">
          Rename subject
        </h3>
        <button
          onClick={onClose}
          disabled={isSubmitting || success}
          className="shrink-0 text-muted transition-colors hover:text-ink disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="rename-subject-title"
            className="mb-2 block text-sm font-semibold text-ink"
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
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base transition-colors placeholder:text-muted/60 focus:border-ink focus:outline-none disabled:opacity-50 md:text-sm"
          />
        </div>

        <div>
          <label
            htmlFor="rename-subject-code"
            className="mb-2 block text-sm font-semibold text-ink"
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
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-base uppercase transition-colors placeholder:text-muted/60 focus:border-ink focus:outline-none disabled:opacity-50 md:text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-600">Subject renamed successfully.</p>}

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || success}
            className="px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !code.trim() || isSubmitting || success}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-40"
          >
            {isSubmitting ? (
              <><Loader2 size={14} className="animate-spin" /> Renaming...</>
            ) : success ? (
              <><Check size={14} /> Renamed</>
            ) : (
              'Rename subject'
            )}
          </button>
        </div>
      </form>
    </ModalCard>
  );
}
