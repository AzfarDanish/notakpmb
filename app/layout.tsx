import type {Metadata} from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
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
        alt: 'NotaKPMB - The Archive',
      },
    ],
  },
  other: {
    'og:logo': 'https://ais-pre-we3xed4xziy6xyjwuusywk-579051113471.asia-southeast1.run.app/icon',
  }
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-[#F9F8F6] text-neutral-900 font-sans antialiased selection:bg-neutral-200 flex flex-col min-h-screen" suppressHydrationWarning>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-WJG1B5VZDS" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-WJG1B5VZDS');
          `}
        </Script>
        <div className="flex-1">
          {children}
        </div>
        <footer className="p-6 md:px-12 text-[10px] tracking-widest text-neutral-400 uppercase font-medium">
          Created by Azfar Danish
        </footer>
      </body>
    </html>
  );
}
