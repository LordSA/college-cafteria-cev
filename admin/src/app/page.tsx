'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/AdminSidebar';
import {
  ShieldAlert,
  Loader2,
  Search,
  Download,
  CheckCircle2,
  ArrowRight,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

interface OperationalStats {
  totalMenu: number;
  availableMenu: number;
  totalCategories: number;
  activeOrders: number;
  lowStockCount: number;
}

interface FinancialStats {
  totalRevenuePaise: number;
  totalOrders: number;
  activeOrders: number;
  completedOrders: number;
  paymentBreakdown: {
    razorpayPaise: number;
    walletPaise: number;
    payLaterPaise: number;
  };
}

interface ChartPoint {
  label: string;
  date: string;
  totalRevenue: number;
  razorpayRevenue: number;
  orderCount: number;
}

interface TodayPayment {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email?: string | null;
  customer_contact?: string | null;
  amount: number;
  payment_method: string;
  method_detail?: string | null;
  payment_status: string;
  created_at: string;
  paid_at?: string;
  source?: string;
}

interface DashboardInventoryItem {
  id: string;
  name: string;
  stock_quantity: number;
  low_stock_threshold: number;
  is_available: boolean;
}

interface PayLaterLogItem {
  id: string;
  order_number: string;
  customer_id: string;
  teacher_name: string;
  teacher_email: string;
  teacher_phone: string;
  amount_paise: number;
  amount_inr: string;
  payment_status: string;
  is_settled: boolean;
  order_stage: string;
  created_at: string;
  settled_at?: string | null;
  settled_via?: string | null;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export default function AdminDashboardPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading, session, role, canAccessDashboard } = useAdminAuth();

  useEffect(() => {
    if (!loading && adminUser) {
      if (role === 'staff') {
        router.push('/orders');
      } else if (role === 'retail') {
        router.push('/inventory');
      } else if (role === 'printer') {
        router.push('/printer');
      }
    }
  }, [loading, adminUser, role, router]);

  const [stats, setStats] = useState<OperationalStats>({
    totalMenu: 0,
    availableMenu: 0,
    totalCategories: 0,
    activeOrders: 0,
    lowStockCount: 0,
  });
  const [financialStats, setFinancialStats] = useState<FinancialStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [todayPayments, setTodayPayments] = useState<TodayPayment[]>([]);
  const [todayRazorpayTotalPaise, setTodayRazorpayTotalPaise] = useState<number>(0);
  const [razorpayConfigured, setRazorpayConfigured] = useState<boolean>(true);
  const [refreshingPayments, setRefreshingPayments] = useState(false);
  const [teachersCount, setTeachersCount] = useState<number>(0);
  const [lowStockItems, setLowStockItems] = useState<DashboardInventoryItem[]>([]);
  const [payLaterLogs, setPayLaterLogs] = useState<PayLaterLogItem[]>([]);
  const [payLaterLoading, setPayLaterLoading] = useState(false);
  const [payLaterUnpaidPaise, setPayLaterUnpaidPaise] = useState(0);
  const [payLaterSettledPaise, setPayLaterSettledPaise] = useState(0);
  const [statsLoading, setStatsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const refreshRazorpayLogs = async () => {
    if (!session?.access_token) return;
    setRefreshingPayments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/razorpay-payments?range=today&count=50&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setRazorpayConfigured(json.data.configured ?? true);
          setTodayRazorpayTotalPaise(json.data.total_captured_paise || 0);
          setTodayPayments(
            (json.data.items || []).map((p: any) => ({
              id: p.id,
              order_number: p.order_number || (p.order_id ? p.order_id.replace(/^order_/, '') : p.id),
              customer_name: p.customer_name || p.contact || 'Customer',
              customer_email: p.email,
              customer_contact: p.contact,
              amount: p.amount,
              payment_method: 'razorpay',
              method_detail: p.vpa ? `UPI (${p.vpa})` : (p.method || 'Razorpay').toUpperCase(),
              payment_status: p.status,
              created_at: p.created_at,
              paid_at: p.status === 'captured' ? p.created_at : undefined,
              source: 'razorpay_gateway',
            }))
          );
        }
      }
    } catch {
    } finally {
      setRefreshingPayments(false);
    }
  };

  const loadPayLaterLogs = async () => {
    if (!session?.access_token) return;
    setPayLaterLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/pay-later-logs?limit=20&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setPayLaterLogs(json.data.items || []);
          setPayLaterUnpaidPaise(json.data.total_unpaid_paise || 0);
          setPayLaterSettledPaise(json.data.total_settled_paise || 0);
        }
      }
    } catch {
    } finally {
      setPayLaterLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchStats() {
      if (!session?.access_token || !adminUser || isUnauthorized || !canAccessDashboard) return;
      setStatsLoading(true);

      try {
        const headers = { Authorization: `Bearer ${session.access_token}` };

        const [
          menuRes,
          catsRes,
          teachersRes,
          ordersRes,
          inventoryRes,
          financialRes,
          payLaterRes,
        ] = await Promise.allSettled([
          fetch(`${API_BASE_URL}/api/v1/admin/menu?t=${Date.now()}`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/admin/categories?t=${Date.now()}`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/list?t=${Date.now()}`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/admin/orders?limit=6&t=${Date.now()}`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/admin/inventory?t=${Date.now()}`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/admin/reports/stats?range=${timeframe}&t=${Date.now()}`, { headers, cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/admin/reports/pay-later-logs?limit=20&t=${Date.now()}`, { headers, cache: 'no-store' }),
        ]);

        if (!isMounted) return;

        let totalMenu = 0;
        let availableMenu = 0;
        if (menuRes.status === 'fulfilled' && menuRes.value.ok) {
          const json = await menuRes.value.json();
          const items = Array.isArray(json.data) ? json.data : (json.data?.items || []);
          totalMenu = items.length;
          availableMenu = items.filter((i: any) => i.is_available).length;
        }

        let totalCategories = 0;
        if (catsRes.status === 'fulfilled' && catsRes.value.ok) {
          const json = await catsRes.value.json();
          const cats = Array.isArray(json.data) ? json.data : (json.data?.categories || []);
          totalCategories = cats.length;
        }

        if (teachersRes.status === 'fulfilled' && teachersRes.value.ok) {
          const json = await teachersRes.value.json();
          const list = Array.isArray(json.data) ? json.data : [];
          setTeachersCount(list.length);
        }

        let activeOrdersCount = 0;
        if (ordersRes.status === 'fulfilled' && ordersRes.value.ok) {
          const json = await ordersRes.value.json();
          const fetchedOrders = Array.isArray(json.data) ? json.data : (json.data?.orders || []);
          activeOrdersCount = fetchedOrders.filter(
            (o: any) => (o.order_stage || o.order_status) === 'ORDER_PLACED'
          ).length;
        }

        let lowStockCount = 0;
        if (inventoryRes.status === 'fulfilled' && inventoryRes.value.ok) {
          const json = await inventoryRes.value.json();
          const items: DashboardInventoryItem[] = Array.isArray(json.data) ? json.data : (json.data?.inventory || []);
          const lowPortions = items.filter(
            (i) => i.stock_quantity <= i.low_stock_threshold
          );
          lowStockCount = lowPortions.length;
          setLowStockItems(lowPortions.slice(0, 4));
        }

        if (financialRes.status === 'fulfilled' && financialRes.value.ok) {
          const json = await financialRes.value.json();
          if (json.data) {
            setFinancialStats({
              totalRevenuePaise: json.data.total_revenue_paise || 0,
              totalOrders: json.data.total_orders || 0,
              activeOrders: json.data.placed_orders || 0,
              completedOrders: json.data.collected_orders || 0,
              paymentBreakdown: {
                razorpayPaise: json.data.payment_breakdown?.razorpayPaise || 0,
                walletPaise: json.data.payment_breakdown?.walletPaise || 0,
                payLaterPaise: json.data.payment_breakdown?.payLaterPaise || 0,
              },
            });
            setChartData(json.data.chart_data || []);
            setTodayPayments(json.data.today_payments || []);
            setTodayRazorpayTotalPaise(json.data.today_razorpay_total_paise || 0);
            setRazorpayConfigured(json.data.razorpay_configured ?? true);
            if (json.data.teachers_count !== undefined) {
              setTeachersCount(json.data.teachers_count);
            }
          }
        }

        if (payLaterRes.status === 'fulfilled' && payLaterRes.value.ok) {
          const json = await payLaterRes.value.json();
          if (json.success && json.data) {
            setPayLaterLogs(json.data.items || []);
            setPayLaterUnpaidPaise(json.data.total_unpaid_paise || 0);
            setPayLaterSettledPaise(json.data.total_settled_paise || 0);
          }
        }

        setStats({
          totalMenu,
          availableMenu,
          totalCategories,
          activeOrders: activeOrdersCount,
          lowStockCount,
        });
      } catch {
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
  }, [session?.access_token, adminUser, isUnauthorized, timeframe, canAccessDashboard]);

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

  const maxVal = Math.max(...chartData.map((d) => d.totalRevenue), 50);
  const maxTick = Math.ceil(maxVal / 50) * 50;
  const numPoints = chartData.length;

  const points = chartData.map((d, i) => {
    const x = numPoints > 1 ? (i / (numPoints - 1)) * 960 + 20 : 500;
    const y = 175 - (d.totalRevenue / maxTick) * 155;
    return { x, y, ...d };
  });

  const pathD = points.length === 0
    ? 'M 20 175 L 980 175'
    : points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');

  const areaD = points.length === 0
    ? 'M 20 175 L 980 175 L 980 175 L 20 175 Z'
    : `${pathD} L ${points[points.length - 1]!.x.toFixed(1)} 175 L ${points[0]!.x.toFixed(1)} 175 Z`;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-[#252525]">
        <div className="flex flex-col items-center gap-3 text-[#666666]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
          <p className="text-xs font-semibold tracking-wider text-[#666666]">
            Verifying administrative access...
          </p>
        </div>
      </main>
    );
  }

  if (isUnauthorized || !adminUser) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="w-full max-w-sm rounded-3xl border border-[#EEEEEE] bg-white p-7 shadow-xl space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-[#D94A43]">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#252525]">Access Restricted</h2>
            <p className="text-xs text-[#666666] mt-1.5 leading-relaxed">
              Your profile does not hold administrative access credentials.
            </p>
          </div>
          <div className="pt-2">
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
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[#252525] mt-1">
                Dashboard
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
              </div>

              <div className="mt-4 pt-3 border-t border-[#F47721]/20 flex items-center justify-between text-[11px] text-[#F47721] font-bold">
                <span>View Queue</span>
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
                    <h3 className="text-xs font-bold text-[#252525] tracking-wide">Pantry Inventory</h3>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 border border-amber-300">
                    {stats.availableMenu}/{stats.totalMenu} Live
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-700 font-bold group-hover:text-amber-800">
                <span>Manage Pantry</span>
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
                    <h3 className="text-xs font-bold text-[#252525] tracking-wide">Teachers</h3>
                  </div>
                  <span className="rounded-full bg-[#FFF7F0] text-[#F47721] text-[10px] font-bold px-2 py-0.5 border border-[#F47721]/30">
                    {teachersCount} Registered
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EEEEEE] flex items-center justify-between text-[11px] text-[#F47721] font-bold">
                <span>Manage Teachers</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          </div>

          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEEEEE] pb-4">
              <div>
                <h2 className="text-sm font-bold text-[#252525] tracking-wide">Real-time Financial Velocity</h2>
                <div className="flex items-center gap-2.5 mt-2 text-[11px] flex-wrap">
                  <span className="rounded-lg bg-[#FAFAFA] border border-[#EEEEEE] px-2.5 py-1 text-[#666666]">
                    Gross: <strong className="text-[#252525] font-black">₹{((financialStats?.totalRevenuePaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="rounded-lg bg-[#FFF7F0] border border-[#F47721]/30 px-2.5 py-1 text-[#F47721]">
                    UPI: <strong className="text-[#F47721] font-black">₹{((financialStats?.paymentBreakdown?.razorpayPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </span>
                  <span className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-amber-800">
                    Faculty Post-Pay: <strong className="text-amber-900 font-black">₹{((financialStats?.paymentBreakdown?.payLaterPaise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
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
                <span>₹{maxTick >= 1000 ? `${(maxTick / 1000).toFixed(1)}k` : maxTick}</span>
                <span>₹{Math.round(maxTick * 0.75) >= 1000 ? `${(Math.round(maxTick * 0.75) / 1000).toFixed(1)}k` : Math.round(maxTick * 0.75)}</span>
                <span>₹{Math.round(maxTick * 0.5) >= 1000 ? `${(Math.round(maxTick * 0.5) / 1000).toFixed(1)}k` : Math.round(maxTick * 0.5)}</span>
                <span>₹{Math.round(maxTick * 0.25) >= 1000 ? `${(Math.round(maxTick * 0.25) / 1000).toFixed(1)}k` : Math.round(maxTick * 0.25)}</span>
                <span>₹0</span>
              </div>

              <div className="ml-12 h-full">
                <svg viewBox="0 0 1000 200" className="h-44 w-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F47721" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#F47721" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="20" x2="1000" y2="20" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="60" x2="1000" y2="60" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="100" x2="1000" y2="100" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="140" x2="1000" y2="140" stroke="#EEEEEE" strokeDasharray="2 2" />
                  <line x1="0" y1="175" x2="1000" y2="175" stroke="#EEEEEE" />

                  <path d={areaD} fill="url(#primaryGradient)" />
                  <path d={pathD} fill="none" stroke="#F47721" strokeWidth="3" />

                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r="4.5"
                        fill="#F47721"
                        stroke="#FFFFFF"
                        strokeWidth="2"
                      />
                    </g>
                  ))}
                </svg>

                <div className="flex justify-between text-[11px] font-mono text-[#888888] pt-2">
                  {chartData.map((pt, idx) => (
                    <span key={idx}>{pt.label}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EEEEEE] pb-4">
              <div>
                <h2 className="text-sm font-bold text-[#252525] tracking-wide">Teachers Pay Later Logs</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                    Unsettled Dues: ₹{(payLaterUnpaidPaise / 100).toFixed(2)}
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    Settled: ₹{(payLaterSettledPaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadPayLaterLogs}
                  disabled={payLaterLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1.5 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${payLaterLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <Link
                  href="/staff-requests"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#F47721] hover:underline"
                >
                  <span>Teachers</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {payLaterLoading && payLaterLogs.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#666666]">
                <Loader2 className="h-6 w-6 animate-spin text-[#F47721]" />
                <p className="text-xs font-semibold">Loading pay later logs...</p>
              </div>
            ) : payLaterLogs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-[#FAFAFA] border border-dashed border-[#EEEEEE]">
                <p className="text-xs text-[#666666]">No Pay Later orders recorded yet.</p>
                <p className="text-[10px] text-[#888888] mt-1">Orders placed by verified faculty teachers using Pay Later will appear here with settlement tracking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#252525]">
                    <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                      <tr>
                        <th className="px-4 py-2.5 font-bold">Teacher / Faculty</th>
                        <th className="px-3 py-2.5 font-bold">Order #</th>
                        <th className="px-3 py-2.5 font-bold">Date & Time</th>
                        <th className="px-3 py-2.5 font-bold">Total (₹)</th>
                        <th className="px-4 py-2.5 font-bold text-right">Settlement Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEEEE] font-medium">
                      {payLaterLogs.slice(0, 8).map((log) => (
                        <tr key={log.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#252525]">{log.teacher_name}</div>
                            {log.teacher_email && (
                              <div className="text-[10px] text-[#888888]">{log.teacher_email}</div>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono font-bold text-[#252525]">
                            {log.order_number}
                          </td>
                          <td className="px-3 py-3 text-[11px] text-[#666666]">
                            {new Date(log.created_at).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </td>
                          <td className="px-3 py-3 font-mono font-black text-sm text-[#252525] tabular-nums">
                            ₹{(log.amount_paise / 100).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {log.is_settled ? (
                              <div className="inline-flex flex-col items-end">
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-[#269B62]">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span>Settled</span>
                                </span>
                                {log.settled_at && (
                                  <span className="text-[9px] text-[#888888] mt-0.5">
                                    {new Date(log.settled_at).toLocaleDateString('en-IN')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                                <span>Due (Unsettled)</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="sm:hidden space-y-2">
                  {payLaterLogs.slice(0, 8).map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-3 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-[#252525]">{log.teacher_name}</div>
                          <div className="text-[10px] text-[#888888]">Order #{log.order_number}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-sm text-[#252525]">
                            ₹{(log.amount_paise / 100).toFixed(2)}
                          </div>
                          <div className="text-[9px] text-[#888888]">
                            {new Date(log.created_at).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-[#EEEEEE]">
                        <span className="text-[10px] text-[#666666]">Status:</span>
                        {log.is_settled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-[#269B62]">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Settled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            <span>Due (Unsettled)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="xl:col-span-4 space-y-6">
          <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-[#252525] tracking-wide">Low Stock Alerts</h3>
              </div>
              <Link href="/inventory" className="text-[11px] font-bold text-[#F47721] hover:underline">
                Manage
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="p-4 text-center">
                <CheckCircle2 className="h-6 w-6 text-[#269B62] mx-auto mb-1" />
                <p className="text-xs text-[#666666]">All Stocks ok</p>
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

                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-bold text-[#252525] tracking-wide">Today&apos;s Live Payments</h3>
                  </div>
                  <p className="text-[10px] text-[#888888]">Razorpay gateway</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={refreshRazorpayLogs}
                  disabled={refreshingPayments}
                  title="Refresh Razorpay Logs"
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingPayments ? 'animate-spin text-[#F47721]' : ''}`} />
                </button>
                <Link href="/financial?tab=razorpay" className="text-[11px] font-bold text-[#F47721] hover:underline flex items-center gap-0.5">
                  <span>View More</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>

            {todayPayments.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 p-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Razorpay Recieved Today
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {todayPayments.filter((p) => p.payment_status === 'captured').length} captured payments
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-black text-emerald-700 tabular-nums">
                    ₹{(todayRazorpayTotalPaise / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {!razorpayConfigured && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 space-y-1">
                <p className="font-bold">Razorpay Keys Not Configured</p>
                <p className="text-[11px] text-amber-700">
                  Add <code className="font-mono font-bold">RAZORPAY_KEY_ID</code> and <code className="font-mono font-bold">RAZORPAY_KEY_SECRET</code> to your backend environment to stream live gateway transactions.
                </p>
              </div>
            )}

            {todayPayments.length === 0 ? (
              <div className="p-5 text-center">
                <CreditCard className="h-6 w-6 text-[#888888] mx-auto mb-1" />
                <p className="text-xs text-[#666666]">No Razorpay payments recorded today yet.</p>
                <p className="text-[10px] text-[#888888] mt-1">Logs stream directly from Razorpay once payments are completed.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {todayPayments.slice(0, 6).map((pay) => {
                  const payDate = new Date(pay.paid_at || pay.created_at);
                  const timeStr = payDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div key={pay.id} className="rounded-xl bg-[#FAFAFA] p-3 border border-[#EEEEEE] hover:border-orange-200 flex items-center justify-between text-xs transition">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#252525] truncate max-w-[130px]">
                            {pay.customer_name}
                          </span>
                          <span className="text-[9px] font-mono text-[#888888] truncate max-w-[100px]" title={pay.id}>
                            {pay.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-[#666666] mt-0.5">
                          <span>{timeStr}</span>
                          <span>•</span>
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {pay.method_detail || 'RAZORPAY'}
                          </span>
                          {pay.order_number && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[9px] text-[#888888]">#{pay.order_number}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-extrabold text-[#269B62] text-xs tabular-nums">
                          ₹{(pay.amount / 100).toFixed(2)}
                        </span>
                        <div className={`text-[9px] font-bold capitalize ${pay.payment_status === 'captured' ? 'text-green-700' : 'text-amber-700'}`}>
                          {pay.payment_status}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 text-center">
                  <Link
                    href="/financial?tab=razorpay"
                    className="inline-flex items-center justify-center gap-1 text-xs font-bold text-[#F47721] hover:underline"
                  >
                    <span>View All Live Gateway Logs</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
