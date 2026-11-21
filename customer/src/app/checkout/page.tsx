'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  User,
  AlertTriangle,
  CreditCard,
  Building2,
  ShieldAlert,
} from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, session } = useAuth();
  const { items, clearCart, subtotal, itemCount } = useCart();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(true);
  const [unavailableItems, setUnavailableItems] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'counter_cash' | 'pay_later'>('razorpay');
  const [pendingPayLater, setPendingPayLater] = useState<number>(0);

  const isFacultyOrStaff = ['faculty', 'staff', 'staff_t'].includes(
    profile?.approved_account_type || profile?.account_type || ''
  );

  useEffect(() => {
    loadRazorpayScript();
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/checkout');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    async function validateCartItems() {
      if (items.length === 0) {
        setValidating(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/menu?t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const menuMap = new Map<string, { id: string; name: string; is_available: boolean; is_archived: boolean }>(
              json.data.map((m: any) => [m.id, m])
            );
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
      } catch {
      } finally {
        setValidating(false);
      }
    }

    validateCartItems();
  }, [items]);

  useEffect(() => {
    async function loadPayLater() {
      if (!session?.access_token || !isFacultyOrStaff) return;
      try {
        const plRes = await fetch(`${API_BASE_URL}/api/v1/orders/pay-later/pending`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (plRes.ok) {
          const plJson = await plRes.json();
          if (plJson.success && plJson.data) {
            setPendingPayLater(plJson.data.total_pending || 0);
          }
        }
      } catch {}
    }

    loadPayLater();
  }, [session, isFacultyOrStaff]);

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
          items: items.map((i) => ({ menu_item_id: i.id, quantity: i.quantity })),
          payment_method: paymentMethod,
          idempotency_key: idempotencyKey,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to place order');
      }

      const orderId = data.data.id || data.data.order_id;

      if (paymentMethod === 'razorpay') {
        const scriptReady = await loadRazorpayScript();
        if (!scriptReady || !(window as any).Razorpay) {
          throw new Error('Payment gateway failed to load. Please check your network connection.');
        }

        const razorpayKeyId = data.data.razorpay_key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

        const options = {
          key: razorpayKeyId,
          amount: data.data.total,
          currency: 'INR',
          name: 'Cafeteria CEV',
          description: `Takeaway Order #${data.data.order_number}`,
          order_id: data.data.razorpay_order_id,
          handler: async function (response: any) {
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/api/v1/orders/verify-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  order_id: orderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error?.message || 'Payment verification failed on server');
              }

              clearCart();
              router.push(`/checkout/success?order_id=${orderId}`);
            } catch (vErr: any) {
              setError(vErr?.message || 'Payment completed but server confirmation failed. Please refresh order tracker.');
            }
          },
          prefill: {
            name: profile?.display_name || user?.user_metadata?.full_name || '',
            email: user?.email || '',
            contact: profile?.phone || user?.phone || '',
          },
          theme: {
            color: '#ff5e3a',
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
              setError('Online payment window closed. You can retry checkout anytime.');
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', (failRes: any) => {
          setError(failRes?.error?.description || 'Online payment failed. Please try again.');
          setSubmitting(false);
        });
        rzp.open();
        return;
      }

      if (paymentMethod === 'pay_later') {
        clearCart();
        router.push(`/checkout/success?order_id=${orderId}`);
        return;
      }

      clearCart();
      router.push(`/checkout/success?order_id=${orderId}`);
    } catch (err: any) {
      setError(err?.message || 'Network error occurred while creating order');
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <>
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#fafaf9] dark:bg-[#0d0e12] transition-colors duration-200">
          <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white/80 dark:bg-[#161820]/80 backdrop-blur-xl p-8 max-w-sm w-full space-y-4 shadow-sm">
            <h1 className="text-xl font-bold text-stone-900 dark:text-white">Your Cart is Empty</h1>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Please add fresh dishes from the canteen menu to proceed with checkout.
            </p>
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5e3a] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-orange-600 transition"
            >
              <span>Explore Canteen Menu</span>
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
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-stone-50/50 dark:bg-[#0d0e12] pb-28 md:pb-12 transition-colors duration-200">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="border-b border-stone-200 dark:border-white/10 pb-5">
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-[#ff5e3a] transition mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Cart</span>
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">
              Review & Place Order
            </h1>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Please verify your meal selection, payment method and pickup details
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3.5 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {unavailableItems.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/40 p-3.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Some items became unavailable: </span>
                <span>{unavailableItems.join(', ')}. Please return to cart and remove them.</span>
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-[#161820]/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-100 dark:border-white/10 pb-3">
              <User className="h-4 w-4 text-[#ff5e3a]" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Pickup Customer Details</h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-stone-400 dark:text-stone-500 font-medium">Customer Name</span>
                <p className="font-bold text-stone-900 dark:text-white mt-0.5">
                  {profile?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </p>
              </div>

              <div>
                <span className="text-stone-400 dark:text-stone-500 font-medium">Contact Email</span>
                <p className="font-bold text-stone-900 dark:text-white mt-0.5">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-[#161820]/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/10 pb-3">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Order Summary</h2>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">{itemCount} items</span>
            </div>

            <div className="divide-y divide-stone-100 dark:divide-white/10">
              {items.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-stone-900 dark:text-white">{item.quantity}x</span>
                    <span className="text-stone-700 dark:text-stone-200">{item.name}</span>
                  </div>
                  <span className="font-mono font-bold text-stone-900 dark:text-white">
                    ₹{((item.price * item.quantity) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 dark:border-white/10 pt-3 space-y-1.5">
              <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
                <span>Subtotal</span>
                <span className="font-mono">₹{(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-stone-500 dark:text-stone-400">
                <span>Canteen Service Fee</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">FREE (₹0.00)</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-dashed border-stone-200 dark:border-white/10">
                <span className="text-sm font-bold text-stone-900 dark:text-white">Total Payable</span>
                <span className="font-mono text-xl font-extrabold text-[#ff5e3a] tabular-nums">
                  ₹{(subtotal / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-[#161820]/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/10 pb-3">
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Select Payment Method</h2>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Official Campus Checkout</span>
            </div>

            <div className="space-y-3">
              <label
                className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                  paymentMethod === 'razorpay'
                    ? 'border-[#ff5e3a] bg-orange-50/50 dark:bg-orange-950/20 ring-1 ring-[#ff5e3a]'
                    : 'border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="razorpay"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1 h-4 w-4 text-[#ff5e3a] focus:ring-orange-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#ff5e3a]" />
                      <span className="text-xs font-bold text-stone-900 dark:text-white">Online Payment (Razorpay)</span>
                      <span className="rounded bg-orange-100 dark:bg-orange-950/40 px-1.5 py-0.5 text-[10px] font-bold text-[#ff5e3a]">
                        Recommended
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">UPI, Cards, NetBanking</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                    Pay securely via Razorpay Standard Checkout. Instant QR pickup pass generated upon confirmation.
                  </p>
                </div>
              </label>

              {isFacultyOrStaff && (
                <label
                  className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                    paymentMethod === 'pay_later'
                      ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-500'
                      : 'border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="pay_later"
                    checked={paymentMethod === 'pay_later'}
                    onChange={() => setPaymentMethod('pay_later')}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-indigo-600" />
                        <span className="text-xs font-bold text-stone-900 dark:text-white">Pay Later (Faculty & Staff Credit)</span>
                        <span className="rounded bg-indigo-100 dark:bg-indigo-950/40 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:text-indigo-300">
                          Faculty Benefit
                        </span>
                      </div>
                      {pendingPayLater > 0 && (
                        <span className="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                          Pending: ₹{(pendingPayLater / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                      Order now with instant QR token without upfront payment. Settle dues from your profile.
                    </p>
                  </div>
                </label>
              )}

              <label
                className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                  paymentMethod === 'counter_cash'
                    ? 'border-stone-400 bg-stone-50 dark:bg-white/[0.06] ring-1 ring-stone-400'
                    : 'border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 bg-white dark:bg-white/[0.02]'
                }`}
              >
                <input
                  type="radio"
                  name="payment_method"
                  value="counter_cash"
                  checked={paymentMethod === 'counter_cash'}
                  onChange={() => setPaymentMethod('counter_cash')}
                  className="mt-1 h-4 w-4 text-stone-700 focus:ring-stone-500"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900 dark:text-white">Pay at Counter (Cash/Physical UPI)</span>
                    <span className="rounded bg-stone-200 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-stone-700 dark:text-stone-300">
                      Unpaid Order
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
                    Order is placed as unpaid. Pay canteen staff directly at the collection desk to complete pickup.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/15 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 shadow-xs">
            <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold block text-xs">Strict No-Refund & No-Cancellation Policy</span>
              <p className="text-[11px] leading-relaxed opacity-90">
                All canteen meals are freshly prepared on-demand immediately upon order placement. Once submitted, orders cannot be cancelled and payments are strictly non-refundable.
              </p>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={submitting || validating || unavailableItems.length > 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full py-4 text-xs font-black uppercase tracking-wider text-white shadow-xl transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none bg-[#ff5e3a] hover:bg-[#ff4b4b] shadow-orange-500/25"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Order...</span>
              </>
            ) : paymentMethod === 'razorpay' ? (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Pay ₹{(subtotal / 100).toFixed(2)} Online via Razorpay</span>
              </>
            ) : paymentMethod === 'pay_later' ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Confirm Pay Later Order</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Place Order & Pay at Counter</span>
              </>
            )}
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}
