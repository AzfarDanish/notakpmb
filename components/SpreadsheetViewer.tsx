'use client';

import { useEffect, useState } from 'react';

type State =
  | { status: 'loading' }
  | { status: 'ready'; rows: (string | number)[][]; sheetName: string }
  | { status: 'error' };

export function SpreadsheetViewer({ url }: { url: string }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch file');
        const arrayBuffer = await res.arrayBuffer();
        const { default: XLSX } = await import('xlsx');
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = sheet
          ? (XLSX.utils.sheet_to_json(sheet, {
              header: 1,
              defval: '',
            }) as (string | number)[][])
          : [];
        if (cancelled) return;
        setState({ status: 'ready', rows, sheetName });
      } catch (e) {
        console.error('Spreadsheet preview error:', e);
        if (!cancelled) setState({ status: 'error' });
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
        Loading spreadsheet…
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-center p-8 text-neutral-500">
        <p className="mb-2">Unable to preview this file.</p>
        <p className="text-xs">Please use the download button instead.</p>
      </div>
    );
  }

  if (state.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-center p-8 text-neutral-500">
        <p className="mb-2">This spreadsheet is empty.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 px-8 md:px-10 pt-6 pb-4">
        <p className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium">
          {state.sheetName}
        </p>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-8 md:px-10 pb-8 md:pb-10">
        <table className="docx-content w-full border-collapse text-sm">
          <tbody>
            {state.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border border-neutral-200 px-3 py-1.5 align-top">
                    {String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
