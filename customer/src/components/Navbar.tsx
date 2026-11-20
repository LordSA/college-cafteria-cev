'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export function Navbar() {
  const pathname = usePathname();
  const { user, profile, loading, session } = useAuth();
  const { itemCount } = useCart();
  const { activeTheme } = useTheme();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      if (!session?.access_token) {
        setAvatarUrl(null);
        return;
      }

      if (profile?.avatar_key) {
        if (profile.avatar_key.startsWith('/avatars/')) {
          setAvatarUrl(profile.avatar_key);
        } else {
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
      }
    }

    loadUserData();
  }, [profile?.avatar_key, session]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Account';

  const navLinks = [
    { label: 'Home', href: '/', isActive: pathname === '/' },
    { label: 'Menu', href: '/menu', isActive: pathname.startsWith('/menu') },
  ];

  return (
    <header className="hidden md:block sticky top-0 z-50 bg-[#ff5e3a] dark:bg-[#121316]/95 text-white shadow-md backdrop-blur-md border-b border-black/5 dark:border-white/10 select-none transition-colors duration-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 p-1.5">
            <img
              src={activeTheme === 'dark' ? '/logo/logo_white.svg' : '/logo/logo_white.svg'}
              alt="Cafeteria CEV"
              className="h-8 w-8 object-contain drop-shadow-sm"
            />
            <div className="flex items-center px-1 py-0.5">
              <img
                src={activeTheme === 'dark' ? '/logo title.svg' : '/lg_t_w.svg'}
                alt="Cafeteria CEV"
                className="h-5 w-auto object-contain"
              />
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-white/95">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-xl px-3.5 py-1.5 transition ${link.isActive
                  ? 'bg-white/20 dark:bg-white/15 text-white shadow-xs'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-2xl bg-white dark:bg-[#161820] border border-transparent dark:border-white/10 px-3.5 py-2 text-stone-900 dark:text-white shadow-md hover:bg-orange-50 dark:hover:bg-white/[0.06] transition active:scale-95"
          >
            <div className="relative">
              <ShoppingBag className="h-4 w-4 text-[#ff5e3a]" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4b4b] px-1 text-[9px] font-black text-white shadow-xs">
                  {itemCount}
                </span>
              )}
            </div>
            <span className="text-xs font-black">Cart</span>
          </Link>

          {!loading && (
            <div className="flex items-center">
              {user ? (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-2xl bg-white/15 dark:bg-white/10 border border-white/20 p-1 pr-3 text-white backdrop-blur-md hover:bg-white/25 transition shadow-xs active:scale-95"
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
                  <span className="text-xs font-bold max-w-[120px] truncate">{displayName}</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-2xl bg-white px-4 py-2 text-xs font-black text-[#ff5e3a] hover:bg-orange-50 transition shadow-sm active:scale-95"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
