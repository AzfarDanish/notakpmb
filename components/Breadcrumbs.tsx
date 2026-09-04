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
      <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="flex min-w-0 max-w-full items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-neutral-300">
                  →
                </span>
              )}
              {isLast || !item.href ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={
                    isLast ? 'text-dynamic max-w-full text-ink' : 'text-dynamic max-w-full text-muted'
                  }
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-md py-1 text-dynamic max-w-full text-muted transition-colors hover:text-ink"
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
