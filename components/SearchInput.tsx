'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function SearchInput({
  size = 'sm',
  autoFocus = false,
}: {
  size?: 'sm' | 'lg'
  autoFocus?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }
      event.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = inputRef.current?.value.trim()
    if (query) router.push(`/search?q=${encodeURIComponent(query)}`)
  }

  const isLarge = size === 'lg'

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`relative flex items-center ${isLarge ? 'w-full' : 'w-full md:w-64'}`}
    >
      <Search
        size={isLarge ? 20 : 16}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-4 text-muted"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue=""
        placeholder="Search files, subjects, programmes"
        aria-label="Search programmes and subjects"
        autoFocus={autoFocus}
        className={`w-full rounded-2xl border border-line bg-white/70 pl-11 text-ink shadow-none transition-colors placeholder:text-muted/60 focus:border-ink focus:bg-white focus:outline-none ${
          isLarge ? 'py-4 pr-16 text-base' : 'py-3 pr-12 text-sm'
        }`}
      />
      <kbd
        className={`absolute right-4 hidden rounded-md border border-line bg-soft px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block ${
          isLarge ? 'text-xs' : ''
        }`}
      >
        /
      </kbd>
    </form>
  )
}
