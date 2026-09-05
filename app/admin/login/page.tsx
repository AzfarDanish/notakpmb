import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin';
import { LoginForm } from '@/components/admin/LoginForm';

export default async function AdminLoginPage() {
  const isAdmin = await getAdminFromCookies().catch(() => false);
  if (isAdmin) redirect('/admin');
  return (
    <section className="mt-10 rounded-[2rem] border border-line bg-white p-6 shadow-[0_24px_90px_rgba(23,20,17,0.08)] sm:p-8">
      <p className="text-sm font-bold text-accent">Private area</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-ink">Admin login</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Owner only. Public visitors never need this page. Attempts are rate-limited.
      </p>
      <div className="mt-6">
        <LoginForm />
      </div>
    </section>
  );
}
