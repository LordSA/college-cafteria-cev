'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Search,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Landmark,
  CheckCircle2,
} from 'lucide-react';

interface PaymentRecord {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  amount_paise: number;
  amount_inr: string;
  payment_method: string;
  payment_status: string;
  order_stage: string;
  razorpay_payment_id?: string | null;
  created_at: string;
  paid_at?: string;
}

interface RazorpayPaymentRecord {
  id: string;
  order_id: string | null;
  order_number: string | null;
  amount: number;
  amount_inr: string;
  currency: string;
  status: string;
  method: string;
  vpa: string | null;
  bank: string | null;
  wallet: string | null;
  email: string | null;
  contact: string | null;
  customer_name: string;
  description: string | null;
  fee: number;
  fee_inr: string;
  tax: number;
  created_at: string;
  captured: boolean;
}

interface SettlementRecord {
  id: string;
  amount: number;
  amount_inr: string;
  status: string;
  fees: number;
  fees_inr: string;
  tax: number;
  tax_inr: string;
  utr?: string | null;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminFinancialPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canAccessDashboard } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'razorpay' | 'database' | 'settlement'>('razorpay');
  const [razorpayRange, setRazorpayRange] = useState<'today' | 'all'>('today');
  const [razorpayPayments, setRazorpayPayments] = useState<RazorpayPaymentRecord[]>([]);
  const [razorpayLoading, setRazorpayLoading] = useState(false);
  const [razorpayTotalCapturedPaise, setRazorpayTotalCapturedPaise] = useState<number>(0);

  const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
  const [settlementsLoading, setSettlementsLoading] = useState(false);
  const [settlementsTotalPaise, setSettlementsTotalPaise] = useState<number>(0);

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'database') {
        setActiveTab('database');
      } else if (tabParam === 'settlement') {
        setActiveTab('settlement');
      } else {
        setActiveTab('razorpay');
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canAccessDashboard) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, canAccessDashboard, authLoading, router]);

  const loadRazorpayPayments = async (range: 'today' | 'all' = razorpayRange) => {
    if (!session?.access_token) return;

    setRazorpayLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/razorpay-payments?range=${range}&count=100&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch Razorpay gateway payments');
      }

      setRazorpayPayments(body.data?.items || []);
      setRazorpayTotalCapturedPaise(body.data?.total_captured_paise || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading live Razorpay logs');
    } finally {
      setRazorpayLoading(false);
    }
  };

  const loadDatabasePayments = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const q = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/payments?limit=200${q}&t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch financial payments ledger');
      }

      setPayments(body.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading payments');
    } finally {
      setLoading(false);
    }
  };

  const loadSettlements = async () => {
    if (!session?.access_token) return;

    setSettlementsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/razorpay-settlements?count=50&t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch settlements from Razorpay');
      }

      setSettlements(body.data?.items || []);
      setSettlementsTotalPaise(body.data?.total_settled_paise || 0);
    } catch (err: any) {
      setError(err.message || 'Error loading settlements');
    } finally {
      setSettlementsLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      if (activeTab === 'razorpay') {
        loadRazorpayPayments(razorpayRange);
      } else if (activeTab === 'settlement') {
        loadSettlements();
      } else {
        loadDatabasePayments();
      }
    }
  }, [adminUser, isUnauthorized, session?.access_token, activeTab, razorpayRange]);

  const handleExportExcel = async () => {
    if (!session?.access_token) return;
    setExporting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/reports/export?range=all`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial_ledger_${new Date().toISOString().slice(0, 10)}.xlsx`;
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

  const filteredRazorpay = razorpayPayments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.id.toLowerCase().includes(q) ||
      (p.order_number && p.order_number.toLowerCase().includes(q)) ||
      (p.order_id && p.order_id.toLowerCase().includes(q)) ||
      (p.vpa && p.vpa.toLowerCase().includes(q)) ||
      p.customer_name.toLowerCase().includes(q) ||
      (p.email && p.email.toLowerCase().includes(q)) ||
      (p.contact && p.contact.toLowerCase().includes(q))
    );
  });

  const filteredDbPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.order_number.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q) ||
      p.customer_email.toLowerCase().includes(q) ||
      (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q))
    );
  });

  const totalPaise = filteredDbPayments.reduce((acc, p) => acc + (p.payment_status === 'paid' ? p.amount_paise : 0), 0);
  const upiPaise = filteredDbPayments.reduce((acc, p) => acc + (p.payment_method === 'razorpay' && p.payment_status === 'paid' ? p.amount_paise : 0), 0);
  const payLaterPaise = filteredDbPayments.reduce((acc, p) => acc + (p.payment_method === 'pay_later' ? p.amount_paise : 0), 0);

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-[#252525]">
        <div className="flex flex-col items-center gap-3 text-[#666666]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
          <p className="text-xs font-semibold">Loading financial records...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F47721] hover:underline mb-2"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Dashboard</span>
                </Link>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                    Financial Overview
                  </h1>
                </div>
                <p className="mt-1 text-xs text-[#666666]">
                  Transaction logs from payment logs
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => (activeTab === 'razorpay' ? loadRazorpayPayments(razorpayRange) : activeTab === 'settlement' ? loadSettlements() : loadDatabasePayments())}
                  disabled={loading || razorpayLoading || settlementsLoading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${(loading || razorpayLoading || settlementsLoading) ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                {activeTab === 'database' && (
                  <button
                    onClick={handleExportExcel}
                    disabled={exporting}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                  >
                    {exporting ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span>Export (.xlsx)</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-[#EEEEEE] pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('razorpay')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition shadow-xs ${activeTab === 'razorpay'
                  ? 'bg-[#F47721] text-white shadow-[#F47721]/25'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-stone-100 hover:text-[#252525]'
                  }`}
              >
                <span>Razorpay Logs</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'razorpay' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
                  {razorpayPayments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('database')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition shadow-xs ${activeTab === 'database'
                  ? 'bg-[#F47721] text-white shadow-[#F47721]/25'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-stone-100 hover:text-[#252525]'
                  }`}
              >
                <span>Total Revenue</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'database' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
                  {payments.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settlement')}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold transition shadow-xs ${activeTab === 'settlement'
                  ? 'bg-[#F47721] text-white shadow-[#F47721]/25'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-stone-100 hover:text-[#252525]'
                  }`}
              >
                <span>Bank Settlements</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${activeTab === 'settlement' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'}`}>
                  {settlements.length}
                </span>
              </button>
            </div>

            {activeTab === 'razorpay' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAFAFA] border border-[#EEEEEE] p-3.5 rounded-full">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#666666]">Filter Range:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRazorpayRange('today');
                        loadRazorpayPayments('today');
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${razorpayRange === 'today'
                        ? 'bg-[#F47721] text-white shadow-xs'
                        : 'bg-white border border-[#EEEEEE] text-[#666666] hover:text-[#252525]'
                        }`}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRazorpayRange('all');
                        loadRazorpayPayments('all');
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${razorpayRange === 'all'
                        ? 'bg-[#F47721] text-white shadow-xs'
                        : 'bg-white border border-[#EEEEEE] text-[#666666] hover:text-[#252525]'
                        }`}
                    >
                      All
                    </button>

                  </div>
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by Payment ID"
                      className="w-full rounded-full bg-white border border-[#EEEEEE] hover:border-gray-300 pl-4 pr-9 py-2.5 text-xs font-medium text-[#252525] placeholder:text-[#888888] focus:outline-none focus:border-[#F47721] focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                    />
                    <Search className="absolute right-3.5 top-3 h-3.5 w-3.5 text-[#888888]" />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-5 shadow-xs">
                    <span className="text-[11px] font-bold text-emerald-800 tracking-wide uppercase">
                      Total Recieved
                    </span>
                    <div className="mt-2 text-2xl font-black text-emerald-800 font-mono">
                      ₹{(razorpayTotalCapturedPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] p-5 shadow-xs">
                    <span className="text-[11px] font-bold text-[#666666] tracking-wide uppercase">
                      Succesfull Transactions
                    </span>
                    <div className="mt-2 text-2xl font-black text-[#252525] font-mono">
                      {filteredRazorpay.filter((p) => p.status === 'captured').length}
                    </div>
                  </div>

                </div>

                <div className="flex items-center gap-3">

                </div>

                {razorpayLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                    <p className="text-xs font-semibold">Loading...</p>
                  </div>
                ) : filteredRazorpay.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                    <h3 className="mt-3 text-sm font-bold text-[#252525]">No Payments Found</h3>
                    <p className="mt-1 text-xs text-[#666666]">
                      {searchQuery ? 'Try matching another query or clear the filter.' : 'Live payments completed via Razorpay will appear here instantly.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#252525]">
                        <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                          <tr>
                            <th className="px-6 py-3.5 font-bold">Razorpay Payment ID</th>
                            <th className="px-6 py-3.5 font-bold">Payer / Contact</th>
                            <th className="px-6 py-3.5 font-bold">Date & Time (IST)</th>
                            <th className="px-6 py-3.5 font-bold">Method</th>
                            <th className="px-6 py-3.5 font-bold">Gross Amount (₹)</th>
                            <th className="px-6 py-3.5 font-bold">Gateway Fee (₹)</th>
                            <th className="px-6 py-3.5 font-bold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE] font-medium">
                          {filteredRazorpay.map((p) => {
                            const d = new Date(p.created_at);
                            const dateFormatted = d.toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            });
                            const timeFormatted = d.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <tr key={p.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-[#252525]">
                                  <div>{p.id}</div>
                                  {p.order_number && (
                                    <div className="text-[10px] font-mono text-[#888888]">#{p.order_number}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-[#252525]">{p.customer_name}</div>
                                  {p.contact && (
                                    <div className="text-[10px] text-[#666666] font-mono">{p.contact}</div>
                                  )}
                                  {p.email && (
                                    <div className="text-[10px] text-[#888888]">{p.email}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-[#666666]">
                                  <div className="font-semibold text-[#252525]">{dateFormatted}</div>
                                  <div className="text-[10px]">{timeFormatted}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-block uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    {p.vpa ? `UPI: ${p.vpa}` : (p.method || 'Razorpay').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm font-extrabold text-[#269B62] tabular-nums">
                                  ₹{p.amount_inr}
                                </td>
                                <td className="px-6 py-4 font-mono text-xs text-[#888888] tabular-nums">
                                  ₹{p.fee_inr}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.status === 'captured'
                                      ? 'bg-green-50 text-[#269B62] border border-green-200'
                                      : p.status === 'authorized'
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      }`}
                                  >
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2x  l bg-[#FAFAFA] border border-[#EEEEEE] p-5 shadow-xs">
                    <span className="text-[11px] font-bold text-[#666666] tracking-wide uppercase">
                      Revenue
                    </span>
                    <div className="mt-2 text-2xl font-black text-[#252525] font-mono">
                      ₹{(totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-orange-50/50 border border-orange-200/80 p-5 shadow-xs">
                    <span className="text-[11px] font-bold text-[#F47721] tracking-wide uppercase">
                      Razorpay Revenue
                    </span>
                    <div className="mt-2 text-2xl font-black text-[#F47721] font-mono">
                      ₹{(upiPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-amber-50/50 border border-amber-200/80 p-5 shadow-xs">
                    <span className="text-[11px] font-bold text-amber-800 tracking-wide uppercase">
                      Faculty Post-Payment
                    </span>
                    <div className="mt-2 text-2xl font-black text-amber-900 font-mono">
                      ₹{(payLaterPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by Order #, Customer, or Payment ID..."
                      className="w-full rounded-xl bg-white border border-[#EEEEEE] hover:border-gray-300 pl-4 pr-9 py-2.5 text-xs font-medium text-[#252525] placeholder:text-[#888888] focus:outline-none focus:border-[#F47721] focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                    />
                    <Search className="absolute right-3.5 top-3 h-3.5 w-3.5 text-[#888888]" />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43]">
                    <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43] mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                    <p className="text-xs font-semibold">Fetching payment records from database...</p>
                  </div>
                ) : filteredDbPayments.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                    <h3 className="mt-3 text-sm font-bold text-[#252525]">No Database Orders Found</h3>
                    <p className="mt-1 text-xs text-[#666666]">
                      {searchQuery ? 'Try matching another query or clear the filter.' : 'Completed orders will be recorded here.'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#252525]">
                        <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                          <tr>
                            <th className="px-6 py-3.5 font-bold">Order #</th>
                            <th className="px-6 py-3.5 font-bold">Customer</th>
                            <th className="px-6 py-3.5 font-bold">Date & Time</th>
                            <th className="px-6 py-3.5 font-bold">Method</th>
                            <th className="px-6 py-3.5 font-bold">Gateway Ref ID</th>
                            <th className="px-6 py-3.5 font-bold">Amount (₹)</th>
                            <th className="px-6 py-3.5 font-bold text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE] font-medium">
                          {filteredDbPayments.map((p) => {
                            const d = new Date(p.paid_at || p.created_at);
                            const dateFormatted = d.toLocaleDateString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            });
                            const timeFormatted = d.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <tr key={p.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-[#252525]">
                                  #{p.order_number}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-[#252525]">{p.customer_name}</div>
                                  <div className="text-[10px] text-[#666666]">{p.customer_email}</div>
                                </td>
                                <td className="px-6 py-4 text-[#666666]">
                                  <div className="font-semibold text-[#252525]">{dateFormatted}</div>
                                  <div className="text-[10px]">{timeFormatted}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-block uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7F0] text-[#F47721] border border-[#F47721]/30">
                                    {p.payment_method === 'razorpay' ? 'Razorpay / UPI' : p.payment_method === 'pay_later' ? 'Pay Later' : p.payment_method}
                                  </span>
                                </td>
                                <td className="px-6 py-4 font-mono text-[11px] text-[#666666]">
                                  {p.razorpay_payment_id || '—'}
                                </td>
                                <td className="px-6 py-4 font-mono text-sm font-extrabold text-[#269B62] tabular-nums">
                                  ₹{p.amount_inr}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${p.payment_status === 'paid'
                                      ? 'bg-green-50 text-[#269B62] border border-green-200'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                                      }`}
                                  >
                                    {p.payment_status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settlement' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">
                      Total Bank Payouts
                    </span>
                    <div className="mt-1 font-mono text-2xl font-black text-[#252525] tabular-nums">
                      ₹{(settlementsTotalPaise / 100).toFixed(2)}
                    </div>
                  </div>
                </div>

                {settlementsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                    <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                    <p className="text-xs font-semibold">Connecting to Razorpay Settlements API...</p>
                  </div>
                ) : settlements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center space-y-2">
                    <Landmark className="mx-auto h-8 w-8 text-[#888888]" />
                    <h3 className="text-sm font-bold text-[#252525]">No Bank Settlements Found</h3>
                    <p className="text-xs text-[#666666] max-w-md mx-auto">
                      Settlement logs stream directly from Razorpay once the daily settlement cycle completes and funds are dispatched to your verified bank account.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-[#252525]">
                        <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                          <tr>
                            <th className="px-6 py-3.5 font-bold">Settlement ID</th>
                            <th className="px-6 py-3.5 font-bold">Transfer Amount (₹)</th>
                            <th className="px-6 py-3.5 font-bold">Fees & Taxes</th>
                            <th className="px-6 py-3.5 font-bold">Bank UTR Reference</th>
                            <th className="px-6 py-3.5 font-bold">Status</th>
                            <th className="px-6 py-3.5 font-bold text-right">Settled Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEEEEE] font-medium">
                          {settlements.map((s) => (
                            <tr key={s.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                              <td className="px-6 py-4 font-mono font-bold text-[#252525]">
                                {s.id}
                              </td>
                              <td className="px-6 py-4 font-mono text-sm font-black text-[#269B62] tabular-nums">
                                ₹{s.amount_inr}
                              </td>
                              <td className="px-6 py-4 text-[11px] text-[#666666]">
                                <div>Fee: ₹{s.fees_inr}</div>
                                <div className="text-[10px] text-[#888888]">Tax: ₹{s.tax_inr}</div>
                              </td>
                              <td className="px-6 py-4 font-mono text-xs font-semibold text-[#252525]">
                                {s.utr || <span className="text-[#888888]">Pending</span>}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.status === 'processed'
                                  ? 'bg-emerald-50 text-[#269B62] border border-emerald-200'
                                  : s.status === 'created'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : 'bg-red-50 text-[#D94A43] border border-red-200'
                                  }`}>
                                  {s.status === 'processed' && <CheckCircle2 className="h-3 w-3" />}
                                  <span>{s.status}</span>
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-[11px] text-[#666666]">
                                {new Date(s.created_at).toLocaleString('en-IN', {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
