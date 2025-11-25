'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import User from '@/features/auth/components/User';  

const nav = [
  { name: 'Artists', href: '/artists' },
  { name: 'Songs', href: '/songs' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-4">
      {nav.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.name}
            href={link.href}
            className={isActive ? 'text-blue-500' : 'text-white hover:text-gray-300'}
          >
            {link.name}
          </Link>
        );
      })}
      <User />
    </div>
  );
}