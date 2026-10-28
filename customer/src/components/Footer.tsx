import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, Clock, ShieldCheck, HelpCircle, FileText, Lock, Sparkles, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-stone-200/80 bg-gradient-to-b from-stone-50 to-white text-stone-600">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black tracking-tight text-stone-900">
                  Cafteria<span className="text-[#ff5e3a]">.cev</span>
                </span>
                <span className="text-[10px] font-bold tracking-widest uppercase text-stone-400 mt-0.5">
                  College Canteen Shop
                </span>
              </div>
            </Link>

            <p className="mt-4 max-w-sm text-xs leading-relaxed text-stone-500">
              Smart digital dining built exclusively for our college students, faculty, and staff.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
              Canteen Menu
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link href="/menu" className="hover:text-[#ff5e3a] transition">
                  Today's Full Menu
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-[#ff5e3a] transition">
                  Hot Breakfast Specials
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-[#ff5e3a] transition">
                  Executive Lunch Thali
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-[#ff5e3a] transition">
                  Snacks & Beverages
                </Link>
              </li>
              <li>
                <Link href="/cart" className="hover:text-[#ff5e3a] transition">
                  Active Food Cart
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900">
              Help & Policies
            </h3>
            <ul className="mt-4 space-y-2 text-xs">
              <li>
                <Link href="/payment-faq" className="inline-flex items-center gap-1.5 hover:text-[#ff5e3a] transition">
                  <HelpCircle className="h-3.5 w-3.5 text-stone-400" />
                  <span>Payment & Wallet FAQs</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className="inline-flex items-center gap-1.5 hover:text-[#ff5e3a] transition">
                  <FileText className="h-3.5 w-3.5 text-stone-400" />
                  <span>Terms & Conditions</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="inline-flex items-center gap-1.5 hover:text-[#ff5e3a] transition">
                  <Lock className="h-3.5 w-3.5 text-stone-400" />
                  <span>Privacy Policy</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-200/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p className="flex items-center gap-1">
            <span>&copy; {new Date().getFullYear()} Cafteria CEV</span>
          </p>

          <div className="flex items-center gap-4 text-stone-500">
            <Link href="/payment-faq" className="hover:text-[#ff5e3a] transition">Payment FAQ</Link>
            <span>&bull;</span>
            <Link href="/terms" className="hover:text-[#ff5e3a] transition">Terms & Conditions</Link>
            <span>&bull;</span>
            <Link href="/privacy" className="hover:text-[#ff5e3a] transition">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
