'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function ImageViewer({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-neutral-50 relative">
      <div className="min-h-full flex items-center justify-center p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={`Preview of ${title}`}
          onLoad={() => setStatus('ready')}
          onError={() => setStatus('error')}
          className={`max-w-full max-h-full object-contain ${status === 'loading' ? 'opacity-0' : ''}`}
        />
      </div>
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-400 pointer-events-none">
          <Loader2 size={20} className="animate-spin" />
          <p className="text-lg">Loading image&hellip;</p>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center text-center p-8 text-neutral-500">
          <p className="mb-2">Unable to load this image.</p>
        </div>
      )}
    </div>
  );
}
