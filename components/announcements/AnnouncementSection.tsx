import { getPublishedAnnouncement } from '@/lib/announcements';
import { AnnouncementRenderer } from './AnnouncementRenderer';

export async function AnnouncementSection(){const announcement=await getPublishedAnnouncement().catch(()=>null);if(!announcement)return null;return <div className="mt-8 max-w-xl border-t border-line pt-8"><AnnouncementRenderer announcement={announcement}/><div aria-hidden="true" className="mt-10 border-b border-line" /></div>}
