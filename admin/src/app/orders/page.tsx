'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  ReceiptText,
  Search,
  RefreshCw,
  Clock,
  CheckCircle2,
  PackageCheck,
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
  order_stage?: 'ORDER_PLACED' | 'READY_TO_PICK' | 'COLLECTED';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminOrdersPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session } = useAdminAuth();

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, authLoading, router]);

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

  const getOrderStage = (order: AdminOrder): 'ORDER_PLACED' | 'READY_TO_PICK' | 'COLLECTED' => {
    if (order.order_stage) return order.order_stage;
    if (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK') return 'READY_TO_PICK';
    if (order.order_status === 'completed' || order.order_status === 'COLLECTED') return 'COLLECTED';
    return 'ORDER_PLACED';
  };

  const handleMarkReady = async (orderId: string) => {
    if (!session?.access_token) return;

    setUpdatingOrderId(orderId);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/orders/${orderId}/ready`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to mark order as ready');
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, order_stage: 'READY_TO_PICK', order_status: 'READY_TO_PICK' }
            : o
        )
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark order as ready';
      setError(msg);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const renderStageBadge = (stage: 'ORDER_PLACED' | 'READY_TO_PICK' | 'COLLECTED') => {
    switch (stage) {
      case 'ORDER_PLACED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#9d8bf0]/15 border border-[#9d8bf0]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#9d8bf0]">
            <Clock className="h-3 w-3" />
            <span>Order Placed</span>
          </span>
        );
      case 'READY_TO_PICK':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#f5a4c6]/15 border border-[#f5a4c6]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#f5a4c6] animate-pulse">
            <PackageCheck className="h-3 w-3" />
            <span>Ready to Pick</span>
          </span>
        );
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>Collected</span>
          </span>
        );
    }
  };

  const stageTabs = [
    { key: 'all', label: 'All Orders' },
    { key: 'ORDER_PLACED', label: 'Order Placed' },
    { key: 'READY_TO_PICK', label: 'Ready to Pick' },
    { key: 'COLLECTED', label: 'Collected' },
  ];

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-[#101114] text-slate-100 min-h-screen">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#22242e] pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">
                ALEXATEL • Kitchen Dispatch & POS
              </span>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Live Orders Management
              </h1>
              <p className="mt-1 text-xs text-stone-400">
                Monitor incoming tickets, kitchen prep progression, and meal pickup fulfillment
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#9d8bf0]" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {stageTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                    statusFilter === tab.key
                      ? 'bg-[#f5a4c6] text-[#101114] shadow-md shadow-[#f5a4c6]/20'
                      : 'bg-[#17181f] text-stone-400 border border-[#2b2d3b] hover:bg-[#232533] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search order #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#2b2d3b] bg-[#1a1b24] pl-9 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-stone-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
              <p className="text-xs font-semibold">Retrieving active orders queue...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#22242e] bg-[#17181f]/40 p-12 text-center space-y-3">
              <ReceiptText className="mx-auto h-8 w-8 text-stone-600" />
              <h2 className="text-sm font-bold text-stone-300">No orders found</h2>
              <p className="text-xs text-stone-500">
                {statusFilter === 'all'
                  ? 'No canteen orders have been recorded yet.'
                  : `No orders currently in "${statusFilter}" status.`}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isExpanded = expandedOrders.has(order.id);
                const isUpdating = updatingOrderId === order.id;
                const stage = getOrderStage(order);

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[#22242e] bg-[#17181f] p-5 shadow-sm space-y-4 hover:border-[#2f3140] transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-base font-extrabold text-white">
                            {order.order_number}
                          </span>
                          {renderStageBadge(stage)}
                          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            order.payment_status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-[#ea9955]/15 text-[#ea9955] border-[#ea9955]/30'
                          }`}>
                            {order.payment_status}
                          </span>
                          <span className="rounded-full bg-[#101114] px-2.5 py-0.5 text-[10px] font-semibold text-stone-300 border border-[#282a38]">
                            {order.customer_name} ({order.customer_account_type})
                          </span>
                          {order.payment_method && (
                            <span className="text-[10px] text-stone-400">
                              via {order.payment_method === 'testing_wallet' ? 'Testing Wallet' : order.payment_method === 'pay_later' ? 'Pay Later (Staff Credit)' : 'Counter Cash'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-stone-400">
                          <span>
                            Placed: {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                          {order.collected_at && (
                            <span className="text-emerald-400 font-semibold text-[11px]">
                              • Collected at {new Date(order.collected_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <Link
                          href={`/orders/receipt/?id=${order.id}`}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#1a1b24] px-3 py-1.5 text-[11px] font-bold text-stone-300 hover:text-white hover:bg-[#232533] transition"
                          title="Print bill receipt"
                        >
                          <Printer className="h-3 w-3 text-[#9d8bf0]" />
                          <span>Receipt</span>
                        </Link>
                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 block">
                            Total
                          </span>
                          <span className="font-mono text-base font-extrabold text-white tabular-nums">
                            ₹{(order.total / 100).toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#282a38] bg-[#101114] text-stone-400 hover:text-white transition"
                          title="Toggle details"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#22242e]">
                      {stage === 'ORDER_PLACED' && (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5a4c6] px-3.5 py-1.5 text-xs font-bold text-[#101114] shadow-sm shadow-[#f5a4c6]/20 hover:opacity-90 transition disabled:opacity-50"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Mark Ready to Pick</span>
                        </button>
                      )}

                      {stage === 'READY_TO_PICK' && (
                        <Link
                          href={`/scan?token=${encodeURIComponent(order.qr_verification_token || '')}`}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-[#9d8bf0] px-3.5 py-1.5 text-xs font-bold text-[#101114] shadow-sm shadow-[#9d8bf0]/20 hover:opacity-90 transition"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Scan QR / Collect Order</span>
                        </Link>
                      )}

                      {stage === 'COLLECTED' && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          <span>
                            Collected {order.collected_at ? `at ${new Date(order.collected_at).toLocaleTimeString()}` : ''}
                          </span>
                        </span>
                      )}

                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-[#9d8bf0] ml-2" />}
                    </div>

                    {isExpanded && (
                      <div className="rounded-xl bg-[#101114] p-4 border border-[#22242e] space-y-3 pt-3">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#9d8bf0]">
                          Items Checklist
                        </h4>
                        <div className="divide-y divide-[#22242e] text-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="py-2 flex items-center justify-between text-stone-200">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[#f5a4c6] min-w-[20px]">
                                  {item.quantity}×
                                </span>
                                <span>{item.item_name}</span>
                              </div>
                              <span className="font-mono tabular-nums text-stone-400">
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
    </>
  );
}
