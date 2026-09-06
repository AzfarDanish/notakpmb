import { redirect } from 'next/navigation';
import { getAdminFromCookies } from '@/lib/admin';
import { AnnouncementsAdminClient } from '@/components/admin/AnnouncementsAdminClient';

export default async function AnnouncementsPage(){if(!await getAdminFromCookies())redirect('/admin/login');return <div className="flex min-w-0 flex-col gap-6"><section><p className="text-sm font-bold text-accent">Publishing</p><h1 className="mt-2 text-4xl font-black tracking-tight text-ink">Announcements</h1><p className="mt-3 max-w-md text-sm leading-6 text-muted">Create, preview, publish, and inspect public submissions.</p></section><AnnouncementsAdminClient/></div>}
