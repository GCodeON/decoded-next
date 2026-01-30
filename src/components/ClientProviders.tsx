'use client'
import { SpotifyPlayerProvider, PlaybackStateProvider } from '@/modules/player';
import { AuthGuard } from '@/modules/auth';
import Dashboard from '@/components/Dashboard';
import VerificationPrompt from '@/components/VerificationPrompt';

export default function ClientProviders({children}: {children: React.ReactNode}) {
  return (
    <SpotifyPlayerProvider>
      <Dashboard>
        <AuthGuard>
          <PlaybackStateProvider />
          <VerificationPrompt />
          {children}
        </AuthGuard>
      </Dashboard>
    </SpotifyPlayerProvider>
  )
}
