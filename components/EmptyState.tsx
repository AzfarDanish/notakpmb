export function EmptyState({
  title,
  hint,
}: {
  title: string
  hint?: string
}) {
  return (
    <div className="border border-dashed border-neutral-300 rounded-sm p-8 text-center">
      <p className="font-serif text-2xl text-neutral-500">{title}</p>
      {hint && <p className="text-base text-neutral-400 mt-2">{hint}</p>}
    </div>
  )
}
