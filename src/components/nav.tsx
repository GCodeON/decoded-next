'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

import Auth from '@/components/auth'

const nav = [
  { 
    name: 'Artists', 
    href: '/artists' 
  },
  { 
    name: 'Songs', 
    href: '/songs' 
  }
];
interface Navlink {
    href : string;
    name : string;
}

export default function Navigation () {
  const pathname = usePathname()
 
  return (
    <div className='flex flex-col gap-4'>
      {nav.map((link: Navlink) => {
        const isActive = pathname === link.href
        return (
          <Link
            className={isActive ? 'text-blue' : 'text-white'}
            href={link.href}
            key={link.name}
          >
            {link.name}
          </Link>
        )
      })}
      <Auth />
    </div>
  )
}