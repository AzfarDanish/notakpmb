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
      className="page-shell flex min-h-[70vh] min-w-0 flex-col items-start justify-center py-16 md:py-24"
    >
      <p className="mb-4 text-sm font-bold text-accent">404</p>
      <h1 className="text-dynamic max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.05em] text-balance sm:text-5xl md:text-7xl">
        This page doesn&rsquo;t exist.
      </h1>
      <p className="text-dynamic mt-6 max-w-xl text-base leading-7 text-muted">
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
