'use client'
import { SpotifyPlayerProvider, PlaybackStateProvider } from '@/modules/player';
import { AuthGuard } from '@/modules/auth';
import Dashboard from '@/components/Dashboard';

export default function ClientProviders({children}: {children: React.ReactNode}) {
  return (
    <SpotifyPlayerProvider>
      <Dashboard>
        <AuthGuard>
          <PlaybackStateProvider />
          {children}
        </AuthGuard>
      </Dashboard>
    </SpotifyPlayerProvider>
  )
}
