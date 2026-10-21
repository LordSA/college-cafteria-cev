'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  ReceiptText,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  Utensils,
  CheckCircle2,
  XCircle,
  Flame,
  PackageCheck,
  AlertTriangle,
} from 'lucide-react';

interface OrderItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

interface Order {
  id: string;
  order_number: string;
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'completed' | 'cancelled';
  payment_status: string;
  subtotal: number;
  total: number;
  created_at: string;
  items: OrderItem[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function CustomerOrdersPage() {
  const { user, loading: authLoading, session } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!session?.access_token) return;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/orders/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || 'Failed to load order history');
        }

        setOrders(data.data || []);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error retrieving orders';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      if (session) {
        fetchOrders();
      } else {
        setLoading(false);
      }
    }
  }, [session, authLoading]);

  const renderStatusBadge = (status: Order['order_status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
            <Clock className="h-3 w-3" />
            <span>Order Placed</span>
          </span>
        );
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">
            <CheckCircle2 className="h-3 w-3" />
            <span>Kitchen Confirmed</span>
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800 animate-pulse">
            <Flame className="h-3 w-3" />
            <span>Cooking in Progress</span>
          </span>
        );
      case 'ready_for_pickup':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <PackageCheck className="h-3 w-3" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-bold text-stone-700">
            <CheckCircle2 className="h-3 w-3" />
            <span>Completed</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
            <XCircle className="h-3 w-3" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="border-b border-stone-200 pb-6">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Personal Dining Record
            </span>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
              My Campus Orders
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Track live kitchen status, token numbers, and previous canteen orders
            </p>
          </div>

          {!user && !authLoading ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
              <ReceiptText className="mx-auto h-8 w-8 text-stone-400" />
              <h2 className="text-base font-bold text-stone-900">Sign in to view your orders</h2>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Authenticate with your college account to view active prep queues and receipts.
              </p>
              <Link
                href="/login?redirect=/orders"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                Sign In
              </Link>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
              <p className="text-xs font-medium">Loading your orders...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center space-y-4">
              <ReceiptText className="mx-auto h-8 w-8 text-stone-300" />
              <h2 className="text-base font-bold text-stone-900">No orders placed yet</h2>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                When you order from the campus canteen, your live kitchen status and tickets will show up here.
              </p>
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                <Utensils className="h-4 w-4" />
                <span>Explore Today's Menu</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const formattedDate = new Date(order.created_at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={order.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs hover:border-amber-300 hover:shadow-sm transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm font-extrabold text-stone-900">
                          {order.order_number}
                        </span>
                        {renderStatusBadge(order.order_status)}
                      </div>

                      <p className="text-xs text-stone-500 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        <span>{formattedDate}</span>
                      </p>

                      <div className="text-xs text-stone-700">
                        {order.items.map((i) => `${i.quantity}× ${i.item_name}`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                      <div className="text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 block">
                          Total
                        </span>
                        <span className="font-mono text-base font-extrabold text-stone-900 tabular-nums">
                          ₹{(order.total / 100).toFixed(2)}
                        </span>
                      </div>

                      <Link
                        href={`/orders/track/?id=${order.id}`}
                        className="inline-flex items-center gap-1 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:text-amber-700 transition"
                      >
                        <span>Details</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
