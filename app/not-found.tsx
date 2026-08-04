import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: {
    index: false,
  },
};

export default function NotFound() {
  return (
    <main
      id="main"
      className="max-w-7xl mx-auto px-6 py-24 md:px-12 min-h-[70vh] flex flex-col items-start justify-center"
    >
      <p className="text-[10px] tracking-widest text-accent uppercase font-bold mb-4">
        404
      </p>
      <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-4xl">
        This page doesn&rsquo;t exist.
      </h1>
      <p className="text-neutral-600 leading-relaxed text-sm md:text-base max-w-xl mt-6">
        The page you&rsquo;re looking for may have been moved or removed. Head
        back to the archive to keep exploring.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 text-xs tracking-widest uppercase font-bold text-accent hover:opacity-60 transition-opacity"
      >
        Back to the archive
      </Link>
    </main>
  );
}