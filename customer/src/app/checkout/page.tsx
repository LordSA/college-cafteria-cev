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
  Wallet,
  CreditCard,
  Building2,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

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
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'testing_wallet' | 'counter_cash' | 'pay_later'>('razorpay');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [pendingPayLater, setPendingPayLater] = useState<number>(0);

  const isLivePaymentMode = process.env.NEXT_PUBLIC_PAYMENT_MODE === 'live';

  const isFacultyOrStaff = ['faculty', 'staff'].includes(
    profile?.approved_account_type || profile?.account_type || ''
  );

  useEffect(() => {
    loadRazorpayScript();
  }, []);

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
      } catch {}
      setValidating(false);
    }

    validateCartItems();
  }, [items]);

  useEffect(() => {
    async function loadWallet() {
      if (!session?.access_token) {
        setWalletLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/wallet/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setWalletBalance(json.data.balance);
          }
        }

        if (isFacultyOrStaff) {
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
        }
      } catch {}
      setWalletLoading(false);
    }

    loadWallet();
  }, [session, isFacultyOrStaff]);

  const hasInsufficientWalletBalance =
    paymentMethod === 'testing_wallet' && walletBalance !== null && walletBalance < subtotal;

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

    if (hasInsufficientWalletBalance) {
      setError(
        `Insufficient testing wallet balance (₹${((walletBalance || 0) / 100).toFixed(2)}). Please choose Razorpay Online or Pay at Counter.`
      );
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
          payment_method: paymentMethod,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to place order');
      }

      if (paymentMethod === 'razorpay') {
        const scriptReady = await loadRazorpayScript();
        if (!scriptReady || !(window as any).Razorpay) {
          throw new Error('Payment gateway failed to load. Please check your network connection.');
        }

        const razorpayKeyId = data.data.razorpay_key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

        const options = {
          key: razorpayKeyId,
          amount: data.data.amount,
          currency: data.data.currency || 'INR',
          name: 'Cafteria CEV',
          description: `Order #${data.data.order_number}`,
          order_id: data.data.razorpay_order_id,
          handler: async (response: any) => {
            try {
              const verifyRes = await fetch(`${API_BASE_URL}/api/v1/orders/verify-payment`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                  order_id: data.data.id,
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
              router.push(`/checkout/success/?id=${data.data.id}`);
            } catch (vErr: any) {
              setError(vErr?.message || 'Payment completed but server confirmation failed. Please refresh order tracker.');
              setSubmitting(false);
            }
          },
          prefill: {
            name: profile?.display_name || '',
            email: user?.email || '',
          },
          theme: {
            color: '#ff5e3a',
          },
          modal: {
            ondismiss: () => {
              setSubmitting(false);
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

      clearCart();
      if (paymentMethod === 'testing_wallet' || paymentMethod === 'pay_later') {
        router.push(`/checkout/success/?id=${data.data.id}`);
      } else {
        router.push(`/orders/track/?id=${data.data.id}`);
      }
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
        <main className="flex-1 flex items-center justify-center py-20 pb-28 md:pb-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
        </main>
        <Footer />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Header />
        <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
          <div className="mx-auto max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm space-y-5">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5e3a]">
              <User className="h-7 w-7" />
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
                className="w-full inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition"
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

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-stone-50/50 pb-28 md:pb-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#ff5e3a] transition mb-3"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Cart</span>
            </Link>
            <h1 className="text-2xl font-black tracking-tight text-stone-900">
              Review & Place Order
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Please verify your canteen meal selection, payment method and pickup details
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

          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900">Ordering Account</h2>
              <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold text-[#ff5e3a] capitalize">
                {profile?.account_type || 'Student'}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-stone-400 font-medium">Name</span>
                <p className="font-bold text-stone-900 mt-0.5">
                  {profile?.display_name || user.email?.split('@')[0]}
                </p>
              </div>
              <div>
                <span className="text-stone-400 font-medium">Email</span>
                <p className="font-bold text-stone-900 truncate mt-0.5">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
              Order Items ({itemCount})
            </h2>

            <div className="divide-y divide-stone-100">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#ff5e3a] min-w-[20px]">
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

            <div className="border-t border-stone-200/80 pt-3 space-y-2 text-xs">
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
                <span className="font-mono text-xl font-extrabold text-[#ff5e3a] tabular-nums">
                  ₹{(subtotal / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h2 className="text-sm font-bold text-stone-900">Select Payment Method</h2>
              <span className="text-[11px] font-semibold text-emerald-600">Official Campus Checkout</span>
            </div>

            <div className="space-y-3">
              <label
                className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                  paymentMethod === 'razorpay'
                    ? 'border-[#ff5e3a] bg-orange-50/40 ring-1 ring-[#ff5e3a]'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
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
                      <span className="text-xs font-bold text-stone-900">Online Payment (Razorpay)</span>
                      <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-[#ff5e3a]">
                        Recommended
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">UPI, Cards, NetBanking</span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 leading-normal">
                    Pay securely via Razorpay Standard Checkout in INR paise. Upon verified confirmation, your official QR pickup pass is generated instantly.
                  </p>
                </div>
              </label>

              {!isLivePaymentMode && (
                <label
                  className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                    paymentMethod === 'testing_wallet'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value="testing_wallet"
                    checked={paymentMethod === 'testing_wallet'}
                    onChange={() => setPaymentMethod('testing_wallet')}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-stone-900">Testing Wallet</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          Demo Credits Only
                        </span>
                      </div>
                      {walletBalance !== null ? (
                        <span className="font-mono text-xs font-bold text-emerald-700 tabular-nums">
                          ₹{(walletBalance / 100).toFixed(2)} available
                        </span>
                      ) : walletLoading ? (
                        <span className="text-[10px] text-stone-400">Checking balance...</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-normal">
                      Development mode credits only. Not usable as real tender.
                    </p>
                    {hasInsufficientWalletBalance && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-rose-600">
                        <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>
                          Insufficient demo balance (need ₹{(subtotal / 100).toFixed(2)}, have ₹{((walletBalance || 0) / 100).toFixed(2)}). Select Razorpay Online.
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              )}

              {isFacultyOrStaff && (
                <label
                  className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                    paymentMethod === 'pay_later'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                      : 'border-stone-200 hover:border-stone-300 bg-white'
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
                        <span className="text-xs font-bold text-stone-900">Pay Later (Faculty & Staff Credit)</span>
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800">
                          Faculty Benefit
                        </span>
                      </div>
                      {pendingPayLater > 0 && (
                        <span className="font-mono text-xs font-bold text-amber-700 tabular-nums">
                          Pending: ₹{(pendingPayLater / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-normal">
                      Order now with instant QR token without upfront payment. Settle dues from your profile.
                    </p>
                  </div>
                </label>
              )}

              <label
                className={`relative flex items-start gap-3.5 rounded-2xl border p-4 cursor-pointer transition ${
                  paymentMethod === 'counter_cash'
                    ? 'border-stone-400 bg-stone-50 ring-1 ring-stone-400'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
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
                    <span className="text-xs font-bold text-stone-900">Pay at Counter (Cash/Physical UPI)</span>
                    <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-bold text-stone-700">
                      Unpaid Order
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-stone-500 leading-normal">
                    Order is placed as unpaid. Pay canteen staff directly at the collection desk to complete pickup.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={submitting || validating || unavailableItems.length > 0 || hasInsufficientWalletBalance}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] hover:opacity-95 shadow-orange-500/25"
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
            ) : paymentMethod === 'testing_wallet' ? (
              <>
                <Wallet className="h-4 w-4" />
                <span>Pay ₹{(subtotal / 100).toFixed(2)} with Testing Wallet</span>
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
