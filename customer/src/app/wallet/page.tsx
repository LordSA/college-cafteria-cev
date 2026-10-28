'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Clock,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  Loader2,
} from 'lucide-react';

interface WalletData {
  id: string;
  customer_id: string;
  balance: number;
  formatted_balance: string;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  customer_id: string;
  amount: number;
  transaction_type: 'credit' | 'debit';
  balance_after: number;
  reason: string;
  order_id?: string | null;
  actor_id?: string | null;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function WalletPage() {
  const { user, session, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    if (!session?.access_token) return;

    setError(null);
    try {
      const [walletRes, txRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/wallet/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
        fetch(`${API_BASE_URL}/api/v1/wallet/transactions`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }),
      ]);

      const walletJson = await walletRes.json();
      const txJson = await txRes.json();

      if (!walletRes.ok || !walletJson.success) {
        throw new Error(walletJson.error?.message || 'Failed to load wallet');
      }

      setWallet(walletJson.data);
      if (txJson.success && Array.isArray(txJson.data)) {
        setTransactions(txJson.data);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading wallet';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (session) {
        fetchWalletData();
      } else {
        setLoading(false);
      }
    }
  }, [session, authLoading]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-stone-50">
        <Header />
        <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-md rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Wallet className="h-6 w-6" />
            </div>
            <h1 className="text-lg font-bold text-stone-900">Sign in to view your wallet</h1>
            <p className="text-xs text-stone-500">
              Access your canteen testing wallet, view demo balances, and track payment transactions.
            </p>
            <div className="pt-2">
              <Link
                href="/login?redirect=/wallet"
                className="w-full inline-flex items-center justify-center rounded-xl bg-amber-600 py-3 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                Sign In to Cafteria
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <Header />

      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  Phase 4.1 Feature
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                  Testing Wallet
                </span>
              </div>
              <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-stone-900 sm:text-3xl">
                Canteen Testing Wallet
              </h1>
              <p className="mt-1 text-xs text-stone-500">
                Manage your non-monetary demo credits for simulated campus food ordering.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 shadow-xs hover:bg-stone-50 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
                <span>Refresh</span>
              </button>
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Order Food</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-xs flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Testing Wallet — Demo Credits Only. No Real Money.</p>
              <p className="mt-0.5 text-amber-800/90 leading-relaxed">
                This wallet balance contains non-monetary test credits provided for canteen system testing. Credits cannot be withdrawn, refunded to real currency, or transferred. Real payment gateways will be activated in Phase 5.
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-1 rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 h-28 w-28 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-300">Available Balance</span>
                  <Wallet className="h-5 w-5 text-amber-400" />
                </div>
                <div className="mt-4">
                  <div className="font-mono text-3xl font-extrabold tracking-tight tabular-nums text-white">
                    {wallet ? `₹${(wallet.balance / 100).toFixed(2)}` : '₹0.00'}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Demo credits active</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-stone-700/60 pt-4 text-[10px] text-stone-400">
                <span>Account ID: </span>
                <span className="font-mono text-stone-300">{user.id.slice(0, 8)}...</span>
              </div>
            </div>

            <div className="md:col-span-2 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-stone-900">How Wallet Credits Work</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3.5">
                    <span className="font-bold text-stone-800">1. Instant Checkout</span>
                    <p className="mt-1 text-stone-500 text-[11px]">
                      Select "Testing Wallet" during checkout to instantly pay and generate a secure QR pickup pass.
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-100 bg-stone-50 p-3.5">
                    <span className="font-bold text-stone-800">2. Staff Top-Up</span>
                    <p className="mt-1 text-stone-500 text-[11px]">
                      Need more test credits? Request canteen administrators to adjust your balance from the operations panel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs">
                <span className="text-stone-500">Need food right now?</span>
                <Link
                  href="/menu"
                  className="font-bold text-amber-700 hover:text-amber-800 transition"
                >
                  Explore Today's Menu &rarr;
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-stone-100 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">Transaction History</h3>
                <p className="text-xs text-stone-500">Auditable ledger of your canteen test credits</p>
              </div>
              <span className="text-xs font-mono font-medium text-stone-400">
                {transactions.length} record{transactions.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12 text-stone-400">
                <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                No wallet transactions recorded yet. Place an order or request demo credits to see activity.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {transactions.map((tx) => {
                  const isCredit = tx.transaction_type === 'credit';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/70 transition"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            isCredit
                              ? 'bg-emerald-50 text-emerald-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {isCredit ? (
                            <ArrowDownLeft className="h-5 w-5" />
                          ) : (
                            <ArrowUpRight className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-stone-900">{tx.reason}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(tx.created_at).toLocaleString()}</span>
                            <span>•</span>
                            <span className="font-mono">Bal: ₹{(tx.balance_after / 100).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono text-sm font-bold tabular-nums ${
                            isCredit ? 'text-emerald-700' : 'text-stone-900'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₹{(tx.amount / 100).toFixed(2)}
                        </span>
                        <span className="block text-[10px] uppercase font-semibold text-stone-400 tracking-wider">
                          {tx.transaction_type}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
