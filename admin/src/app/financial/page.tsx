'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  CreditCard,
  Search,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  ArrowLeft,
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

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export default function AdminFinancialPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canAccessDashboard } = useAdminAuth();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canAccessDashboard) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, canAccessDashboard, authLoading, router]);

  const loadPayments = async () => {
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

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      loadPayments();
    }
  }, [adminUser, isUnauthorized, session?.access_token]);

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

  const filteredPayments = payments.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.order_number.toLowerCase().includes(q) ||
      p.customer_name.toLowerCase().includes(q) ||
      p.customer_email.toLowerCase().includes(q) ||
      (p.razorpay_payment_id && p.razorpay_payment_id.toLowerCase().includes(q))
    );
  });

  const totalPaise = filteredPayments.reduce((acc, p) => acc + (p.payment_status === 'paid' ? p.amount_paise : 0), 0);
  const upiPaise = filteredPayments.reduce((acc, p) => acc + (p.payment_method === 'razorpay' && p.payment_status === 'paid' ? p.amount_paise : 0), 0);
  const payLaterPaise = filteredPayments.reduce((acc, p) => acc + (p.payment_method === 'pay_later' ? p.amount_paise : 0), 0);

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white text-[#252525]">
        <div className="flex flex-col items-center gap-3 text-[#666666]">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
          <p className="text-xs font-semibold">Loading ledger records...</p>
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
                <h1 className="text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  Financial Ledger
                </h1>
                <p className="mt-1 text-xs text-[#666666]">
                  Real-time payment logs, UPI verification codes, and financial audit logs
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={loadPayments}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

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
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] p-5 shadow-xs">
                <span className="text-[11px] font-bold text-[#666666] tracking-wide uppercase">
                  Settled Revenue
                </span>
                <div className="mt-2 text-2xl font-black text-[#252525] font-mono">
                  ₹{(totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="mt-1 text-[11px] text-[#666666]">
                  Across {filteredPayments.filter((p) => p.payment_status === 'paid').length} completed transactions
                </p>
              </div>

              <div className="rounded-2xl bg-orange-50/50 border border-orange-200/80 p-5 shadow-xs">
                <span className="text-[11px] font-bold text-[#F47721] tracking-wide uppercase">
                  Razorpay UPI Settled
                </span>
                <div className="mt-2 text-2xl font-black text-[#F47721] font-mono">
                  ₹{(upiPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="mt-1 text-[11px] text-orange-700/80">
                  Instant UPI verified payments
                </p>
              </div>

              <div className="rounded-2xl bg-amber-50/50 border border-amber-200/80 p-5 shadow-xs">
                <span className="text-[11px] font-bold text-amber-800 tracking-wide uppercase">
                  Faculty Post-Pay Balance
                </span>
                <div className="mt-2 text-2xl font-black text-amber-900 font-mono">
                  ₹{(payLaterPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <p className="mt-1 text-[11px] text-amber-700/80">
                  Total cumulative faculty debt orders
                </p>
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
                <p className="text-xs font-semibold">Fetching payment records from gateway...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                <CreditCard className="mx-auto h-8 w-8 text-[#888888]" />
                <h3 className="mt-3 text-sm font-bold text-[#252525]">No Payment Records Found</h3>
                <p className="mt-1 text-xs text-[#666666]">
                  {searchQuery ? 'Try matching another query or clear the filter.' : 'Completed payments will be recorded here.'}
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
                      {filteredPayments.map((p) => {
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
                                {p.payment_method === 'razorpay' ? 'UPI' : p.payment_method === 'testing_wallet' ? 'Wallet' : p.payment_method}
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
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  p.payment_status === 'paid'
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
        </main>
        <Footer />
      </div>
    </div>
  );
}
