'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  Home,
  BookOpen,
  Grid,
  ReceiptText,
  Wallet,
  User,
  LogIn,
  LogOut,
  ChevronRight,
  UtensilsCrossed,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidebarDrawer({ isOpen, onClose }: SidebarDrawerProps) {
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Kaliraj';

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-full w-full max-w-xs flex-col bg-white shadow-2xl transition-transform">
        <div className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 font-black text-white shadow-inner text-lg">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-orange-100">Welcome,</p>
                <h3 className="text-base font-black tracking-tight text-white">
                  Hi {displayName}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-xs text-orange-100 font-semibold">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            <span>Cafteria CEV</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1">
            <Link
              href="/"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
            >
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-[#ff5e3a]" />
                <span>Home</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            <Link
              href="/menu"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-[#ff5e3a]" />
                <span>Today's Menu</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            <Link
              href="/categories"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
            >
              <div className="flex items-center gap-3">
                <Grid className="h-4 w-4 text-[#ff5e3a]" />
                <span>Categories</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            <Link
              href="/orders"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
            >
              <div className="flex items-center gap-3">
                <ReceiptText className="h-4 w-4 text-[#ff5e3a]" />
                <span>My Orders</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>

            <Link
              href="/wallet"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
            >
              <div className="flex items-center gap-3">
                <Wallet className="h-4 w-4 text-[#ff5e3a]" />
                <span>Wallet</span>
              </div>
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                Demo
              </span>
            </Link>

            <Link
              href="/profile"
              onClick={onClose}
              className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
            >
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-[#ff5e3a]" />
                <span>Profile</span>
              </div>
              <ChevronRight className="h-4 w-4 text-stone-300" />
            </Link>
          </div>
        </div>

        <div className="border-t border-stone-200 p-4">
          {user ? (
            <button
              onClick={async () => {
                await signOut();
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In / Register</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
