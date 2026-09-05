'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Search, X } from 'lucide-react'
import { OverlayPortal } from '@/components/OverlayPortal'
import { useScrollLock } from '@/hooks/useScrollLock'
import { LookupResultsSkeleton } from '@/components/Skeleton'

type CourseHit = {
  id: string
  code: string
  title: string
  programme: { id: string; code: string; title: string }
  href: string
}

const SEARCH_CACHE_TTL = 60_000
const searchCache = new Map<string, { at: number; courses: CourseHit[] }>()

function ModalCard({
  children,
  onClose,
  disableClose,
}: {
  children: React.ReactNode
  onClose: () => void
  disableClose?: boolean
}) {
  useScrollLock(true)

  return (
    <OverlayPortal>
      <div
        onClick={() => !disableClose && onClose()}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/10 p-4 backdrop-blur-sm sm:p-6"
      >
        <div
          data-overlay-panel
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          className="relative z-[110] flex max-h-[min(85dvh,640px)] min-h-[min(70dvh,520px)] w-full max-w-[380px] flex-col overflow-hidden rounded-[2rem] border border-line bg-white shadow-[0_24px_90px_rgba(23,20,17,0.16)] sm:max-w-[400px]"
        >
          <div className="min-w-0 flex-1 overflow-y-auto p-5 sm:p-6 md:p-7">{children}</div>
        </div>
      </div>
    </OverlayPortal>
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
  const [showSkeleton, setShowSkeleton] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // debounce fetch when query changes
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) {
      setHits([])
      setLoading(false)
      setShowSkeleton(false)
      return
    }

    const cacheKey = `${programmeId}:${q.toLowerCase()}`
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.at < SEARCH_CACHE_TTL) {
      setHits(cached.courses.filter(
        (c) => !existingSubjects.some((s) => s.id === c.id || s.code.trim().toUpperCase() === c.code.trim().toUpperCase()),
      ))
      setLoading(false)
      setShowSkeleton(false)
      return
    }

    setLoading(true)
    setShowSkeleton(false)
    const controller = new AbortController()
    const skeletonTimer = setTimeout(() => setShowSkeleton(true), 150)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/courses?q=${encodeURIComponent(q)}&programmeId=${encodeURIComponent(programmeId)}&limit=12`,
          { signal: controller.signal },
        )
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as { courses: CourseHit[] }
        searchCache.set(cacheKey, { at: Date.now(), courses: data.courses ?? [] })
        // filter out already existing subjects (strict: don't show already added)
        const filtered = (data.courses ?? []).filter(
          (c) => !existingSubjects.some((s) => s.id === c.id || s.code.trim().toUpperCase() === c.code.trim().toUpperCase()),
        )
        setHits(filtered)
      } catch {
        if (controller.signal.aborted) return
        setHits([])
      } finally {
        clearTimeout(skeletonTimer)
        setLoading(false)
        setShowSkeleton(false)
      }
    }, 180)
    return () => {
      controller.abort()
      clearTimeout(t)
      clearTimeout(skeletonTimer)
    }
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
      <div className="mb-6 flex min-w-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-dynamic text-2xl font-black tracking-tight text-ink">Add subject</h3>
          <p className="text-dynamic mt-1 text-sm text-muted">Pick from the Computer Science cloud catalog.</p>
        </div>
        <button
          onClick={onClose}
          disabled={isSubmitting || success}
          className="shrink-0 rounded-full p-2 text-muted transition-colors hover:bg-sheet hover:text-ink disabled:opacity-50"
          aria-label="Close"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      {allAlreadyAdded ? (
        <div className="rounded-[2rem] bg-sheet px-4 py-8 text-center">
          <p className="text-sm font-semibold text-ink">All CS courses already added</p>
          <p className="mt-2 text-sm text-muted">
            Can&apos;t find yours? Type it in the confession group and tag{' '}
            <span className="font-bold text-ink">azferish</span> and we&apos;ll add it to the cloud.
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelected(null)
                setError('')
              }}
              placeholder="Search code or name"
              autoFocus
              autoComplete="off"
              className="w-full rounded-2xl border border-line bg-white py-3 pl-11 pr-10 text-base transition-colors placeholder:text-muted/60 focus:border-ink focus:outline-none md:text-sm"
            />
            {loading && <span className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-muted/50 motion-safe:animate-pulse" />}
          </div>

          {/* Selected preview */}
          {selected && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-sheet px-4 py-3">
              <span className="text-dynamic shrink-0 text-xs font-bold text-accent">{selected.code}</span>
              <span className="text-dynamic min-w-0 flex-1 text-sm font-semibold leading-tight text-ink">{selected.title}</span>
              <button
                onClick={() => setSelected(null)}
                className="ml-auto text-muted transition-colors hover:text-ink"
                aria-label="Clear selection"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Hits list */}
          <div className="max-h-[18rem] overflow-auto rounded-2xl border border-line">
            {loading && displayHits.length === 0 && showSkeleton ? (
              <LookupResultsSkeleton />
            ) : displayHits.length === 0 && !loading ? (
              <div className="px-4 py-8 text-center">
                {query.trim().length >= 1 ? (
                  <>
                    <p className="text-sm font-semibold text-ink">No course found for “{query.trim()}”</p>
                    <p className="mt-2 text-sm text-muted">
                      Can&apos;t find yours? Type it in the confession group and tag{' '}
                      <span className="font-bold text-ink">azferish</span>
                    </p>
                    <p className="mt-3 text-xs text-muted">We&apos;ll verify and add it to the cloud catalog.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">Type to search CS courses by code or name.</p>
                    <p className="mt-2 text-xs text-muted">e.g. “Programming”, “CSC 1393”, “MPU”</p>
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
                        className={`flex w-full min-w-0 items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-soft ${isSelected ? 'bg-ink text-paper hover:bg-ink' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block text-xs font-bold ${isSelected ? 'text-paper' : 'text-accent'}`}>{hit.code}</span>
                          <span className={`text-dynamic mt-0.5 block text-sm font-semibold leading-tight ${isSelected ? 'text-paper' : 'text-ink'}`}>{hit.title}</span>
                        </span>
                        {isSelected && <Check size={16} className="shrink-0 mt-1 text-white" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <p className="text-dynamic mt-3 text-xs font-medium text-muted">
            {query.trim() ? `${displayHits.length} result${displayHits.length === 1 ? '' : 's'} from cloud` : 'Type to search. Strict pick-only.'}
            {' · '}tag <span className="text-ink">azferish</span> if missing
          </p>

          {error && <p className="text-sm text-red-500 mt-3">{error}</p>}
          {success && <p className="mt-3 text-sm text-green-600">Subject added. Refreshing...</p>}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || success}
              className="px-5 py-3 text-sm font-semibold text-muted transition-colors hover:text-ink disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selected || isSubmitting || success}
              className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Adding...
                </>
              ) : success ? (
                <>
                  <Check size={14} /> Added
                </>
              ) : (
                'Add subject'
              )}
            </button>
          </div>
        </>
      )}
    </ModalCard>
  )
}
