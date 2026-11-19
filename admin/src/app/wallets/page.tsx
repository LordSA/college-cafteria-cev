'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
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
  const { adminUser, isUnauthorized, session, loading: authLoading } = useAdminAuth();

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
    if (adminUser && !isUnauthorized) {
      fetchWallets();
    } else if (!authLoading && (!adminUser || isUnauthorized)) {
      setLoading(false);
    }
  }, [adminUser, isUnauthorized, authLoading, session?.access_token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    fetchWallets(search);
  };

  const handleOpenAdjustModal = (customer: WalletListItem, type: 'credit' | 'debit') => {
    setSelectedCustomer(customer);
    setAdjustType(type);
    setAdjustAmountRupees('');
    setAdjustReason('');
    setAdjustError(null);
    setAdjustSuccess(null);
  };

  const handleCloseAdjustModal = () => {
    setSelectedCustomer(null);
    setAdjustAmountRupees('');
    setAdjustReason('');
    setAdjustError(null);
    setAdjustSuccess(null);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !session?.access_token) return;

    setAdjustError(null);
    setAdjustSuccess(null);

    const parsedRupees = parseFloat(adjustAmountRupees);
    if (isNaN(parsedRupees) || parsedRupees <= 0) {
      setAdjustError('Please provide a valid adjustment amount above ₹0');
      return;
    }

    if (!adjustReason.trim()) {
      setAdjustError('A reason is mandatory for all credit or debit operations');
      return;
    }

    const amountInPaise = Math.round(parsedRupees * 100);

    setAdjustSubmitting(true);
    try {
      const endpoint =
        adjustType === 'credit'
          ? `${API_BASE_URL}/api/v1/admin/wallets/credit`
          : `${API_BASE_URL}/api/v1/admin/wallets/debit`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          customer_id: selectedCustomer.customer_id,
          amount: amountInPaise,
          reason: adjustReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Failed to ${adjustType} customer wallet`);
      }

      setAdjustSuccess(
        `Successfully ${adjustType === 'credit' ? 'credited' : 'debited'} ₹${parsedRupees.toFixed(2)}.`
      );

      await fetchWallets(search);

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
    setViewingLedger(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/wallets/${customerId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Failed to fetch customer ledger details');
      }

      setViewingLedger(json.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading customer ledger';
      setError(msg);
    } finally {
      setLedgerLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white text-[#252525]">
        <Header />
        <main className="flex-1 flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!adminUser || isUnauthorized) {
    return (
      <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 flex items-center justify-center py-20 px-4">
            <div className="max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center space-y-4 shadow-sm">
              <Shield className="mx-auto h-12 w-12 text-[#D94A43]" />
              <h1 className="text-xl font-bold text-[#252525]">Access Denied</h1>
              <p className="text-xs text-[#666666]">
                You must have an approved staff administrator account to manage testing wallets.
              </p>
              <Link
                href="/login"
                className="inline-block rounded-xl bg-[#F47721] px-5 py-2.5 text-xs font-black text-white shadow-md shadow-[#F47721]/20 hover:bg-[#E06310] transition"
              >
                Sign In with Admin Account
              </Link>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721]">
                  Cafeteria.cev • Ledger Auditing
                </span>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  Testing Wallet Management
                </h1>
                <p className="mt-1 text-xs text-[#666666]">
                  Allocate demo credits, review customer balances, and audit testing transactions
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchWallets(search)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-xs"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#F47721]" />
                  <span>Refresh</span>
                </button>
                <Link
                  href="/scan"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-black text-white transition shadow-md shadow-[#F47721]/20"
                >
                  <span>QR Scanner &rarr;</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
              <Info className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-800 leading-relaxed">
                <strong>Testing Wallet — Demo Credits Only. No Real Money.</strong> These balances are for simulated canteen ordering. Real gateway payments remain scheduled for Phase 5.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43] flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-[#D94A43] flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-2xl border border-[#EEEEEE] bg-white p-4 shadow-xs">
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#888888]" />
                  <input
                    type="text"
                    placeholder="Search customer by name or UUID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white pl-9 pr-4 py-2 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-[#FAFAFA] hover:bg-[#FFF7F0] px-5 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition border border-[#EEEEEE]"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-[#EEEEEE] bg-white overflow-hidden shadow-xs">
              <div className="border-b border-[#EEEEEE] px-6 py-4 flex items-center justify-between bg-[#FAFAFA]">
                <span className="text-xs font-bold text-[#252525] uppercase tracking-wider">
                  Active Customer Wallets
                </span>
                <span className="text-xs font-mono text-[#666666]">
                  {wallets.length} account{wallets.length === 1 ? '' : 's'}
                </span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-[#666666]">
                  <Loader2 className="h-7 w-7 animate-spin text-[#F47721]" />
                </div>
              ) : wallets.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#666666]">
                  No customer wallets found matching your search.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#EEEEEE] bg-[#FAFAFA] text-[#666666] uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-6 py-3">Customer</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Balance</th>
                        <th className="px-4 py-3">Last Active</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEEEE]">
                      {wallets.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-[#252525]">{item.customer_name}</p>
                            <p className="font-mono text-[10px] text-[#888888]">{item.customer_id}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-[#FAFAFA] px-2.5 py-0.5 text-[10px] font-semibold text-[#252525] capitalize border border-[#EEEEEE]">
                              {item.customer_account_type}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="font-mono text-sm font-extrabold text-[#269B62] tabular-nums">
                              {item.formatted_balance}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-[#666666] font-medium">
                            {new Date(item.updated_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenAdjustModal(item, 'credit')}
                                className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-[11px] font-bold text-[#269B62] hover:bg-green-100 transition"
                              >
                                <PlusCircle className="h-3 w-3" />
                                <span>Credit</span>
                              </button>
                              <button
                                onClick={() => handleOpenAdjustModal(item, 'debit')}
                                className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-[11px] font-bold text-[#D94A43] hover:bg-red-100 transition"
                              >
                                <MinusCircle className="h-3 w-3" />
                                <span>Debit</span>
                              </button>
                              <button
                                onClick={() => handleOpenLedger(item.customer_id)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1 text-[11px] font-bold text-[#252525] hover:text-[#F47721] transition"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#252525]">
                    {adjustType === 'credit' ? 'Add Testing Credits' : 'Deduct Testing Credits'}
                  </h3>
                  <p className="text-xs text-[#666666]">
                    Target: <span className="text-[#252525] font-semibold">{selectedCustomer.customer_name}</span>
                  </p>
                </div>
                <button
                  onClick={handleCloseAdjustModal}
                  className="rounded-full p-1 text-[#888888] hover:bg-gray-100 hover:text-[#252525] transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] p-3 text-xs flex justify-between items-center">
                <span className="text-[#666666] font-medium">Current Balance:</span>
                <span className="font-mono text-sm font-extrabold text-[#269B62]">
                  {selectedCustomer.formatted_balance}
                </span>
              </div>

              {adjustError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-[#D94A43] flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                  <span>{adjustError}</span>
                </div>
              )}

              {adjustSuccess && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-3 text-xs text-[#269B62] flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#269B62]" />
                  <span>{adjustSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitAdjustment} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#252525] mb-1">
                    Adjustment Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('credit')}
                      className={`rounded-xl py-2 text-xs font-bold transition border ${
                        adjustType === 'credit'
                          ? 'bg-green-50 border-green-200 text-[#269B62]'
                          : 'bg-white border-[#EEEEEE] text-[#666666] hover:text-[#252525]'
                      }`}
                    >
                      + Credit (Add)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('debit')}
                      className={`rounded-xl py-2 text-xs font-bold transition border ${
                        adjustType === 'debit'
                          ? 'bg-red-50 border-red-200 text-[#D94A43]'
                          : 'bg-white border-[#EEEEEE] text-[#666666] hover:text-[#252525]'
                      }`}
                    >
                      - Debit (Deduct)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252525] mb-1">
                    Amount in Rupees (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-[#888888]">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="100.00"
                      value={adjustAmountRupees}
                      onChange={(e) => setAdjustAmountRupees(e.target.value)}
                      required
                      className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white pl-8 pr-3 py-2 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 font-mono transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#252525] mb-1">
                    Mandatory Audit Reason
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lab testing credits allocation"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    required
                    className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handleCloseAdjustModal}
                    className="flex-1 rounded-xl border border-[#EEEEEE] bg-white py-2.5 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustSubmitting}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-black transition disabled:opacity-50 ${
                      adjustType === 'credit'
                        ? 'bg-[#269B62] text-white hover:bg-[#1f8050] shadow-md shadow-[#269B62]/20'
                        : 'bg-[#D94A43] text-white hover:bg-[#b83b35] shadow-md shadow-[#D94A43]/20'
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                <div>
                  <h3 className="text-base font-bold text-[#252525]">
                    Customer Ledger Audit
                  </h3>
                  <p className="text-xs text-[#666666]">
                    {viewingLedger.customer_name} • Balance:{' '}
                    <span className="text-[#269B62] font-mono font-bold">
                      {viewingLedger.formatted_balance}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => setViewingLedger(null)}
                  className="rounded-full p-1 text-[#888888] hover:bg-gray-100 hover:text-[#252525] transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {ledgerLoading ? (
                  <div className="py-12 flex items-center justify-center text-[#666666]">
                    <Loader2 className="h-6 w-6 animate-spin text-[#F47721]" />
                  </div>
                ) : viewingLedger.transactions.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#666666]">
                    No transaction history recorded for this customer.
                  </div>
                ) : (
                  viewingLedger.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="rounded-2xl border border-[#EEEEEE] bg-[#FAFAFA] p-3.5 text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-[#252525]">{tx.reason}</p>
                        <div className="flex items-center gap-2 text-[10px] text-[#888888] mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(tx.created_at).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-mono text-[#252525]">Bal: ₹{(tx.balance_after / 100).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold ${
                            tx.transaction_type === 'credit' ? 'text-[#269B62]' : 'text-[#252525]'
                          }`}
                        >
                          {tx.transaction_type === 'credit' ? '+' : '-'}₹{(tx.amount / 100).toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-[#666666] uppercase font-bold">
                          {tx.transaction_type}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-[#EEEEEE] pt-3 text-right">
                <button
                  onClick={() => setViewingLedger(null)}
                  className="rounded-xl bg-[#FAFAFA] border border-[#EEEEEE] px-5 py-2 text-xs font-bold text-[#666666] hover:bg-gray-100 hover:text-[#252525] transition"
                >
                  Close Ledger
                </button>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
