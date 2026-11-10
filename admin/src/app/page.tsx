'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/AdminSidebar';
import {
  ShieldAlert,
  Lock,
  Loader2,
  Check,
  Search,
  LogOut,
  Timer,
  Trophy,
  Bookmark,
  Settings,
  Sparkles,
  ExternalLink,
  Download,
  AlertTriangle,
  QrCode,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface OperationalStats {
  totalMenu: number;
  availableMenu: number;
  totalCategories: number;
  pendingStaff: number;
  activeOrders: number;
  lowStockCount: number;
}

interface FinancialStats {
  totalRevenuePaise: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  lowStockCount: number;
  pendingStaffCount: number;
  paymentBreakdown: {
    razorpayPaise: number;
    walletPaise: number;
    payLaterPaise: number;
  };
}

interface DashboardOrder {
  id: string;
  order_number: string;
  order_stage?: 'ORDER_PLACED' | 'COLLECTED';
  order_status: string;
  payment_status: string;
  total: number;
  created_at: string;
  customer_name?: string;
  customer_account_type?: string;
  qr_verification_token?: string | null;
  items?: Array<{ id: string; item_name: string; quantity: number }>;
}

interface DashboardInventoryItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
}

interface DashboardStaffRequest {
  id: string;
  display_name: string;
  email: string;
  teacher_id?: string | null;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
const CUSTOMER_URL = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';

export default function AdminDashboardPage() {
  const { adminUser, adminProfile, isUnauthorized, loading, session, signOut, role } = useAdminAuth();

  const [stats, setStats] = useState<OperationalStats>({
    totalMenu: 0,
    availableMenu: 0,
    totalCategories: 0,
    pendingStaff: 0,
    activeOrders: 0,
    lowStockCount: 0,
  });
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<DashboardInventoryItem[]>([]);
  const [pendingStaffList, setPendingStaffList] = useState<DashboardStaffRequest[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  useEffect(() => {
    if (!session?.access_token || !adminUser || isUnauthorized) return;

    let isMounted = true;

    async function fetchStats() {
      setStatsLoading(true);

      try {
        const headers = {
          Authorization: `Bearer ${session?.access_token}`,
        };

        const [menuRes, catRes, staffRes, ordersRes, invRes, finRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/admin/menu`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/categories`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/staff-requests?status=pending`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/orders`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/inventory?low_stock_only=true`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/admin/reports/stats?range=${timeframe}`, { headers }).catch(() => null),
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
            if (isMounted) {
              setPendingStaffList(staffData.data.slice(0, 3));
            }
          }
        }

        if (ordersRes && ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.success && Array.isArray(ordersData.data)) {
            const rawOrders = ordersData.data;
            activeOrdersCount = rawOrders.filter((o: any) =>
              ['ORDER_PLACED', 'pending', 'confirmed', 'preparing'].includes(o.order_stage || o.order_status)
            ).length;
            if (isMounted) {
              setRecentOrders(rawOrders.slice(0, 5));
            }
          }
        }

        if (invRes && invRes.ok) {
          const invData = await invRes.json();
          if (invData.success && Array.isArray(invData.data)) {
            lowStockTotal = invData.data.length;
            if (isMounted) {
              setLowStockItems(invData.data.slice(0, 4));
            }
          }
        }

        if (finRes && finRes.ok) {
          const finData = await finRes.json();
          if (finData.success && finData.data && isMounted) {
            setFinancialStats(finData.data);
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
      } catch {} finally {
        if (isMounted) {
          setStatsLoading(false);
        }
      }
    }

    fetchStats();

    return () => {
      isMounted = false;
    };
  }, [session?.access_token, adminUser, isUnauthorized, timeframe]);

  const handleExportExcel = async () => {
    if (!session?.access_token) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/export?range=${timeframe}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cafteria_report_${timeframe}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download Excel report');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#101114] text-slate-100">
        <div className="flex flex-col items-center gap-3 text-stone-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#f5a4c6]" />
          <p className="text-xs font-semibold tracking-wider text-stone-400">
            Loading Dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (adminUser && isUnauthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#101114] text-slate-100">
        <div className="w-full max-w-lg space-y-6 bg-[#17181f] p-8 rounded-3xl border border-rose-500/30 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">403 — Unauthorized Access</h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              Your account (<span className="text-stone-200 font-medium">{adminUser.email}</span>) does not possess administrator privileges.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={CUSTOMER_URL}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700 transition"
            >
              <span>Return to Customer Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={signOut}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5a4c6] px-4 py-2.5 text-xs font-bold text-[#101114] hover:opacity-90 transition shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!adminUser) {
    return (
      <main className="min-h-screen bg-[#101114] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#17181f] p-8 border border-white/[0.06] shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f5a4c6]/15 text-[#f5a4c6] border border-[#f5a4c6]/30">
            <Sparkles className="h-7 w-7" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">ALEXATEL • Cafteria</span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Operations Command</h1>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Real-time kitchen orders, pantry portion inventory, QR counter collection, and auditable finance reports.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f5a4c6] px-5 py-3 text-xs font-black text-[#101114] shadow-lg shadow-[#f5a4c6]/20 hover:opacity-95 transition"
            >
              <Lock className="h-4 w-4" />
              <span>Sign In to Dashboard</span>
            </Link>

            <a
              href={CUSTOMER_URL}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-800 bg-stone-900/60 px-5 py-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-800 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
              <span>Open Customer Portal</span>
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 flex flex-col md:flex-row select-none">
      <AdminSidebar />

      <div className="flex-1 p-5 sm:p-7 lg:p-9 grid grid-cols-1 xl:grid-cols-12 gap-7 overflow-x-hidden min-w-0">
        <main className="xl:col-span-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">
                ALEXATEL • Operations Command Center
              </span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white mt-1">
                Kitchen & Financial Overview
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search orders, dishes..."
                  className="w-full rounded-full bg-[#17181f] border border-[#23242e] pl-4 pr-9 py-2 text-xs font-medium text-white placeholder-stone-500 focus:outline-none focus:border-[#f5a4c6]/60"
                />
                <Search className="absolute right-3.5 top-2.5 h-3.5 w-3.5 text-stone-500" />
              </div>

              <div className="flex items-center gap-2.5 rounded-full bg-[#17181f] border border-[#23242e] p-1 pr-3">
                <div className="h-7 w-7 rounded-full overflow-hidden border border-white/10 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                    alt="Admin user avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-stone-200 hidden sm:inline max-w-[110px] truncate">
                    {adminProfile?.display_name || adminUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] uppercase font-bold text-[#f5a4c6] hidden sm:inline">
                    {role || 'Admin'}
                  </span>
                </div>
              </div>

              <button
                onClick={signOut}
                title="Sign Out"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17181f] border border-[#23242e] text-stone-400 hover:text-white hover:bg-rose-500/20 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/orders"
              className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg flex flex-col justify-between hover:border-[#f5a4c6]/40 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f5a4c6]/20 text-[#f5a4c6]">
                      <Timer className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Live Orders Queue</h3>
                  </div>
                  {statsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-500" />
                  ) : (
                    <span className="rounded-full bg-[#f5a4c6]/15 text-[#f5a4c6] text-[10px] font-bold px-2 py-0.5 border border-[#f5a4c6]/30">
                      {stats.activeOrders} Placed
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>Real-time counter tickets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>Instant optical QR collection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>Zero middle-stage latency</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#22242e] flex items-center justify-between text-[11px] text-[#f5a4c6] font-bold">
                <span>View Kitchen Queue</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>

            <Link
              href="/inventory"
              className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg flex flex-col justify-between hover:border-[#9d8bf0]/40 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#9d8bf0]/20 text-[#9d8bf0]">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Pantry Inventory</h3>
                  </div>
                  <span className="rounded-full bg-[#9d8bf0]/15 text-[#9d8bf0] text-[10px] font-bold px-2 py-0.5 border border-[#9d8bf0]/30">
                    {stats.availableMenu}/{stats.totalMenu} Live
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>Atomic portion decrement on cart</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>5-min customer hold reservation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#ea9955] flex-shrink-0" />
                    <span>{stats.lowStockCount} items near threshold</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#22242e] flex items-center justify-between text-[11px] text-[#9d8bf0] font-bold">
                <span>Manage Pantry Portions</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>

            <Link
              href="/staff-requests"
              className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg flex flex-col justify-between hover:border-[#ea9955]/40 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ea9955]/20 text-[#ea9955]">
                      <Settings className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Staff & Governance</h3>
                  </div>
                  <span className="rounded-full bg-[#ea9955]/15 text-[#ea9955] text-[10px] font-bold px-2 py-0.5 border border-[#ea9955]/30">
                    {stats.pendingStaff} Pending
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>Teacher ID verification queue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <span>4-tier RBAC authorization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Faculty credit ledger access</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#22242e] flex items-center justify-between text-[11px] text-[#ea9955] font-bold">
                <span>Review Staff Requests</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          </div>

          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#23242e] pb-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">Financial Overview & Velocity</h2>
                <div className="flex items-center gap-4 mt-1 text-[11px] text-stone-400">
                  <span>Gross: <strong className="text-white">₹{((financialStats?.totalRevenuePaise || 0) / 100).toLocaleString('en-IN')}</strong></span>
                  <span>UPI: <strong className="text-[#f5a4c6]">₹{((financialStats?.paymentBreakdown?.razorpayPaise || 0) / 100).toLocaleString('en-IN')}</strong></span>
                  <span>Pay Later: <strong className="text-[#ea9955]">₹{((financialStats?.paymentBreakdown?.payLaterPaise || 0) / 100).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTimeframe('daily')}
                    className={`transition ${timeframe === 'daily' ? 'text-white font-bold' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('weekly')}
                    className={`transition ${timeframe === 'weekly' ? 'text-white font-bold' : 'text-stone-500 hover:text-stone-300'}`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('monthly')}
                    className={`relative pb-1 transition ${
                      timeframe === 'monthly'
                        ? 'text-white font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#f5a4c6]'
                        : 'text-stone-500 hover:text-stone-300'
                    }`}
                  >
                    Monthly
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a4c6] px-3.5 py-1.5 text-xs font-bold text-[#101114] shadow-sm hover:opacity-90 disabled:opacity-50 transition active:scale-95"
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Export (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="mt-6 relative h-56 w-full">
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] font-mono text-stone-600">
                <span>₹25k</span>
                <span>₹18k</span>
                <span>₹12k</span>
                <span>₹6k</span>
                <span>₹0</span>
              </div>

              <div className="ml-10 h-full">
                <svg viewBox="0 0 1000 200" className="h-44 w-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9d8bf0" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#9d8bf0" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5a4c6" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#f5a4c6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="10" x2="1000" y2="10" stroke="#1d1e27" strokeDasharray="2 2" />
                  <line x1="0" y1="55" x2="1000" y2="55" stroke="#1d1e27" strokeDasharray="2 2" />
                  <line x1="0" y1="100" x2="1000" y2="100" stroke="#1d1e27" strokeDasharray="2 2" />
                  <line x1="0" y1="145" x2="1000" y2="145" stroke="#1d1e27" strokeDasharray="2 2" />

                  <path
                    d="M 0 140 C 130 180, 180 70, 240 80 C 300 90, 340 170, 410 160 C 480 150, 500 180, 580 135 C 650 95, 700 110, 770 130 C 840 150, 870 70, 930 35 L 1000 60 L 1000 200 L 0 200 Z"
                    fill="url(#purpleGradient)"
                  />
                  <path
                    d="M 0 140 C 130 180, 180 70, 240 80 C 300 90, 340 170, 410 160 C 480 150, 500 180, 580 135 C 650 95, 700 110, 770 130 C 840 150, 870 70, 930 35 L 1000 60"
                    fill="none"
                    stroke="#9d8bf0"
                    strokeWidth="2.5"
                  />

                  <path
                    d="M 0 170 C 120 150, 170 125, 240 90 C 300 60, 340 110, 410 120 C 480 130, 510 75, 580 95 C 650 115, 680 170, 760 175 C 840 180, 880 160, 940 135 L 1000 145 L 1000 200 L 0 200 Z"
                    fill="url(#pinkGradient)"
                  />
                  <path
                    d="M 0 170 C 120 150, 170 125, 240 90 C 300 60, 340 110, 410 120 C 480 130, 510 75, 580 95 C 650 115, 680 170, 760 175 C 840 180, 880 160, 940 135 L 1000 145"
                    fill="none"
                    stroke="#f5a4c6"
                    strokeWidth="2.5"
                  />

                  <circle cx="240" cy="80" r="4" fill="#f5a4c6" stroke="#17181f" strokeWidth="2" />
                  <circle cx="410" cy="160" r="4" fill="#9d8bf0" stroke="#17181f" strokeWidth="2" />
                  <circle cx="580" cy="95" r="4" fill="#f5a4c6" stroke="#17181f" strokeWidth="2" />
                  <circle cx="760" cy="175" r="4" fill="#9d8bf0" stroke="#17181f" strokeWidth="2" />
                  <circle cx="930" cy="35" r="4.5" fill="#9d8bf0" stroke="#17181f" strokeWidth="2" />
                </svg>

                <div className="flex justify-between text-[11px] font-mono text-stone-500 pt-2">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[#f5a4c6]" />
                <h2 className="text-sm font-bold text-white tracking-wide">Live Kitchen Stream</h2>
              </div>
              <Link
                href="/orders"
                className="text-xs font-bold text-[#f5a4c6] hover:underline"
              >
                View all orders &rarr;
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-stone-500 py-4 text-center">No canteen orders placed yet today.</p>
            ) : (
              <div className="divide-y divide-[#22242e]">
                {recentOrders.map((order) => {
                  const stage = order.order_stage || (order.order_status === 'COLLECTED' || order.order_status === 'completed' ? 'COLLECTED' : 'ORDER_PLACED');
                  return (
                    <div key={order.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-white">{order.order_number}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${
                            stage === 'COLLECTED'
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-[#9d8bf0]/15 text-[#9d8bf0] border-[#9d8bf0]/30 animate-pulse'
                          }`}>
                            {stage}
                          </span>
                          <span className="text-[10px] text-stone-400">
                            {order.customer_name} ({order.customer_account_type || 'student'})
                          </span>
                        </div>
                        {order.items && order.items.length > 0 && (
                          <p className="text-[11px] text-stone-500">
                            {order.items.map((i) => `${i.quantity}× ${i.item_name}`).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-mono font-bold text-white tabular-nums">
                          ₹{(order.total / 100).toFixed(2)}
                        </span>
                        {stage === 'ORDER_PLACED' ? (
                          <Link
                            href={`/scan?token=${encodeURIComponent(order.qr_verification_token || '')}`}
                            className="rounded-full bg-[#f5a4c6] px-3 py-1 text-[11px] font-bold text-[#101114] hover:opacity-90 transition"
                          >
                            Scan / Collect
                          </Link>
                        ) : (
                          <Link
                            href={`/orders/receipt/?id=${order.id}`}
                            className="rounded-full border border-[#282a38] bg-[#101114] px-3 py-1 text-[11px] font-bold text-stone-300 hover:text-white transition"
                          >
                            Receipt
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <aside className="xl:col-span-4 space-y-6">
          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#22242e] pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#ea9955]" />
                <h3 className="text-xs font-bold text-white tracking-wide">Pantry Portion Alerts</h3>
              </div>
              <Link href="/inventory" className="text-[11px] font-bold text-[#ea9955] hover:underline">
                Manage
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-stone-400">All pantry inventory portions healthy</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="rounded-xl bg-[#101114] p-3 border border-[#282a38] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-[10px] text-stone-500">
                        Remaining: <strong className="text-rose-400">{item.stock_quantity}</strong> portions (min {item.low_stock_threshold})
                      </p>
                    </div>
                    <Link
                      href="/inventory"
                      className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[10px] font-bold text-rose-300 hover:bg-rose-500/25 transition"
                    >
                      Restock
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#22242e] pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#9d8bf0]" />
                <h3 className="text-xs font-bold text-white tracking-wide">Staff Authorization Queue</h3>
              </div>
              <Link href="/staff-requests" className="text-[11px] font-bold text-[#9d8bf0] hover:underline">
                Review All
              </Link>
            </div>

            {pendingStaffList.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs text-stone-400">No pending staff applications</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingStaffList.map((req) => (
                  <div key={req.id} className="rounded-xl bg-[#101114] p-3 border border-[#282a38] flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-white">{req.display_name || req.email}</p>
                      <p className="text-[10px] text-stone-500">
                        Teacher ID: <span className="font-mono text-stone-300">{req.teacher_id || 'Not specified'}</span>
                      </p>
                    </div>
                    <Link
                      href="/staff-requests"
                      className="rounded-full bg-[#9d8bf0]/20 border border-[#9d8bf0]/30 px-2.5 py-1 text-[10px] font-bold text-[#9d8bf0] hover:bg-[#9d8bf0]/30 transition"
                    >
                      Verify
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg space-y-3">
            <h3 className="text-xs font-bold text-white tracking-wide border-b border-[#22242e] pb-2">
              Counter Fast Dispatch
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <Link
                href="/scan"
                className="rounded-xl bg-[#f5a4c6] p-3 text-[#101114] text-center shadow-sm hover:opacity-95 transition flex flex-col items-center justify-center gap-1.5"
              >
                <QrCode className="h-4 w-4" />
                <span>Scan QR Pass</span>
              </Link>

              <Link
                href="/orders"
                className="rounded-xl bg-[#9d8bf0] p-3 text-[#101114] text-center shadow-sm hover:opacity-95 transition flex flex-col items-center justify-center gap-1.5"
              >
                <Timer className="h-4 w-4" />
                <span>Orders Queue</span>
              </Link>

              <Link
                href="/inventory"
                className="rounded-xl bg-[#101114] border border-[#282a38] p-3 text-stone-200 text-center hover:border-stone-500 transition flex flex-col items-center justify-center gap-1.5"
              >
                <Trophy className="h-4 w-4 text-[#ea9955]" />
                <span>Portions & 86</span>
              </Link>

              <Link
                href="/menu"
                className="rounded-xl bg-[#101114] border border-[#282a38] p-3 text-stone-200 text-center hover:border-stone-500 transition flex flex-col items-center justify-center gap-1.5"
              >
                <Bookmark className="h-4 w-4 text-[#9d8bf0]" />
                <span>Menu Dishes</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}