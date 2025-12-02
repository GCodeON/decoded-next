import './globals.css'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Dashboard from '@/components/Dashboard';
import { SpotifyPlayerProvider, PlaybackStateProvider } from '@/modules/player';
import { AuthGuard } from '@/modules/auth';

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
            <AuthGuard>
              <PlaybackStateProvider />
              {children}
            </AuthGuard>
          </Dashboard>
        </SpotifyPlayerProvider>
      </body>
    </html>
  )
}
