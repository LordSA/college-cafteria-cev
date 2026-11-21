'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import { QRCodeSvg } from '../../../components/QRCodeSvg';
import { isOrderQrExpired } from '../../../lib/orderExpiry';
import {
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Printer,
  Clock,
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
  order_status?: string;
  order_stage?: 'ORDER_PLACED' | 'COLLECTED';
  qr_consumed_at?: string | null;
  collected_at?: string | null;
  collected_by?: string | null;
  payment_status: string;
  payment_method?: string;
  qr_verification_token?: string | null;
  subtotal: number;
  total: number;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  confirmed_at?: string | null;
  created_at: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function OrderTrackerContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { session, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
        <p className="text-xs font-medium">Tracking order...</p>
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

  const stage = order.order_stage || (order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');
  const isCollected = stage === 'COLLECTED' || Boolean(order.qr_consumed_at);
  const isPlaced = stage === 'ORDER_PLACED';
  const isCancelled = order.order_status === 'cancelled';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
        <div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>All Orders</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-stone-900">
              Order #{order.order_number}
            </h1>
          </div>
          <p className="mt-1 text-xs text-stone-500">
            Placed on {new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/orders/receipt/?id=${order.id}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 dark:border-white/10 bg-white dark:bg-[#161822] px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/5 transition shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Receipt</span>
          </Link>

          <button
            onClick={fetchOrder}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 dark:border-white/10 bg-white dark:bg-[#161822] px-3.5 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/5 transition shadow-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#ff5e3a]" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-4">
          Order Status
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3.5 rounded-2xl text-center border ${isPlaced || isCollected ? 'border-orange-300 dark:border-orange-500/40 bg-orange-50/70 dark:bg-orange-950/20 text-[#ff5e3a]' : 'border-stone-100 dark:border-white/5 bg-stone-50 dark:bg-white/5 text-stone-400 dark:text-stone-500'}`}>
            <Clock className="h-5 w-5 mx-auto mb-1 text-current" />
            <p className="text-xs font-bold">Order Placed</p>
          </div>
          <div className={`p-3.5 rounded-2xl text-center border ${isCollected ? 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'border-stone-100 dark:border-white/5 bg-stone-50 dark:bg-white/5 text-stone-400 dark:text-stone-500'}`}>
            <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-current" />
            <p className="text-xs font-bold">Collected</p>
          </div>
        </div>
      </div>

      {isCancelled && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">This order was cancelled</p>
            <p className="mt-0.5">
              Reason: {order.cancellation_reason || 'Cancelled'}
            </p>
            {order.cancelled_at && (
              <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
                Cancelled at: {new Date(order.cancelled_at).toLocaleTimeString('en-IN')}
              </p>
            )}
          </div>
        </div>
      )}

      {order.qr_verification_token && !isCancelled && (
        <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 sm:p-8 text-center shadow-xs space-y-4">
          {isCollected ? (
            <div className="space-y-2 py-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">Order Collected</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                This meal has been picked up from Cafteria CEV. The collection pass is fulfilled.
              </p>
              {order.collected_at && (
                <p className="font-mono text-[11px] text-stone-400">
                  Collected on {new Date(order.collected_at).toLocaleTimeString('en-IN')}
                </p>
              )}
            </div>
          ) : isOrderQrExpired(order.created_at) ? (
            <div className="space-y-3 py-6">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500">
                <Clock className="h-8 w-8" />
              </div>
              <h2 className="text-base font-bold text-stone-900 dark:text-white">Collection Pass Expired</h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold max-w-sm mx-auto">
                This meal pickup pass expired at 10:00 PM IST. Uncollected orders cannot be scanned after canteen closing.
              </p>
              <div className="pt-2">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                  Expired Token
                </span>
                <p className="font-mono text-2xl font-black text-stone-400 line-through tracking-wider mt-0.5">
                  #{order.order_number}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-center py-2">
                <div className="p-3.5 bg-stone-50 dark:bg-white rounded-2xl border border-stone-100 dark:border-white/10 shadow-sm">
                  <QRCodeSvg value={order.qr_verification_token} size={210} />
                </div>
              </div>

              <div>
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                  Token Number
                </span>
                <p className="font-mono text-3xl font-black text-[#ff5e3a] tracking-wider mt-0.5">
                  {order.order_number}
                </p>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
                Present this QR code to the canteen counter staff to collect your order.
              </p>
            </>
          )}
        </div>
      )}

      <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#161822] p-6 shadow-xs space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 border-b border-stone-100 dark:border-white/10 pb-2">
          Ordered Items
        </h2>

        <div className="divide-y divide-stone-100 dark:divide-white/10 text-xs">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#ff5e3a] min-w-[20px]">
                  {item.quantity}×
                </span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">{item.item_name}</span>
                <span className="text-stone-400 dark:text-stone-500 text-[11px]">
                  (₹{(item.unit_price / 100).toFixed(2)} each)
                </span>
              </div>
              <span className="font-mono font-bold text-stone-900 dark:text-white tabular-nums">
                ₹{(item.line_total / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-stone-200/80 dark:border-white/10 pt-3 flex justify-between items-baseline">
          <span className="text-sm font-bold text-stone-900 dark:text-white">Total Amount</span>
          <span className="font-mono text-xl font-extrabold text-[#ff5e3a] tabular-nums">
            ₹{(order.total / 100).toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/80 dark:border-white/10 bg-stone-50 dark:bg-white/5 p-3.5 text-center">
        <p className="text-[11px] text-stone-500 dark:text-stone-400">
          <strong className="text-stone-700 dark:text-stone-200">Strict No-Refund Policy:</strong> Takeaway food is freshly cooked upon confirmation. Orders cannot be cancelled or refunded once placed.
        </p>
      </div>
    </div>
  );
}

export default function OrderTrackerPage() {
  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
        <div className="mx-auto max-w-2xl">
          <Suspense
            fallback={
              <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
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