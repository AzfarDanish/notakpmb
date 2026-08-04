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
        className="absolute left-4 text-neutral-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        name="q"
        defaultValue=""
        placeholder="Search programmes & subjects"
        aria-label="Search programmes and subjects"
        autoFocus={autoFocus}
        className={`w-full bg-transparent border border-neutral-300 rounded-full pl-11 ${
          isLarge ? 'pr-16 py-4 text-base' : 'pr-12 py-2.5 text-sm'
        } placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors`}
      />
      <kbd
        className={`absolute right-4 hidden sm:block text-[10px] tracking-widest uppercase text-neutral-400 border border-neutral-300 rounded px-1.5 py-0.5 ${
          isLarge ? 'text-xs' : ''
        }`}
      >
        /
      </kbd>
    </form>
  )
}
