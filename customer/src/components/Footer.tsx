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
              Browse daily menu items, order between classes, skip the queue, and pick up freshly prepared hot food at Counter #1.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-bold text-orange-700 border border-orange-200/60">
                <Sparkles className="h-3 w-3 text-orange-500" />
                Zero Queue Pickup
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200/60">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                Verified Campus Food
              </span>
            </div>
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
              Campus Shop Info
            </h3>
            <ul className="mt-4 space-y-2 text-xs text-stone-500">
              <li className="flex items-start gap-1.5">
                <Clock className="h-3.5 w-3.5 text-[#ff5e3a] mt-0.5 flex-shrink-0" />
                <span>
                  <strong className="text-stone-800">Shop Hours:</strong><br />
                  8:00 AM &ndash; 7:00 PM
                </span>
              </li>
              <li className="pt-1">
                <strong className="text-stone-800">Pickup Counter:</strong><br />
                Counter #1 &ndash; Express Queue
              </li>
              <li className="pt-1">
                <Link href="/orders" className="hover:text-[#ff5e3a] text-stone-600 transition">
                  My Live Orders
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="hover:text-[#ff5e3a] text-stone-600 transition">
                  Testing Demo Wallet
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
              <li>
                <Link href="/profile" className="hover:text-[#ff5e3a] transition">
                  Student Account & Profile
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#ff5e3a] transition">
                  Faculty & Staff Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-stone-200/60 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p className="flex items-center gap-1">
            <span>&copy; {new Date().getFullYear()} Cafteria CEV Canteen. Made with</span>
            <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 inline" />
            <span>for our campus.</span>
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
