'use client'

import { useEffect, useRef, useState } from 'react'
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
  placeholder = 'Search subject name — e.g. Programming Fundamentals, CSC 1413',
  autoFocus = false,
  size = 'lg',
}: {
  placeholder?: string
  autoFocus?: boolean
  size?: 'sm' | 'lg'
}) {
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<CourseHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // debounce fetch
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setHits([])
      setOpen(false)
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/courses?q=${encodeURIComponent(q)}&limit=8`)
        if (!res.ok) throw new Error('fetch failed')
        const data = (await res.json()) as { courses: CourseHit[] }
        setHits(data.courses ?? [])
        setOpen(true)
        setActiveIndex(-1)
      } catch {
        setHits([])
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  // close on outside click
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [])

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % Math.max(hits.length, 1))
    } else if (e.key === 'ArrowUp') {
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
    <div ref={containerRef} className={`relative ${isLarge ? 'w-full' : 'w-full md:w-80'}`}>
      <div className={`relative flex items-center ${isLarge ? 'w-full' : 'w-full'}`}>
        <Search
          size={isLarge ? 20 : 16}
          strokeWidth={1.5}
          className="absolute left-4 text-neutral-400 pointer-events-none"
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
          aria-controls="course-lookup-listbox"
          aria-autocomplete="list"
          role="combobox"
          autoFocus={autoFocus}
          autoComplete="off"
          className={`w-full bg-transparent border border-neutral-300 rounded-full pl-11 ${
            isLarge ? 'pr-12 py-4 text-base' : 'pr-12 py-2.5 text-sm'
          } placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors`}
        />
        <div className="absolute right-3 flex items-center gap-2">
          {loading && <Loader2 size={16} className="animate-spin text-neutral-400" aria-hidden="true" />}
          {!loading && query.trim().length >= 2 && (
            <span className="hidden sm:block text-[10px] tracking-widest uppercase text-neutral-400 border border-neutral-300 rounded px-1.5 py-0.5">
              {hits.length}
            </span>
          )}
        </div>
      </div>

      {/* selected quick detail */}
      {selected && open && (
        <div className="mt-3 hidden md:flex items-center gap-3 text-xs text-neutral-600 border border-neutral-200 rounded-sm px-4 py-3 bg-neutral-50">
          <span className="text-[10px] tracking-widest uppercase font-bold text-accent">{selected.code}</span>
          <span className="font-medium text-neutral-900">{selected.title}</span>
          <span className="text-neutral-400">· {selected.programme.code}</span>
          <ArrowRight size={14} className="ml-auto text-neutral-400" />
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 mt-2 bg-white border border-neutral-200 rounded-sm shadow-xl z-40 max-h-[22rem] overflow-auto">
          {hits.length === 0 && !loading && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-neutral-900 font-medium">No course found for “{query.trim()}”</p>
              <p className="text-xs text-neutral-500 mt-1">Try the code e.g. CSC 1383 or a keyword like Database.</p>
            </div>
          )}
          {hits.length > 0 && (
            <ul id="course-lookup-listbox" ref={listRef} role="listbox" className="py-2">
              {hits.map((hit, idx) => {
                const isActive = idx === activeIndex
                return (
                  <li key={hit.id} role="option" aria-selected={isActive}>
                    <Link
                      href={hit.href}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`flex items-start justify-between gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors ${isActive ? 'bg-neutral-50' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[10px] tracking-widest uppercase font-bold text-accent">{hit.code}</span>
                        <span className="block font-serif text-base md:text-lg font-bold leading-tight text-neutral-900 mt-0.5">{highlight(hit.title, query)}</span>
                        <span className="block text-xs text-neutral-500 mt-1">{hit.programme.code} · {hit.programme.title}</span>
                      </span>
                      <ArrowRight size={16} strokeWidth={1.5} className={`shrink-0 mt-2 ${isActive ? 'text-neutral-900' : 'text-neutral-300'}`} aria-hidden="true" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <div className="border-t border-neutral-100 px-5 py-2.5 flex items-center justify-between text-[10px] tracking-widest uppercase font-medium text-neutral-400">
            <span>{loading ? 'Searching cloud…' : `${hits.length} result${hits.length === 1 ? '' : 's'} from cloud`}</span>
            <Link href={hits[0]?.href ?? '/search?q='+encodeURIComponent(query.trim())} className="hover:text-neutral-900 transition-colors">
              View all →
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
      <mark key={i} className="bg-yellow-100 text-neutral-900 px-0.5 rounded-sm">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}
