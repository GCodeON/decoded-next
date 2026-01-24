'use client'
import Link from 'next/link';
import { createContext, useContext, useState, useEffect, Dispatch, SetStateAction } from 'react'
import { usePathname } from 'next/navigation';
import { Divide as Hamburger } from 'hamburger-react';
import Navigation from '@/components/Navigation';
import { SpotifyWebPlayer } from '@/modules/player';

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
            <h1 className="title text-md md:text-lg font-bold text-white">DECODED</h1>
          </Link>

          <Navigation />
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col w-full h-[100dvh] lg:h-screen">
        <div className="flex items-center justify-between p-2 shadow-md lg:hidden">
          <Link href="/">
            <h1 className="title text-md md:text-lg font-bold">DECODED</h1>
          </Link>
          <Hamburger toggled={isOpen} toggle={setOpen} rounded />
        </div>

        <div className="flex-1 grid grid-rows-[1fr_auto] lg:grid-rows-[90%_10%] overflow-hidden">
          <div id="content-scroll-container" className="overflow-y-auto">
            <div className="mx-auto w-full flex flex-col">
              {children}
            </div>
          </div>

          <div className="w-full">
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
