'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Search,
  PlusCircle,
  MinusCircle,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  X,
  History,
  Info,
} from 'lucide-react';

interface WalletListItem {
  id: string;
  customer_id: string;
  balance: number;
  formatted_balance: string;
  customer_name: string;
  customer_account_type: string;
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
  actor_id?: string | null;
  created_at: string;
}

interface CustomerDetail {
  id: string;
  customer_id: string;
  balance: number;
  formatted_balance: string;
  customer_name: string;
  customer_account_type: string;
  transactions: WalletTransaction[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminWalletsPage() {
  const { adminUser, adminProfile, session, loading: authLoading } = useAdminAuth();

  const [wallets, setWallets] = useState<WalletListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [selectedCustomer, setSelectedCustomer] = useState<WalletListItem | null>(null);
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit');
  const [adjustAmountRupees, setAdjustAmountRupees] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  const [viewingLedger, setViewingLedger] = useState<CustomerDetail | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const fetchWallets = async (query = '') => {
    if (!session?.access_token) return;

    setError(null);
    try {
      const url = new URL(`${API_BASE_URL}/api/v1/admin/wallets`);
      if (query) url.searchParams.set('search', query);

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch customer wallets');
      }

      setWallets(json.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading wallets';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && session) {
      fetchWallets(search);
    }
  }, [session, authLoading]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchWallets(search);
  };

  const handleOpenAdjustModal = (item: WalletListItem, type: 'credit' | 'debit' = 'credit') => {
    setSelectedCustomer(item);
    setAdjustType(type);
    setAdjustAmountRupees('');
    setAdjustReason('');
    setAdjustError(null);
    setAdjustSuccess(null);
  };

  const handleCloseAdjustModal = () => {
    setSelectedCustomer(null);
    setAdjustError(null);
    setAdjustSuccess(null);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !session?.access_token) return;

    const amountRupees = parseFloat(adjustAmountRupees);
    if (isNaN(amountRupees) || amountRupees <= 0) {
      setAdjustError('Please provide a valid adjustment amount greater than ₹0.00');
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError('A mandatory ledger audit reason is required for administrative adjustments');
      return;
    }

    setAdjustSubmitting(true);
    setAdjustError(null);
    setAdjustSuccess(null);

    const amountPaise = Math.round(amountRupees * 100);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/wallets/${selectedCustomer.customer_id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          amount: amountPaise,
          type: adjustType,
          reason: adjustReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to process balance adjustment');
      }

      setAdjustSuccess(
        `Successfully ${adjustType === 'credit' ? 'credited' : 'debited'} ₹${amountRupees.toFixed(2)} to ${selectedCustomer.customer_name}.`
      );

      setWallets((prev) =>
        prev.map((w) =>
          w.customer_id === selectedCustomer.customer_id
            ? {
                ...w,
                balance: json.data.balance,
                formatted_balance: json.data.formatted_balance,
                updated_at: new Date().toISOString(),
              }
            : w
        )
      );

      setSelectedCustomer((prev) =>
        prev
          ? {
              ...prev,
              balance: json.data.balance,
              formatted_balance: json.data.formatted_balance,
            }
          : null
      );

      setTimeout(() => {
        handleCloseAdjustModal();
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing adjustment';
      setAdjustError(msg);
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const handleOpenLedger = async (customerId: string) => {
    if (!session?.access_token) return;

    setLedgerLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/wallets/${customerId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to load customer ledger');
      }

      setViewingLedger(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading ledger';
      setError(msg);
    } finally {
      setLedgerLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#101114] text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!adminUser || adminProfile?.app_role !== 'admin') {
    return (
      <div className="min-h-screen flex flex-col bg-[#101114] text-slate-100">
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 px-4">
          <div className="max-w-md rounded-3xl border border-rose-500/30 bg-[#17181f] p-8 text-center space-y-4 shadow-xl">
            <Shield className="mx-auto h-12 w-12 text-rose-400" />
            <h1 className="text-xl font-bold text-white">Access Denied</h1>
            <p className="text-xs text-stone-400">
              You must have an approved staff administrator account to manage testing wallets.
            </p>
            <Link
              href="/login"
              className="inline-block rounded-xl bg-[#f5a4c6] px-5 py-2.5 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 transition"
            >
              Sign In with Admin Account
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#101114] text-slate-100">
      <Header />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#22242e] pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">
                ALEXATEL • Ledger Auditing
              </span>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Testing Wallet Management
              </h1>
              <p className="mt-1 text-xs text-stone-400">
                Allocate demo credits, review customer balances, and audit testing transactions
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchWallets(search)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white transition shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#9d8bf0]" />
                <span>Refresh</span>
              </button>
              <Link
                href="/scan"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a4c6] px-4 py-2 text-xs font-black text-[#101114] hover:opacity-90 transition shadow-md shadow-[#f5a4c6]/20"
              >
                <span>QR Scanner &rarr;</span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-4 text-xs text-amber-200 flex items-start gap-3">
            <Info className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300 leading-relaxed">
              <strong>Testing Wallet — Demo Credits Only. No Real Money.</strong> These balances are for simulated canteen ordering. Real gateway payments remain scheduled for Phase 5.
            </p>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl border border-[#22242e] bg-[#17181f] p-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search customer by name or UUID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-full border border-[#2b2d3b] bg-[#1a1b24] pl-9 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                />
              </div>
              <button
                type="submit"
                className="rounded-full bg-[#1a1b24] px-5 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white transition border border-[#282a38]"
              >
                Search
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-[#22242e] bg-[#17181f] overflow-hidden shadow-xs">
            <div className="border-b border-[#22242e] px-6 py-4 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                Active Customer Wallets
              </span>
              <span className="text-xs font-mono text-stone-400">
                {wallets.length} account{wallets.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-stone-500">
                <Loader2 className="h-7 w-7 animate-spin text-[#9d8bf0]" />
              </div>
            ) : wallets.length === 0 ? (
              <div className="py-16 text-center text-xs text-stone-500">
                No customer wallets found matching your search.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#22242e] bg-[#121316] text-stone-400 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-6 py-3">Customer</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Balance</th>
                      <th className="px-4 py-3">Last Active</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22242e]">
                    {wallets.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1a1b24] transition">
                        <td className="px-6 py-4">
                          <p className="font-bold text-white">{item.customer_name}</p>
                          <p className="font-mono text-[10px] text-stone-500">{item.customer_id}</p>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-[#101114] px-2.5 py-0.5 text-[10px] font-semibold text-stone-300 capitalize border border-[#282a38]">
                            {item.customer_account_type}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-mono text-sm font-extrabold text-emerald-400 tabular-nums">
                            {item.formatted_balance}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-stone-400 font-medium">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenAdjustModal(item, 'credit')}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
                            >
                              <PlusCircle className="h-3 w-3" />
                              <span>Credit</span>
                            </button>
                            <button
                              onClick={() => handleOpenAdjustModal(item, 'debit')}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/25 transition"
                            >
                              <MinusCircle className="h-3 w-3" />
                              <span>Debit</span>
                            </button>
                            <button
                              onClick={() => handleOpenLedger(item.customer_id)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#282a38] bg-[#1a1b24] px-3 py-1 text-[11px] font-bold text-stone-300 hover:bg-[#232533] hover:text-white transition"
                            >
                              <History className="h-3 w-3" />
                              <span>Ledger</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-[#22242e] bg-[#17181f] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#22242e] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  {adjustType === 'credit' ? 'Add Testing Credits' : 'Deduct Testing Credits'}
                </h3>
                <p className="text-xs text-stone-400">
                  Target: <span className="text-white font-semibold">{selectedCustomer.customer_name}</span>
                </p>
              </div>
              <button
                onClick={handleCloseAdjustModal}
                className="rounded-full p-1 text-stone-400 hover:bg-[#232533] hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-[#22242e] bg-[#101114] p-3 text-xs flex justify-between items-center">
              <span className="text-stone-400 font-medium">Current Balance:</span>
              <span className="font-mono text-sm font-extrabold text-emerald-400">
                {selectedCustomer.formatted_balance}
              </span>
            </div>

            {adjustError && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
                <span>{adjustError}</span>
              </div>
            )}

            {adjustSuccess && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span>{adjustSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`rounded-xl py-2 text-xs font-bold transition border ${
                      adjustType === 'credit'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-[#101114] border-[#282a38] text-stone-400 hover:text-white'
                    }`}
                  >
                    + Credit (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`rounded-xl py-2 text-xs font-bold transition border ${
                      adjustType === 'debit'
                        ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                        : 'bg-[#101114] border-[#282a38] text-stone-400 hover:text-white'
                    }`}
                  >
                    - Debit (Deduct)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Amount in Rupees (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-stone-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="100.00"
                    value={adjustAmountRupees}
                    onChange={(e) => setAdjustAmountRupees(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] pl-8 pr-3 py-2 text-xs text-white placeholder-stone-600 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Mandatory Audit Reason
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lab testing credits allocation"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  required
                  className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2 text-xs text-white placeholder-stone-600 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseAdjustModal}
                  className="flex-1 rounded-full border border-[#282a38] bg-[#101114] py-2.5 text-xs font-bold text-stone-400 hover:bg-[#232533] hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className={`flex-1 rounded-full py-2.5 text-xs font-black transition disabled:opacity-50 ${
                    adjustType === 'credit'
                      ? 'bg-emerald-400 text-[#101114] hover:bg-emerald-300'
                      : 'bg-rose-500 text-white hover:bg-rose-400'
                  }`}
                >
                  {adjustSubmitting ? 'Processing...' : `Confirm ${adjustType === 'credit' ? 'Credit' : 'Debit'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewingLedger && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl rounded-3xl border border-[#22242e] bg-[#17181f] p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#22242e] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Customer Ledger Audit
                </h3>
                <p className="text-xs text-stone-400">
                  {viewingLedger.customer_name} • Balance:{' '}
                  <span className="text-emerald-400 font-mono font-bold">
                    {viewingLedger.formatted_balance}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setViewingLedger(null)}
                className="rounded-full p-1 text-stone-400 hover:bg-[#232533] hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {ledgerLoading ? (
                <div className="py-12 flex items-center justify-center text-stone-500">
                  <Loader2 className="h-6 w-6 animate-spin text-[#9d8bf0]" />
                </div>
              ) : viewingLedger.transactions.length === 0 ? (
                <div className="py-10 text-center text-xs text-stone-500">
                  No transaction history recorded for this customer.
                </div>
              ) : (
                viewingLedger.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="rounded-2xl border border-[#22242e] bg-[#101114] p-3.5 text-xs flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-stone-200">{tx.reason}</p>
                      <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(tx.created_at).toLocaleString()}</span>
                        <span>•</span>
                        <span className="font-mono">Bal: ₹{(tx.balance_after / 100).toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono font-bold ${
                          tx.transaction_type === 'credit' ? 'text-emerald-400' : 'text-stone-200'
                        }`}
                      >
                        {tx.transaction_type === 'credit' ? '+' : '-'}₹{(tx.amount / 100).toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-stone-500 uppercase font-bold">
                        {tx.transaction_type}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-[#22242e] pt-3 text-right">
              <button
                onClick={() => setViewingLedger(null)}
                className="rounded-full bg-[#1a1b24] border border-[#282a38] px-5 py-2 text-xs font-bold text-stone-300 hover:bg-[#232533] hover:text-white transition"
              >
                Close Ledger
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
