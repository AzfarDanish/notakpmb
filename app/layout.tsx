import { Analytics } from '@vercel/analytics/next';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
import { Suspense } from 'react';
import { Footer } from '@/components/Footer';
import { FooterWordmark } from '@/components/FooterWordmark';
import './globals.css';

const sfProDisplay = localFont({
  src: [
    { path: '../fonts/SFPRODISPLAYREGULAR.otf', weight: '400', style: 'normal' },
    { path: '../fonts/SFPRODISPLAYMEDIUM.otf', weight: '500', style: 'normal' },
    { path: '../fonts/SFPRODISPLAYBOLD.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://notakpmb.vercel.app'),
  title: {
    default: 'NotaKPMB — Notes, Exercises & Past Year Questions',
    template: '%s | NotaKPMB',
  },
  description:
    'A curated digital archive of notes, exercises and past year questions shared by KPMB students. NotaKPMB (Nota KPMB) — explore and contribute your own notes.',
  alternates: {
    canonical: '/',
  },
  verification: {
    google: 'DDHJYxNHZvNSwP2kJwjJGkezBdDoLCfImcBiKFWD5Cc',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'NotaKPMB — Notes, Exercises & Past Year Questions',
    description:
      'A curated digital archive of notes, exercises and past year questions shared by KPMB students. Contribute your notes and help the archive grow.',
    type: 'website',
    url: '/',
    siteName: 'NotaKPMB',
    locale: 'en_MY',
    images: [
      {
        url: '/notakpmb_og_image.webp',
        width: 1200,
        height: 630,
        alt: 'Nota KPMB - Shared Notes and Past Year Questions',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NotaKPMB — Notes, Exercises & Past Year Questions',
    description:
      'A curated digital archive of notes, exercises and past year questions shared by KPMB students. Contribute your notes and help the archive grow.',
    images: ['/notakpmb_og_image.webp'],
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

function FooterFallback() {
  return (
    <footer className="-mt-[0.12em] w-full min-w-0 bg-[#111111] text-white" aria-busy="true">
      <div className="page-shell py-10 md:py-14">
        <div className="grid min-w-0 gap-8 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-10">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="min-w-0 space-y-4">
              <div className="h-6 w-28 rounded-full bg-white/15 motion-safe:animate-pulse" />
              <div className="space-y-3">
                <div className="h-4 w-36 rounded-full bg-white/10 motion-safe:animate-pulse" />
                <div className="h-4 w-28 rounded-full bg-white/10 motion-safe:animate-pulse" />
                <div className="h-4 w-32 rounded-full bg-white/10 motion-safe:animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${sfProDisplay.variable}`}>
      <body className="flex min-h-screen min-w-0 flex-col bg-paper font-sans text-ink antialiased" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-2xl focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper"
        >
          Skip to content
        </a>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-WJG1B5VZDS" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-WJG1B5VZDS');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'NotaKPMB',
              alternateName: 'Nota KPMB',
              url: 'https://notakpmb.vercel.app',
              description:
                'A curated digital archive of notes, exercises and past year questions shared by KPMB students.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate:
                    'https://notakpmb.vercel.app/search?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <div id="scroll-root" className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
          <FooterWordmark />
          <Suspense fallback={<FooterFallback />}>
            <Footer />
          </Suspense>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
