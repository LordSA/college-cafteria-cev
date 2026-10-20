'use client';

import React from 'react';
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
      <main className="flex-1 flex items-center justify-center py-20 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="w-full max-w-lg space-y-6 bg-slate-900 p-8 rounded-2xl border border-rose-500/30 text-center shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">403 — Unauthorized Access</h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Your account (<span className="text-slate-200 font-medium">{adminUser?.email || 'Logged-in user'}</span>) does not possess administrator privileges.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 text-left">
            <h2 className="text-xs font-semibold text-slate-300 mb-1">Zero-Trust Role Enforcement</h2>
            <p className="text-[11px] leading-relaxed text-slate-400">
              A standard university customer or student login cannot access the canteen management dashboard. Administrative credentials are authenticated through server-verified role-based access control (RBAC).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="http://localhost:3000"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition border border-slate-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to Customer Portal</span>
            </a>

            <button
              onClick={handleSignOutAndLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
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
