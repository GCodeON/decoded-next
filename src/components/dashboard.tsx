'use client'
import Link from 'next/link'
import { useState } from 'react';

import Navigation from '@/components/nav';
import Auth from '@/components/auth';

import { Divide as Hamburger } from 'hamburger-react';


export default function Dashboard () {
  const [isOpen, setOpen] = useState(false)

  const navigationItems = [
    { 
      name: 'Artists', 
      href: '/artists' 
    },
    { 
      name: 'Albums', 
      href: '/albums' 
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
    </>
  )}