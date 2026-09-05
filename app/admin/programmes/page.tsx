import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin';
import { ProgrammesAdminClient } from '@/components/admin/ProgrammesAdminClient';

export default async function AdminProgrammesPage() {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (!isAdmin) redirect('/admin/login');
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="min-w-0">
        <p className="text-sm font-bold text-accent">Structure</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Programmes</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">Add, edit, hide, reorder, and delete. Deletes with subjects require confirmation.</p>
      </section>
      <ProgrammesAdminClient />
    </div>
  );
}
