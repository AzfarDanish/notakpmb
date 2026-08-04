'use client';

import { useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'ready'; html: string }
  | { status: 'error'; message: string };

export function DocxPreview({ url, title }: { url: string; title: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch file');
        const arrayBuffer = await res.arrayBuffer();
        const { default: mammoth } = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (cancelled) return;
        setState({ status: 'ready', html: result.value });
      } catch (e) {
        console.error('DOCX preview error:', e);
        if (!cancelled) {
          setState({
            status: 'error',
            message: e instanceof Error ? e.message : 'Failed to convert document',
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (state.status === 'loading') {
    return (
      <div className="flex items-center justify-center flex-1 min-h-0 text-neutral-400 text-sm p-8">
        Loading document preview…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-center p-8 text-neutral-500">
        <p className="mb-2">Unable to preview this document.</p>
      </div>
    );
  }

  return (
    <div
      className="docx-content flex-1 min-h-0 overflow-y-auto p-8 md:p-10"
      dangerouslySetInnerHTML={{ __html: state.html }}
      aria-label={`Preview of ${title}`}
    />
  );
}
