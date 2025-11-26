'use client'
import Link from 'next/link';
import { useState } from 'react'
import { Divide as Hamburger } from 'hamburger-react';
import Navigation from '@/components/Navigation';
import { SpotifyWebPlayer } from '@/modules/player';

export default function Dashboard({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false)

  return (
    <div className="flex h-screen w-screen overflow-hidden">

      <aside
        className={`
          fixed top-0 left-0 z-40 h-full w-64 bg-black shadow-md flex flex-col 
          p-5 transition-transform duration-300
          lg:static lg:translate-x-0 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col flex-grow">
          <Link href="/" className="mb-8">
            <h1 className="title text-xl font-bold text-white">DECODED</h1>
          </Link>

          <Navigation />
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col">
        <div className="flex items-center justify-between p-4 shadow-md lg:hidden">
          <Link href="/">
            <h1 className="title text-lg font-bold">DECODED</h1>
          </Link>
          <Hamburger toggled={isOpen} toggle={setOpen} rounded />
        </div>

        <div className="flex-1 overflow-auto p-4 pb-24">
          <div className="mx-auto w-full min-h-full flex flex-col items-center">
            <div className="my-auto">
              {children}
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 w-full lg:left-64 lg:w-[calc(100%-16rem)] z-30">
          <SpotifyWebPlayer />
        </div>
      </main>
      
    </div>
  )
}
