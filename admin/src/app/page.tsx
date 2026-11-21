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

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');
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
    let isMounted = true;

    async function fetchStats() {
      if (!session?.access_token || !adminUser || isUnauthorized) return;
      setStatsLoading(true);

      try {
        const headers = { Authorization: `Bearer ${session.access_token}` };

        const [
          menuRes,
          catsRes,
          staffRes,
          ordersRes,
          inventoryRes,
          financialRes,
        ] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/admin/menu/items`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/menu/categories`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/staff/requests`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/orders?limit=6`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/inventory/portions`, { headers }),
          fetch(`${API_BASE_URL}/api/v1/admin/reports/stats?range=${timeframe}`, { headers }),
        ]);

        if (!isMounted) return;

        let totalMenu = 0;
        let availableMenu = 0;
        if (menuRes.status === 'fulfilled' && menuRes.value.ok) {
          const json = await menuRes.value.json();
          const items = json.data?.items || [];
          totalMenu = items.length;
          availableMenu = items.filter((i: any) => i.is_available).length;
        }

        let totalCategories = 0;
        if (catsRes.status === 'fulfilled' && catsRes.value.ok) {
          const json = await catsRes.value.json();
          totalCategories = (json.data?.categories || []).length;
        }

        let pendingStaff = 0;
        let staffRequests: DashboardStaffRequest[] = [];
        if (staffRes.status === 'fulfilled' && staffRes.value.ok) {
          const json = await staffRes.value.json();
          staffRequests = json.data?.requests || [];
          pendingStaff = staffRequests.length;
          setPendingStaffList(staffRequests.slice(0, 3));
        }

        let activeOrdersCount = 0;
        let fetchedOrders: DashboardOrder[] = [];
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const json = await ordersRes.value.json();
          fetchedOrders = json.data?.orders || [];
          activeOrdersCount = fetchedOrders.filter(
            (o) => (o.order_stage || o.order_status) === 'ORDER_PLACED'
          ).length;
          setRecentOrders(fetchedOrders.slice(0, 6));
        }

        let lowStockCount = 0;
        let lowPortions: DashboardInventoryItem[] = [];
        if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
          const json = await inventoryRes.value.json();
          const items: DashboardInventoryItem[] = json.data?.inventory || [];
          lowPortions = items.filter(
            (i) => i.stock_quantity <= i.low_stock_threshold
          );
          lowStockCount = lowPortions.length;
          setLowStockItems(lowPortions.slice(0, 4));
        }

        if (financialRes.status === 'fulfilled' && financialRes.value.ok) {
          const json = await financialRes.value.json();
          setFinancialStats(json.data?.stats || null);
        }

        setStats({
          totalMenu,
          availableMenu,
          totalCategories,
          pendingStaff,
          activeOrders: activeOrdersCount,
          lowStockCount,
        });
      } catch (err) {
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
      <main className="min-h-screen flex items-center justify-center bg-white text-[#252525]">
        <div className="flex flex-col items-center gap-3 text-[#666666]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
          <p className="text-xs font-semibold tracking-wider text-[#666666]">
            Loading Dashboard...
          </p>
        </div>
      </main>
    );
  }

  if (adminUser && isUnauthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-white text-[#252525]">
        <div className="w-full max-w-lg space-y-6 bg-white p-8 rounded-3xl border border-red-200 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#D94A43] border border-red-200">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#252525]">403 — Unauthorized Access</h1>
            <p className="mt-2 text-xs leading-relaxed text-[#666666]">
              Your account (<span className="text-[#252525] font-medium">{adminUser.email}</span>) does not possess administrator privileges.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={CUSTOMER_URL}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2.5 text-xs font-semibold text-[#252525] hover:text-[#F47721] transition"
            >
              <span>Return to Customer Site</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={signOut}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-4 py-2.5 text-xs font-bold text-white transition shadow-md shadow-[#F47721]/20"
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
      <main className="min-h-screen bg-white text-[#252525] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 border border-[#EEEEEE] shadow-sm text-center space-y-6">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900 leading-[1.1]">
            <img
              src="/lg_title_blk.svg"
              alt="Cafeteria CEV title"
              className="h-12 w-full object-contain drop-shadow-md"
            />
          </h1>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-5 py-3 text-xs font-black text-white shadow-md shadow-[#F47721]/20 transition active:scale-95"
            >
              <span>Sign In</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />

      <div className="flex-1 p-5 pb-24 sm:p-7 md:pb-7 lg:p-9 grid grid-cols-1 xl:grid-cols-12 gap-7 overflow-x-hidden min-w-0">
        <main className="xl:col-span-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721]">
                Cafeteria.cev • Operations Command Center
              </span>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[#252525] mt-1">
                Kitchen & Financial Overview
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search orders, dishes..."
                  className="w-full rounded-xl bg-white border border-[#EEEEEE] hover:border-gray-300 pl-4 pr-9 py-2 text-xs font-medium text-[#252525] placeholder:text-[#888888] focus:outline-none focus:border-[#F47721] focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                />
                <Search className="absolute right-3.5 top-2.5 h-3.5 w-3.5 text-[#888888]" />
              </div>

              <div className="flex items-center gap-2.5 rounded-full bg-[#FFF7F0] border border-[#F47721]/30 p-1 pr-3">
                <div className="h-7 w-7 rounded-full overflow-hidden border border-[#F47721]/30 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                    alt="Admin user avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-bold text-[#252525] hidden sm:inline max-w-[110px] truncate">
                    {adminProfile?.display_name || adminUser.email?.split('@')[0]}
                  </span>
                  <span className="text-[9px] uppercase font-black text-[#F47721] hidden sm:inline">
                    {role || 'Admin'}
                  </span>
                </div>
              </div>

              <button
                onClick={signOut}
                title="Sign Out"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FAFAFA] border border-[#EEEEEE] text-[#666666] hover:text-[#D94A43] hover:bg-red-50 transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            <Link
              href="/orders"
              className="rounded-2xl bg-gradient-to-br from-[#FFF7F0] via-white to-white border-2 border-[#F47721]/30 p-5 shadow-xs flex flex-col justify-between hover:border-[#F47721] hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F47721] text-white shadow-xs">
                      <Timer className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#252525] tracking-wide">Live Orders Queue</h3>
                  </div>
                  {statsLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#F47721]" />
                  ) : (
                    <span className="rounded-full bg-[#F47721] text-white text-[10px] font-black px-2.5 py-0.5 shadow-xs">
                      {stats.activeOrders} Placed
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-[#666666]">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>Real-time counter tickets</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>Instant optical QR collection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>Zero middle-stage latency</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F47721]/20 flex items-center justify-between text-[11px] text-[#F47721] font-bold">
                <span>View Kitchen Queue</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>

            <Link
              href="/inventory"
              className="rounded-2xl bg-gradient-to-br from-amber-50/50 via-white to-white border border-amber-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                      <Trophy className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#252525] tracking-wide">Pantry Inventory</h3>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 border border-amber-300">
                    {stats.availableMenu}/{stats.totalMenu} Live
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-[#666666]">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>Atomic portion decrement on cart</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>5-min customer hold reservation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-amber-600 flex-shrink-0" />
                    <span>{stats.lowStockCount} items near threshold</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-700 font-bold group-hover:text-amber-800">
                <span>Manage Pantry Portions</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>

            <Link
              href="/staff-requests"
              className="rounded-2xl bg-gradient-to-br from-[#FFF7F0]/40 via-white to-white border border-[#EEEEEE] p-5 shadow-xs flex flex-col justify-between hover:border-[#F47721]/40 hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FFF7F0] text-[#F47721] border border-[#F47721]/30">
                      <Settings className="h-4 w-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#252525] tracking-wide">Staff & Governance</h3>
                  </div>
                  <span className="rounded-full bg-[#FFF7F0] text-[#F47721] text-[10px] font-bold px-2 py-0.5 border border-[#F47721]/30">
                    {stats.pendingStaff} Pending
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-[11px] text-[#666666]">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>Teacher ID verification queue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#269B62] flex-shrink-0" />
                    <span>4-tier RBAC authorization</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-[#888888] flex-shrink-0" />
                    <span>Faculty credit ledger access</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EEEEEE] flex items-center justify-between text-[11px] text-[#F47721] font-bold">
                <span>Review Staff Requests</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          </div>

          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEEEEE] pb-4">
              <div>
                <h2 className="text-sm font-bold text-[#252525] tracking-wide">Financial Overview & Velocity</h2>
                <div className="flex items-center gap-2.5 mt-2 text-[11px]">
                  <span className="rounded-lg bg-[#FAFAFA] border border-[#EEEEEE] px-2.5 py-1 text-[#666666]">
                    Gross: <strong className="text-[#252525] font-black">₹{((financialStats?.totalRevenuePaise || 0) / 100).toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="rounded-lg bg-[#FFF7F0] border border-[#F47721]/30 px-2.5 py-1 text-[#F47721]">
                    UPI: <strong className="text-[#F47721] font-black">₹{((financialStats?.paymentBreakdown?.razorpayPaise || 0) / 100).toLocaleString('en-IN')}</strong>
                  </span>
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800">
                    Pay Later: <strong className="text-amber-900 font-black">₹{((financialStats?.paymentBreakdown?.payLaterPaise || 0) / 100).toLocaleString('en-IN')}</strong>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTimeframe('daily')}
                    className={`transition ${timeframe === 'daily' ? 'text-[#F47721] font-bold' : 'text-[#666666] hover:text-[#252525]'}`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('weekly')}
                    className={`transition ${timeframe === 'weekly' ? 'text-[#F47721] font-bold' : 'text-[#666666] hover:text-[#252525]'}`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeframe('monthly')}
                    className={`relative pb-1 transition ${timeframe === 'monthly'
                      ? 'text-[#F47721] font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F47721]'
                      : 'text-[#666666] hover:text-[#252525]'
                      }`}
                  >
                    Monthly
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition active:scale-95"
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
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] font-mono text-[#888888]">
                <span>₹25k</span>
                <span>₹18k</span>
                <span>₹12k</span>
                <span>₹6k</span>
                <span>₹0</span>
              </div>

              <div className="ml-10 h-full">
                <svg viewBox="0 0 1000 200" className="h-44 w-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F47721" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F47721" stopOpacity="0.02" />
                    </linearGradient>
                    <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FB923C" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#FB923C" stopOpacity="0.01" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="10" x2="1000" y2="10" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="55" x2="1000" y2="55" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="100" x2="1000" y2="100" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="145" x2="1000" y2="145" stroke="#EEEEEE" strokeDasharray="2 2" />

                  <path
                    d="M 0 140 C 130 180, 180 70, 240 80 C 300 90, 340 170, 410 160 C 480 150, 500 180, 580 135 C 650 95, 700 110, 770 130 C 840 150, 870 70, 930 35 L 1000 60 L 1000 200 L 0 200 Z"
                    fill="url(#primaryGradient)"
                  />
                  <path
                    d="M 0 140 C 130 180, 180 70, 240 80 C 300 90, 340 170, 410 160 C 480 150, 500 180, 580 135 C 650 95, 700 110, 770 130 C 840 150, 870 70, 930 35 L 1000 60"
                    fill="none"
                    stroke="#F47721"
                    strokeWidth="3"
                  />

                  <path
                    d="M 0 170 C 120 150, 170 125, 240 90 C 300 60, 340 110, 410 120 C 480 130, 510 75, 580 95 C 650 115, 680 170, 760 175 C 840 180, 880 160, 940 135 L 1000 145 L 1000 200 L 0 200 Z"
                    fill="url(#amberGradient)"
                  />
                  <path
                    d="M 0 170 C 120 150, 170 125, 240 90 C 300 60, 340 110, 410 120 C 480 130, 510 75, 580 95 C 650 115, 680 170, 760 175 C 840 180, 880 160, 940 135 L 1000 145"
                    fill="none"
                    stroke="#FB923C"
                    strokeWidth="2.5"
                  />

                  <circle cx="240" cy="80" r="4.5" fill="#F47721" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="410" cy="160" r="4" fill="#FB923C" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="580" cy="95" r="4.5" fill="#F47721" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="760" cy="175" r="4" fill="#FB923C" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="930" cy="35" r="5" fill="#F47721" stroke="#FFFFFF" strokeWidth="2" />
                </svg>

                <div className="flex justify-between text-[11px] font-mono text-[#888888] pt-2">
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

          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF7F0] text-[#F47721] border border-[#F47721]/30">
                  <Clock className="h-4 w-4 text-[#F47721]" />
                </div>
                <h2 className="text-sm font-bold text-[#252525] tracking-wide">Live Kitchen Stream</h2>
              </div>
              <Link
                href="/orders"
                className="text-xs font-bold text-[#F47721] hover:underline"
              >
                View all orders &rarr;
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <p className="text-xs text-[#888888] py-4 text-center">No canteen orders placed yet today.</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => {
                  const stage = order.order_stage || (order.order_status === 'COLLECTED' || order.order_status === 'completed' ? 'COLLECTED' : 'ORDER_PLACED');
                  const isPlaced = stage === 'ORDER_PLACED';
                  return (
                    <div
                      key={order.id}
                      className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs rounded-xl transition-all ${isPlaced
                        ? 'bg-[#FFF7F0]/50 border border-[#F47721]/30 hover:bg-[#FFF7F0]'
                        : 'bg-[#FAFAFA] border border-[#EEEEEE] hover:bg-white'
                        }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-black text-[#F47721]">{order.order_number}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${isPlaced
                            ? 'bg-[#F47721] text-white border-[#F47721] shadow-xs'
                            : 'bg-green-50 text-[#269B62] border-green-200'
                            }`}>
                            {stage}
                          </span>
                          <span className="text-[10px] text-[#666666]">
                            {order.customer_name} ({order.customer_account_type || 'student'})
                          </span>
                        </div>
                        {order.items && order.items.length > 0 && (
                          <p className="text-[11px] text-[#666666]">
                            {order.items.map((i) => `${i.quantity}× ${i.item_name}`).join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="font-mono font-bold text-[#252525] tabular-nums">
                          ₹{(order.total / 100).toFixed(2)}
                        </span>
                        {isPlaced ? (
                          <Link
                            href={`/scan?token=${encodeURIComponent(order.qr_verification_token || '')}`}
                            className="rounded-xl bg-[#F47721] hover:bg-[#E06310] px-3.5 py-1.5 text-[11px] font-bold text-white shadow-md shadow-[#F47721]/20 transition"
                          >
                            Scan / Collect
                          </Link>
                        ) : (
                          <Link
                            href={`/orders/receipt/?id=${order.id}`}
                            className="rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1 text-[11px] font-bold text-[#252525] hover:text-[#F47721] transition"
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
          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[#252525] tracking-wide">Pantry Portion Alerts</h3>
              </div>
              <Link href="/inventory" className="text-[11px] font-bold text-[#F47721] hover:underline">
                Manage
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-[#269B62] mx-auto mb-1" />
                <p className="text-xs text-[#666666]">All pantry inventory portions healthy</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="rounded-xl bg-amber-50/40 p-3 border border-amber-200/60 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#252525]">{item.name}</p>
                      <p className="text-[10px] text-[#666666]">
                        Remaining: <strong className="text-[#D94A43]">{item.stock_quantity}</strong> portions (min {item.low_stock_threshold})
                      </p>
                    </div>
                    <Link
                      href="/inventory"
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition"
                    >
                      Restock
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#FFF7F0] text-[#F47721] border border-[#F47721]/30">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-xs font-bold text-[#252525] tracking-wide">Staff Authorization Queue</h3>
              </div>
              <Link href="/staff-requests" className="text-[11px] font-bold text-[#F47721] hover:underline">
                Review All
              </Link>
            </div>

            {pendingStaffList.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-[#269B62] mx-auto mb-1" />
                <p className="text-xs text-[#666666]">No pending staff applications</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingStaffList.map((req) => (
                  <div key={req.id} className="rounded-xl bg-[#FFF7F0]/40 p-3 border border-[#F47721]/20 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-[#252525]">{req.display_name || req.email}</p>
                      <p className="text-[10px] text-[#666666]">
                        Teacher ID: <span className="font-mono text-[#252525]">{req.teacher_id || 'Not specified'}</span>
                      </p>
                    </div>
                    <Link
                      href="/staff-requests"
                      className="rounded-xl bg-[#F47721] hover:bg-[#E06310] px-2.5 py-1 text-[10px] font-bold text-white shadow-xs transition"
                    >
                      Verify
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-[#252525] tracking-wide border-b border-[#EEEEEE] pb-2">
              Counter Fast Dispatch
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <Link
                href="/scan"
                className="rounded-xl bg-gradient-to-r from-[#F68536] via-[#F47721] to-[#E06310] hover:from-[#E06310] hover:to-[#C75207] p-3 text-white text-center shadow-md shadow-[#F47721]/30 border border-[#F47721] ring-2 ring-[#F47721]/20 font-black transition-all flex flex-col items-center justify-center gap-1.5 active:scale-95"
              >
                <QrCode className="h-4 w-4" />
                <span>Scan QR Pass</span>
              </Link>

              <Link
                href="/orders"
                className="rounded-xl bg-[#FFF7F0] hover:bg-[#F47721] text-[#F47721] hover:text-white border-2 border-[#F47721]/30 hover:border-[#F47721] p-3 text-center shadow-xs transition flex flex-col items-center justify-center gap-1.5 active:scale-95"
              >
                <Timer className="h-4 w-4" />
                <span>Orders Queue</span>
              </Link>

              <Link
                href="/inventory"
                className="rounded-xl bg-[#FAFAFA] hover:bg-[#FFF7F0] border border-[#EEEEEE] hover:border-[#F47721]/30 p-3 text-[#252525] hover:text-[#F47721] text-center transition flex flex-col items-center justify-center gap-1.5 active:scale-95"
              >
                <Trophy className="h-4 w-4 text-amber-600" />
                <span>Portions & 86</span>
              </Link>

              <Link
                href="/menu"
                className="rounded-xl bg-[#FAFAFA] hover:bg-[#FFF7F0] border border-[#EEEEEE] hover:border-[#F47721]/30 p-3 text-[#252525] hover:text-[#F47721] text-center transition flex flex-col items-center justify-center gap-1.5 active:scale-95"
              >
                <Bookmark className="h-4 w-4 text-[#F47721]" />
                <span>Menu Dishes</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
