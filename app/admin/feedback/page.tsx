import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin';
import { FeedbackAdminClient } from '@/components/admin/FeedbackAdminClient';

export default async function AdminFeedbackPage() {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (!isAdmin) redirect('/admin/login');
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <section className="min-w-0">
        <p className="text-sm font-bold text-accent">Moderation</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Feedback</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted">Search and delete feedback.</p>
      </section>
      <FeedbackAdminClient />
    </div>
  );
}
