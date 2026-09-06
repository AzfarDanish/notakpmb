import { redirect } from 'next/navigation';import { getAdminFromCookies } from '@/lib/admin';import { AnnouncementCreateClient } from '@/components/admin/AnnouncementCreateClient';
export default async function NewAnnouncementPage(){if(!await getAdminFromCookies())redirect('/admin/login');return <AnnouncementCreateClient/>}
