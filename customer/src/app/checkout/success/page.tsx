'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import { QRCodeSvg } from '../../../components/QRCodeSvg';
import {
  CheckCircle2,
  Printer,
  ShoppingBag,
  ExternalLink,
  Loader2,
  AlertCircle,
  QrCode,
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
  payment_status: string;
  payment_method: string;
  qr_verification_token: string | null;
  subtotal: number;
  total: number;
  paid_at: string | null;
  created_at: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { session, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId || !session?.access_token) return;

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to retrieve order confirmation');
        }
        setOrder(data.data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error loading confirmation';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (session && orderId) {
        fetchOrder();
      } else {
        setLoading(false);
      }
    }
  }, [session, orderId, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs space-y-4 my-12">
        <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
        <h2 className="text-base font-bold text-stone-900">Order Information Unavailable</h2>
        <p className="text-xs text-stone-500">{error || 'Could not find order reference.'}</p>
        <Link
          href="/orders"
          className="inline-block rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-3xl border border-emerald-200 bg-white p-6 sm:p-8 text-center shadow-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-800">
            Payment Confirmed &bull; Order #{order.order_number}
          </span>
        </div>

        {order.qr_verification_token && (
          <div className="rounded-3xl border border-stone-200 bg-stone-50/70 p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-stone-800">
              <QrCode className="h-4 w-4 text-[#ff5e3a]" />
              <span>Scan to Collect at Counter</span>
            </div>

            <div className="flex justify-center py-2">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-stone-100">
                <QRCodeSvg value={order.qr_verification_token} size={200} />
              </div>
            </div>

            <div>
              <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">
                Token Number
              </span>
              <p className="font-mono text-2xl font-black text-[#ff5e3a] tracking-wider">
                {order.order_number}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-stone-200 bg-white p-5 text-left shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500 border-b border-stone-100 pb-2">
            Items Ordered
          </h2>

          <div className="divide-y divide-stone-100 text-xs">
            {order.items && order.items.length > 0 ? (
              order.items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#ff5e3a] min-w-[20px]">
                      {item.quantity}×
                    </span>
                    <span className="font-semibold text-stone-900">{item.item_name}</span>
                    <span className="text-stone-400 text-[11px]">
                      (₹{(item.unit_price / 100).toFixed(2)})
                    </span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 tabular-nums">
                    ₹{(item.line_total / 100).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-2 text-xs text-stone-500">Order items recorded</p>
            )}
          </div>

          <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline">
            <span className="text-xs font-bold text-stone-700">Total Paid</span>
            <span className="font-mono text-lg font-black text-stone-900 tabular-nums">
              ₹{(order.total / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <Link
            href={`/orders/track/?id=${order.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Track Order</span>
          </Link>

          <Link
            href={`/orders/receipt/?id=${order.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-3 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </Link>
        </div>

        <div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#ff5e3a] transition"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Return to Menu</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
          }
        >
          <CheckoutSuccessContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
