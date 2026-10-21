'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Flame,
  PackageCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';

interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface OrderDetail {
  id: string;
  order_number: string;
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'completed' | 'cancelled';
  payment_status: string;
  subtotal: number;
  total: number;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  confirmed_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

function OrderTrackerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { user, session, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchOrder = async () => {
    if (!orderId || !session?.access_token) return;

    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to retrieve order details');
      }

      setOrder(data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading order';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (session && orderId) {
        fetchOrder();
      } else {
        setLoading(false);
      }
    }
  }, [session, orderId, authLoading]);

  const handleCancelOrder = async () => {
    if (!orderId || !session?.access_token) return;

    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to cancel order');
      }

      setShowCancelConfirm(false);
      await fetchOrder();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not cancel order';
      setCancelError(msg);
    } finally {
      setCancelling(false);
    }
  };

  if (!orderId) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center space-y-3">
        <AlertCircle className="mx-auto h-8 w-8 text-stone-400" />
        <h2 className="text-base font-bold text-stone-900">No order specified</h2>
        <p className="text-xs text-stone-500">Please select an order from your order history.</p>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        <p className="text-xs font-medium">Tracking order status...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center space-y-4">
        <ShieldAlert className="mx-auto h-8 w-8 text-rose-600" />
        <div>
          <h2 className="text-base font-bold text-rose-900">Unable to load order</h2>
          <p className="mt-1 text-xs text-rose-700">{error || 'Order not found or access denied'}</p>
        </div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800 transition"
        >
          Return to Orders
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'pending', label: 'Order Placed', icon: Clock },
    { key: 'confirmed', label: 'Kitchen Confirmed', icon: CheckCircle2 },
    { key: 'preparing', label: 'Cooking', icon: Flame },
    { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: PackageCheck },
    { key: 'completed', label: 'Collected', icon: CheckCircle2 },
  ];

  const statusOrder = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed'];
  const currentIndex = statusOrder.indexOf(order.order_status);
  const isCancelled = order.order_status === 'cancelled';
  const canCancel = ['pending', 'confirmed'].includes(order.order_status);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Orders</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Order #{order.order_number}
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Placed on {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <button
          onClick={fetchOrder}
          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-xs self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
          <span>Refresh Status</span>
        </button>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        {isCancelled ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
            <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">This order was cancelled</p>
              <p className="mt-0.5">
                Reason: {order.cancellation_reason || 'Cancelled upon request'}
              </p>
              {order.cancelled_at && (
                <p className="mt-1 text-[11px] text-rose-600">
                  Cancelled at: {new Date(order.cancelled_at).toLocaleTimeString('en-IN')}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="py-4">
            <div className="relative flex flex-col md:flex-row justify-between gap-6">
              {steps.map((step, idx) => {
                const IconComponent = step.icon;
                const isPassed = currentIndex >= idx;
                const isCurrent = currentIndex === idx;

                return (
                  <div key={step.key} className="flex-1 flex md:flex-col items-center gap-3 text-left md:text-center relative">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition ${
                        isCurrent
                          ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30 ring-4 ring-amber-100'
                          : isPassed
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-400'
                      }`}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? 'text-amber-800'
                            : isPassed
                            ? 'text-stone-900'
                            : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 mt-1">
                          Current Stage
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
          Ordered Dishes
        </h2>

        <div className="divide-y divide-stone-100 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-amber-700 min-w-[20px]">
                  {item.quantity}×
                </span>
                <span className="font-semibold text-stone-900">{item.item_name}</span>
                <span className="text-stone-400 text-[11px]">
                  (₹{(item.unit_price / 100).toFixed(2)} each)
                </span>
              </div>
              <span className="font-mono font-bold text-stone-900 tabular-nums">
                ₹{(item.line_total / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline">
          <span className="text-sm font-bold text-stone-900">Total Order Amount</span>
          <span className="font-mono text-xl font-extrabold text-amber-700 tabular-nums">
            ₹{(order.total / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
          Campus Fulfillment Details
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <span className="text-stone-500">Pickup Counter</span>
            <p className="font-semibold text-stone-900">Campus Canteen — Dispatch Station 1</p>
          </div>
          <div>
            <span className="text-stone-500">Payment Status</span>
            <p className="font-semibold text-stone-900 uppercase tracking-wider text-[11px] text-amber-700">
              {order.payment_status} (Phase 4 development flow)
            </p>
          </div>
          <div>
            <span className="text-stone-500">Order Reference</span>
            <p className="font-mono font-semibold text-stone-900">{order.id}</p>
          </div>
          <div>
            <span className="text-stone-500">Token Number</span>
            <p className="font-mono font-extrabold text-amber-700">{order.order_number}</p>
          </div>
        </div>
      </div>

      {canCancel && !isCancelled && (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Need to cancel this order?</h3>
              <p className="text-xs text-stone-500">
                You can self-cancel before the kitchen starts cooking. Reserved ingredients will be restored.
              </p>
            </div>

            {!showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs"
              >
                Cancel Order
              </button>
            )}
          </div>

          {cancelError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{cancelError}</span>
            </div>
          )}

          {showCancelConfirm && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-rose-900">
                Are you sure you want to cancel Order #{order.order_number}?
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Yes, Confirm Cancellation'}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                  className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Keep Order
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderTrackerPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
                <p className="text-xs font-medium">Loading order details...</p>
              </div>
            }
          >
            <OrderTrackerContent />
          </Suspense>
        </div>
      </main>
      <Footer />
    </>
  );
}
