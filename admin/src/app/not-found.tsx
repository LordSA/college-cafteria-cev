'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0e12] px-4 text-stone-100">
      <div className="max-w-md w-full text-center bg-[#17181f] p-8 rounded-3xl border border-[#262833] shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#9d8bf0] to-[#f5a4c6] text-[#101114] shadow-md shadow-[#9d8bf0]/20">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-white">404 — Not Found</h1>
        <p className="mt-1 text-xs text-stone-400">The administration route requested does not exist or has been relocated.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-[#f5a4c6] px-5 py-2.5 text-xs font-bold text-[#101114] shadow-md hover:opacity-90 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

