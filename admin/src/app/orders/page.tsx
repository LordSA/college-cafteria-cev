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
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-950/60 border border-blue-800/60 px-2.5 py-0.5 text-[11px] font-bold text-blue-400">
            <Clock className="h-3 w-3" />
            <span>Order Placed</span>
          </span>
        );
      case 'READY_TO_PICK':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 animate-pulse">
            <PackageCheck className="h-3 w-3" />
            <span>Ready to Pick</span>
          </span>
        );
      case 'COLLECTED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-[11px] font-bold text-slate-300">
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
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Kitchen Dispatch & POS
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Live Orders Management
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Monitor incoming tickets, kitchen prep progression, and meal pickup fulfillment
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
              <span>Refresh Queue</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
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
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                    statusFilter === tab.key
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search order #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Retrieving active orders queue...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
              <ReceiptText className="mx-auto h-8 w-8 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-300">No orders found</h2>
              <p className="text-xs text-slate-500">
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
                    className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-sm space-y-4 hover:border-slate-700 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-base font-extrabold text-white">
                            {order.order_number}
                          </span>
                          {renderStageBadge(stage)}
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            order.payment_status === 'paid'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}>
                            {order.payment_status}
                          </span>
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300 border border-slate-700">
                            {order.customer_name} ({order.customer_account_type})
                          </span>
                          {order.payment_method && (
                            <span className="text-[10px] text-slate-400">
                              via {order.payment_method === 'testing_wallet' ? 'Testing Wallet' : 'Counter Cash'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
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
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                          title="Print bill receipt"
                        >
                          <Printer className="h-3 w-3 text-indigo-400" />
                          <span>Receipt</span>
                        </Link>
                        <div className="text-right">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                            Total
                          </span>
                          <span className="font-mono text-base font-extrabold text-white tabular-nums">
                            ₹{(order.total / 100).toFixed(2)}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:text-white transition"
                          title="Toggle details"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
                      {stage === 'ORDER_PLACED' && (
                        <button
                          onClick={() => handleMarkReady(order.id)}
                          disabled={isUpdating}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-50"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>Mark Ready to Pick</span>
                        </button>
                      )}

                      {stage === 'READY_TO_PICK' && (
                        <Link
                          href={`/scan?token=${encodeURIComponent(order.qr_verification_token || '')}`}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-xs"
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span>Scan QR / Collect Order</span>
                        </Link>
                      )}

                      {stage === 'COLLECTED' && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 text-slate-500" />
                          <span>
                            Collected {order.collected_at ? `at ${new Date(order.collected_at).toLocaleTimeString()}` : ''}
                          </span>
                        </span>
                      )}

                      {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-indigo-400 ml-2" />}
                    </div>

                    {isExpanded && (
                      <div className="rounded-xl bg-slate-950 p-4 border border-slate-800 space-y-3 pt-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                          Items Checklist
                        </h4>
                        <div className="divide-y divide-slate-800 text-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="py-2 flex items-center justify-between text-slate-200">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-400 min-w-[20px]">
                                  {item.quantity}×
                                </span>
                                <span>{item.item_name}</span>
                              </div>
                              <span className="font-mono tabular-nums text-slate-400">
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
