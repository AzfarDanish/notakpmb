import { NextRequest,NextResponse } from 'next/server';
import { DeleteObjectsCommand,PutObjectCommand } from '@aws-sdk/client-s3';
import { createHash,randomUUID } from 'node:crypto';
import { incrementRateLimit } from '@/lib/feedback';
import { getPublishedAnnouncement, validateBlockData } from '@/lib/announcements';
import { getR2Client } from '@/lib/r2';
import { supabaseAdmin } from '@/lib/supabase';
import { logActivity } from '@/lib/admin';

const COOKIE='notakpmb_submission_id';
const MIME:Record<string,string[]>= {pdf:['application/pdf'],doc:['application/msword'],docx:['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],txt:['text/plain'],jpg:['image/jpeg'],jpeg:['image/jpeg'],png:['image/png']};
function safeName(n:string){return n.replace(/[^\w.\-]+/g,'_').slice(0,120)||'file'}
function hash(v:string){return createHash('sha256').update(`${process.env.FEEDBACK_COOKIE_SALT??process.env.NEXT_PUBLIC_SUPABASE_URL??'nota'}:${v}`).digest('hex')}

export async function POST(req:NextRequest){
  const form=await req.formData(); const blockId=String(form.get('blockId')??''); const requestToken=String(form.get('requestToken')??''); const message=String(form.get('message')??'').trim().slice(0,1000);
  const files=form.getAll('files').filter((f):f is File=>f instanceof File);
  const ann=await getPublishedAnnouncement(); const block=ann?.blocks.find((b)=>b.id===blockId&&b.type==='upload_request');
  if(!ann||!block)return NextResponse.json({error:'Upload request is unavailable or expired'},{status:410});
  const cfg=validateBlockData('upload_request',block.data); const accepted=cfg.acceptedTypes as string[]; const max=Number(cfg.maxSizeMB)*1024*1024;
  if((cfg.required===true&&files.length===0)||files.length===0)return NextResponse.json({error:'Select a file'},{status:400});
  if(cfg.multiple!==true&&files.length>1)return NextResponse.json({error:'Only one file is allowed'},{status:400});
  if(files.length>10)return NextResponse.json({error:'Too many files'},{status:400});
  for(const file of files){const ext=file.name.split('.').pop()?.toLowerCase()??'';if(!accepted.includes(ext)||!(MIME[ext]??[]).includes(file.type)||file.size>max)return NextResponse.json({error:`${file.name}: invalid type or size`},{status:400});}
  if(cfg.allowMessage===false&&message)return NextResponse.json({error:'Message is not allowed'},{status:400});
  const raw=req.cookies.get(COOKIE)?.value??randomUUID(); const uploaderHash=hash(raw);
  try{await incrementRateLimit({voterHash:uploaderHash,action:`announcement-submit:${blockId}`,max:5,windowMs:60*60*1000});}catch{return NextResponse.json({error:'Please wait before submitting more files.'},{status:429});}
  const tokenOk=/^[0-9a-f-]{36}$/i.test(requestToken);const submissionId=tokenOk?`sub-${requestToken}`:`sub-${Date.now().toString(36)}-${randomUUID().slice(0,8)}`;
  const {data:prior}=await supabaseAdmin().from('announcement_submissions').select('id,uploader_hash').eq('id',submissionId).limit(1).maybeSingle();if(prior){if(prior.uploader_hash===uploaderHash)return NextResponse.json({success:true,submissionId,duplicate:true});return NextResponse.json({error:'Duplicate submission token'},{status:409});}
  const client=getR2Client();const bucket=process.env.R2_BUCKET_NAME;
  if(!client||!bucket)return NextResponse.json({error:'Storage unavailable'},{status:503});
  const uploaded:{key:string;file:File}[]=[];
  try{
    for(const file of files){const key=`submissions/${ann.id}/${block.id}/${submissionId}/${Date.now()}-${safeName(file.name)}`;await client.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:Buffer.from(await file.arrayBuffer()),ContentType:file.type,Metadata:{originalName:encodeURIComponent(file.name)}}));uploaded.push({key,file});}
    const {error}=await supabaseAdmin().from('announcement_submissions').insert({id:submissionId,announcement_id:ann.id,block_id:block.id,uploader_hash:uploaderHash,message,file_count:files.length});if(error)throw error;
    const {error:fileErr}=await supabaseAdmin().from('files').insert(uploaded.map(({key,file})=>({key,kind:'submission',announcement_id:ann.id,block_id:block.id,submission_id:submissionId,size:file.size,content_type:file.type,title:file.name,original_name:file.name})));if(fileErr)throw fileErr;
    await logActivity('public_submission.received','announcement',ann.id,`${block.id}:${submissionId}`);
    const res=NextResponse.json({success:true,submissionId},{status:201});res.cookies.set(COOKIE,raw,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:31536000});return res;
  }catch(e){if(uploaded.length)await client.send(new DeleteObjectsCommand({Bucket:bucket,Delete:{Objects:uploaded.map((u)=>({Key:u.key}))}})).catch(()=>undefined);await supabaseAdmin().from('announcement_submissions').delete().eq('id',submissionId);return NextResponse.json({error:e instanceof Error?e.message:'Submission failed'},{status:500});}
}
