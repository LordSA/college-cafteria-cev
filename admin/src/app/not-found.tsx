'use client';

import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 text-[#252525]">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-3xl border border-[#EEEEEE] shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7F0] border border-[#F47721]/30 text-[#F47721] shadow-xs">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black text-[#252525]">404 — Not Found</h1>
        <p className="mt-1 text-xs text-[#666666]">The administration route requested does not exist or has been relocated.</p>
        <div className="mt-6">
          <Link
            href="/"
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-[#F47721]/20 transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
