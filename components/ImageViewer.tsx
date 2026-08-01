'use client';

export function ImageViewer({ url, title }: { url: string; title: string }) {
  return (
    <div className="flex-1 min-h-0 overflow-auto bg-neutral-50 flex items-center justify-center p-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Preview of ${title}`}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}
