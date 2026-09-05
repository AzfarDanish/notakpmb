'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { Activity, BarChart3, Files, FolderOpen, HeartHandshake, LogOut, Menu, Search, Settings2, X } from 'lucide-react';

const LINKS = [
  { href: '/admin', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/admin/feedback', label: 'Feedback', icon: HeartHandshake },
  { href: '/admin/files', label: 'Files', icon: Files },
  { href: '/admin/subjects', label: 'Subjects', icon: FolderOpen },
  { href: '/admin/programmes', label: 'Programmes', icon: Settings2 },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/health', label: 'Health', icon: Search },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      setLoggingOut(false);
      router.push('/admin/login');
      router.refresh();
    }
  }

  return (
    <div className="border-b border-line bg-paper">
      <div className="page-shell flex min-w-0 items-center gap-2 py-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-sheet hover:text-ink md:hidden"
          aria-label="Toggle admin navigation"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex" aria-label="Admin">
          {LINKS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active ? 'bg-ink text-paper' : 'text-muted hover:bg-sheet hover:text-ink'}`}
              >
                <Icon size={15} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={logout}
          disabled={loggingOut}
          className="ml-auto inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-sheet hover:text-ink disabled:opacity-50"
        >
          <LogOut size={15} strokeWidth={1.8} />
          <span className="hidden sm:inline">{loggingOut ? 'Leaving…' : 'Log out'}</span>
        </button>
      </div>
      {open && (
        <nav className="page-shell grid grid-cols-1 gap-1 pb-3 md:hidden" aria-label="Admin mobile">
          {LINKS.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`inline-flex min-h-11 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${active ? 'bg-ink text-paper' : 'bg-sheet text-ink'}`}
              >
                <Icon size={16} strokeWidth={1.8} />
                {label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
