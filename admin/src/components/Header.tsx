'use client';

import Link from 'next/link';
import { LogOut, LogIn } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export function Header() {
  const { adminUser, adminProfile, loading, signOut, role } = useAdminAuth();

  const renderRoleBadge = () => {
    switch (role) {
      case 'developer':
        return (
          <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-bold text-purple-300">
            DEVELOPER
          </span>
        );
      case 'admin':
        return (
          <span className="rounded-full bg-pink-500/15 border border-pink-500/30 px-2 py-0.5 text-[10px] font-bold text-pink-300">
            ADMIN
          </span>
        );
      case 'retail':
        return (
          <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            RETAIL
          </span>
        );
      case 'staff':
        return (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            STAFF
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[#1e1f25] bg-[#121316]/95 text-slate-100 backdrop-blur-md select-none px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-white hover:text-[#f5a4c6] transition">
              Cafeteria.cev
            </span>
          </Link>
          {renderRoleBadge()}
        </div>

        <div className="flex items-center gap-3">
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
            <div className="flex items-center gap-2.5">
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