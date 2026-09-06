import { NextRequest,NextResponse } from 'next/server';
import { requireAdmin,logActivity } from '@/lib/admin';
import { getSubmissionGroups } from '@/lib/announcements';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const id=req.nextUrl.searchParams.get('announcementId');if(!id)return NextResponse.json({error:'announcementId required'},{status:400});return NextResponse.json({groups:await getSubmissionGroups(id)},{headers:{'Cache-Control':'private, max-age=0, must-revalidate'}})}

export async function DELETE(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const id=req.nextUrl.searchParams.get('id');if(!id)return NextResponse.json({error:'id required'},{status:400});const {data:sub}=await supabaseAdmin().from('announcement_submissions').select('announcement_id,block_id').eq('id',id).limit(1).maybeSingle();if(!sub)return NextResponse.json({error:'Submission not found'},{status:404});const {listR2Keys,deleteR2Keys}=await import('@/lib/r2');await deleteR2Keys((await listR2Keys(`submissions/${sub.announcement_id}/${sub.block_id}/${id}/`)).map((o)=>o.key));const {error}=await supabaseAdmin().from('announcement_submissions').delete().eq('id',id);if(error)throw error;await logActivity('public_submission.deleted','submission',id,'');return NextResponse.json({success:true})}
