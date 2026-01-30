import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@/modules/auth';
import useAuth from '@/modules/auth/hooks/useAuth';

const nav = [
  { name: 'Artists', href: '/artists' },
  { name: 'Songs', href: '/songs' },
];

export default function Navigation() {
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuth();

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

      {/* Admin Link */}
      {isAuthenticated && user?.role === 'admin' && (
        <div className="pt-4 border-t border-gray-700">
          <Link
            href="/admin"
            className={pathname === '/admin' ? 'text-blue-500' : 'text-white hover:text-gray-300'}
          >
            Admin Dashboard
          </Link>
        </div>
      )}

      <div className="pt-4 border-t border-gray-700">
        <User />
      </div>
    </div>
  );
}