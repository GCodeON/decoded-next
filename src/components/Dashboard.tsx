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

interface SidebarContextType {
  isOpen: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  closeSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}

function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const closeSidebar = () => setOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, setOpen, closeSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

function DashboardUI({ children }: { children: React.ReactNode }) {
  const { isOpen, setOpen } = useSidebar();
  const { isAuthenticated, isChecking } = useAuth();
  const pathname = usePathname();

  // Show minimal layout for public pages when not authenticated
  const isPublicPage = ['/', '/login', '/register', '/callback', '/songs'].some(p => pathname.startsWith(p));
  const showMinimalLayout = isPublicPage && !isAuthenticated && !isChecking;

  if (showMinimalLayout) {
    return (
      <div className="flex w-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex fixed top-0 left-0 z-40 h-full w-48 bg-black shadow-md flex-col p-5">
          <div className="sticky top-0 flex flex-col flex-grow">
            <Link href="/" className="mb-8">
              <h1 className="title text-md md:text-lg font-bold text-white">DECODED</h1>
            </Link>
            <Navigation />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex flex-col min-h-screen bg-black w-full lg:ml-48">
          {/* Mobile Header */}
          <header className="flex lg:hidden items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <h1 className="title text-lg md:text-xl font-bold text-white">DECODED</h1>
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
            <SpotifyWebPlayer />
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
        `}
      >
        <div className="sticky top-0 flex flex-col flex-grow">
          <Link href="/" className="mb-8">
            <h1 className="title text-md md:text-lg font-bold text-white">
              DECODED
            </h1>
          </Link>

          <Navigation />
        </div>
      </aside>

      {/* Overlay when sidebar is open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/75 z-30 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <main className="relative flex flex-1 flex-col w-full h-[100dvh] lg:h-screen">
        <div className="flex items-center justify-between gap-3 p-3 shadow-md lg:hidden">
          <Link href="/">
            <h1 className="title text-sm md:text-md font-bold">
              DECODED
            </h1>
          </Link>
          <div className="flex-1" />
          <SpotifySearchBar isMobile />
          <div className="position relative z-50">
            <Hamburger toggled={isOpen} toggle={setOpen} rounded />
          </div>
        </div>

        <div className="hidden lg:flex items-center justify-center px-6 py-4 border-b border-white/10 bg-black/40">
          <div className="w-full max-w-2xl">
            <SpotifySearchBar />
          </div>
        </div>

        <div className="flex-1 grid grid-rows-[1fr_auto] lg:grid-rows-[90%_10%] overflow-hidden">
          <div id="content-scroll-container" className="overflow-y-auto">
            <div className="mx-auto w-full flex flex-col">
              {children}
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <SpotifyWebPlayer />
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
