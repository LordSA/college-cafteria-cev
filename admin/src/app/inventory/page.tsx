'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

  const toggleAvailability = async (item: InventoryItem) => {
    if (!session?.access_token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/menu/items/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ is_available: !item.is_available }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update item availability');
      }

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !item.is_available } : i))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error toggling availability';
      alert(msg);
    }
  };

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
        throw new Error(data.error?.message || 'Failed to update inventory');
      }

      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? {
              ...i,
              stock_quantity: editStock,
              low_stock_threshold: editThreshold,
              track_inventory: editTrack,
              is_available: editAvailable,
              is_low_stock: editTrack && editStock <= editThreshold,
            }
            : i
        )
      );

      setEditingItem(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving inventory adjustments';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  Inventory Management
                </h1>
                <p className="mt-1 text-xs text-[#666666]">
                </p>
              </div>

              <button
                onClick={loadInventory}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-xs self-start sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5 text-[#F47721]" />
                <span>Refresh</span>
              </button>
            </div>

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43] flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43]" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLowStockFilter(false)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${!lowStockFilter
                    ? 'bg-[#F47721] text-white shadow-md shadow-[#F47721]/20'
                    : 'bg-white text-[#666666] border border-[#EEEEEE] hover:bg-gray-50 hover:text-[#252525]'
                    }`}
                >
                  All Menu
                </button>
                <button
                  onClick={() => setLowStockFilter(true)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition flex items-center gap-1.5 ${lowStockFilter
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                    : 'bg-white text-[#666666] border border-[#EEEEEE] hover:bg-gray-50 hover:text-[#252525]'
                    }`}
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Low Stock</span>
                </button>
              </div>

              <div className="w-full sm:w-64">
                <div className="relative">
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-[#888888]" />
                  <input
                    type="text"
                    placeholder="Search item name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-[#EEEEEE] hover:border-gray-300 bg-white pl-9 pr-4 py-2 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#666666] gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                <p className="text-xs font-semibold">Loading...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center space-y-3">
                <h2 className="text-sm font-bold text-[#252525]">No items match</h2>
                <p className="text-xs text-[#666666]">
                  {lowStockFilter
                    ? 'All inventory items are currently above their low-stock thresholds.'
                    : 'No menu items found.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#EEEEEE] text-[11px] font-bold uppercase tracking-wider text-[#666666]">
                      <tr>
                        <th className="px-5 py-3.5">Item</th>
                        <th className="px-4 py-3.5">Category</th>
                        <th className="px-4 py-3.5">Price</th>
                        <th className="px-4 py-3.5">Stock Quantity</th>
                        <th className="px-4 py-3.5">Tracking Mode</th>
                        <th className="px-4 py-3.5">Availability</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEEEE]">
                      {items.map((item) => (
                        <tr key={item.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-[#252525]">{item.name}</div>
                            {item.is_low_stock && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700 mt-1">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>Low Stock</span>
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5 text-[#666666] font-medium">
                            {item.category_name || 'General'}
                          </td>

                          <td className="px-4 py-3.5 font-mono font-bold text-[#252525] tabular-nums">
                            ₹{(item.price / 100).toFixed(2)}
                          </td>

                          <td className="px-4 py-3.5">
                            {item.track_inventory ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono text-sm font-extrabold tabular-nums ${item.stock_quantity === 0
                                    ? 'text-[#D94A43]'
                                    : item.is_low_stock
                                      ? 'text-amber-700'
                                      : 'text-[#269B62]'
                                    }`}
                                >
                                  {item.stock_quantity}
                                </span>
                                <span className="text-[10px] text-[#888888]">
                                  (alert ≤ {item.low_stock_threshold})
                                </span>
                              </div>
                            ) : (
                              <span className="rounded-full bg-[#FAFAFA] px-2.5 py-0.5 text-[10px] font-semibold text-[#666666] border border-[#EEEEEE]">
                                Unlimited / On-Demand
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            {item.track_inventory ? (
                              <span className="rounded-full bg-[#FFF7F0] border border-[#F47721]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F47721]">
                                Tracked Unit
                              </span>
                            ) : (
                              <span className="text-[#888888] text-[11px]">Uncapped</span>
                            )}
                          </td>

                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => toggleAvailability(item)}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold transition shadow-xs ${item.is_available
                                ? 'bg-green-50 border border-green-200 text-[#269B62] hover:bg-green-100'
                                : 'bg-red-50 border border-red-200 text-[#D94A43] hover:bg-red-100'
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
                                  <span>Sold Out</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => openEditModal(item)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1 text-xs font-bold text-[#252525] hover:text-[#F47721] transition"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-[#F47721]" />
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
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
                <div className="w-full max-w-md rounded-2xl border border-[#EEEEEE] bg-white p-6 shadow-2xl space-y-5">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-base font-bold text-[#252525]">
                      Adjust Inventory: {editingItem.name}
                    </h3>
                    <button
                      onClick={() => setEditingItem(null)}
                      className="text-[#888888] hover:text-[#252525]"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-[#252525]">
                        <input
                          type="checkbox"
                          checked={editTrack}
                          onChange={(e) => setEditTrack(e.target.checked)}
                          className="rounded border-[#EEEEEE] text-[#F47721] focus:ring-0"
                        />
                        <span>Track Individual Stock</span>
                      </label>
                      <p className="text-[11px] text-[#666666] mt-1">
                        When enabled, orders deduct stock atomically. Item is automatically marked sold out when stock hits 0.
                      </p>
                    </div>

                    {editTrack && (
                      <>
                        <div>
                          <label className="block text-[#666666] mb-1.5 font-medium">
                            Stock Quantity
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setEditStock((s) => Math.max(0, s - 1))}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EEEEEE] bg-[#FAFAFA] text-[#252525] hover:bg-gray-100"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={editStock}
                              onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value || '0', 10)))}
                              className="w-24 rounded-full border border-[#EEEEEE] bg-white px-3 py-1.5 font-mono text-center text-sm font-bold text-[#252525] focus:outline-none focus:border-[#F47721]"
                            />
                            <button
                              onClick={() => setEditStock((s) => s + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#EEEEEE] bg-[#FAFAFA] text-[#252525] hover:bg-gray-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[#666666] mb-1.5 font-medium">
                            Alert Threshold
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editThreshold}
                            onChange={(e) => setEditThreshold(Math.max(0, parseInt(e.target.value || '0', 10)))}
                            className="w-24 rounded-full border border-[#EEEEEE] bg-white px-3 py-1.5 font-mono text-center text-sm font-bold text-[#252525] focus:outline-none focus:border-[#F47721]"
                          />
                          <p className="text-[11px] text-[#666666] mt-1">
                            Shows Low Alert When it is below Threshold
                          </p>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer font-medium text-[#252525]">
                        <input
                          type="checkbox"
                          checked={editAvailable}
                          onChange={(e) => setEditAvailable(e.target.checked)}
                          className="rounded border-[#EEEEEE] text-[#F47721] focus:ring-0"
                        />
                        <span>Ready to Supply</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EEEEEE]">
                    <button
                      onClick={() => setEditingItem(null)}
                      disabled={saving}
                      className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveInventory}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50"
                    >
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <span>Save</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
