'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, ShoppingBag, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, loading, session } = useAuth();
  const { itemCount } = useCart();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    async function loadUserData() {
      if (!session?.access_token) {
        setAvatarUrl(null);
        setWalletBalance(null);
        return;
      }

      if (profile?.avatar_key) {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/uploads/avatar`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          if (res.ok) {
            const body = await res.json();
            if (body.success && body.data?.display_url) {
              setAvatarUrl(body.data.display_url);
            }
          }
        } catch {
          setAvatarUrl(null);
        }
      }

      try {
        const walletRes = await fetch(`${API_BASE_URL}/api/v1/wallet/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (walletRes.ok) {
          const wBody = await walletRes.json();
          if (wBody.success && wBody.data) {
            setWalletBalance(wBody.data.balance);
          }
        }
      } catch { }
    }

    loadUserData();
  }, [profile?.avatar_key, session]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Account';

  const navLinks = [
    { label: 'Home', href: '/', isActive: pathname === '/' },
    { label: 'Menu', href: '/menu', isActive: pathname.startsWith('/menu') },
    { label: 'Categories', href: '/categories', isActive: pathname.startsWith('/categories') },
  ];

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] text-white shadow-md select-none">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 rounded-xl p-1 hover:bg-white/10 transition active:scale-95">
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-black tracking-tight text-white">
                Cafteria<span className="text-amber-200">.cev</span>
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-white/95">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3.5 py-1.5 transition ${link.isActive
                  ? 'bg-white/20 text-white shadow-xs'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <Link
              href="/wallet"
              title={walletBalance !== null ? `Wallet Balance: ₹${(walletBalance / 100).toFixed(0)}` : 'Testing Wallet'}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 border border-white/20 text-white hover:bg-white/25 transition shadow-xs active:scale-95"
            >
              <Wallet className="h-4 w-4" />
            </Link>
          )}

          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-2 text-stone-900 shadow-md hover:bg-orange-50 transition active:scale-95"
          >
            <div className="relative">
              <ShoppingBag className="h-4 w-4 text-[#ff5e3a]" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4b4b] px-1 text-[9px] font-black text-white shadow-xs">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="text-xs font-black text-stone-900">Cart</span>
          </Link>

          {!loading && (
            <div className="flex items-center">
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-2xl bg-white/15 border border-white/20 p-1 pr-3 text-white backdrop-blur-md hover:bg-white/25 transition shadow-xs active:scale-95"
                >
                  <div className="h-7 w-7 rounded-full overflow-hidden bg-white/25 border border-white/40 flex items-center justify-center shadow-xs">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-white">
                        {(displayName || 'C').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-white max-w-[100px] truncate hidden sm:inline">
                    {displayName}
                  </span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-3.5 py-2 text-xs font-black text-[#ff5e3a] shadow-md hover:bg-orange-50 transition active:scale-95"
                >
                  <User className="h-3.5 w-3.5" />
                  <span>Login</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export { Navbar as Header };

