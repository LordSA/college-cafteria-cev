'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  ShieldCheck,
  ShoppingBag,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  User,
  AlertTriangle,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, session } = useAuth();
  const { items, clearCart, subtotal, itemCount } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [unavailableItems, setUnavailableItems] = useState<string[]>([]);

  useEffect(() => {
    async function validateCartItems() {
      if (items.length === 0) {
        setValidating(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/menu`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const menuMap = new Map(json.data.map((m: any) => [m.id, m]));
            const unavailable: string[] = [];

            for (const item of items) {
              const liveItem = menuMap.get(item.id);
              if (!liveItem || !liveItem.is_available || liveItem.is_archived) {
                unavailable.push(item.name);
              }
            }
            setUnavailableItems(unavailable);
          }
        }
      } catch {}
      setValidating(false);
    }

    validateCartItems();
  }, [items]);

  const handlePlaceOrder = async () => {
    if (!session?.access_token) {
      setError('Please sign in to place an order');
      return;
    }

    if (items.length === 0) {
      setError('Your cart is empty');
      return;
    }

    if (unavailableItems.length > 0) {
      setError(`Please remove unavailable dishes: ${unavailableItems.join(', ')}`);
      return;
    }

    setSubmitting(true);
    setError(null);

    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          items: items.map((i) => ({
            menu_item_id: i.id,
            quantity: i.quantity,
          })),
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to place order');
      }

      clearCart();
      router.push(`/orders/${data.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while placing order';
      setError(msg);
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm space-y-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900">Sign in to complete order</h1>
              <p className="mt-1 text-xs text-stone-500">
                To link this order to your student or faculty profile, please sign in to your Cafteria account.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/login?redirect=/checkout"
                className="w-full inline-flex items-center justify-center rounded-xl bg-amber-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                Sign In to Continue
              </Link>
              <Link
                href="/cart"
                className="w-full inline-flex items-center justify-center rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition"
              >
                Return to Cart
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm space-y-4">
            <ShoppingBag className="mx-auto h-8 w-8 text-stone-400" />
            <h1 className="text-base font-bold text-stone-900">Your cart is empty</h1>
            <p className="text-xs text-stone-500">
              Add some freshly prepared items from the canteen menu first.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 transition"
            >
              Browse Menu
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Cart</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              Review & Place Order
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Please verify your canteen meal selection and pickup details
            </p>
          </div>

          {unavailableItems.length > 0 && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Items Unavailable or Sold Out:</p>
                <p className="mt-0.5">{unavailableItems.join(', ')}</p>
                <Link
                  href="/cart"
                  className="mt-2 inline-block font-semibold underline hover:text-rose-950"
                >
                  Return to Cart to adjust quantities
                </Link>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900">Customer Identity</h2>
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 capitalize">
                {profile?.account_type || 'Student'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-stone-500">Name</span>
                <p className="font-semibold text-stone-900">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
              </div>
              <div>
                <span className="text-stone-500">Email</span>
                <p className="font-semibold text-stone-900 truncate">{user.email}</p>
              </div>
              <div>
                <span className="text-stone-500">Pickup Counter</span>
                <p className="font-semibold text-stone-900">Campus Canteen — Dispatch Station 1</p>
              </div>
              <div>
                <span className="text-stone-500">Estimated Prep Window</span>
                <p className="font-semibold text-amber-700 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>10–15 minutes</span>
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
              Order Items ({itemCount})
            </h2>

            <div className="divide-y divide-stone-100">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-700 min-w-[20px]">
                      {item.quantity}×
                    </span>
                    <span className="font-semibold text-stone-900">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 tabular-nums">
                    ₹{((item.price * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-stone-500">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums font-semibold text-stone-800">
                  ₹{(subtotal / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-stone-500">
                <span>Campus Canteen Surcharge</span>
                <span className="font-mono tabular-nums font-semibold text-emerald-600">₹0.00</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
                <span className="text-sm font-bold text-stone-900">Total Payable</span>
                <span className="font-mono text-xl font-extrabold text-amber-700 tabular-nums">
                  ₹{(subtotal / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <span>Phase 4 Development Flow Notice</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-800">
              Real online payment gateways (Razorpay) are explicitly scheduled for Phase 5. In Phase 4, your order will be recorded in <strong>unpaid</strong> payment status with atomic stock deduction and immediately placed into the kitchen display queue.
            </p>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={submitting || validating || unavailableItems.length > 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 py-3.5 text-sm font-bold text-white shadow-md shadow-amber-600/25 hover:bg-amber-700 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Submitting Order to Kitchen...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm & Place Order</span>
              </>
            )}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
