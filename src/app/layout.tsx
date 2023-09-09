import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import Dashboard from '../components/dashboard'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Decoded',
  description: 'Rap Genius 2.0',
}

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Dashboard />
        <main className="flex min-h-screen items-center justify-center justify-items-center">
          {children}
        </main>
      </body>
    </html>
  )
}
