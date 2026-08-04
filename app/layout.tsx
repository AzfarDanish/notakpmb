import { Analytics } from '@vercel/analytics/next';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import Script from 'next/script';
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
  metadataBase: new URL('https://ais-pre-we3xed4xziy6xyjwuusywk-579051113471.asia-southeast1.run.app'),
  title: 'NotaKPMB - Ultimate Archive for Computer Science Students',
  description: 'Access a meticulously curated digital repository of Computer Science notes, exercises, and past year questions. Boost your academic productivity today.',
  openGraph: {
    title: 'NotaKPMB - Ultimate Archive for Computer Science Students',
    description: 'Access a meticulously curated digital repository of Computer Science notes, exercises, and past year questions. Boost your academic productivity today.',
    type: 'website',
    url: '/',
    images: [
      {
        url: '/notakpmb-og.webp',
        width: 1200,
        height: 630,
        alt: 'Nota KPMB - The Archive',
      },
    ],
  },
  other: {
    'og:logo': 'https://ais-pre-we3xed4xziy6xyjwuusywk-579051113471.asia-southeast1.run.app/icon',
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${sfProDisplay.variable}`}>
      <body className="bg-paper text-neutral-900 font-sans antialiased selection:bg-neutral-200 flex flex-col min-h-screen md:h-dvh md:overflow-hidden" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:bg-ink focus:text-paper focus:px-4 focus:py-2 focus:text-xs focus:tracking-widest focus:uppercase focus:rounded-sm"
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
        <div id="scroll-root" className="flex-1 md:min-h-0 md:overflow-y-auto md:flex md:flex-col">
          {children}
        </div>
        <Analytics />
      </body>
    </html>
  );
}
