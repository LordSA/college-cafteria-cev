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
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          track_inventory: editTrack,
          stock_quantity: editStock,
          low_stock_threshold: editThreshold,
          is_available: editAvailable,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update item inventory');
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                track_inventory: editTrack,
                stock_quantity: editStock,
                low_stock_threshold: editThreshold,
                is_available: editAvailable,
                is_low_stock: editTrack && editStock <= editThreshold,
              }
            : item
        )
      );

      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save inventory adjustments';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: InventoryItem) => {
    if (!session?.access_token) return;

    const newStatus = !item.is_available;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/inventory/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_available: newStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to toggle availability');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error updating availability';
      setError(msg);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-[#101114] text-slate-100 min-h-screen">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#22242e] pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">
                ALEXATEL • Kitchen Stock & Roster
              </span>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                Real-Time Inventory & 86 Management
              </h1>
              <p className="mt-1 text-xs text-stone-400">
                Live portion counters, atomic deductions, and instant menu item cut-off toggles
              </p>
            </div>

            <button
              onClick={loadInventory}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white transition shadow-xs self-start sm:self-auto"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#9d8bf0]" />
              <span>Refresh Stock</span>
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLowStockFilter(false)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  !lowStockFilter
                    ? 'bg-[#f5a4c6] text-[#101114] shadow-md shadow-[#f5a4c6]/20'
                    : 'bg-[#17181f] text-stone-400 border border-[#2b2d3b] hover:bg-[#232533] hover:text-white'
                }`}
              >
                All Menu Dishes
              </button>
              <button
                onClick={() => setLowStockFilter(true)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${
                  lowStockFilter
                    ? 'bg-[#ea9955] text-[#101114] shadow-md shadow-[#ea9955]/20'
                    : 'bg-[#17181f] text-stone-400 border border-[#2b2d3b] hover:bg-[#232533] hover:text-white'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 text-[#ea9955]" />
                <span>Low Stock Warnings</span>
              </button>
            </div>

            <div className="w-full sm:w-64">
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-stone-500" />
                <input
                  type="text"
                  placeholder="Search item name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-[#2b2d3b] bg-[#1a1b24] pl-9 pr-4 py-2 text-xs text-white placeholder-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-stone-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
              <p className="text-xs font-semibold">Loading canteen inventory...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#22242e] bg-[#17181f]/40 p-12 text-center space-y-3">
              <ClipboardList className="mx-auto h-8 w-8 text-stone-600" />
              <h2 className="text-sm font-bold text-stone-300">No items match filter</h2>
              <p className="text-xs text-stone-500">
                {lowStockFilter
                  ? 'All inventory items are currently above their low-stock thresholds.'
                  : 'No menu items found.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#22242e] bg-[#17181f] shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#121316] border-b border-[#22242e] text-[11px] font-bold uppercase tracking-wider text-stone-400">
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
                  <tbody className="divide-y divide-[#22242e]">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1a1b24] transition">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-white">{item.name}</div>
                          {item.is_low_stock && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#ea9955]/15 border border-[#ea9955]/30 px-2 py-0.5 text-[10px] font-bold text-[#ea9955] mt-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              <span>Low Stock</span>
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-stone-400 font-medium">
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
                                    ? 'text-[#ea9955]'
                                    : 'text-emerald-400'
                                }`}
                              >
                                {item.stock_quantity}
                              </span>
                              <span className="text-[10px] text-stone-500">
                                (alert ≤ {item.low_stock_threshold})
                              </span>
                            </div>
                          ) : (
                            <span className="rounded-full bg-[#101114] px-2.5 py-0.5 text-[10px] font-semibold text-stone-400 border border-[#282a38]">
                              Unlimited / On-Demand
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {item.track_inventory ? (
                            <span className="rounded-full bg-[#9d8bf0]/15 border border-[#9d8bf0]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#9d8bf0]">
                              Tracked Unit
                            </span>
                          ) : (
                            <span className="text-stone-500 text-[11px]">Uncapped</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition shadow-xs ${
                              item.is_available
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
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
                                <span>86&apos;d (Sold Out)</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#282a38] bg-[#1a1b24] px-3 py-1 text-xs font-bold text-stone-300 hover:bg-[#232533] hover:text-white transition"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-[#9d8bf0]" />
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
              <div className="w-full max-w-md rounded-3xl border border-[#22242e] bg-[#17181f] p-6 shadow-2xl space-y-5">
                <div className="flex items-center justify-between border-b border-[#22242e] pb-3">
                  <h3 className="text-base font-bold text-white">
                    Adjust Inventory: {editingItem.name}
                  </h3>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-stone-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-300">
                      <input
                        type="checkbox"
                        checked={editTrack}
                        onChange={(e) => setEditTrack(e.target.checked)}
                        className="rounded border-[#282a38] bg-[#101114] text-[#f5a4c6] focus:ring-0"
                      />
                      <span>Track Individual Stock for this item</span>
                    </label>
                    <p className="text-[11px] text-stone-500 mt-1">
                      When enabled, orders deduct stock atomically. Item is automatically marked sold out when stock hits 0.
                    </p>
                  </div>

                  {editTrack && (
                    <>
                      <div>
                        <label className="block text-stone-400 mb-1.5 font-medium">
                          Current Stock Quantity
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setEditStock((s) => Math.max(0, s - 1))}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#282a38] bg-[#101114] text-stone-300 hover:bg-[#232533]"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={editStock}
                            onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value || '0', 10)))}
                            className="w-24 rounded-xl border border-[#282a38] bg-[#101114] px-3 py-1.5 font-mono text-center text-sm font-bold text-white focus:outline-none focus:border-[#f5a4c6]"
                          />
                          <button
                            onClick={() => setEditStock((s) => s + 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#282a38] bg-[#101114] text-stone-300 hover:bg-[#232533]"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-stone-400 mb-1.5 font-medium">
                          Low-Stock Alert Threshold
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(Math.max(0, parseInt(e.target.value || '0', 10)))}
                          className="w-24 rounded-xl border border-[#282a38] bg-[#101114] px-3 py-1.5 font-mono text-center text-sm font-bold text-white focus:outline-none focus:border-[#f5a4c6]"
                        />
                        <p className="text-[11px] text-stone-500 mt-1">
                          Kitchen dashboard highlights low stock when remaining quantity is less than or equal to this number.
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-stone-300">
                      <input
                        type="checkbox"
                        checked={editAvailable}
                        onChange={(e) => setEditAvailable(e.target.checked)}
                        className="rounded border-[#282a38] bg-[#101114] text-[#f5a4c6] focus:ring-0"
                      />
                      <span>Dish is Available for Ordering (Not 86&apos;d)</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#22242e]">
                  <button
                    onClick={() => setEditingItem(null)}
                    disabled={saving}
                    className="rounded-full border border-[#282a38] bg-[#101114] px-4 py-2 text-xs font-bold text-stone-300 hover:bg-[#232533]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInventory}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a4c6] px-5 py-2 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 disabled:opacity-50"
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
