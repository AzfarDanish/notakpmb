'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'

type CourseHit = {
  id: string
  code: string
  title: string
  programme: { id: string; code: string; title: string }
  href: string
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
    <div
      onClick={() => !disableClose && onClose()}
      className="fixed inset-0 bg-white/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white border border-neutral-200 shadow-2xl rounded-sm p-6 md:p-8 max-w-md w-full max-h-[85vh] overflow-auto"
      >
        {children}
      </div>
    </div>
  )
}

export function CoursePickerModal({
  onClose,
  onAdded,
  programmeId,
  existingSubjects,
}: {
  onClose: () => void
  onAdded: () => void
  programmeId: string
  existingSubjects: { id: string; code: string; title: string }[]
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CourseHit[]>([])
  const [selected, setSelected] = useState<CourseHit | null>(null)
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // debounce fetch when query changes
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setHits([])
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/courses?q=${encodeURIComponent(q)}&programmeId=${encodeURIComponent(programmeId)}&limit=12`,
        )
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as { courses: CourseHit[] }
        // filter out already existing subjects (strict: don't show already added)
        const filtered = (data.courses ?? []).filter(
          (c) => !existingSubjects.some((s) => s.id === c.id || s.code.trim().toUpperCase() === c.code.trim().toUpperCase()),
        )
        setHits(filtered)
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, programmeId, existingSubjects])

  const displayHits = hits

  async function handleAdd() {
    if (!selected || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programmeId,
          title: selected.title,
          code: selected.code,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error || 'Failed to add subject')
        return
      }
      setSuccess(true)
      setTimeout(onAdded, 1000)
    } catch (err) {
      console.error('Add subject error:', err)
      setError('Failed to add subject')
    } finally {
      setIsSubmitting(false)
    }
  }

  const allAlreadyAdded = existingSubjects.length >= 36 && programmeId === 'dcs'

  return (
    <ModalCard onClose={onClose} disableClose={isSubmitting || success}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-serif text-2xl font-bold text-neutral-900">Add Subject</h3>
          <p className="text-xs text-neutral-500 mt-1">Pick from the 36 Computer Science cloud courses</p>
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

      {allAlreadyAdded ? (
        <div className="border border-dashed border-neutral-200 rounded-sm px-4 py-8 text-center">
          <p className="text-sm font-medium text-neutral-900">All 36 CS courses already added</p>
          <p className="text-sm text-neutral-600 mt-2">
            Can&apos;t find yours? Type it in the confession group and tag{' '}
            <span className="font-bold text-neutral-900">azferish</span> — we&apos;ll add it to the cloud.
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-6 py-2.5 bg-neutral-900 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-neutral-800 transition-colors rounded-sm cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search size={16} strokeWidth={1.5} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelected(null)
                setError('')
              }}
              placeholder="Search code or name — e.g. CSC 1413, Database"
              autoFocus
              autoComplete="off"
              className="w-full bg-transparent border border-neutral-300 rounded-sm pl-11 pr-10 py-3 text-sm placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors"
            />
            {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-neutral-400" />}
          </div>

          {/* Selected preview */}
          {selected && (
            <div className="mb-4 border border-neutral-900 bg-neutral-50 rounded-sm px-4 py-3 flex items-center gap-3">
              <span className="text-[10px] tracking-widest uppercase font-bold text-accent shrink-0">{selected.code}</span>
              <span className="text-sm font-medium text-neutral-900 leading-tight">{selected.title}</span>
              <button
                onClick={() => setSelected(null)}
                className="ml-auto text-neutral-400 hover:text-neutral-900 transition-colors"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Hits list */}
          <div className="border border-neutral-200 rounded-sm max-h-[18rem] overflow-auto">
            {displayHits.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center">
                {query.trim().length >= 1 ? (
                  <>
                    <p className="text-sm font-medium text-neutral-900">No course found for “{query.trim()}”</p>
                    <p className="text-sm text-neutral-600 mt-2">
                      Can&apos;t find yours? Type it in the confession group and tag{' '}
                      <span className="font-bold text-neutral-900">azferish</span>
                    </p>
                    <p className="text-xs text-neutral-400 mt-3">We&apos;ll verify and add it to the cloud catalog.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-neutral-500">Type to search 36 CS courses by code or name.</p>
                    <p className="text-xs text-neutral-400 mt-2">e.g. “Programming”, “CSC 1393”, “MPU”</p>
                  </>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100" role="listbox">
                {displayHits.map((hit) => {
                  const isSelected = selected?.id === hit.id
                  return (
                    <li key={hit.id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => setSelected(hit)}
                        className={`w-full text-left px-4 py-3 flex items-start justify-between gap-3 hover:bg-neutral-50 transition-colors cursor-pointer ${isSelected ? 'bg-neutral-900 text-white hover:bg-neutral-900' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[10px] tracking-widest uppercase font-bold ${isSelected ? 'text-white' : 'text-accent'}`}>{hit.code}</span>
                          <span className={`block text-sm font-medium leading-tight mt-0.5 ${isSelected ? 'text-white' : 'text-neutral-900'}`}>{hit.title}</span>
                        </span>
                        {isSelected && <Check size={16} className="shrink-0 mt-1 text-white" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="text-[10px] tracking-widest uppercase font-medium text-neutral-400 mt-3">
            {query.trim() ? `${displayHits.length} result${displayHits.length === 1 ? '' : 's'} from cloud` : 'Type to search — strict pick-only'}
            {' · '}tag <span className="text-neutral-900">azferish</span> if missing
          </p>

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          {success && <p className="text-sm text-green-600 mt-3">Subject added — refreshing…</p>}

          <div className="flex items-center justify-end gap-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || success}
              className="px-6 py-3 text-[10px] tracking-widest uppercase font-medium text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 cursor-pointer"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected || isSubmitting || success}
              className="px-6 py-3 bg-neutral-900 text-white text-[10px] tracking-widest uppercase font-medium hover:bg-neutral-800 transition-colors disabled:opacity-40 rounded-sm flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> ADDING...
                </>
              ) : success ? (
                <>
                  <Check size={14} /> ADDED
                </>
              ) : (
                'ADD SUBJECT'
              )}
            </button>
          </div>
        </>
      )}
    </ModalCard>
  )
}
