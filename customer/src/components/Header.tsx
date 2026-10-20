'use client';

import Link from 'next/link';
import { UtensilsCrossed, User, LogIn, UserPlus, BookOpen } from 'lucide-react';
import { ApiHealthBadge } from './ApiHealthBadge';
import { useAuth } from '../context/AuthContext';

export function Header() {
  const { user, profile, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-stone-50/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm shadow-amber-500/30">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-stone-900">Cafteria</span>
              <span className="ml-2 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                Customer
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center gap-4 text-xs font-semibold text-stone-600">
            <Link href="/menu" className="inline-flex items-center gap-1.5 hover:text-amber-700 transition">
              <BookOpen className="h-3.5 w-3.5 text-amber-600" />
              <span>Menu</span>
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/menu"
            className="sm:hidden inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-stone-700 hover:text-amber-700"
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-600" />
            <span>Menu</span>
          </Link>

          <ApiHealthBadge />

          {!loading && (
            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 hover:text-amber-700 transition"
                >
                  <User className="h-3.5 w-3.5 text-amber-600" />
                  <span className="max-w-[120px] truncate">
                    {profile?.display_name || user.email?.split('@')[0] || 'Account'}
                  </span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-700 hover:text-amber-700 transition"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
