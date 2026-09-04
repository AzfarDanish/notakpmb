import Link from 'next/link'
import { Globe } from 'lucide-react'
import { getProgrammes } from '@/lib/subjects'

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export async function Footer() {
  const programmes = await getProgrammes()

  return (
    <footer className="-mt-[0.12em] w-full min-w-0 bg-[#111111] text-white">
      <div className="page-shell py-10 md:py-14">
        <div className="grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10">
          <div className="min-w-0">
            <h3 className="text-2xl font-black tracking-tight">NotaKPMB</h3>
            <p className="text-dynamic mt-3 max-w-[260px] text-sm leading-6 text-white/65">
              Student notes, course codes, and shared files in one open archive.
            </p>
          </div>

          <div className="min-w-0">
            <p className="mb-4 text-sm font-bold text-white">Open</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link href="/" className="text-white/65 transition-colors hover:text-white">
                  Index
                </Link>
              </li>
              <li>
                <Link href="/courses" className="text-white/65 transition-colors hover:text-white">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-white/65 transition-colors hover:text-white">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          <div className="min-w-0">
            <p className="mb-4 text-sm font-bold text-white">Programmes</p>
            <ul className="flex flex-col gap-3 text-sm">
              {programmes.map((p) => (
                <li key={p.id}>
                  <Link href={`/programme/${p.id}`} className="text-dynamic text-white/65 transition-colors hover:text-white">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <p className="mb-4 text-sm font-bold text-white">Project</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link href="/privacy" className="text-white/65 transition-colors hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-white/65 transition-colors hover:text-white">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <a href="mailto:azfardns@gmail.com" className="text-dynamic text-white/65 transition-colors hover:text-white">
                  azfardns@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex min-w-0 flex-col items-start justify-between gap-6 border-t border-white/10 pt-6 md:flex-row md:items-center">
          <span className="text-xs font-medium text-white/50">
            Created by Azfar Danish
          </span>
          <div className="flex items-center gap-4 text-white/55">
            <a
              href="https://instagram.com/azferish"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Instagram"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://azfardanish.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Portfolio"
              title="Portfolio"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/10 hover:text-white"
            >
              <Globe size={20} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
