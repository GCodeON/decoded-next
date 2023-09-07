'use client'
 
import { usePathname } from 'next/navigation'
import Link from 'next/link'


interface NavigationProps {
   links: [];
}

interface Navlink {
    href : string;
    name : string;
}

 
export default function Navigation ( nav: NavigationProps ) {
  const pathname = usePathname()
 
  return (
    <>
      {nav.links.map((link: Navlink) => {
        const isActive = pathname === link.href
 
        return (
          <Link
            className={isActive ? 'text-blue' : 'text-black'}
            href={link.href}
            key={link.name}
          >
            {link.name}
          </Link>
        )
      })}
    </>
  )
}