'use client';

import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { adminUser, signOut } = useAdminAuth();
  const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL;
  const handleSignOutAndLogin = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <main className="flex-1 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-lg space-y-6 bg-white p-8 rounded-3xl border border-[#EEEEEE] text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#D94A43] border border-red-200 shadow-xs">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525]">403 — Unauthorized Access</h1>
            <p className="mt-2 text-xs leading-relaxed text-[#666666]">
              Your account (<span className="text-[#252525] font-bold">{adminUser?.email || 'Logged-in user'}</span>) does not possess administrator privileges.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={CUSTOMER_URL}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-5 py-2.5 text-xs font-bold text-[#252525] hover:text-[#F47721] transition active:scale-95"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Customer </span>
            </a>

            <button
              onClick={handleSignOutAndLogin}
              className="w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#F47721]/20 transition active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign In with Another Account</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
