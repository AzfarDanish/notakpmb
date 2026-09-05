import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin';
import { SubjectsAdminClient } from '@/components/admin/SubjectsAdminClient';

export default async function AdminSubjectsPage() {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (!isAdmin) redirect('/admin/login');
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="min-w-0">
        <p className="text-sm font-bold text-accent">Catalog</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Subjects</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">Add, rename, hide, and delete. Deletes with files require explicit confirmation.</p>
      </section>
      <SubjectsAdminClient />
    </div>
  );
}
