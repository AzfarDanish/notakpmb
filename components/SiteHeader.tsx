import Link from 'next/link'
import { SearchInput } from '@/components/SearchInput'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-paper/85 backdrop-blur border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex items-center justify-between gap-6 py-4">
        <Link
          href="/"
          className="font-serif font-bold text-2xl md:text-3xl tracking-tight text-neutral-900 hover:opacity-60 transition-opacity"
        >
          NotaKPMB
        </Link>

        <div className="flex items-center justify-end gap-3 flex-1">
          <div className="hidden md:block">
            <SearchInput size="sm" />
          </div>
          <Link
            href="/search"
            aria-label="Search"
            className="md:hidden p-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  )
}
