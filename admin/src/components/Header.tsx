'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  LogOut,
  LogIn,
  Timer,
  Trophy,
  Calendar,
  Bookmark,
  Layers,
  Settings,
  Wallet,
  Home,
} from 'lucide-react';
import { ApiHealthBadge } from './ApiHealthBadge';
import { useAdminAuth } from '../context/AdminAuthContext';

export function Header() {
  const pathname = usePathname();
  const { adminUser, adminProfile, loading, signOut } = useAdminAuth();

  const navLinks = [
    { label: 'Dashboard', href: '/', icon: Home, isActive: pathname === '/' },
    { label: 'Orders', href: '/orders', icon: Timer, isActive: pathname.startsWith('/orders') },
    { label: 'Inventory', href: '/inventory', icon: Trophy, isActive: pathname.startsWith('/inventory') },
    { label: 'Scanner', href: '/scan', icon: Calendar, isActive: pathname.startsWith('/scan') },
    { label: 'Menu', href: '/menu', icon: Bookmark, isActive: pathname.startsWith('/menu') },
    { label: 'Categories', href: '/categories', icon: Layers, isActive: pathname.startsWith('/categories') },
    { label: 'Wallets', href: '/wallets', icon: Wallet, isActive: pathname.startsWith('/wallets') },
    { label: 'Staff', href: '/staff-requests', icon: Settings, isActive: pathname.startsWith('/staff-requests') },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#1e1f25] bg-[#121316]/95 text-slate-100 backdrop-blur-md select-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#9d8bf0] to-[#f5a4c6] text-[#101114] shadow-md shadow-[#9d8bf0]/20">
              <svg viewBox="0 0 32 32" className="h-5 w-5 fill-none stroke-current stroke-2">
                <path d="M 10 10 C 6 10, 6 16, 10 16 C 14 16, 18 10, 22 10 C 26 10, 26 16, 22 16" />
                <path d="M 22 16 C 26 16, 26 22, 22 22 C 18 22, 14 16, 10 16 C 6 16, 6 22, 10 22" />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-black tracking-tight text-white group-hover:text-[#f5a4c6] transition">
                ALEXATEL
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-stone-400">
                Cafteria Ops
              </span>
            </div>
          </Link>

          {!loading && adminUser && adminProfile?.app_role === 'admin' && (
            <nav className="hidden lg:flex items-center gap-1.5 text-xs font-semibold">
              {navLinks.map((link) => {
                const IconComp = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition ${
                      link.isActive
                        ? 'bg-[#f5a4c6] text-[#101114] font-bold shadow-sm shadow-[#f5a4c6]/20'
                        : 'text-stone-400 hover:bg-white/[0.05] hover:text-white'
                    }`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <ApiHealthBadge />

          {!loading && !adminUser && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a4c6] px-4 py-1.5 text-xs font-bold text-[#101114] shadow-sm hover:opacity-90 transition active:scale-95"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {!loading && adminUser && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-[#17181f] border border-[#23242e] p-1 pr-3">
                <div className="h-6 w-6 rounded-full overflow-hidden border border-white/10 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                    alt="Admin user avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-xs font-bold text-stone-200 hidden sm:inline max-w-[120px] truncate">
                  {adminProfile?.display_name || adminUser.email?.split('@')[0]}
                </span>
              </div>

              <button
                onClick={signOut}
                title="Sign Out"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#17181f] border border-[#23242e] text-stone-400 hover:text-white hover:bg-rose-500/20 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
