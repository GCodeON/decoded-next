'use client'
import Link from 'next/link'
import { useState } from 'react';

import Navigation from '@/components/nav';
import Auth from '@/components/auth';
import Player from '@/components/player'

import { Divide as Hamburger } from 'hamburger-react';


export default function Dashboard ({children}: {children: React.ReactNode}) {
  const [isOpen, setOpen] = useState(false)

  const navigationItems = [
    { 
      name: 'Artists', 
      href: '/artists' 
    },
    { 
      name: 'Songs', 
      href: '/songs' 
    }
  ];

  return (
    <>
      <div className="flex w-screen flex-row items-center justify-between p-5">
        <Link href="/">
          <h1 className="title">DECODED</h1>
        </Link>
        <Auth />
        <Hamburger toggled={isOpen} toggle={setOpen} rounded />
      </div>
      { isOpen && (
        <div>
          <Navigation links={navigationItems}/>
        </div>
      )}
      {children}
      <Player />
    </>
  )}