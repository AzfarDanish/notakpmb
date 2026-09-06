import { NextResponse } from 'next/server';
import { getPublishedAnnouncement } from '@/lib/announcements';

export async function GET(){
  const item=await getPublishedAnnouncement().catch(()=>null);
  return NextResponse.json({item},{headers:{'Cache-Control':'private, max-age=0, must-revalidate'}});
}
