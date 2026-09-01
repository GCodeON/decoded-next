'use client'
import Link from 'next/link';
import { FaUser } from 'react-icons/fa';
import { createContext, useContext, useState, useEffect, Dispatch, SetStateAction } from 'react'
import { usePathname } from 'next/navigation';
import { Divide as Hamburger } from 'hamburger-react';
import Navigation from '@/components/Navigation';
import { SpotifyWebPlayer } from '@/modules/player';
import SpotifySearchBar from '@/components/SpotifySearchBar';
import useAuth from '@/modules/auth/hooks/useAuth';
import DecodeLogo from '@/components/DecodedLogo';
interface SidebarContextType {
  isOpen: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  closeSidebar: () => void;
}

interface CurrentTrackContextType {
  currentTrackId: string | null;
  setCurrentTrackId: Dispatch<SetStateAction<string | null>>;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
const CurrentTrackContext = createContext<CurrentTrackContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

export function useCurrentTrack() {
  const context = useContext(CurrentTrackContext);
  if (!context) {
    throw new Error('useCurrentTrack must be used within CurrentTrackProvider');
  }
  return context;
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Extract track ID from URL if on song page
  useEffect(() => {
    const songMatch = pathname.match(/^\/songs\/([^\/]+)/);
    setCurrentTrackId(songMatch ? songMatch[1] : null);
  }, [pathname]);

  const closeSidebar = () => setOpen(false);

  return (
    <CurrentTrackContext.Provider value={{ currentTrackId, setCurrentTrackId }}>
      <SidebarContext.Provider value={{ isOpen, setOpen, closeSidebar }}>
        {children}
      </SidebarContext.Provider>
    </CurrentTrackContext.Provider>
  );
}

function DashboardUI({ children }: { children: React.ReactNode }) {
  const { isOpen, setOpen } = useSidebar();
  const { currentTrackId } = useCurrentTrack();
  const { isAuthenticated, isChecking } = useAuth();
  const pathname = usePathname();
  const [isNavCompact, setIsNavCompact] = useState(false);

  // Show minimal layout for public pages when not authenticated
  const isPublicPage = ['/', '/login', '/register', '/callback', '/songs'].some(p => pathname.startsWith(p));
  const showMinimalLayout = isPublicPage && !isAuthenticated && !isChecking;
  const isSongPage = pathname.startsWith('/songs/');
  const [isPresentationMode, setIsPresentationMode] = useState(false);

  useEffect(() => {
    if (!isSongPage) {
      setIsPresentationMode(false);
      return;
    }

    const handlePresentationChange = (event: Event) => {
      const detail = (event as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') {
        setIsPresentationMode(detail.enabled);
      }
    };

    window.addEventListener('presentation-mode-change', handlePresentationChange);
    return () => {
      window.removeEventListener('presentation-mode-change', handlePresentationChange);
    };
  }, [isSongPage]);

  useEffect(() => {
    if (!isSongPage || isPresentationMode) {
      setIsNavCompact(false);
      return;
    }

    const threshold = 32;
    const onScroll = () => {
      const scrollTop = showMinimalLayout
        ? window.scrollY
        : document.getElementById('content-scroll-container')?.scrollTop ?? 0;
      setIsNavCompact(scrollTop > threshold);
    };

    onScroll();

    if (showMinimalLayout) {
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    const container = document.getElementById('content-scroll-container');
    container?.addEventListener('scroll', onScroll, { passive: true });
    return () => container?.removeEventListener('scroll', onScroll);
  }, [isSongPage, isPresentationMode, showMinimalLayout]);

  if (showMinimalLayout && !isPresentationMode) {
    return (
      <div className="flex w-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-48 bg-black shadow-md flex-col p-5">
          <div className="sticky top-0 flex flex-col flex-grow">
            <Link href="/" className="mb-8">
              <DecodeLogo />
            </Link>
            <Navigation />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-col min-h-screen bg-black w-full lg:ml-48">
          {/* Mobile Header */}
          <header
            className={`flex lg:hidden items-center justify-between px-6 border-b border-white/10 bg-black/40 transition-all duration-200 ${
              isNavCompact ? 'py-2' : 'py-4'
            }`}
          >
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <div className={`transition-transform duration-200 ${isNavCompact ? 'scale-90 origin-left' : ''}`}>
                <DecodeLogo />
              </div>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="flex items-center justify-center text-white hover:text-gray-300 transition-colors"
                aria-label="Account"
              >
                <FaUser className="text-lg" />
              </Link>
            </div>
          </header>

          {/* Desktop Search Bar */}
          <div className="hidden lg:flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
            <div className="flex-1 flex justify-center">
              <div className="w-full max-w-2xl">
                <SpotifySearchBar />
              </div>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center text-white hover:text-gray-300 transition-colors"
              aria-label="Account"
            >
              <FaUser className="text-lg" />
            </Link>
          </div>

          <main className="flex-1">
            {children}
          </main>
          <div className="w-full">
            <SpotifyWebPlayer currentTrackId={currentTrackId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-screen">

      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-48 bg-black shadow-md flex flex-col 
          p-5 transition-transform duration-300
          lg:static lg:translate-x-0 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isPresentationMode ? 'hidden lg:hidden' : ''}
        `}
      >
        <div className="sticky top-0 flex flex-col flex-grow">
          <Link href="/" className="mb-8">
            <DecodeLogo />
          </Link>

          <Navigation />
        </div>
      </aside>

      {/* Overlay when sidebar is open on mobile */}
      {isOpen && !isPresentationMode && (
        <div
          className="fixed inset-0 bg-black/75 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="relative flex flex-1 flex-col w-full h-[100dvh] lg:h-screen">
        {!isPresentationMode && (
          <div
            className={`flex items-center justify-between gap-3 shadow-md lg:hidden transition-all duration-100 ${
              isNavCompact ? 'p-1' : 'p-3'
            }`}
          >
          <Link href="/">
            <div className={`transition-transform duration-100 ${isNavCompact ? 'scale-90 origin-left' : ''}`}>
              <DecodeLogo />
            </div>
          </Link>
          <div className="flex-1" />
          <SpotifySearchBar isMobile />
          <div className="position relative z-50">
            <Hamburger toggled={isOpen} toggle={setOpen} rounded />
          </div>
          </div>
        )}

        {!isPresentationMode && (
          <div className="hidden lg:flex items-center justify-center px-6 py-4 border-b border-white/10 bg-black/40">
            <div className="w-full max-w-2xl">
              <SpotifySearchBar />
            </div>
          </div>
        )}

        <div
          className={`flex-1 grid overflow-hidden ${
            isPresentationMode ? 'grid-rows-[1fr_0px]' : 'grid-rows-[1fr_auto] lg:grid-rows-[90%_10%]'
          }`}
        >
          <div id="content-scroll-container" className="overflow-y-auto">
            <div className="mx-auto w-full flex flex-col">
              {children}
            </div>
          </div>

          <div
            className={`w-full overflow-visible transition-opacity duration-200 ${
              isPresentationMode ? 'h-0 opacity-0 pointer-events-none' : ''
            }`}
          >
            <div className="relative z-[60] overflow-visible">
              <SpotifyWebPlayer currentTrackId={currentTrackId} />
            </div>
          </div>
        </div>
      </main>
      
    </div>
  )
}

export default function Dashboard({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardUI>{children}</DashboardUI>
    </SidebarProvider>
  );
}
