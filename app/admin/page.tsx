import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getAdminFromCookies } from '@/lib/admin';
import { DashboardClient } from '@/components/admin/DashboardClient';
import { StatsSkeleton } from '@/components/admin/ui';
import { AdminSearch } from '@/components/admin/AdminSearch';

export default async function AdminDashboardPage() {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (!isAdmin) redirect('/admin/login');
  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section className="min-w-0">
        <p className="text-sm font-bold text-accent">Overview</p>
        <h1 className="mt-2 max-w-xl text-4xl font-black leading-[0.94] tracking-[-0.05em] text-balance sm:text-5xl">Dashboard</h1>
        <p className="mt-4 max-w-md text-base leading-7 text-muted">Live counts and recent activity from the real archive.</p>
      </section>
      <AdminSearch />
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardClient />
      </Suspense>
    </div>
  );
}
