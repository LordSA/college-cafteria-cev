'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAdminAuth } from '../context/AdminAuthContext';
import {
  ShieldAlert,
  Lock,
  Loader2,
  Check,
  Search,
  Bell,
  LogOut,
  Send,
  Phone,
  MoreVertical,
  Link as LinkIcon,
  Timer,
  Trophy,
  Calendar,
  Bookmark,
  Settings,
  Home,
  X,
  Sparkles,
  ExternalLink,
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
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [newsInput, setNewsInput] = useState('');
  const [newsSent, setNewsSent] = useState(false);
  const [recipientTags, setRecipientTags] = useState([
    { id: '1', name: 'Lolita M.', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces' },
    { id: '2', name: 'Obin D.', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces' },
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

  const handleNewsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsInput.trim()) return;
    setNewsSent(true);
    setNewsInput('');
    setTimeout(() => setNewsSent(false), 3000);
  };

  const removeTag = (id: string) => {
    setRecipientTags((prev) => prev.filter((t) => t.id !== id));
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
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">My Dashboard</h1>
            <p className="mt-2 text-xs text-stone-400 leading-relaxed">
              Operations control, tariff subscriptions, network velocity, and online operator consultation.
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

  const messageFeed = [
    {
      id: '1',
      name: 'David S.',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces',
      text: 'Your mobile internet is amazing!',
    },
    {
      id: '2',
      name: 'David S.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&crop=faces',
      text: 'Alexatel, your service is awe...',
    },
    {
      id: '3',
      name: 'David S.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces',
      text: 'Thanks for the great mobile...',
    },
    {
      id: '4',
      name: 'David S.',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=96&h=96&fit=crop&crop=faces',
      text: 'Wow, Alexatel, your internet...',
    },
    {
      id: '5',
      name: 'David S.',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=96&h=96&fit=crop&crop=faces',
      text: 'Alexatel - the best mobile...',
    },
  ];

  return (
    <div className="min-h-screen bg-[#101114] text-slate-100 flex flex-col md:flex-row select-none">
      <aside className="w-full md:w-20 bg-[#121316] border-b md:border-b-0 md:border-r border-[#1e1f25] flex md:flex-col items-center justify-between py-6 px-3 flex-shrink-0 z-30">
        <div className="flex md:flex-col items-center gap-7">
          <Link href="/" className="flex flex-col items-center gap-1.5 group">
            <div className="flex h-10 w-10 items-center justify-center">
              <svg viewBox="0 0 32 32" className="h-8 w-8 text-[#9d8bf0] fill-none stroke-current stroke-2">
                <path d="M 10 10 C 6 10, 6 16, 10 16 C 14 16, 18 10, 22 10 C 26 10, 26 16, 22 16" />
                <path d="M 22 16 C 26 16, 26 22, 22 22 C 18 22, 14 16, 10 16 C 6 16, 6 22, 10 22" />
              </svg>
            </div>
            <span className="text-[8px] font-black tracking-widest uppercase text-stone-400 group-hover:text-white transition">
              ALEXATEL
            </span>
          </Link>

          <nav className="flex md:flex-col items-center gap-4">
            <Link
              href="/"
              title="Dashboard"
              className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#f5a4c6] text-[#101114] shadow-lg shadow-[#f5a4c6]/20 transition active:scale-95"
            >
              <Home className="h-5 w-5 fill-[#101114] stroke-[#101114]" />
            </Link>

            <Link
              href="/orders"
              title="Orders & Timer"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-white transition"
            >
              <Timer className="h-5 w-5" />
            </Link>

            <Link
              href="/inventory"
              title="Inventory & Rankings"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-white transition"
            >
              <Trophy className="h-5 w-5" />
            </Link>

            <Link
              href="/scan"
              title="Calendar & QR"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-white transition"
            >
              <Calendar className="h-5 w-5" />
            </Link>

            <Link
              href="/menu"
              title="Bookmarks & Menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-white transition"
            >
              <Bookmark className="h-5 w-5" />
            </Link>

            <Link
              href="/staff-requests"
              title="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-white transition"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </nav>
        </div>

        <div className="flex md:flex-col items-center gap-3">
          <button
            onClick={signOut}
            title="Sign Out"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-stone-500 hover:text-white transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 p-5 sm:p-7 lg:p-9 grid grid-cols-1 xl:grid-cols-12 gap-7 overflow-x-hidden">
        <main className="xl:col-span-8 space-y-6">
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
              My Dashboard
            </h1>

            <div className="flex items-center gap-4">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-full rounded-full bg-[#17181f] border border-[#23242e] pl-5 pr-10 py-2.5 text-xs font-medium text-white placeholder-stone-500 focus:outline-none focus:border-[#a78bfa]/60"
                />
                <Search className="absolute right-4 top-3 h-4 w-4 text-stone-500" />
              </div>

              <button
                type="button"
                title="Notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-stone-300 hover:text-white transition"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1.5 h-1.5 w-1.5 rounded-full bg-[#f5a4c6]" />
              </button>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full overflow-hidden border border-white/10 shadow-sm">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces"
                    alt="Admin user avatar"
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="hidden sm:inline text-xs font-bold text-stone-200">
                  {adminProfile?.display_name || 'Admin'}
                </span>

                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-stone-400 hover:text-white transition"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5a4c6]/20 text-[#f5a4c6]">
                      <div className="grid grid-cols-2 gap-0.5">
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                        <span className="h-1 w-1 rounded-full bg-current" />
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Tariff Plans</h3>
                  </div>
                  {statsLoading ? (
                    <span className="text-[10px] text-stone-500">...</span>
                  ) : (
                    <span className="rounded-full bg-[#f5a4c6]/15 text-[#f5a4c6] text-[10px] font-bold px-2 py-0.5 border border-[#f5a4c6]/30">
                      {stats.activeOrders} Active
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2.5 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Choice of base tariff</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Ability to add additional options</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>View and compare available tariff plans</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#9d8bf0]/20 text-[#9d8bf0]">
                      <div className="h-3 w-3 border border-current rounded-sm" />
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Additional Options</h3>
                  </div>
                  <span className="rounded-full bg-[#9d8bf0]/15 text-[#9d8bf0] text-[10px] font-bold px-2 py-0.5 border border-[#9d8bf0]/30">
                    {stats.totalMenu} Items
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Increase internet speed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Adding additional minutes and sms</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Connection of special service packages</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#ea9955]/20 text-[#ea9955]">
                      <div className="h-3 w-3 rounded-full border border-current" />
                    </div>
                    <h3 className="text-xs font-bold text-white tracking-wide">Subscription Management</h3>
                  </div>
                  <span className="rounded-full bg-[#ea9955]/15 text-[#ea9955] text-[10px] font-bold px-2 py-0.5 border border-[#ea9955]/30">
                    {stats.pendingStaff} Pending
                  </span>
                </div>

                <div className="mt-4 space-y-2.5 text-[11px] text-stone-400">
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Disable/enable subscriptions to various services</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Control access to content</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-stone-400 flex-shrink-0" />
                    <span>Cancel services</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-[#23242e] pb-4">
              <h2 className="text-sm font-bold text-white tracking-wide">Network Speed</h2>

              <div className="flex items-center gap-5 text-xs font-medium">
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
                      ? 'text-white font-bold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#8e75db]'
                      : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  Monthly
                </button>
              </div>
            </div>

            <div className="mt-6 relative h-60 w-full">
              <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[11px] font-mono text-stone-600">
                <span>200</span>
                <span>150</span>
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>

              <div className="ml-9 h-full">
                <svg viewBox="0 0 1000 220" className="h-52 w-full overflow-visible" preserveAspectRatio="none">
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
                  <line x1="0" y1="60" x2="1000" y2="60" stroke="#1d1e27" strokeDasharray="2 2" />
                  <line x1="0" y1="110" x2="1000" y2="110" stroke="#1d1e27" strokeDasharray="2 2" />
                  <line x1="0" y1="160" x2="1000" y2="160" stroke="#1d1e27" strokeDasharray="2 2" />

                  <path
                    d="M 0 140 C 130 180, 180 70, 240 80 C 300 90, 340 170, 410 160 C 480 150, 500 180, 580 135 C 650 95, 700 110, 770 130 C 840 150, 870 70, 930 35 L 1000 60 L 1000 220 L 0 220 Z"
                    fill="url(#purpleGradient)"
                  />
                  <path
                    d="M 0 140 C 130 180, 180 70, 240 80 C 300 90, 340 170, 410 160 C 480 150, 500 180, 580 135 C 650 95, 700 110, 770 130 C 840 150, 870 70, 930 35 L 1000 60"
                    fill="none"
                    stroke="#9d8bf0"
                    strokeWidth="2.5"
                  />

                  <path
                    d="M 0 170 C 120 150, 170 125, 240 90 C 300 60, 340 110, 410 120 C 480 130, 510 75, 580 95 C 650 115, 680 170, 760 175 C 840 180, 880 160, 940 135 L 1000 145 L 1000 220 L 0 220 Z"
                    fill="url(#pinkGradient)"
                  />
                  <path
                    d="M 0 170 C 120 150, 170 125, 240 90 C 300 60, 340 110, 410 120 C 480 130, 510 75, 580 95 C 650 115, 680 170, 760 175 C 840 180, 880 160, 940 135 L 1000 145"
                    fill="none"
                    stroke="#f5a4c6"
                    strokeWidth="2.5"
                  />

                  <circle cx="240" cy="80" r="4.5" fill="#f5a4c6" stroke="#17181f" strokeWidth="2" />
                  <circle cx="410" cy="160" r="4.5" fill="#9d8bf0" stroke="#17181f" strokeWidth="2" />
                  <circle cx="580" cy="95" r="4.5" fill="#f5a4c6" stroke="#17181f" strokeWidth="2" />
                  <circle cx="760" cy="175" r="4.5" fill="#9d8bf0" stroke="#17181f" strokeWidth="2" />
                  <circle cx="930" cy="35" r="5" fill="#9d8bf0" stroke="#17181f" strokeWidth="2" />
                </svg>

                <div className="flex justify-between text-[11px] font-mono text-stone-500 pt-2">
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
            <h2 className="text-sm font-bold text-white tracking-wide">Current Partnerships</h2>

            <div className="space-y-3">
              <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f39c6b]/20 text-[#f39c6b]">
                    <div className="h-5 w-5 rounded-full border-2 border-current flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white">Bowl Club</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">1 partner</p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col text-xs">
                  <span className="text-stone-300 font-medium">Read more on the website</span>
                  <div className="flex items-center gap-1 text-[11px] text-[#9d8bf0]">
                    <LinkIcon className="h-3 w-3" />
                    <span className="underline">alexatel/partnerships</span>
                  </div>
                </div>

                <div className="rounded-full bg-[#1b251f] text-[#6ee7b7] border border-[#6ee7b7]/20 px-4 py-1.5 text-xs font-semibold">
                  Since 2024
                </div>
              </div>

              <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-4 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-4">
                  <div className="h-11 w-11 rounded-full overflow-hidden border border-white/10">
                    <img
                      src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces"
                      alt="Edward S."
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white">Edward S.</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">2 partner</p>
                  </div>
                </div>

                <div className="hidden sm:flex flex-col text-xs">
                  <span className="text-stone-300 font-medium">Read more on the website</span>
                  <div className="flex items-center gap-1 text-[11px] text-[#9d8bf0]">
                    <LinkIcon className="h-3 w-3" />
                    <span className="underline">alexatel/partnerships</span>
                  </div>
                </div>

                <div className="rounded-full bg-[#271f2a] text-[#d8b4fe] border border-[#d8b4fe]/20 px-4 py-1.5 text-xs font-semibold">
                  Since 2019
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="xl:col-span-4 space-y-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-200">Online consultation with an operator</h3>
              <button
                type="button"
                className="text-xs font-bold text-stone-400 hover:text-white transition"
              >
                + Join
              </button>
            </div>

            <div className="rounded-2xl bg-[#8587e8] text-[#121316] p-4 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-full overflow-hidden border-2 border-white/40 shadow-xs">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=96&h=96&fit=crop&crop=faces"
                    alt="Monika S."
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-stone-950">Monika S.</h4>
                </div>
              </div>

              <div className="flex items-center gap-3 text-stone-900">
                <button type="button" title="Call operator" className="hover:opacity-75 transition">
                  <Phone className="h-4 w-4" />
                </button>
                <button type="button" title="Options" className="hover:opacity-75 transition">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-stone-200">Messages</h3>

            <div className="space-y-4 pt-1">
              {messageFeed.map((msg) => (
                <div key={msg.id} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={msg.avatar} alt={msg.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h5 className="text-xs font-bold text-stone-200">{msg.name}</h5>
                    <p className="text-[11px] text-stone-500 truncate leading-tight mt-0.5">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-stone-200">Update News</h3>

            <form onSubmit={handleNewsSubmit} className="relative">
              <input
                type="text"
                value={newsInput}
                onChange={(e) => setNewsInput(e.target.value)}
                placeholder="Guys, there's a new rate plan"
                className="w-full rounded-2xl bg-[#17181f] border border-[#22242e] pl-4 pr-11 py-3 text-xs font-medium text-white placeholder-stone-500 focus:outline-none focus:border-[#a78bfa]/60"
              />
              <button
                type="submit"
                title="Send update"
                className="absolute right-3 top-3 text-stone-400 hover:text-white transition"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>

            {newsSent && (
              <div className="text-[11px] text-[#6ee7b7] font-semibold">
                Update dispatched successfully!
              </div>
            )}

            <div className="pt-2">
              <span className="block text-xs font-bold text-stone-200 mb-2.5">Send Messages</span>
              <div className="flex flex-wrap gap-2.5">
                {recipientTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="inline-flex items-center gap-2 rounded-full bg-[#17181f] border border-[#22242e] pl-1.5 pr-3 py-1 text-xs font-semibold text-stone-300"
                  >
                    <div className="h-5 w-5 rounded-full overflow-hidden">
                      <img src={tag.avatar} alt={tag.name} className="h-full w-full object-cover" />
                    </div>
                    <span>{tag.name}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(tag.id)}
                      className="text-stone-500 hover:text-white transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
