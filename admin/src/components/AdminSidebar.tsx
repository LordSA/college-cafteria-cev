'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Timer,
  Trophy,
  Calendar,
  Bookmark,
  Layers,
  Settings,
  Wallet,
  Terminal,
  LogOut,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AdminSidebar() {
  const pathname = usePathname();
  const { signOut, isDeveloper, isAdmin, isRetail, isStaff } = useAdminAuth();

  const navLinks = [
    { label: 'Dashboard', shortLabel: 'Dashboard', href: '/', icon: Home, show: isAdmin },
    { label: 'Orders Queue', shortLabel: 'Orders', href: '/orders', icon: Timer, show: isRetail || isStaff },
    { label: 'QR Scanner', shortLabel: 'Scanner', href: '/scan', icon: Calendar, show: isStaff },
    { label: 'Pantry Inventory', shortLabel: 'Inventory', href: '/inventory', icon: Trophy, show: isRetail },
    { label: 'Menu Dishes', shortLabel: 'Menu', href: '/menu', icon: Bookmark, show: isRetail },
    { label: 'Categories', shortLabel: 'Categories', href: '/categories', icon: Layers, show: isRetail },
    { label: 'Staff Requests', shortLabel: 'Staff', href: '/staff-requests', icon: Settings, show: isAdmin },
    { label: 'Wallets & Credit', shortLabel: 'Wallets', href: '/wallets', icon: Wallet, show: isAdmin },
    { label: 'Developer', shortLabel: 'Developer', href: '/developer', icon: Terminal, show: isDeveloper },
  ];

  const visibleLinks = navLinks.filter((l) => l.show);

  return (
    <>
      <aside className="hidden md:flex w-20 bg-[#121316] border-r border-[#1e1f25] flex-col items-center justify-between py-6 px-3 flex-shrink-0 z-30 select-none min-h-screen sticky top-0 h-screen print:hidden">
        <div className="flex flex-col items-center gap-7">
          <Link href="/" className="flex flex-col items-center gap-1.5 group">
            <div className="flex h-10 w-10 items-center justify-center">
              <svg viewBox="0 0 32 32" className="h-8 w-8 text-[#9d8bf0] fill-none stroke-current stroke-2">
                <path d="M 10 10 C 6 10, 6 16, 10 16 C 14 16, 18 10, 22 10 C 26 10, 26 16, 22 16" />
                <path d="M 22 16 C 26 16, 26 22, 22 22 C 18 22, 14 16, 10 16 C 6 16, 6 22, 10 22" />
              </svg>
            </div>
            <span className="text-[8px] font-black tracking-wider text-stone-400 group-hover:text-white transition">
              Cafeteria.cev
            </span>
          </Link>

          <nav className="flex flex-col items-center gap-3">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  className={`flex items-center justify-center transition active:scale-95 ${
                    isActive
                      ? 'h-12 w-12 rounded-[20px] bg-[#f5a4c6] text-[#101114] shadow-lg shadow-[#f5a4c6]/20 font-bold'
                      : 'h-10 w-10 rounded-xl text-stone-500 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={signOut}
            title="Sign Out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#121316]/95 backdrop-blur-md border-t border-[#1e1f25] px-2 py-1.5 shadow-2xl safe-area-bottom print:hidden">
        <div className="flex items-center justify-around gap-1 overflow-x-auto no-scrollbar max-w-lg mx-auto">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center flex-1 min-w-[56px] py-1 px-1 rounded-xl transition active:scale-95 ${
                  isActive
                    ? 'text-[#f5a4c6]'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <div
                  className={`flex items-center justify-center h-8 w-8 rounded-xl transition ${
                    isActive ? 'bg-[#f5a4c6]/15' : ''
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                </div>
                <span
                  className={`text-[9px] font-medium tracking-tight mt-0.5 truncate max-w-[62px] ${
                    isActive ? 'font-bold text-[#f5a4c6]' : ''
                  }`}
                >
                  {link.shortLabel}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
