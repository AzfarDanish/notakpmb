'use client';

import { useEffect, useState } from 'react';
import { PreviewSkeleton } from '@/components/Skeleton';

type State =
  | { status: 'loading' }
  | { status: 'ready'; text: string }
  | { status: 'error' };

export function CodeViewer({ url }: { url: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch file');
        const text = await res.text();
        if (!cancelled) setState({ status: 'ready', text });
      } catch (e) {
        console.error('Code preview error:', e);
        if (!cancelled) setState({ status: 'error' });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === 'loading') {
    return <PreviewSkeleton label="Loading file preview" />;
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-center p-8 text-neutral-500">
        <p className="mb-2">Unable to preview this file.</p>
      </div>
    );
  }

  return (
    <pre className="code-viewer m-0 flex-1 min-h-0 overflow-auto p-4 sm:p-6 md:p-10">
      <code>{state.text}</code>
    </pre>
  );
}
