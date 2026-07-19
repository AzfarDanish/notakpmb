import './globals.css'
import { Playfair_Display, Inter } from 'next/font/google'

const serif = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'NotaKPMB',
  description: 'Academic archive',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="bg-background text-primary font-sans antialiased">
        {children}
      </body>
    </html>
  )
}