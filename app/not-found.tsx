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
      className="page-shell flex min-h-[70vh] flex-col items-start justify-center py-24"
    >
      <p className="mb-4 text-sm font-bold text-accent">404</p>
      <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] text-balance md:text-7xl">
        This page doesn&rsquo;t exist.
      </h1>
      <p className="mt-6 max-w-xl text-base leading-7 text-muted">
        The page you&rsquo;re looking for may have been moved or removed. Head
        back to the archive to keep exploring.
      </p>
      <Link
        href="/"
        className="mt-10 inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-accent"
      >
        Open the archive
      </Link>
    </main>
  );
}
