import { NextRequest,NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { requireAdmin } from '@/lib/admin';
import { getR2Client } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req:NextRequest){const denied=await requireAdmin(req);if(denied)return denied;const key=req.nextUrl.searchParams.get('key');if(!key?.startsWith('submissions/')||key.includes('..'))return NextResponse.json({error:'Invalid key'},{status:400});const {data:row}=await supabaseAdmin().from('files').select('original_name,content_type').eq('key',key).eq('kind','submission').limit(1).maybeSingle();if(!row)return NextResponse.json({error:'File not found'},{status:404});const client=getR2Client();const bucket=process.env.R2_BUCKET_NAME;if(!client||!bucket)return NextResponse.json({error:'Storage unavailable'},{status:503});const obj=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}));const filename=String(row.original_name??'download').replace(/["\r\n]/g,'_').slice(0,200);return new NextResponse(obj.Body as ReadableStream,{headers:{'Content-Type':String(row.content_type??obj.ContentType??'application/octet-stream'),'Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store'}})}
