'use client';

import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();
  const { adminUser, signOut } = useAdminAuth();

  const handleSignOutAndLogin = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-[#101114]">
        <div className="w-full max-w-lg space-y-6 bg-[#17181f] p-8 rounded-3xl border border-[#22242e] text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-400">Security Clearance Required</span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">403 — Unauthorized Access</h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              Your account (<span className="text-stone-200 font-bold">{adminUser?.email || 'Logged-in user'}</span>) does not possess administrator privileges.
            </p>
          </div>

          <div className="rounded-2xl bg-[#101114] p-4 border border-[#22242e] text-left">
            <h2 className="text-xs font-bold text-stone-300 mb-1">Zero-Trust Role Enforcement</h2>
            <p className="text-[11px] leading-relaxed text-stone-400">
              A standard university customer or student login cannot access the canteen management dashboard. Administrative credentials are authenticated through server-verified role-based access control (RBAC).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="http://localhost:3000"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#282a38] bg-[#101114] px-5 py-2.5 text-xs font-bold text-stone-200 hover:bg-[#232533] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Customer Portal</span>
            </a>

            <button
              onClick={handleSignOutAndLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#f5a4c6] px-5 py-2.5 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 transition active:scale-95"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign In with Admin Account</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
