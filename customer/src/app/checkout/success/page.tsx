'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import { QRCodeSvg } from '../../../components/QRCodeSvg';
import {
  CheckCircle2,
  Clock,
  Printer,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Loader2,
  AlertCircle,
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
  order_status: string;
  payment_status: string;
  payment_method: string;
  qr_verification_token: string | null;
  subtotal: number;
  total: number;
  paid_at: string | null;
  created_at: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

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
          className="inline-block rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-3xl border border-emerald-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-sm">
          <CheckCircle2 className="h-10 w-10" />
        </div>

        <div>
          <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
            Payment Confirmed • Testing Wallet
          </span>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
            Order Sent to Kitchen!
          </h1>
          <p className="mt-1 text-xs text-stone-500">
            Your payment of ₹{(order.total / 100).toFixed(2)} was settled with demo credits.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Pickup Token
          </span>
          <div className="mt-1 font-mono text-3xl font-extrabold tracking-tight text-amber-700">
            {order.order_number}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-stone-600">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Estimated pickup in 10–15 minutes</span>
          </div>
        </div>

        {order.qr_verification_token && (
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-3">
            <span className="text-xs font-bold text-stone-900">
              Counter Verification Pass
            </span>
            <p className="text-[11px] text-stone-500">
              Show this QR code at Canteen Dispatch Station 1 to verify and collect your food.
            </p>

            <div className="flex justify-center pt-1">
              <QRCodeSvg value={order.qr_verification_token} size={180} />
            </div>

            <div className="pt-1">
              <span className="text-[10px] text-stone-400">Manual Verification Code:</span>
              <p className="font-mono text-xs font-bold text-stone-800 tracking-wider">
                {order.qr_verification_token}
              </p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-left text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800/90 leading-relaxed">
            Testing Wallet — Demo Credits Only. No Real Money. Real payments will be enabled in Phase 5.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <Link
            href={`/orders/track/?id=${order.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Track Order Status</span>
          </Link>

          <Link
            href={`/orders/receipt/?id=${order.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-3 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition"
          >
            <Printer className="h-4 w-4" />
            <span>Print Receipt</span>
          </Link>
        </div>

        <div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition"
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
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
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
