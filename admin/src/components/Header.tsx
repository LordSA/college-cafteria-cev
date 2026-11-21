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
          <span className="rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
            DEVELOPER
          </span>
        );
      case 'admin':
        return (
          <span className="rounded-full bg-[#FFF7F0] border border-[#F47721]/30 px-2 py-0.5 text-[10px] font-bold text-[#F47721]">
            ADMIN
          </span>
        );
      case 'retail':
        return (
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            RETAIL
          </span>
        );
      case 'staff':
        return (
          <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-[#269B62]">
            STAFF
          </span>
        );
      case 'printer':
        return (
          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
            PRINTER
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[#EEEEEE] bg-white/95 text-[#252525] backdrop-blur-md select-none px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-[#252525] hover:text-[#F47721] transition">
              Cafeteria.cev
            </span>
          </Link>
          {renderRoleBadge()}
        </div>

        <div className="flex items-center gap-3">
          {!loading && !adminUser && (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition active:scale-95"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          {!loading && adminUser && (
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 rounded-full bg-[#FAFAFA] border border-[#EEEEEE] p-1 pr-3">
                <div className="h-6 w-6 rounded-full overflow-hidden border border-[#EEEEEE] shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                    alt="Admin user avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="text-xs font-bold text-[#252525] hidden sm:inline max-w-[120px] truncate">
                  {adminProfile?.display_name || adminUser.email?.split('@')[0]}
                </span>
              </div>

              <button
                onClick={signOut}
                title="Sign Out"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#EEEEEE] text-[#666666] hover:text-[#D94A43] hover:bg-red-50 transition"
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
