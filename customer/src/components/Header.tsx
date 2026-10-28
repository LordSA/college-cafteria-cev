'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, LogIn, UserPlus, BookOpen, ShoppingBag, ReceiptText, Wallet, Grid } from 'lucide-react';
import { ApiHealthBadge } from './ApiHealthBadge';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export function Header() {
  const { user, profile, loading, session } = useAuth();
  const { itemCount, subtotal } = useCart();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    async function loadWallet() {
      if (!session?.access_token) {
        setWalletBalance(null);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/wallet/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setWalletBalance(json.data.balance);
          }
        }
      } catch {}
    }

    loadWallet();
  }, [session]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 rounded-xl p-1 hover:bg-white/10 transition">
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-black tracking-tight text-white">
                Cafteria<span className="text-amber-200">.cev</span>
              </span>
              <span className="text-[10px] tracking-wider text-orange-100 uppercase font-bold">
                Cafteria CEV
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-bold text-white/90">
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 hover:bg-white/15 hover:text-white transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-200" />
              <span>Today's Menu</span>
            </Link>
            <Link
              href="/categories"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 hover:bg-white/15 hover:text-white transition"
            >
              <Grid className="h-3.5 w-3.5 text-amber-200" />
              <span>Categories</span>
            </Link>
            {user && (
              <>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 hover:bg-white/15 hover:text-white transition"
                >
                  <ReceiptText className="h-3.5 w-3.5 text-amber-200" />
                  <span>My Orders</span>
                </Link>
                <Link
                  href="/wallet"
                  className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 hover:bg-white/15 hover:text-white transition"
                >
                  <Wallet className="h-3.5 w-3.5 text-amber-200" />
                  <span>Wallet</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && walletBalance !== null && (
            <Link
              href="/wallet"
              title="Testing Wallet (Demo Credits)"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25 transition shadow-xs"
            >
              <Wallet className="h-3.5 w-3.5 text-amber-200" />
              <span className="font-mono tabular-nums">₹{(walletBalance / 100).toFixed(0)}</span>
            </Link>
          )}

          <Link
            href="/cart"
            className="flex items-center gap-2 rounded-2xl bg-white px-3.5 py-1.5 text-stone-900 shadow-md hover:bg-orange-50 transition"
          >
            <div className="relative">
              <ShoppingBag className="h-4 w-4 text-[#ff5e3a]" />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#ff4b4b] px-1 text-[9px] font-black text-white">
                  {itemCount}
                </span>
              )}
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black text-stone-900">Cart</span>
              <span className="font-mono text-[10px] font-bold text-[#ff5e3a] tabular-nums">
                ₹{(subtotal / 100).toFixed(0)}
              </span>
            </div>
          </Link>

          <div className="hidden sm:block">
            <ApiHealthBadge />
          </div>

          {!loading && (
            <div className="flex items-center gap-2">
              {user ? (
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/25 transition shadow-xs"
                >
                  <User className="h-3.5 w-3.5 text-amber-200" />
                  <span className="max-w-[110px] truncate">{displayName}</span>
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold text-white hover:bg-white/15 transition"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign In</span>
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1 rounded-xl bg-white px-3.5 py-1.5 text-xs font-black text-[#ff5e3a] shadow-md hover:bg-orange-50 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Sign Up</span>
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
