'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Utensils,
  LogIn,
  Clock,
  AlertCircle,
  ReceiptText,
  X,
} from 'lucide-react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787').replace(/\/+$/, '');

export default function CartPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal, itemCount, remainingSeconds, isExpired } = useCart();
  const [cartError, setCartError] = useState<string | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, { stock_quantity?: number; track_inventory?: boolean; is_available: boolean }>>({});

  useEffect(() => {
    async function fetchMenuStock() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/menu?t=${Date.now()}`, { cache: 'no-store' });
        const json = await res.json();
        if (res.ok && json.success) {
          const list = Array.isArray(json.data) ? json.data : (json.data?.items || []);
          const map: Record<string, { stock_quantity?: number; track_inventory?: boolean; is_available: boolean }> = {};
          for (const it of list) {
            map[it.id] = {
              stock_quantity: it.stock_quantity,
              track_inventory: it.track_inventory,
              is_available: it.is_available,
            };
          }
          setStockMap(map);
        }
      } catch {}
    }
    fetchMenuStock();
  }, [items]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/cart');
    }
  }, [user, authLoading, router]);

  const handleIncrease = async (id: string, qty: number) => {
    setCartError(null);
    const res = await updateQuantity(id, qty);
    if (!res.success) {
      setCartError(res.error || 'Cannot add more. No additional stock available.');
    }
  };

  const handleDecrease = async (id: string, qty: number) => {
    setCartError(null);
    await updateQuantity(id, qty);
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Header />

      <div className="md:hidden">
        <header className="rounded-b-[2.5rem] bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-5 pb-7 text-white shadow-xl shadow-orange-500/15">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-100">
                Cafteria CEV
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Shopping Cart
              </h1>
            </div>
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md hover:bg-white/30 transition shadow-xs"
            >
              <ReceiptText className="h-3.5 w-3.5" />
              <span>Orders</span>
            </Link>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-orange-100">
            <span>{itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart</span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex items-center gap-1 text-xs font-bold text-white/90 hover:text-white transition"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </header>
      </div>

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="hidden md:block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-7 text-white shadow-xl shadow-orange-500/15">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-100">
                    Cafteria CEV
                  </span>
                  <h1 className="text-3xl font-black tracking-tight text-white mt-0.5">
                    Shopping Cart
                  </h1>
                  <p className="mt-1 text-xs text-orange-100">
                    Review your items before proceeding to checkout
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/orders"
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-white/20 backdrop-blur-md px-4 py-2.5 text-xs font-bold text-white hover:bg-white/30 transition shadow-sm"
                  >
                    <ReceiptText className="h-4 w-4" />
                    <span>My Orders</span>
                  </Link>

                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={clearCart}
                      className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition backdrop-blur-md"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {remainingSeconds > 0 && items.length > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-300/60 dark:border-amber-500/30 p-3.5 text-amber-950 dark:text-amber-200 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" />
                <span>Items in your cart are locked for you. Stock will release in</span>
              </div>
              <span className="font-mono font-black text-amber-700 dark:text-amber-300 bg-white dark:bg-[#202230] px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-500/40">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          )}

          {cartError && (
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{cartError}</span>
              </div>
              <button
                type="button"
                onClick={() => setCartError(null)}
                className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {isExpired && (
            <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Your cart reservation expired. Items have been released back to stock.</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-[#161822]/60 p-12 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-[#ff5e3a]">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">Your cart is empty</h2>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  Looks like you have no items in your cart. Check today's fresh canteen menu!
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
                >
                  <Utensils className="h-4 w-4" />
                  <span>Browse Menu</span>
                </Link>
                <Link
                  href="/orders"
                  className="inline-flex items-center gap-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] px-5 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-200 shadow-xs hover:bg-orange-50 dark:hover:bg-white/5 hover:border-orange-200 hover:text-[#ff5e3a] transition active:scale-95"
                >
                  <ReceiptText className="h-4 w-4 text-[#ff5e3a]" />
                  <span>My Orders</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-3.5">
                {items.map((item) => {
                  const itemStockInfo = stockMap[item.id];
                  const trackInventory = itemStockInfo?.track_inventory ?? item.track_inventory ?? false;
                  const isAvailable = itemStockInfo ? itemStockInfo.is_available : true;
                  const maxStock = itemStockInfo?.track_inventory
                    ? (itemStockInfo.stock_quantity ?? 0)
                    : (item.track_inventory ? (item.stock_quantity ?? 0) : 999);
                  const isAtMaxStock = !isAvailable || (trackInventory && (maxStock <= 0 || item.quantity >= maxStock));

                  return (
                    <div
                      key={item.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-4 shadow-xs"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-white/5 flex items-center justify-center border border-stone-100 dark:border-white/5">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Utensils className="h-6 w-6 text-stone-300 dark:text-stone-600" />
                          )}
                        </div>
                        <div>
                          {item.category_name && (
                            <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                              {item.category_name}
                            </span>
                          )}
                          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">{item.name}</h3>
                          <p className="font-mono text-xs font-semibold text-stone-500 dark:text-stone-400 mt-0.5 tabular-nums">
                            ₹{(item.price / 100).toFixed(2)} each
                          </p>
                          {isAtMaxStock && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold block mt-0.5">
                              Max stock reached
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100 dark:border-white/10">
                        <div className="flex items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() => handleDecrease(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-lg bg-white dark:bg-[#202230] text-stone-700 dark:text-white hover:bg-stone-100 dark:hover:bg-white/10 transition shadow-xs"
                            title="Decrease"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[18px] text-center font-mono text-xs font-bold text-orange-950 dark:text-orange-200">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            disabled={isAtMaxStock}
                            onClick={() => {
                              if (!isAtMaxStock) {
                                handleIncrease(item.id, item.quantity + 1);
                              }
                            }}
                            className={`flex h-6 w-6 items-center justify-center rounded-lg transition shadow-xs ${
                              isAtMaxStock
                                ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60'
                                : 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white hover:opacity-95'
                            }`}
                            title={isAtMaxStock ? 'Max available stock reached' : 'Increase'}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <div className="font-mono text-sm font-bold text-stone-900 dark:text-white min-w-[70px] text-right tabular-nums">
                          ₹{((item.price * item.quantity) / 100).toFixed(2)}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-rose-600 dark:hover:text-rose-400 transition"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <Link
                    href="/menu"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-[#ff5e3a] transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Add more items from menu</span>
                  </Link>
                </div>
              </div>

              <div className="h-fit rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 shadow-xs space-y-5">
                <h2 className="text-sm font-bold text-stone-900 dark:text-white border-b border-stone-100 dark:border-white/10 pb-3">
                  Order Summary
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Items Count</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">{itemCount} items</span>
                  </div>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-stone-900 dark:text-white tabular-nums">
                      ₹{(subtotal / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="border-t border-stone-200 dark:border-white/10 pt-4 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-stone-900 dark:text-white">Total Amount</span>
                  <span className="font-mono text-xl font-extrabold text-[#ff5e3a] tabular-nums">
                    ₹{(subtotal / 100).toFixed(2)}
                  </span>
                </div>

                {user ? (
                  <Link
                    href="/checkout"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 transition active:scale-95"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/login?redirect=/checkout"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 transition active:scale-95"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In to Checkout</span>
                  </Link>
                )}

                <Link
                  href="/orders"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#202230] py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-orange-50 dark:hover:bg-white/5 hover:border-orange-200 hover:text-[#ff5e3a] transition"
                >
                  <ReceiptText className="h-4 w-4 text-[#ff5e3a]" />
                  <span>View Past Orders</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
