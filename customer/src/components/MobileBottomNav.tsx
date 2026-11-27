'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useStoreStatus } from '../context/StoreStatusContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { itemCount } = useCart();
  const { isOpen } = useStoreStatus();

  if (!user || !isOpen || pathname === '/closed' || pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname === '/verify-email') {
    return null;
  }

  const navItems = [
    { label: 'Home', href: '/', icon: Home, isActive: pathname === '/' },
    { label: 'Menu', href: '/menu', icon: UtensilsCrossed, isActive: pathname.startsWith('/menu') },
    { label: 'Cart', href: '/cart', icon: ShoppingBag, isActive: pathname === '/cart', badge: itemCount },
    { label: 'Profile', href: '/profile', icon: User, isActive: pathname.startsWith('/profile') },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 z-50 max-w-md mx-auto pointer-events-none safe-area-bottom">
      <nav className="pointer-events-auto rounded-[28px] bg-white/85 dark:bg-[#161820]/85 backdrop-blur-xl border border-black/[0.06] dark:border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] px-2 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 py-1.5 px-2 rounded-2xl transition-all duration-200 active:scale-90 ${
                  isActive
                    ? 'text-[#ff5e3a] font-bold bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white font-medium'
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isActive ? 'scale-110 text-[#ff5e3a]' : 'text-stone-500 dark:text-stone-400'
                    }`}
                  />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4b4b] px-1 font-mono text-[9px] font-black text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold text-[#ff5e3a]' : ''}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
