'use client';

import Link from 'next/link';
import { Shield, User, LogOut } from 'lucide-react';
import { ApiHealthBadge } from './ApiHealthBadge';
import { useAdminAuth } from '../context/AdminAuthContext';

export function Header() {
  const { adminUser, adminProfile, loading, signOut } = useAdminAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 text-slate-100 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white">Cafteria Admin</span>
            <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-700">
              Operations Portal
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ApiHealthBadge />

          {!loading && adminUser && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                <User className="h-3.5 w-3.5 text-indigo-400" />
                <span className="max-w-[130px] truncate">
                  {adminProfile?.display_name || adminUser.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={signOut}
                title="Sign Out"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
