'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  ShieldCheck,
  User,
  Mail,
  Calendar,
  Lock,
  Layers,
  Flame,
  ClipboardList,
  BarChart3,
  Loader2,
  CheckCircle2,
  Utensils,
  Users,
  ArrowRight,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { adminUser, adminProfile, isUnauthorized, loading, signOut } = useAdminAuth();

  useEffect(() => {
    if (!loading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, loading, router]);

  if (loading || !adminUser || isUnauthorized) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-slate-950">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Verifying administrator authorization...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const displayName = adminProfile?.display_name || adminUser.email?.split('@')[0] || 'Administrator';
  const email = adminUser.email || '';
  const appRole = adminProfile?.app_role || 'admin';
  const accountType = adminProfile?.account_type || 'staff';

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 text-[11px] font-medium text-emerald-400 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Authorized Administrator Session</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Operations Command Center</h1>
              <p className="mt-1 text-xs text-slate-400">Canteen kitchen display, catalog management, and dispatch control</p>
            </div>

            <button
              onClick={signOut}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg backdrop-blur-sm">
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              <span>Signed-In Administrator Identity</span>
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <User className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Admin Name</span>
                </div>
                <p className="font-semibold text-white truncate">{displayName}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Mail className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Authenticated Email</span>
                </div>
                <p className="font-semibold text-white truncate">{email}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Verified Role</span>
                </div>
                <div className="inline-flex items-center gap-1.5 font-semibold text-emerald-400 uppercase tracking-wider text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                  <span>{appRole} ({accountType})</span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Backend Verification</span>
                </div>
                <p className="font-semibold text-slate-200">REST /api/v1/admin/me</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">
              Operations Management Subsystems
            </h2>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/menu"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Menu & Catalog</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Manage food items, pricing in paise, storage uploads, and instant 86 availability toggles.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Manage Menu</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <Link
                href="/categories"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Menu Categories</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Create meal sections (Hot Breakfast, Rice Bowls, Beverages) and set sorting orders.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Manage Categories</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <Link
                href="/staff-requests"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Staff Verification</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Review faculty and staff registration requests with authoritative approval workflows.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Review Requests</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm opacity-70">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                  <Flame className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-300">Kitchen Display (KDS)</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Live order dispatch queue with prep timers and fulfillment markers.
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  <span>Phase 4</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm opacity-70">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-300">Inventory Controls</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Raw ingredients and low-stock threshold alerts to stop sold-out sales.
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  <span>Phase 4</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm opacity-70">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-300">Sales & Auditing</h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Daily turnover totals, peak rush traffic breakdown, and Razorpay auditing.
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  <span>Phase 6</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
