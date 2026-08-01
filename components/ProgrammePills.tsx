import Link from 'next/link'
import { getProgrammes } from '@/lib/data'

export function ProgrammePills({
  activeId,
  basePath = '/',
}: {
  activeId?: string
  basePath?: string
}) {
  const programmes = getProgrammes()

  return (
    <nav aria-label="Programmes">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {programmes.map((programme) => {
          const isActive = programme.id === activeId
          return (
            <li key={programme.id} className="shrink-0">
              <Link
                href={`${basePath}?programme=${programme.id}`}
                aria-current={isActive ? 'true' : undefined}
                className={`inline-block rounded-full px-4 py-2 text-[10px] tracking-widest uppercase font-medium transition-colors ${
                  isActive
                    ? 'bg-ink text-paper'
                    : 'border border-neutral-300 text-neutral-600 hover:border-neutral-900 hover:text-neutral-900'
                }`}
              >
                {programme.code}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
