'use client';

import Link from 'next/link';
import { UtensilsCrossed, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] px-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20">
          <UtensilsCrossed className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-stone-900">Page Not Found</h1>
        <p className="mt-1 text-xs text-stone-500">The dish or page you are looking for does not exist.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
