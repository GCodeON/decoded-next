import './globals.css'
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Decoded',
  description: 'Rap Genius 2.0',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <Suspense fallback={<div />}>
          <ClientProviders>
            {children}
          </ClientProviders>
        </Suspense>
      </body>
    </html>
  )
}
