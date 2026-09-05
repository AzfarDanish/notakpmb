import Link from 'next/link';
import { getAdminFromCookies } from '@/lib/admin';
import { AdminNav } from '@/components/admin/AdminNav';

export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (!isAdmin) {
    return (
      <main id="main" className="page-shell">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    );
  }
  return (
    <div className="min-w-0">
      <div className="border-b border-line bg-sheet/60">
        <div className="page-shell flex min-w-0 items-center justify-between gap-3 py-3">
          <Link href="/admin" className="min-w-0 truncate text-lg font-black tracking-tight text-ink">
            NotaKPMB <span className="text-sm font-bold text-accent">Admin</span>
          </Link>
          <Link href="/" className="shrink-0 text-sm font-semibold text-muted transition-colors hover:text-ink">
            View site
          </Link>
        </div>
      </div>
      <AdminNav />
      <main id="main" className="page-shell min-w-0 pb-16">{children}</main>
    </div>
  );
}
