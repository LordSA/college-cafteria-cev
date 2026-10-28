'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  ClipboardList,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  category_id: string;
  category_name?: string;
  is_available: boolean;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  is_low_stock: boolean;
  updated_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminInventoryPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session } = useAdminAuth();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editStock, setEditStock] = useState<number>(0);
  const [editThreshold, setEditThreshold] = useState<number>(5);
  const [editTrack, setEditTrack] = useState<boolean>(true);
  const [editAvailable, setEditAvailable] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, authLoading, router]);

  const loadInventory = useCallback(async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/api/v1/admin/inventory`);
      if (lowStockFilter) {
        url.searchParams.set('low_stock_only', 'true');
      }
      if (searchQuery.trim()) {
        url.searchParams.set('search', searchQuery.trim());
      }

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to load inventory data');
      }

      setItems(data.data || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error fetching inventory';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, lowStockFilter, searchQuery]);

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      loadInventory();
    }
  }, [adminUser, isUnauthorized, loadInventory]);

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditStock(item.stock_quantity);
    setEditThreshold(item.low_stock_threshold);
    setEditTrack(item.track_inventory);
    setEditAvailable(item.is_available);
  };

  const handleSaveInventory = async () => {
    if (!editingItem || !session?.access_token) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/${editingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          stock_quantity: editStock,
          low_stock_threshold: editThreshold,
          track_inventory: editTrack,
          is_available: editAvailable,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update inventory record');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === editingItem.id ? { ...i, ...data.data } : i))
      );
      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: InventoryItem) => {
    if (!session?.access_token) return;

    const nextAvailable = !item.is_available;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_available: nextAvailable,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to toggle availability');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: nextAvailable } : i))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Toggle failed';
      setError(msg);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Pantry & Stock Controls
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
                Inventory & Stock Management
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Monitor stock quantities, set low-threshold warnings, and toggle instant 86 availability
              </p>
            </div>

            <button
              onClick={loadInventory}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
              <span>Refresh Stock</span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLowStockFilter(false)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  !lowStockFilter
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                All Menu Dishes
              </button>
              <button
                onClick={() => setLowStockFilter(true)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
                  lowStockFilter
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="h-3 w-3 text-amber-400" />
                <span>Low Stock Warnings</span>
              </button>
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Loading canteen inventory...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center space-y-3">
              <ClipboardList className="mx-auto h-8 w-8 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-300">No items match filter</h2>
              <p className="text-xs text-slate-500">
                {lowStockFilter
                  ? 'All inventory items are currently above their low-stock thresholds.'
                  : 'No menu items found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-5 py-3.5">Dish / Item</th>
                      <th className="px-4 py-3.5">Category</th>
                      <th className="px-4 py-3.5">Price</th>
                      <th className="px-4 py-3.5">Stock Quantity</th>
                      <th className="px-4 py-3.5">Tracking Mode</th>
                      <th className="px-4 py-3.5">Availability</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{item.name}</div>
                          {item.is_low_stock && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 text-[10px] font-bold text-amber-400 mt-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>Low Stock</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-400">
                          {item.category_name || 'General'}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-white tabular-nums">
                          ₹{(item.price / 100).toFixed(2)}
                        </td>

                        <td className="px-4 py-3.5">
                          {item.track_inventory ? (
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-sm font-extrabold tabular-nums ${
                                  item.stock_quantity === 0
                                    ? 'text-rose-400'
                                    : item.is_low_stock
                                    ? 'text-amber-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {item.stock_quantity}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                (alert ≤ {item.low_stock_threshold})
                              </span>
                            </div>
                          ) : (
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                              Unlimited / On-Demand
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {item.track_inventory ? (
                            <span className="rounded bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                              Tracked Unit
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Uncapped</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition shadow-2xs ${
                              item.is_available
                                ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 hover:bg-emerald-900/60'
                                : 'bg-rose-950/60 border border-rose-800/60 text-rose-400 hover:bg-rose-900/60'
                            }`}
                            title="Click to toggle availability"
                          >
                            {item.is_available ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Available</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3" />
                                <span>86'd (Sold Out)</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                            <span>Edit Stock</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white">
                    Adjust Inventory: {editingItem.name}
                  </h3>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                      <input
                        type="checkbox"
                        checked={editTrack}
                        onChange={(e) => setEditTrack(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                      />
                      <span>Track Individual Stock for this item</span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">
                      When enabled, orders deduct stock atomically. Item is automatically marked sold out when stock hits 0.
                    </p>
                  </div>

                  {editTrack && (
                    <>
                      <div>
                        <label className="block text-slate-400 mb-1.5 font-medium">
                          Current Stock Quantity
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditStock((s) => Math.max(0, s - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={editStock}
                            onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value || '0', 10)))}
                            className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-center text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => setEditStock((s) => s + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5 font-medium">
                          Low-Stock Alert Threshold
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(Math.max(0, parseInt(e.target.value || '0', 10)))}
                          className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-center text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                        />
                        <p className="text-[11px] text-slate-500 mt-1">
                          Kitchen dashboard highlights low stock when remaining quantity is less than or equal to this number.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                      <input
                        type="checkbox"
                        checked={editAvailable}
                        onChange={(e) => setEditAvailable(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                      />
                      <span>Dish is Available for Ordering (Not 86'd)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    onClick={() => setEditingItem(null)}
                    disabled={saving}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInventory}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>Save Adjustments</span>
                  </button>
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
