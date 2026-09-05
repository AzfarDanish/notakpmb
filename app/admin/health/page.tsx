import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin';
import { HealthClient } from '@/components/admin/HealthClient';

export default async function AdminHealthPage() {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (!isAdmin) redirect('/admin/login');
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="min-w-0">
        <p className="text-sm font-bold text-accent">Operations</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">System health</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">Live D1, R2, and app status. No secrets are ever displayed.</p>
      </section>
      <HealthClient />
    </div>
  );
}
