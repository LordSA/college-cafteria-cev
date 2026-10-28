'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Mail,
  Calendar,
  Lock,
  Layers,
  ClipboardList,
  BarChart3,
  Loader2,
  CheckCircle2,
  Utensils,
  Users,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Server,
  AlertTriangle,
  ReceiptText,
  Wallet,
  QrCode,
} from 'lucide-react';

interface OperationalStats {
  totalMenu: number;
  availableMenu: number;
  totalCategories: number;
  pendingStaff: number;
  activeOrders: number;
  lowStockCount: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';

export default function AdminDashboardPage() {
  const { adminUser, adminProfile, isUnauthorized, loading, session, signOut } = useAdminAuth();

  const [stats, setStats] = useState<OperationalStats>({
    totalMenu: 0,
    availableMenu: 0,
    totalCategories: 0,
    pendingStaff: 0,
    activeOrders: 0,
    lowStockCount: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.access_token || !adminUser || isUnauthorized) return;

    let isMounted = true;

    async function fetchStats() {
      setStatsLoading(true);
      setStatsError(null);

      try {
        const headers = {
          Authorization: `Bearer ${session?.access_token}`,
        };

        const [menuRes, catRes, staffRes, ordersRes, invRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/admin/menu`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/categories`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/staff-requests?status=pending`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/orders`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/inventory?low_stock_only=true`, { headers }).catch(() => null),
        ]);

        let menuCount = 0;
        let availableCount = 0;
        let catCount = 0;
        let pendingStaffCount = 0;
        let activeOrdersCount = 0;
        let lowStockTotal = 0;

        if (menuRes && menuRes.ok) {
          const menuData = await menuRes.json();
          if (menuData.success && Array.isArray(menuData.data)) {
            menuCount = menuData.data.length;
            availableCount = menuData.data.filter((i: { is_available: boolean; is_archived: boolean }) => i.is_available && !i.is_archived).length;
          }
        }

        if (catRes && catRes.ok) {
          const catData = await catRes.json();
          if (catData.success && Array.isArray(catData.data)) {
            catCount = catData.data.length;
          }
        }

        if (staffRes && staffRes.ok) {
          const staffData = await staffRes.json();
          if (staffData.success && Array.isArray(staffData.data)) {
            pendingStaffCount = staffData.data.length;
          }
        }

        if (ordersRes && ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.success && Array.isArray(ordersData.data)) {
            activeOrdersCount = ordersData.data.filter((o: any) =>
              ['ORDER_PLACED', 'READY_TO_PICK', 'pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.order_stage || o.order_status)
            ).length;
          }
        }

        if (invRes && invRes.ok) {
          const invData = await invRes.json();
          if (invData.success && Array.isArray(invData.data)) {
            lowStockTotal = invData.data.length;
          }
        }

        if (isMounted) {
          setStats({
            totalMenu: menuCount,
            availableMenu: availableCount,
            totalCategories: catCount,
            pendingStaff: pendingStaffCount,
            activeOrders: activeOrdersCount,
            lowStockCount: lowStockTotal,
          });
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to retrieve operational metrics';
          setStatsError(msg);
        }
      } finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [session?.access_token, adminUser, isUnauthorized]);

  if (loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-24 bg-slate-950">
          <div className="flex flex-col items-center gap-3.5 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-semibold tracking-wide uppercase text-slate-300">
              Verifying Cafteria Operations Session...
            </p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (adminUser && isUnauthorized) {
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
                Your account (<span className="text-slate-200 font-medium">{adminUser.email}</span>) does not possess administrator privileges.
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
                href={CUSTOMER_URL}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition border border-slate-700"
              >
                <span>Return to Customer Portal</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                onClick={signOut}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign Out & Switch Account</span>
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!adminUser) {
    return (
      <>
        <Header />
        <main className="flex-1 bg-slate-950 text-slate-100">
          <section className="relative overflow-hidden border-b border-slate-800/80 bg-gradient-to-b from-indigo-950/40 via-slate-950 to-slate-950 py-16 sm:py-24">
            <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Cafteria Operations Center • Phase 4 Live</span>
              </div>

              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl">
                Mission Control for <br className="hidden sm:inline" />
                <span className="text-indigo-400">Campus Canteen Operations.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Manage live dish availability, update category listings, review staff discount requests, and monitor kitchen prep queues in real time.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <Link
                  href="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-500 transition active:scale-95"
                >
                  <Lock className="h-4 w-4" />
                  <span>Sign In to Operations</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href={CUSTOMER_URL}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-6 py-3.5 text-sm font-bold text-slate-200 shadow-sm hover:bg-slate-800 hover:text-white transition active:scale-95"
                >
                  <ExternalLink className="h-4 w-4 text-indigo-400" />
                  <span>Open Customer App</span>
                </a>
              </div>

              <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-left shadow-lg backdrop-blur-sm">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">
                      Zero-Trust Role-Based Access Control
                    </h2>
                    <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                      Access is restricted to authorized college canteen operators, culinary supervisors, and faculty managers. All catalog updates, stock adjustments, and order state transitions are cryptographically authenticated via Cloudflare Edge API and Supabase Auth.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="py-16 sm:py-20">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="text-center">
                <h2 className="text-xs font-bold uppercase tracking-wider text-indigo-400">Operations Architecture</h2>
                <p className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Engineered for high-volume campus kitchens
                </p>
              </div>

              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:border-slate-700">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">Orders Queue</h3>
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Phase 4 Live
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Live kitchen ticket dispatch queue with status transitions: Queued, Confirmed, Cooking, Ready, and Completed.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:border-slate-700">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">Inventory Controls</h3>
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Phase 4 Live
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Atomic stock tracking, low-inventory threshold alerts, automated depletion on order placement, and 1-click 86 toggles.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:border-slate-700">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Utensils className="h-5 w-5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">Menu & Catalog</h3>
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Phase 3 Live
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Manage food items, configure pricing in paise, upload dish photos to secure storage, and manage categories.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:border-slate-700">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">Category Ordering</h3>
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Phase 3 Live
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Group dishes into meal sections (Hot Breakfast, Rice Bowls, Beverages) and set custom sort orders.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:border-slate-700">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-white">Staff Verification</h3>
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                        Phase 3 Live
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      Review registered campus faculty and employee accounts with authoritative one-click approval workflows.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-sm opacity-75">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-300">Sales & Auditing</h3>
                      <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                        Phase 6
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      End-of-day financial reconciliation, peak rush traffic heatmaps, and payment gateway settlement auditing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
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

            <div className="flex items-center gap-2.5">
              <a
                href={CUSTOMER_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition shadow-sm"
              >
                <ExternalLink className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Customer App</span>
              </a>

              <button
                onClick={signOut}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Active Kitchen Orders</span>
                <ReceiptText className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                ) : (
                  <>
                    <span className="text-2xl font-extrabold text-white">{stats.activeOrders}</span>
                    <span className="text-xs text-slate-400">tickets</span>
                  </>
                )}
              </div>
              <div className="mt-2 text-[11px] text-indigo-400">
                <span>Queued, cooking, or ready</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Inventory Health</span>
                <ClipboardList className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                ) : (
                  <>
                    <span className="text-2xl font-extrabold text-white">{stats.totalMenu}</span>
                    <span className="text-xs text-slate-400">items</span>
                  </>
                )}
              </div>
              <div className="mt-2 text-[11px]">
                {stats.lowStockCount > 0 ? (
                  <span className="text-amber-400 font-medium">{stats.lowStockCount} items low stock</span>
                ) : (
                  <span className="text-emerald-400">All stocks healthy</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Staff Verifications</span>
                <Users className="h-4 w-4 text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-slate-600" />
                ) : (
                  <>
                    <span className="text-2xl font-extrabold text-white">{stats.pendingStaff}</span>
                    <span className="text-xs text-slate-400">pending</span>
                  </>
                )}
              </div>
              <div className="mt-2 text-[11px]">
                {stats.pendingStaff > 0 ? (
                  <span className="text-amber-400 font-medium">Requires admin review</span>
                ) : (
                  <span className="text-emerald-400">Queue is clear</span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Edge API Runtime</span>
                <Server className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-emerald-400">Live</span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 truncate">
                <span>Phase 4 Cart & Orders Active</span>
              </div>
            </div>
          </div>

          {statsError && (
            <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>Notice: {statsError}</span>
            </div>
          )}

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
                href="/scan"
                className="group rounded-2xl border border-indigo-900/60 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 p-6 shadow-sm hover:border-indigo-500/80 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
                      <QrCode className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-emerald-950/80 border border-emerald-700/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
                      Live Dispatch
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">QR Scanner & Collection</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Scan customer pickup QR tickets with camera or token entry to verify and collect orders.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Launch Scanner</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <Link
                href="/wallets"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[11px] font-semibold text-slate-300">
                      Demo Credits
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Testing Wallets</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Allocate demo balances to student/staff profiles, audit transactions, and correct ledgers.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Manage Wallets</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <Link
                href="/orders"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                      {stats.activeOrders} active
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Orders & Kitchen Queue</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Process live canteen orders, update preparation stages, and dispatch meals at the counter.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Manage Orders</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <Link
                href="/inventory"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    {stats.lowStockCount > 0 ? (
                      <span className="rounded-full bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 animate-pulse">
                        {stats.lowStockCount} low stock
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        Healthy
                      </span>
                    )}
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Inventory Controls</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Adjust ingredient counts, configure threshold warnings, and toggle 86 item availability.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800/60 text-xs font-semibold text-indigo-400">
                  <span>Manage Inventory</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              <Link
                href="/menu"
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm hover:border-indigo-500/50 hover:bg-slate-900 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Utensils className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                      {stats.totalMenu} items
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">Menu & Catalog</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    Add food items, update pricing in paise, and upload dish pictures to cloud storage.
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
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Layers className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-indigo-950/60 border border-indigo-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
                      {stats.totalCategories} sections
                    </span>
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
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Users className="h-5 w-5" />
                    </div>
                    {stats.pendingStaff > 0 ? (
                      <span className="rounded-full bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 animate-pulse">
                        {stats.pendingStaff} pending
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-400">
                        Clear
                      </span>
                    )}
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
