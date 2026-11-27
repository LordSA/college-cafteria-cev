'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MoonStar, Clock, RefreshCw, HelpCircle, UtensilsCrossed } from 'lucide-react';
import { useStoreStatus } from '../context/StoreStatusContext';

export function CanteenClosedView() {
  const { closedMessage, refreshStatus } = useStoreStatus();
  const [checking, setChecking] = useState(false);

  const handleManualCheck = async () => {
    setChecking(true);
    await refreshStatus();
    setTimeout(() => setChecking(false), 600);
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0d0e12] text-stone-900 dark:text-stone-100 flex flex-col justify-between p-4 sm:p-6 select-none transition-colors duration-200">
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-4">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-[#ff5e3a] to-[#ffa040] flex items-center justify-center text-white shadow-md shadow-[#ff5e3a]/25">
            <UtensilsCrossed className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight text-stone-900 dark:text-white">
              Cafeteria<span className="text-[#ff5e3a]">.cev</span>
            </h1>
            <p className="text-[10px] text-stone-500 font-medium tracking-wide">
              College of Engineering Vadakara
            </p>
          </div>
        </div>

        <Link
          href="/support"
          className="inline-flex items-center gap-1 rounded-full border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161820] px-3 py-1 text-[11px] font-bold text-stone-600 dark:text-stone-300 hover:text-[#ff5e3a] transition"
        >
          <HelpCircle className="h-3 w-3" />
          <span>Support</span>
        </Link>
      </header>

      <main className="max-w-md w-full mx-auto my-auto py-8">
        <div className="relative rounded-3xl bg-white dark:bg-[#161820] border border-black/[0.06] dark:border-white/10 p-7 sm:p-8 shadow-xl dark:shadow-2xl text-center overflow-hidden">
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-[#ffa040]/10 dark:bg-[#ffa040]/15 blur-3xl pointer-events-none" />

          <div className="relative mx-auto mb-5 h-20 w-20 rounded-3xl bg-gradient-to-tr from-[#FFF7F0] via-orange-50 to-[#ff5e3a]/10 dark:from-[#221c1a] dark:to-[#ff5e3a]/20 border border-[#ff5e3a]/20 flex items-center justify-center shadow-inner">
            <div className="relative">
              <MoonStar className="h-10 w-10 text-[#ff5e3a] animate-pulse" />
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#ff5e3a] ring-4 ring-white dark:ring-[#161820]" />
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 px-3 py-1 text-[11px] font-black tracking-wider text-rose-700 dark:text-rose-300 uppercase shadow-xs mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-600 animate-ping" />
            Currently Closed
          </span>

          <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight mb-2">
            We Are Closed
          </h2>

          <p className="text-xs text-stone-600 dark:text-stone-300 font-medium leading-relaxed max-w-xs mx-auto mb-6">
            {closedMessage || 'Our kitchen is currently closed or resting. Ordering is temporarily paused until our next service window.'}
          </p>

          <div className="rounded-2xl bg-stone-50 dark:bg-white/[0.04] border border-stone-200/70 dark:border-white/[0.06] p-4 text-left space-y-2 mb-6">
            <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 text-xs font-bold">
              <Clock className="h-4 w-4 text-[#ff5e3a] shrink-0" />
              <span>Campus Operating Hours</span>
            </div>
            <div className="text-[11px] text-stone-500 dark:text-stone-400 pl-6 space-y-0.5">
              <div className="flex justify-between">
                <span>Monday – Saturday:</span>
                <span className="font-semibold text-stone-700 dark:text-stone-200">8:00 AM – 7:00 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday & Holidays:</span>
                <span className="font-semibold text-stone-700 dark:text-stone-200">Special Service / Closed</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ff5e3a] to-[#ffa040] hover:from-[#ff4b4b] hover:to-[#ff7844] py-3 px-5 text-xs font-black text-white shadow-lg shadow-[#ff5e3a]/25 active:scale-95 disabled:opacity-60 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status...' : 'Check If Open'}</span>
          </button>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center py-4">
        <p className="text-[11px] text-stone-400 dark:text-stone-500 font-medium">
          Designed and Developed by <span className="font-bold text-stone-600 dark:text-stone-300">IEDC CEV</span>
        </p>
        <p className="text-[10px] text-stone-400/80 dark:text-stone-600 mt-0.5">
          CAFETERIA · College of Engineering Vadakara
        </p>
      </footer>
    </div>
  );
}
