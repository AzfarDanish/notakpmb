export function EmptyState({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <div className="rounded-[1.75rem] bg-sheet px-6 py-10 text-center md:px-10">
      <p className="text-xl font-semibold tracking-tight text-ink">{title}</p>
      {hint && <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted">{hint}</p>}
    </div>
  )
}
