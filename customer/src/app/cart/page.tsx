'use client';

import Link from 'next/link';
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
  ShieldCheck,
  LogIn,
} from 'lucide-react';

export default function CartPage() {
  const { user } = useAuth();
  const { items, updateQuantity, removeItem, clearCart, subtotal, itemCount } = useCart();

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff5e3a]">
                Cafteria CEV
              </span>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
                Shopping Cart
              </h1>
              <p className="mt-1 text-xs text-stone-500">
                Review your selected dishes before proceeding to order placement
              </p>
            </div>

            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-rose-600 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear All Items</span>
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5e3a]">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-base font-bold text-stone-900">Your cart is empty</h2>
                <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
                  Looks like you haven't added anything to your cart yet. Check out today's menu!
                </p>
              </div>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
              >
                <Utensils className="h-4 w-4" />
                <span>Browse Menu</span>
              </Link>
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Utensils className="h-6 w-6 text-stone-300" />
                        )}
                      </div>
                      <div>
                        {item.category_name && (
                          <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                            {item.category_name}
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-stone-900 line-clamp-1">{item.name}</h3>
                        <p className="font-mono text-xs font-semibold text-stone-500 mt-0.5 tabular-nums">
                          ₹{(item.price / 100).toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1 shadow-xs">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 transition shadow-xs"
                          title="Decrease"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-[18px] text-center font-mono text-xs font-bold text-orange-950">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white hover:opacity-95 transition shadow-xs"
                          title="Increase"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="font-mono text-sm font-bold text-stone-900 min-w-[70px] text-right tabular-nums">
                        ₹{((item.price * item.quantity) / 100).toFixed(2)}
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 transition"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="pt-2">
                  <Link
                    href="/menu"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-[#ff5e3a] transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Add more items from menu</span>
                  </Link>
                </div>
              </div>

              <div className="h-fit rounded-2xl border border-stone-200 bg-white p-6 shadow-sm space-y-6">
                <h2 className="text-sm font-bold text-stone-900 border-b border-stone-100 pb-3">
                  Order Summary
                </h2>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>Items Count</span>
                    <span className="font-semibold text-stone-900">{itemCount} items</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-mono font-semibold text-stone-900 tabular-nums">
                      ₹{(subtotal / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>Campus Surcharge</span>
                    <span className="font-mono font-semibold text-emerald-600 tabular-nums">₹0.00</span>
                  </div>
                </div>

                <div className="border-t border-stone-200 pt-4 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-stone-900">Total Amount</span>
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

                <div className="rounded-xl bg-orange-50/70 p-3 border border-orange-200/60 text-[11px] text-orange-950 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#ff5e3a] flex-shrink-0 mt-0.5" />
                  <span>
                    Orders are checked for live availability and queued directly for canteen kitchen preparation.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
