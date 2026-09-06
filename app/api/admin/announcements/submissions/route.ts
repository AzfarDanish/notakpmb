import { NextRequest,NextResponse } from 'next/server';
import { DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { requireAdmin,logActivity } from '@/lib/admin';
import { getSubmissionGroups } from '@/lib/announcements';
import { supabaseAdmin } from '@/lib/supabase';
import { getR2Client } from '@/lib/r2';

export async function GET(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const id=req.nextUrl.searchParams.get('announcementId');if(!id)return NextResponse.json({error:'announcementId required'},{status:400});return NextResponse.json({groups:await getSubmissionGroups(id)},{headers:{'Cache-Control':'private, max-age=0, must-revalidate'}})}

export async function PATCH(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const body=await req.json() as {id?:unknown;status?:unknown};if(typeof body.id!=='string'||!['new','reviewed','archived'].includes(String(body.status)))return NextResponse.json({error:'Invalid submission'},{status:400});const {error}=await supabaseAdmin().from('announcement_submissions').update({status:body.status}).eq('id',body.id);if(error)throw error;await logActivity('submission.reviewed','submission',body.id,String(body.status));return NextResponse.json({success:true})}

export async function DELETE(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const id=req.nextUrl.searchParams.get('id');if(!id)return NextResponse.json({error:'id required'},{status:400});const {data:files}=await supabaseAdmin().from('files').select('key').eq('submission_id',id);const client=getR2Client();const bucket=process.env.R2_BUCKET_NAME;if(client&&bucket&&files?.length)await client.send(new DeleteObjectsCommand({Bucket:bucket,Delete:{Objects:files.map((f)=>({Key:String(f.key)}))}}));await supabaseAdmin().from('files').delete().eq('submission_id',id);const {error}=await supabaseAdmin().from('announcement_submissions').delete().eq('id',id);if(error)throw error;await logActivity('public_submission.deleted','submission',id,'');return NextResponse.json({success:true})}
