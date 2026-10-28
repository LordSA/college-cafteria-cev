'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  ShieldAlert,
  User,
  Lock,
  Layers,
  ClipboardList,
  Loader2,
  Check,
  Utensils,
  ReceiptText,
  Wallet,
  QrCode,
  Search,
  Bell,
  LogOut,
  Send,
  MoreVertical,
  ChevronRight,
  ExternalLink,
  Sparkles,
  CreditCard,
  Flame,
  Coffee,
  X,
  Users,
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
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [activeStaffList, setActiveStaffList] = useState([
    { id: '1', name: 'Chef Lolita M.' },
    { id: '2', name: 'Cashier Obin D.' },
  ]);

  useEffect(() => {
    if (!session?.access_token || !adminUser || isUnauthorized) return;

    let isMounted = true;

    async function fetchStats() {
      setStatsLoading(true);

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
            setRecentOrders(ordersData.data.slice(0, 8));
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
  }, [session?.access_token, adminUser, isUnauthorized]);

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setBroadcastMessage('');
    setTimeout(() => setBroadcastSent(false), 3000);
  };

  const removeStaff = (id: string) => {
    setActiveStaffList((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0d0e12] text-slate-100">
        <div className="flex flex-col items-center gap-3.5 text-stone-400">
          <Loader2 className="h-8 w-8 animate-spin text-[#f49ebb]" />
          <p className="text-xs font-semibold tracking-wider uppercase text-stone-400">
            Verifying Cafteria Operations Session...
          </p>
        </div>
      </main>
    );
  }

  if (adminUser && isUnauthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[#0d0e12] text-slate-100">
        <div className="w-full max-w-lg space-y-6 bg-[#16171d] p-8 rounded-3xl border border-rose-500/30 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">403 — Unauthorized Access</h1>
            <p className="mt-2 text-xs leading-relaxed text-stone-400">
              Your account (<span className="text-stone-200 font-medium">{adminUser.email}</span>) does not possess administrator privileges.
            </p>
          </div>

          <div className="rounded-2xl bg-[#0d0e12] p-4 border border-stone-800 text-left">
            <h2 className="text-xs font-semibold text-stone-300 mb-1">Zero-Trust Role Enforcement</h2>
            <p className="text-[11px] leading-relaxed text-stone-400">
              Student and regular faculty logins cannot access the canteen management dashboard. Administrative credentials are authenticated through server-verified role-based access control.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={CUSTOMER_URL}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-stone-800 px-4 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700 transition border border-stone-700"
            >
              <span>Return to Customer Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <button
              onClick={signOut}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition shadow-sm"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Sign Out & Switch Account</span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!adminUser) {
    return (
      <main className="min-h-screen bg-[#0d0e12] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#16171d] p-8 border border-white/[0.06] shadow-2xl text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f49ebb]/15 text-[#f49ebb] border border-[#f49ebb]/30 shadow-lg shadow-[#f49ebb]/10">
            <Sparkles className="h-7 w-7" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f49ebb]">Cafteria CEV</span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Operations Command</h1>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Kitchen Display System, live dispatch queue, inventory depletion, and faculty Pay Later settlement controls.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#f49ebb] px-5 py-3 text-xs font-black text-[#0d0e12] shadow-lg shadow-[#f49ebb]/20 hover:opacity-95 transition active:scale-95"
            >
              <Lock className="h-4 w-4" />
              <span>Sign In to Admin Dashboard</span>
            </Link>

            <a
              href={CUSTOMER_URL}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-stone-800 bg-stone-900/60 px-5 py-2.5 text-xs font-semibold text-stone-300 hover:bg-stone-800 transition"
            >
              <ExternalLink className="h-3.5 w-3.5 text-stone-400" />
              <span>Open Customer Ordering Web App</span>
            </a>
          </div>
        </div>
      </main>
    );
  }

  const displayName = adminProfile?.display_name || adminUser.email?.split('@')[0] || 'Administrator';

  const filteredOrders = recentOrders.filter((ord) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      ord.order_number?.toLowerCase().includes(q) ||
      ord.customer?.display_name?.toLowerCase().includes(q) ||
      ord.payment_method?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col md:flex-row select-none">
      <aside className="w-full md:w-20 lg:w-24 bg-[#13141a] border-b md:border-b-0 md:border-r border-white/[0.05] flex md:flex-col items-center justify-between py-4 md:py-8 px-4 flex-shrink-0 z-30">
        <div className="flex md:flex-col items-center gap-6">
          <Link href="/" className="flex flex-col items-center gap-1 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-orange-400 text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 transition">
              <Flame className="h-5 w-5" />
            </div>
            <span className="hidden lg:block text-[9px] font-black uppercase tracking-wider text-stone-400 group-hover:text-white transition">
              Cafteria
            </span>
          </Link>

          <nav className="flex md:flex-col items-center gap-2 md:gap-4">
            <Link
              href="/"
              title="Dashboard"
              className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#f49ebb] text-[#0d0e12] shadow-lg shadow-[#f49ebb]/25 transition active:scale-95"
            >
              <Utensils className="h-5 w-5" />
            </Link>

            <Link
              href="/orders"
              title="Orders & KDS"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
            >
              <ReceiptText className="h-5 w-5" />
            </Link>

            <Link
              href="/inventory"
              title="Inventory & 86"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
            >
              <ClipboardList className="h-5 w-5" />
            </Link>

            <Link
              href="/scan"
              title="QR Camera Scanner"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
            >
              <QrCode className="h-5 w-5" />
            </Link>

            <Link
              href="/menu"
              title="Menu Catalog"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
            >
              <Layers className="h-5 w-5" />
            </Link>

            <Link
              href="/wallets"
              title="Wallets & Ledger"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
            >
              <Wallet className="h-5 w-5" />
            </Link>

            <Link
              href="/staff-requests"
              title="Staff Requests"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition active:scale-95"
            >
              <Users className="h-5 w-5" />
            </Link>
          </nav>
        </div>

        <div className="flex md:flex-col items-center gap-3">
          <a
            href={CUSTOMER_URL}
            target="_blank"
            rel="noreferrer"
            title="Open Customer App"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <ExternalLink className="h-4 w-4" />
          </a>

          <button
            onClick={signOut}
            title="Sign Out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-x-hidden">
        <main className="xl:col-span-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                My Dashboard
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-72">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search orders, faculty, dues..."
                  className="w-full rounded-full bg-[#181922] border border-white/[0.06] px-4 py-2 text-xs font-medium text-white placeholder-stone-400 focus:outline-none focus:border-purple-500/50"
                />
                <Search className="absolute right-3.5 top-2.5 h-3.5 w-3.5 text-stone-400" />
              </div>

              <button
                type="button"
                title="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#181922] border border-white/[0.06] text-stone-300 hover:text-white transition"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#f49ebb]" />
              </button>

              <div className="flex items-center gap-2 rounded-full bg-[#181922] border border-white/[0.06] p-1 pr-3">
                <div className="h-7 w-7 rounded-full bg-gradient-to-tr from-purple-500 to-[#f49ebb] flex items-center justify-center text-xs font-black text-white shadow-xs">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-stone-200 hidden sm:inline max-w-[100px] truncate">
                  {displayName}
                </span>
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f49ebb]/20 text-[#f49ebb] border border-[#f49ebb]/30">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Kitchen Queue & KDS</h3>
                </div>

                <div className="mt-4 space-y-2 text-xs text-stone-400">
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>{statsLoading ? '...' : `${stats.activeOrders} active tickets in queue`}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>Instant mark ready & counter dispatch</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>High-volume velocity tracking</span>
                  </div>
                </div>
              </div>

              <Link
                href="/orders"
                className="mt-5 inline-flex items-center gap-1 text-[11px] font-bold text-[#f49ebb] hover:underline"
              >
                <span>Open Kitchen Queue</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    <ClipboardList className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Inventory Controls</h3>
                </div>

                <div className="mt-4 space-y-2 text-xs text-stone-400">
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>{statsLoading ? '...' : `${stats.availableMenu} of ${stats.totalMenu} items available`}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>{statsLoading ? '...' : `${stats.lowStockCount} items at low threshold`}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>1-click 86 out-of-stock toggles</span>
                  </div>
                </div>
              </div>

              <Link
                href="/inventory"
                className="mt-5 inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 hover:underline"
              >
                <span>Manage Stock</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Pay Later & Wallets</h3>
                </div>

                <div className="mt-4 space-y-2 text-xs text-stone-400">
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>Faculty & staff post-paid credit dues</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>Testing wallet balance adjustments</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span>Instant clearance via Wallet or UPI</span>
                  </div>
                </div>
              </div>

              <Link
                href="/wallets"
                className="mt-5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:underline"
              >
                <span>Inspect Ledgers</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
              <h2 className="text-base font-bold text-white">Canteen Velocity</h2>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTimeframe('daily')}
                  className={`transition ${timeframe === 'daily' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('weekly')}
                  className={`transition ${timeframe === 'weekly' ? 'text-white' : 'text-stone-500 hover:text-stone-300'}`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframe('monthly')}
                  className={`relative pb-1 transition ${
                    timeframe === 'monthly'
                      ? 'text-white font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-purple-500 after:rounded-full'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="mt-6 relative h-64 w-full">
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] font-mono text-stone-500">
                <span>200</span>
                <span>150</span>
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>

              <div className="ml-8 h-full">
                <svg viewBox="0 0 1000 240" className="h-56 w-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="pinkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f49ebb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#f49ebb" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  <line x1="0" y1="30" x2="1000" y2="30" stroke="#23242e" strokeDasharray="3 3" />
                  <line x1="0" y1="85" x2="1000" y2="85" stroke="#23242e" strokeDasharray="3 3" />
                  <line x1="0" y1="140" x2="1000" y2="140" stroke="#23242e" strokeDasharray="3 3" />
                  <line x1="0" y1="195" x2="1000" y2="195" stroke="#23242e" strokeDasharray="3 3" />

                  <path
                    d={
                      timeframe === 'daily'
                        ? 'M 0 180 Q 200 60, 400 130 T 700 80 T 1000 120 L 1000 240 L 0 240 Z'
                        : timeframe === 'weekly'
                        ? 'M 0 160 Q 250 110, 500 70 T 800 100 T 1000 140 L 1000 240 L 0 240 Z'
                        : 'M 0 160 C 140 190, 180 80, 260 90 C 320 100, 360 170, 430 160 C 490 150, 520 180, 590 140 C 660 100, 710 110, 780 130 C 850 150, 890 80, 950 40 L 1000 70 L 1000 240 L 0 240 Z'
                    }
                    fill="url(#purpleGrad)"
                  />
                  <path
                    d={
                      timeframe === 'daily'
                        ? 'M 0 180 Q 200 60, 400 130 T 700 80 T 1000 120'
                        : timeframe === 'weekly'
                        ? 'M 0 160 Q 250 110, 500 70 T 800 100 T 1000 140'
                        : 'M 0 160 C 140 190, 180 80, 260 90 C 320 100, 360 170, 430 160 C 490 150, 520 180, 590 140 C 660 100, 710 110, 780 130 C 850 150, 890 80, 950 40 L 1000 70'
                    }
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="2.5"
                  />

                  <path
                    d={
                      timeframe === 'daily'
                        ? 'M 0 190 Q 220 120, 450 160 T 750 110 T 1000 160 L 1000 240 L 0 240 Z'
                        : timeframe === 'weekly'
                        ? 'M 0 180 Q 200 130, 480 120 T 780 140 T 1000 170 L 1000 240 L 0 240 Z'
                        : 'M 0 180 C 130 160, 190 130, 260 95 C 330 60, 360 110, 430 120 C 500 130, 530 80, 590 100 C 660 120, 700 170, 780 180 C 860 190, 910 170, 970 140 L 1000 150 L 1000 240 L 0 240 Z'
                    }
                    fill="url(#pinkGrad)"
                  />
                  <path
                    d={
                      timeframe === 'daily'
                        ? 'M 0 190 Q 220 120, 450 160 T 750 110 T 1000 160'
                        : timeframe === 'weekly'
                        ? 'M 0 180 Q 200 130, 480 120 T 780 140 T 1000 170'
                        : 'M 0 180 C 130 160, 190 130, 260 95 C 330 60, 360 110, 430 120 C 500 130, 530 80, 590 100 C 660 120, 700 170, 780 180 C 860 190, 910 170, 970 140 L 1000 150'
                    }
                    fill="none"
                    stroke="#f49ebb"
                    strokeWidth="2.5"
                  />

                  <circle cx="260" cy="90" r="4.5" fill="#f49ebb" stroke="#16171e" strokeWidth="2" />
                  <circle cx="430" cy="160" r="4.5" fill="#a78bfa" stroke="#16171e" strokeWidth="2" />
                  <circle cx="590" cy="100" r="4.5" fill="#f49ebb" stroke="#16171e" strokeWidth="2" />
                  <circle cx="780" cy="130" r="4.5" fill="#a78bfa" stroke="#16171e" strokeWidth="2" />
                  <circle cx="950" cy="40" r="5" fill="#a78bfa" stroke="#16171e" strokeWidth="2" />
                </svg>

                <div className="flex justify-between text-[10px] font-mono text-stone-500 pt-2">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                  <span>Nov</span>
                  <span>Dec</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-white">Live Orders & Pay Later Dues</h2>

            {filteredOrders.length === 0 ? (
              <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-8 text-center text-xs text-stone-400">
                No active canteen orders found matching search criteria.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredOrders.map((order) => {
                  const isPayLater = order.payment_method === 'pay_later';
                  const isUnpaid = order.payment_status === 'unpaid' || order.payment_status === 'pending';

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl bg-[#16171e] border border-white/[0.04] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md hover:border-white/[0.08] transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${
                            isPayLater ? 'bg-amber-500/15 text-amber-400' : 'bg-purple-500/15 text-purple-400'
                          }`}
                        >
                          {isPayLater ? <CreditCard className="h-5 w-5" /> : <Coffee className="h-5 w-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-white">
                              {order.order_number}
                            </h4>
                            <span className="text-[10px] text-stone-400 font-medium">
                              {order.customer?.display_name || 'Customer'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-400 mt-0.5">
                            {order.order_items?.length || 1} items &bull; ₹{((order.total || 0) / 100).toFixed(0)} &bull;{' '}
                            {isPayLater ? 'Faculty Pay Later' : order.payment_method || 'Testing Wallet'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <Link
                          href={`/orders?id=${order.id}`}
                          className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3 w-3" />
                        </Link>

                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                            isPayLater && isUnpaid
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : order.order_stage === 'READY_TO_PICK'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-stone-800 text-stone-300'
                          }`}
                        >
                          {isPayLater && isUnpaid ? 'Pay Later Due' : order.order_stage || order.order_status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <aside className="xl:col-span-4 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Collection Desk & Scanner</h3>
              <Link
                href="/scan"
                className="text-[11px] font-bold text-purple-400 hover:text-purple-300 transition"
              >
                + Scan QR
              </Link>
            </div>

            <div className="rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-[#181922] border border-purple-500/20 p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#16171e]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Counter #1 Desk</h4>
                  <p className="text-[11px] text-purple-300/80 font-medium">Head Operator On-Duty</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-stone-400">
                <Link
                  href="/scan"
                  title="Open Camera Scanner"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.12] transition"
                >
                  <QrCode className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  title="More actions"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-white hover:bg-white/[0.12] transition"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Live Kitchen Stream</h3>

            <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-4 divide-y divide-white/[0.04] shadow-xl">
              <div className="py-2.5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  D
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate">David S.</h5>
                    <span className="text-[10px] text-stone-500">2m ago</span>
                  </div>
                  <p className="text-[11px] text-stone-400 truncate">Ordered Chicken Biryani Rice Bowl</p>
                </div>
              </div>

              <div className="py-2.5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  E
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate">Prof. Edward S.</h5>
                    <span className="text-[10px] text-amber-400 font-semibold">Pay Later</span>
                  </div>
                  <p className="text-[11px] text-stone-400 truncate">Tab added: ₹180 via Faculty Pay Later</p>
                </div>
              </div>

              <div className="py-2.5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  M
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate">Monika S.</h5>
                    <span className="text-[10px] text-emerald-400 font-semibold">Ready</span>
                  </div>
                  <p className="text-[11px] text-stone-400 truncate">Ticket #CAF-102 marked ready for pickup</p>
                </div>
              </div>

              <div className="py-2.5 flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  R
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-white truncate">Dr. Ramesh</h5>
                    <span className="text-[10px] text-stone-500">14m ago</span>
                  </div>
                  <p className="text-[11px] text-stone-400 truncate">Cleared ₹240 Pay Later dues via UPI</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Campus Broadcast</h3>

            <div className="rounded-3xl bg-[#16171e] border border-white/[0.04] p-5 shadow-xl space-y-4">
              <form onSubmit={handleBroadcastSubmit} className="relative">
                <input
                  type="text"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Post alert to canteen monitors..."
                  className="w-full rounded-2xl bg-[#0d0e12] border border-white/[0.06] pl-4 pr-11 py-3 text-xs font-medium text-white placeholder-stone-400 focus:outline-none focus:border-purple-500/50"
                />
                <button
                  type="submit"
                  title="Broadcast notice"
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-xl bg-purple-600 text-white hover:bg-purple-500 transition active:scale-95 shadow-md shadow-purple-600/20"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              {broadcastSent && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-400 font-semibold">
                  <Check className="h-4 w-4" />
                  <span>Broadcast transmitted to digital menu boards!</span>
                </div>
              )}

              <div>
                <span className="block text-[11px] font-bold text-stone-400 mb-2">Staff On-Duty</span>
                <div className="flex flex-wrap gap-2">
                  {activeStaffList.map((st) => (
                    <div
                      key={st.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#1e2029] border border-white/[0.06] px-3 py-1 text-xs font-semibold text-stone-300"
                    >
                      <span>{st.name}</span>
                      <button
                        type="button"
                        onClick={() => removeStaff(st.id)}
                        className="text-stone-500 hover:text-white transition"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
