'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import { useAuth } from '../../../context/AuthContext';
import { ReceiptPrinterAnimation, type Order as PrinterOrder } from '../../../components/ReceiptPrinterAnimation';
import {
  Printer,
  ShoppingBag,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { session, loading: authLoading } = useAuth();

  const [order, setOrder] = useState<PrinterOrder | null>(null);
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
      <ReceiptPrinterAnimation order={order} />

      <div className="flex flex-col sm:flex-row gap-2.5 max-w-sm mx-auto">
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

      <div className="text-center">
        <Link
          href="/menu"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#ff5e3a] transition"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          <span>Return to Menu</span>
        </Link>
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