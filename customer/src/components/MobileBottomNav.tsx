'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, UtensilsCrossed, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  const navItems = [
    {
      label: 'HOME',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'MENU',
      href: '/menu',
      icon: UtensilsCrossed,
      isActive: pathname.startsWith('/menu'),
    },
    {
      label: 'CART',
      href: '/cart',
      icon: ShoppingBag,
      isActive: pathname.startsWith('/cart'),
      badge: itemCount > 0 ? itemCount : null,
    },
    {
      label: 'PROFILE',
      href: '/profile',
      icon: User,
      isActive: pathname.startsWith('/profile') || pathname.startsWith('/login') || pathname.startsWith('/signup'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-stone-200/80 bg-white/95 px-3 py-2 backdrop-blur-lg shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          if (item.isActive) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-r from-[#ff4b4b] to-[#ff6b5a] px-4 py-1.5 text-white shadow-md shadow-red-500/25 transition active:scale-95"
              >
                <div className="relative">
                  <IconComponent className="h-5 w-5" />
                  {item.badge !== null && item.badge !== undefined && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white px-1 text-[9px] font-black text-red-600 shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[9px] font-black tracking-wider">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className="relative flex flex-col items-center justify-center px-3 py-1 text-stone-400 transition hover:text-stone-700 active:scale-95"
            >
              <div className="relative">
                <IconComponent className="h-5 w-5" />
                {item.badge !== null && item.badge !== undefined && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-black text-white shadow-sm">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 text-[9px] font-bold tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

