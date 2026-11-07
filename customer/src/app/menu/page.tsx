'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  Utensils,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  X,
  Clock,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string | null;
  price: number;
  image_key: string | null;
  image_url: string | null;
  is_available: boolean;
  is_archived: boolean;
  track_inventory?: boolean;
  stock_quantity?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function MenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, addItem, updateQuantity, itemCount, subtotal, remainingSeconds, isExpired } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const catParam = params.get('category');
      if (catParam) {
        setSelectedCategory(catParam);
      }
    }
  }, []);

  useEffect(() => {
    async function loadMenuData() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, menuRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/categories`),
          fetch(`${API_BASE_URL}/api/v1/menu`),
        ]);

        if (!catRes.ok || !menuRes.ok) {
          throw new Error('Unable to connect to canteen catalog service');
        }

        const catData = await catRes.json();
        const menuData = await menuRes.json();

        if (catData.success) {
          setCategories(catData.data || []);
        }
        if (menuData.success) {
          setMenuItems(menuData.data || []);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load canteen menu';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadMenuData();
  }, []);

  const cartQuantityMap = new Map(cartItems.map((i) => [i.id, i.quantity]));

  const filteredItems = menuItems.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category_id === selectedCategory;
  });

  const handleAddToCart = async (item: MenuItem) => {
    if (!user) {
      router.push('/login?redirect=/menu');
      return;
    }

    setActionError(null);
    const res = await addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      category_name: item.category_name,
    });

    if (!res.success) {
      setActionError(res.error || 'Unable to reserve item. It may be out of stock.');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const handleUpdateQty = async (itemId: string, qty: number) => {
    setActionError(null);
    const res = await updateQuantity(itemId, qty);
    if (!res.success) {
      setActionError(res.error || 'Failed to update item reservation quantity.');
      setTimeout(() => setActionError(null), 4000);
    }
  };

  const activeCategoryName =
    selectedCategory === 'all'
      ? 'All Dishes'
      : categories.find((c) => c.id === selectedCategory)?.name || 'Filtered';

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 pb-32 md:pb-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-5">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff5e3a]">
                Cafteria CEV
              </span>
              <h1 className="mt-0.5 text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900">
                Today's Menu
              </h1>
              <p className="mt-0.5 text-xs text-stone-500">
                Freshly prepared meals, snacks, and refreshments
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-bold text-stone-800 shadow-xs hover:border-[#ff5e3a] transition active:scale-95"
              >
                <Filter className="h-4 w-4 text-[#ff5e3a]" />
                <span>Filter</span>
                {selectedCategory !== 'all' && (
                  <span className="ml-1 rounded-full bg-[#ff5e3a] px-2 py-0.5 text-[10px] font-bold text-white">
                    1
                  </span>
                )}
              </button>

              {selectedCategory !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200 transition"
                >
                  <span>{activeCategoryName}</span>
                  <X className="h-3.5 w-3.5 text-stone-500" />
                </button>
              )}
            </div>
          </div>

          {remainingSeconds > 0 && itemCount > 0 && (
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-500/10 border border-amber-300/60 p-3.5 text-amber-950 text-xs font-medium">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 animate-pulse" />
                <span>Items in your cart are locked for you. Stock will release in</span>
              </div>
              <span className="font-mono font-black text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-200">
                {formatTimer(remainingSeconds)}
              </span>
            </div>
          )}

          {isExpired && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <span>Your previous cart reservation expired. Stock has been returned to the menu.</span>
            </div>
          )}

          {actionError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
              <span>{actionError}</span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
              <p className="text-xs font-medium">Loading menu catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <Utensils className="mx-auto h-8 w-8 text-stone-300" />
              <h3 className="mt-3 text-sm font-bold text-stone-800">No dishes in this category</h3>
              <p className="mt-1 text-xs text-stone-500">
                Try selecting "All Dishes" or choose another category from the filter.
              </p>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-stone-100 px-4 py-2 text-xs font-bold text-stone-800 hover:bg-stone-200 transition"
              >
                Show All Dishes
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              {filteredItems.map((item) => {
                const inCartQuantity = cartQuantityMap.get(item.id) || 0;
                const isAvailable = item.is_available && (!item.track_inventory || (item.stock_quantity ?? 0) > 0 || inCartQuantity > 0);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-xs hover:border-orange-200 transition"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-stone-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-stone-100">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <Utensils className="h-6 w-6 text-stone-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-bold text-stone-900 truncate">
                            {item.name}
                          </h3>
                          {item.category_name && (
                            <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600">
                              {item.category_name}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="mt-0.5 text-xs text-stone-500 line-clamp-1 leading-snug">
                            {item.description}
                          </p>
                        )}

                        <div className="mt-1 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isAvailable ? 'text-emerald-700' : 'text-rose-600'
                              }`}
                          >
                            {isAvailable ? (
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
                          </span>

                          {item.track_inventory && isAvailable && item.stock_quantity !== undefined && (
                            <span className="text-[10px] text-stone-400 font-medium">
                              ({item.stock_quantity} left)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4 flex-shrink-0">
                      <span className="font-mono text-sm sm:text-base font-extrabold text-stone-900 tabular-nums">
                        ₹{(item.price / 100).toFixed(2)}
                      </span>

                      {isAvailable ? (
                        inCartQuantity > 0 ? (
                          <div className="flex items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1 shadow-xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, inCartQuantity - 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 transition shadow-xs"
                              title="Decrease"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[18px] text-center font-mono text-xs font-bold text-orange-950">
                              {inCartQuantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, inCartQuantity + 1)}
                              className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white transition shadow-xs"
                              title="Increase"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddToCart(item)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        )
                      ) : (
                        <span className="rounded-lg bg-stone-100 px-3 py-1.5 text-[11px] font-semibold text-stone-400">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-[#ff5e3a]" />
                <h3 className="text-base font-black text-stone-900">Select Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setShowFilterModal(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                    : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                  }`}
              >
                <span>All Dishes</span>
                <span className="text-[11px] opacity-80">{menuItems.length}</span>
              </button>

              {categories.map((cat) => {
                const count = menuItems.filter((i) => i.category_id === cat.id).length;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setShowFilterModal(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${isSelected
                        ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-800'
                      }`}
                  >
                    <span>{cat.name}</span>
                    <span className="text-[11px] opacity-80">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {itemCount > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-4 right-4 z-30 max-w-md mx-auto rounded-2xl border border-orange-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm flex-shrink-0">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-stone-500">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} &bull; Lock: {formatTimer(remainingSeconds)}
                </p>
                <p className="font-mono text-base font-extrabold text-stone-900 tabular-nums">
                  ₹{(subtotal / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 transition active:scale-95"
            >
              <span>View Cart</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
