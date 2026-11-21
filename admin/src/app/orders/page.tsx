'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  ReceiptText,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  QrCode,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Printer,
} from 'lucide-react';

interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface AdminOrder {
  id: string;
  order_number: string;
  order_stage?: 'ORDER_PLACED' | 'COLLECTED';
  order_status: string;
  payment_status: string;
  payment_method?: string;
  qr_verification_token?: string | null;
  collected_at?: string | null;
  collected_by?: string | null;
  ready_at?: string | null;
  subtotal: number;
  total: number;
  cancellation_reason?: string | null;
  customer_name?: string;
  customer_account_type?: string;
  created_at: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminOrdersPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canManageOrders, role } = useAdminAuth();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canManageOrders) {
        if (role === 'retail') {
          router.push('/inventory');
        } else if (role === 'printer') {
          router.push('/printer');
        } else {
          router.push('/unauthorized');
        }
      }
    }
  }, [adminUser, isUnauthorized, canManageOrders, role, authLoading, router]);

  const loadOrders = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/api/v1/admin/orders`);
      if (statusFilter !== 'all') {
        url.searchParams.set('stage', statusFilter);
      }
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to fetch operations orders');
      }

      setOrders(data.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching orders';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, statusFilter, searchQuery]);

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      loadOrders();
    }
  }, [adminUser, isUnauthorized, loadOrders]);

  const toggleExpand = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getOrderStage = (order: AdminOrder): 'ORDER_PLACED' | 'COLLECTED' => {
    if (order.order_status === 'completed' || order.order_status === 'COLLECTED' || order.order_stage === 'COLLECTED') return 'COLLECTED';
    return 'ORDER_PLACED';
  };

  const renderStageBadge = (stage: 'ORDER_PLACED' | 'COLLECTED') => {
    switch (stage) {
      case 'ORDER_PLACED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
            <Clock className="h-3 w-3" />
            <span>Order Placed</span>
          </span>
        );
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2.5 py-0.5 text-[11px] font-bold text-[#269B62]">
            <CheckCircle2 className="h-3 w-3" />
            <span>Collected</span>
          </span>
        );
    }
  };

  const stageTabs = [
    { key: 'all', label: 'All Orders' },
    { key: 'ORDER_PLACED', label: 'Order Placed' },
    { key: 'COLLECTED', label: 'Collected' },
  ];

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  Orders
                </h1>
                <p className="mt-1 text-xs text-[#666666]">
                  Monitor incoming orders
                </p>
              </div>

              <button
                onClick={loadOrders}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-xs self-start sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#F47721]" />
                <span>Refresh Queue</span>
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {stageTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setStatusFilter(tab.key)}
                    className={`rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition ${statusFilter === tab.key
                      ? 'bg-[#F47721] text-white shadow-md shadow-[#F47721]/20'
                      : 'bg-white text-[#666666] border border-[#EEEEEE] hover:bg-gray-50 hover:text-[#252525]'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#888888]" />
                  <input
                    type="text"
                    placeholder="Search order #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-[#EEEEEE] hover:border-gray-300 bg-white pl-9 pr-4 py-2 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#666666] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                <p className="text-xs font-semibold">Loading...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center space-y-3">
                <ReceiptText className="mx-auto h-8 w-8 text-[#888888]" />
                <h2 className="text-sm font-bold text-[#252525]">No orders found</h2>
                <p className="text-xs text-[#666666]">
                  {statusFilter === 'all'
                    ? 'No canteen orders have been recorded yet.'
                    : `No orders currently in "${statusFilter}" status.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  const stage = getOrderStage(order);

                  return (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-4 hover:border-[#F47721]/30 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-base font-extrabold text-[#F47721]">
                              {order.order_number}
                            </span>
                            {renderStageBadge(stage)}
                            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${order.payment_status === 'paid'
                              ? 'bg-green-50 text-[#269B62] border-green-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                              {order.payment_status}
                            </span>
                            <span className="rounded-full bg-[#FAFAFA] px-2.5 py-0.5 text-[10px] font-semibold text-[#252525] border border-[#EEEEEE]">
                              {order.customer_name} ({order.customer_account_type})
                            </span>
                            {order.payment_method && (
                              <span className="text-[10px] text-[#666666]">
                                via {order.payment_method === 'pay_later' ? 'Pay Later (Staff Credit)' : 'UPI'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#666666]">
                            <span>
                              Placed: {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} •{' '}
                              {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <Link
                            href={`/orders/receipt/?id=${order.id}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1.5 text-[11px] font-bold text-[#252525] hover:text-[#F47721] transition"
                            title="Print bill receipt"
                          >
                            <Printer className="h-3 w-3 text-[#F47721]" />
                            <span>Receipt</span>
                          </Link>
                          <div className="text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#666666] block">
                              Total
                            </span>
                            <span className="font-mono text-base font-extrabold text-[#252525] tabular-nums">
                              ₹{(order.total / 100).toFixed(2)}
                            </span>
                          </div>

                          <button
                            onClick={() => toggleExpand(order.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EEEEEE] bg-[#FAFAFA] text-[#666666] hover:text-[#252525] hover:bg-gray-100 transition"
                            title="Toggle details"
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EEEEEE]">
                        {stage === 'ORDER_PLACED' && (
                          <Link
                            href={`/scan?token=${encodeURIComponent(order.qr_verification_token || '')}`}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition"
                          >
                            <QrCode className="h-3.5 w-3.5" />
                            <span>Scan QR</span>
                          </Link>
                        )}

                        {stage === 'COLLECTED' && (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-[#666666] font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#269B62]" />
                            <span>
                              Collected {order.collected_at ? `at ${new Date(order.collected_at).toLocaleTimeString()}` : ''}
                            </span>
                          </span>
                        )}
                      </div>

                      {isExpanded && (
                        <div className="rounded-xl bg-[#FAFAFA] p-4 border border-[#EEEEEE] space-y-3 pt-3">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#F47721]">
                            Items Checklist
                          </h4>
                          <div className="divide-y divide-[#EEEEEE] text-xs">
                            {order.items.map((item) => (
                              <div key={item.id} className="py-2 flex items-center justify-between text-[#252525]">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[#F47721] min-w-[20px]">
                                    {item.quantity}×
                                  </span>
                                  <span>{item.item_name}</span>
                                </div>
                                <span className="font-mono tabular-nums text-[#666666]">
                                  ₹{(item.line_total / 100).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
