'use client';

import { useRef, useState } from 'react';
import { Check, Download, Loader2, Megaphone, Upload } from 'lucide-react';
import Image from 'next/image';
import type { Announcement } from '@/lib/announcements';

export function AnnouncementRenderer({ announcement, preview = false }: { announcement: Announcement; preview?: boolean }) {
  return (
    <section className="min-w-0" aria-label={`Announcement: ${announcement.title}`}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-accent"><Megaphone size={13} strokeWidth={2.2} aria-hidden="true" />Announcement</p>
      <h2 className="text-dynamic mt-3 text-balance text-4xl font-black leading-[1.02] tracking-[-0.03em] text-ink sm:text-5xl">{announcement.title}</h2>
      {announcement.blocks.length > 0 ? <div className="mt-7 flex min-w-0 flex-col gap-6 border-l-2 border-accent pl-4 sm:pl-5">
        {announcement.blocks.map((block) => {
          const d = block.data;
          if (block.type === 'text') return <div key={block.id} className="text-dynamic whitespace-pre-wrap text-base leading-7 text-ink">{String(d.text ?? '')}</div>;
          if (block.type === 'image') {
            const key = String(d.key ?? ''); if (!key) return null;
            return <figure key={block.id} className="min-w-0 overflow-hidden rounded-[1.5rem] bg-white">
              <div className="relative aspect-[16/9] max-h-[32rem]"><Image unoptimized fill sizes="(max-width: 640px) 100vw, 576px" src={`/api/download?key=${encodeURIComponent(key)}&action=preview`} alt={String(d.alt ?? '')} className="object-cover" />
                {d.overlayEnabled === true && d.overlayText ? <figcaption className="absolute inset-x-0 bottom-0 bg-ink/75 px-4 py-3 text-sm font-semibold text-white">{String(d.overlayText)}</figcaption> : null}
              </div>
              {d.credit ? <p className="px-3 py-2 text-xs text-muted">Image: {String(d.credit)}</p> : null}
            </figure>;
          }
          if (block.type === 'banner') return <div key={block.id} className="border-l-4 border-accent bg-white px-4 py-4">
            {d.label ? <p className="text-xs font-bold uppercase tracking-wide text-accent">{String(d.label)}</p> : null}
            <p className="text-dynamic mt-1 text-base font-semibold leading-6 text-ink">{String(d.message ?? '')}</p>
            {d.link ? <a href={String(d.link)} className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-accent underline underline-offset-4">{String(d.cta || 'Learn more')}</a> : null}
          </div>;
          if (block.type === 'download') {
            const files = Array.isArray(d.files) ? d.files as { key: string; label: string; size: number }[] : [];
            return <div key={block.id} className="divide-y divide-line/70 border-y border-line">{files.map((f) => <a key={f.key} href={`/api/download?key=${encodeURIComponent(f.key)}&action=download`} className="flex min-h-14 min-w-0 items-center gap-3 py-3 text-sm font-semibold text-ink hover:text-accent"><Download size={16} className="shrink-0" /><span className="min-w-0 flex-1 truncate">{f.label || f.key.split('/').pop()}</span><span className="shrink-0 text-xs text-muted">{formatSize(f.size)}</span></a>)}</div>;
          }
          return <UploadRequestForm key={block.id} blockId={block.id} data={d} preview={preview} />;
        })}
      </div> : null}
    </section>
  );
}

function UploadRequestForm({ blockId, data, preview }: { blockId: string; data: Record<string, unknown>; preview: boolean }) {
  const [files, setFiles] = useState<File[]>([]); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [success, setSuccess] = useState(false); const [error, setError] = useState('');
  const requestToken = useRef(crypto.randomUUID());
  const accepted = Array.isArray(data.acceptedTypes) ? data.acceptedTypes.map(String) : ['pdf'];
  async function submit(e: React.FormEvent) {e.preventDefault();if(preview||busy||success)return;setBusy(true);setError('');try{const form=new FormData();form.append('blockId',blockId);form.append('requestToken',requestToken.current);form.append('message',message);files.forEach((f)=>form.append('files',f));const res=await fetch('/api/announcements/submit',{method:'POST',body:form});const body=await res.json().catch(()=>null) as {error?:string}|null;if(!res.ok)throw new Error(body?.error||'Submission failed');setSuccess(true);setFiles([]);setMessage('');requestToken.current=crypto.randomUUID();}catch(e){setError(e instanceof Error?e.message:'Submission failed')}finally{setBusy(false)}}
  return <form onSubmit={submit} className="min-w-0 border-t border-line pt-6">
    <div className="flex items-start gap-3"><Upload size={18} className="mt-1 shrink-0 text-accent"/><div className="min-w-0"><h3 className="text-dynamic text-lg font-black text-ink">{String(data.title??'Upload files')}</h3><p className="text-dynamic mt-1 text-sm leading-6 text-muted">{String(data.instructions??'')}</p><p className="mt-2 text-xs font-medium text-muted">{accepted.map((x)=>x.toUpperCase()).join(', ')} · max {Number(data.maxSizeMB??5)}MB each · {data.multiple===true?'multiple files':'one file'}{data.required===true?' · required':''}</p></div></div>
    <input type="file" multiple={data.multiple===true} accept={accepted.map((x)=>`.${x}`).join(',')} onChange={(e)=>{setSuccess(false);setFiles(Array.from(e.target.files??[]));setError('')}} disabled={busy||success||preview} className="mt-4 block w-full min-w-0 rounded-2xl border border-dashed border-line bg-white px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-paper"/>
    {data.allowMessage!==false?<textarea value={message} onChange={(e)=>setMessage(e.target.value.slice(0,1000))} disabled={busy||success||preview} rows={3} placeholder="Optional message" className="mt-3 w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-ink"/>:null}
    {error?<p className="mt-2 text-sm text-red-600">{error}</p>:null}{success?<p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-green-700"><Check size={16}/> Submitted successfully.</p>:null}
    <button type="submit" disabled={preview||busy||success||files.length===0} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper hover:bg-accent disabled:opacity-40">{busy?<Loader2 size={14} className="animate-spin"/>:<Upload size={15}/>} {preview?'Preview only':busy?'Submitting…':'Submit'}</button>
  </form>;
}

function formatSize(n:number){return n<1024*1024?`${Math.round(n/1024)} KB`:`${(n/(1024*1024)).toFixed(1)} MB`}
