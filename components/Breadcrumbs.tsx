import Link from 'next/link'

export type Crumb = {
  label: string
  href?: string
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const structured = items.filter((item) => item.href)

  return (
    <nav aria-label="Breadcrumb">
      {structured.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: structured.map((item, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: item.label,
                item: `https://notakpmb.vercel.app${item.href}`,
              })),
            }),
          }}
        />
      )}
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] tracking-widest uppercase font-medium">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-neutral-300">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast ? 'text-neutral-900' : 'text-neutral-500'
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
