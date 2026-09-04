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
    <footer className="bg-ink text-paper border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 md:px-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-tight">NotaKPMB</h3>
            <p className="text-sm text-paper/60 leading-relaxed mt-3 max-w-[260px]">
              A student-run digital archive of notes, exercises and past year questions. Built by students, for students.
            </p>
          </div>

          {/* Archive */}
          <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-paper/40 mb-4">Archive</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link href="/" className="text-paper/70 hover:text-paper transition-colors">
                  Index
                </Link>
              </li>
              <li>
                <Link href="/courses" className="text-paper/70 hover:text-paper transition-colors">
                  Courses
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-paper/70 hover:text-paper transition-colors">
                  Search
                </Link>
              </li>
            </ul>
          </div>

          {/* Programmes */}
          <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-paper/40 mb-4">Programmes</p>
            <ul className="flex flex-col gap-3 text-sm">
              {programmes.map((p) => (
                <li key={p.id}>
                  <Link href={`/programme/${p.id}`} className="text-paper/70 hover:text-paper transition-colors">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-[10px] tracking-widest uppercase font-bold text-paper/40 mb-4">Legal</p>
            <ul className="flex flex-col gap-3 text-sm">
              <li>
                <Link href="/privacy" className="text-paper/70 hover:text-paper transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-paper/70 hover:text-paper transition-colors">
                  Terms and Conditions
                </Link>
              </li>
              <li>
                <a href="mailto:azfardns@gmail.com" className="text-paper/70 hover:text-paper transition-colors">
                  azfardns@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-neutral-800 pt-6">
          <span className="text-[10px] tracking-widest text-paper/40 uppercase font-medium">
            Created by Azfar Danish
          </span>
          <div className="flex items-center gap-4 text-paper/60">
            <a
              href="https://instagram.com/azferish"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              title="Instagram"
              className="hover:text-paper transition-colors"
            >
              <InstagramIcon />
            </a>
            <a
              href="https://azfardanish.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Portfolio"
              title="Portfolio"
              className="hover:text-paper transition-colors"
            >
              <Globe size={20} strokeWidth={1.5} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
