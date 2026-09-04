export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] flex flex-col">{children}</div>
}
