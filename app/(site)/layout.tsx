import { Globe } from 'lucide-react';

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-[100dvh]">{children}</div>
      <footer className="p-6 md:px-12 flex items-center justify-between gap-6">
        <span className="text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
          Created by Azfar Danish
        </span>
        <div className="flex items-center gap-4 text-neutral-400">
          <a
            href="https://instagram.com/azferish"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            title="Instagram"
            className="hover:text-neutral-900 transition-colors"
          >
            <InstagramIcon />
          </a>
          <a
            href="https://azfardanish.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Portfolio"
            title="Portfolio"
            className="hover:text-neutral-900 transition-colors"
          >
            <Globe size={20} strokeWidth={1.5} />
          </a>
        </div>
      </footer>
    </>
  );
}
