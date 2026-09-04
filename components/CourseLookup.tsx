'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Loader2, ArrowRight } from 'lucide-react'

type CourseHit = {
  id: string
  code: string
  title: string
  programme: { id: string; code: string; title: string }
  href: string
}

export function CourseLookup({
  placeholder = 'Search course name or code',
  autoFocus = false,
  size = 'lg',
  programmeId,
}: {
  placeholder?: string
  autoFocus?: boolean
  size?: 'sm' | 'lg'
  programmeId?: string
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CourseHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [, startTransition] = useTransition()
  const listboxId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const requestSeq = useRef(0)
  const [menuMaxHeight, setMenuMaxHeight] = useState<number | null>(null)
  const [placeAbove, setPlaceAbove] = useState(false)

  // debounce fetch
  useEffect(() => {
    const q = query.trim()
    const seq = ++requestSeq.current
    setError(false)

    if (q.length === 0) {
      startTransition(() => {
        setHits([])
        setOpen(false)
        setLoading(false)
        setActiveIndex(-1)
      })
      return
    }

    setOpen(true)
    setLoading(true)
    const controller = new AbortController()
    const delay = q.length === 1 ? 120 : 180
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q, limit: '8' })
        if (programmeId) params.set('programmeId', programmeId)
        const res = await fetch(`/api/courses?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as { courses: CourseHit[] }
        if (seq !== requestSeq.current) return
        startTransition(() => {
          setHits(data.courses ?? [])
          setOpen(true)
          setActiveIndex(-1)
          setError(false)
        })
      } catch {
        if (controller.signal.aborted || seq !== requestSeq.current) return
        startTransition(() => {
          setHits([])
          setOpen(true)
          setActiveIndex(-1)
          setError(true)
        })
      } finally {
        if (seq === requestSeq.current) setLoading(false)
      }
    }, delay)
    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [query, programmeId, startTransition])

  // close on outside click
  useEffect(() => {
    function onDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [])

  useEffect(() => {
    if (!open) return

    function updateMenuGeometry() {
      const input = inputRef.current
      if (!input) return
      const rect = input.getBoundingClientRect()
      const visualHeight = window.visualViewport?.height ?? window.innerHeight
      const spaceBelow = visualHeight - rect.bottom - 12
      const spaceAbove = rect.top - 12
      const shouldPlaceAbove = spaceBelow < 220 && spaceAbove > spaceBelow
      setPlaceAbove(shouldPlaceAbove)
      setMenuMaxHeight(Math.max(180, Math.floor((shouldPlaceAbove ? spaceAbove : spaceBelow) - 8)))
    }

    updateMenuGeometry()
    window.addEventListener('resize', updateMenuGeometry)
    window.visualViewport?.addEventListener('resize', updateMenuGeometry)
    window.visualViewport?.addEventListener('scroll', updateMenuGeometry)

    return () => {
      window.removeEventListener('resize', updateMenuGeometry)
      window.visualViewport?.removeEventListener('resize', updateMenuGeometry)
      window.visualViewport?.removeEventListener('scroll', updateMenuGeometry)
    }
  }, [open, hits.length])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(hits.length, 1))
    } else if (e.key === 'ArrowUp') {
      if (hits.length === 0) return
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && hits[activeIndex]) {
        e.preventDefault()
        window.location.href = hits[activeIndex].href
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const isLarge = size === 'lg'
  const selected = activeIndex >= 0 ? hits[activeIndex] : null

  return (
    <div ref={containerRef} className={`relative min-w-0 ${isLarge ? 'w-full' : 'w-full md:w-80'}`}>
      <div className={`relative flex items-center ${isLarge ? 'w-full' : 'w-full'}`}>
        <Search
          size={isLarge ? 20 : 16}
          strokeWidth={1.5}
          className="pointer-events-none absolute left-4 text-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (hits.length > 0) setOpen(true) }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search courses by name or code"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          role="combobox"
          autoFocus={autoFocus}
          autoComplete="off"
          className={`w-full rounded-2xl border border-line bg-white/80 pl-11 text-ink transition-colors placeholder:text-muted/60 focus:border-ink focus:bg-white focus:outline-none ${
            isLarge ? 'py-4 pr-14 text-base' : 'py-3 pr-12 text-base md:text-sm'
          }`}
        />
        <div className="absolute right-3 flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-muted" aria-hidden="true" />}
          {!loading && query.trim().length > 0 && (
            <span className="hidden rounded-md border border-line bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">
              {hits.length}
            </span>
          )}
        </div>
      </div>

      {/* selected quick detail */}
      {selected && open && (
        <div className="mt-3 hidden items-center gap-3 rounded-2xl bg-sheet px-4 py-3 text-xs text-muted md:flex">
          <span className="font-bold text-accent">{selected.code}</span>
          <span className="min-w-0 flex-1 truncate font-semibold text-ink">{selected.title}</span>
          <span className="text-muted/70">· {selected.programme.code}</span>
          <ArrowRight size={14} className="ml-auto text-muted" />
        </div>
      )}

      {open && (
        <div
          className={`absolute left-0 right-0 z-40 max-w-full overflow-auto rounded-3xl border border-line bg-white shadow-[0_24px_80px_rgba(23,20,17,0.14)] ${placeAbove ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'}`}
          style={menuMaxHeight ? { maxHeight: `${menuMaxHeight}px` } : undefined}
        >
          {loading && hits.length === 0 && (
            <div className="flex items-center justify-center gap-2 px-5 py-8 text-sm font-semibold text-muted">
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              Searching courses
            </div>
          )}
          {error && !loading && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">Could not search courses</p>
              <p className="mt-1 text-xs text-muted">Check your connection and keep typing to try again.</p>
            </div>
          )}
          {!error && hits.length === 0 && !loading && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm font-semibold text-ink">No course found for “{query.trim()}”</p>
              <p className="mt-1 text-xs text-muted">Try a code like CSC 1383 or a word like Database.</p>
            </div>
          )}
          {hits.length > 0 && (
            <ul id={listboxId} ref={listRef} role="listbox" className="py-2">
              {hits.map((hit, idx) => {
                const isActive = idx === activeIndex
                return (
                  <li key={hit.id} id={`${listboxId}-option-${idx}`} role="option" aria-selected={isActive}>
                    <Link
                      href={hit.href}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex min-w-0 items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-soft sm:gap-4 sm:px-5 ${isActive ? 'bg-soft' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-accent">{hit.code}</span>
                        <span className="text-dynamic mt-0.5 block text-base font-semibold leading-tight text-ink md:text-lg">{highlight(hit.title, query)}</span>
                        <span className="text-dynamic mt-1 block text-xs text-muted">{hit.programme.code} · {hit.programme.title}</span>
                      </span>
                      <ArrowRight size={16} strokeWidth={1.5} className={`mt-2 shrink-0 ${isActive ? 'text-ink' : 'text-muted/40'}`} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="flex min-w-0 items-center justify-between gap-3 border-t border-line/70 px-4 py-2.5 text-xs font-medium text-muted sm:px-5">
            <span className="text-dynamic min-w-0">{loading ? 'Searching live courses...' : `${hits.length} course${hits.length === 1 ? '' : 's'}`}</span>
            <Link href={hits[0]?.href ?? '/search?q='+encodeURIComponent(query.trim())} className="transition-colors hover:text-ink">
              {hits[0] ? 'Open first' : 'Search page'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function highlight(text: string, query: string) {
  const q = query.trim()
  if (!q) return text
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'ig'))
  return parts.map((part, i) =>
    part.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="rounded bg-sheet px-0.5 text-ink">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
