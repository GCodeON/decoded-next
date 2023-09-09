'use client'
 
import { usePathname } from 'next/navigation'
import Link from 'next/link'


interface NavigationProps {
   links: Navlink[];
}

interface Navlink {
    href : string;
    name : string;
}

export default function Navigation ( nav: NavigationProps ) {
  const pathname = usePathname()
 
  return (
    <div className='flex flex-col items-center'>
      {nav.links.map((link: Navlink) => {
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
    </div>
  )
}