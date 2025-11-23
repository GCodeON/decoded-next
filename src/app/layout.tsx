import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { SpotifyPlayerProvider } from '@/context/SpotifyPlayerContext'
import Dashboard from '@/components/dashboard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Decoded',
  description: 'Rap Genius 2.0',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        <SpotifyPlayerProvider>
          <Dashboard>
            {children}
          </Dashboard>
        </SpotifyPlayerProvider>
      </body>
    </html>
  )
}
