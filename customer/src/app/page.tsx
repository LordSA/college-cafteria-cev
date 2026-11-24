'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  Coffee,
  Wine,
  Cake,
  Pizza,
  Apple,
  Cookie,
  Plus,
  Minus,
  ChevronRight,
  ChevronDown,
  Flame,
  Loader2,
  AlertCircle,
  Grid,
  ShoppingBag,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Navbar } from '../components/Navbar';
import { SidebarDrawer } from '../components/SidebarDrawer';
import { Footer } from '../components/Footer';
import { WelcomeLanding } from '../components/WelcomeLanding';

interface ApiCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ApiMenuItem {
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

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('coffee') || lower.includes('tea') || lower.includes('chai')) return Coffee;
  if (lower.includes('juice') || lower.includes('drink') || lower.includes('beverage') || lower.includes('shake')) return Wine;
  if (lower.includes('cake') || lower.includes('bakery') || lower.includes('dessert') || lower.includes('sweet')) return Cake;
  if (lower.includes('pizza') || lower.includes('burger') || lower.includes('fast')) return Pizza;
  if (lower.includes('fruit') || lower.includes('salad') || lower.includes('apple')) return Apple;
  if (lower.includes('snack') || lower.includes('bites') || lower.includes('cookie') || lower.includes('chips')) return Cookie;
  if (lower.includes('test') || lower.includes('hot') || lower.includes('special')) return Flame;
  return UtensilsCrossed;
}

export default function CustomerHomePage() {
  const router = useRouter();
  const { user, profile, session, loading: authLoading } = useAuth();
  const { items: cartItems, addItem, updateQuantity, itemCount, subtotal, remainingSeconds } = useCart();

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [itemClicks, setItemClicks] = useState<Record<string, number>>({});
  const [userPurchases, setUserPurchases] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Guest';

  useEffect(() => {
    try {
      const storedClicks = localStorage.getItem('cafteria_item_clicks');
      if (storedClicks) {
        setItemClicks(JSON.parse(storedClicks));
      }
    } catch { }
  }, []);

  const recordItemClick = (id: string) => {
    setItemClicks((prev) => {
      const updated = { ...prev, [id]: (prev[id] || 0) + 1 };
      try {
        localStorage.setItem('cafteria_item_clicks', JSON.stringify(updated));
      } catch { }
      return updated;
    });
  };

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, menuRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/categories?t=${Date.now()}`, { cache: 'no-store' }),
          fetch(`${API_BASE_URL}/api/v1/menu?t=${Date.now()}`, { cache: 'no-store' }),
        ]);

        if (catRes.ok) {
          const catJson = await catRes.json();
          if (catJson.success && Array.isArray(catJson.data)) {
            setCategories(catJson.data.filter((c: ApiCategory) => c.is_active));
          }
        }

        if (menuRes.ok) {
          const menuJson = await menuRes.json();
          if (menuJson.success && Array.isArray(menuJson.data)) {
            setMenuItems(menuJson.data.filter((m: ApiMenuItem) => !m.is_archived));
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unable to load menu';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadCatalog();
  }, []);

  useEffect(() => {
    async function loadPurchases() {
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/orders/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const counts: Record<string, number> = {};
            for (const order of json.data) {
              if (Array.isArray(order.items)) {
                for (const it of order.items) {
                  const itemId = it.menu_item_id || it.id;
                  if (itemId) {
                    counts[itemId] = (counts[itemId] || 0) + (it.quantity || 1);
                  }
                }
              }
            }
            setUserPurchases(counts);
          }
        }
      } catch { }
    }

    loadPurchases();
  }, [session]);

  const cartQuantityMap = useMemo(() => {
    return new Map(cartItems.map((item) => [item.id, item.quantity]));
  }, [cartItems]);

  const isSearching = searchQuery.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchQuery.trim().toLowerCase();
    return menuItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query)) ||
        (item.category_name && item.category_name.toLowerCase().includes(query));

      const matchesCategory =
        selectedCategory === 'all' || item.category_id === selectedCategory;

      return item.is_available && matchesCategory && matchesSearch;
    });
  }, [isSearching, searchQuery, menuItems, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category_id === selectedCategory;

      return item.is_available && matchesCategory;
    });
  }, [menuItems, selectedCategory]);

  const hotProducts = useMemo(() => {
    const available = menuItems.filter((item) => item.is_available);
    return [...available]
      .sort((a, b) => {
        const scoreA = (itemClicks[a.id] || 0) * 2 + (userPurchases[a.id] || 0) * 5;
        const scoreB = (itemClicks[b.id] || 0) * 2 + (userPurchases[b.id] || 0) * 5;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return (b.price || 0) - (a.price || 0);
      })
      .slice(0, 6);
  }, [menuItems, itemClicks, userPurchases]);

  const handleAddToCart = (item: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    image_url?: string | null;
    categoryName?: string;
    category_name?: string;
    trackInventory?: boolean;
    track_inventory?: boolean;
    stockQuantity?: number;
    stock_quantity?: number;
  }) => {
    recordItemClick(item.id);
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url ?? item.imageUrl ?? null,
      category_name: item.category_name ?? item.categoryName,
      track_inventory: item.track_inventory ?? item.trackInventory ?? true,
      stock_quantity: item.stock_quantity ?? item.stockQuantity,
    });
  };

  const currentCategoryLabel =
    selectedCategory === 'all'
      ? 'All Categories'
      : categories.find((c) => c.id === selectedCategory)?.name || 'All';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafaf9] dark:bg-[#0d0e12]">
        <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
      </div>
    );
  }

  if (!user) {
    return <WelcomeLanding />;
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] dark:bg-[#0d0e12] text-stone-900 dark:text-stone-100 flex flex-col pb-44 md:pb-0 transition-colors duration-200">
      <SidebarDrawer isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="hidden md:block">
        <Navbar />
      </div>

      <div className="md:hidden">
        <header className="rounded-b-[2.5rem] bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-5 pb-7 text-white shadow-xl shadow-orange-500/15">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Hi {displayName}
              </h1>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-orange-100">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                <span>Cafteria CEV</span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-full bg-white dark:bg-[#161822]/90 dark:border dark:border-white/10 px-4 py-3 text-stone-800 dark:text-white shadow-xl shadow-black/5 dark:shadow-black/40">
            <div className="flex flex-1 items-center gap-3">
              <Search className="h-5 w-5 text-[#ff5e3a]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meals, snacks, drinks..."
                className="w-full bg-transparent text-sm font-medium text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFilterModal(true)}
              title="Filter"
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                selectedCategory !== 'all'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                  : 'text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>
      </div>

      <div className="hidden md:block py-6 bg-gradient-to-b from-orange-50/70 via-stone-50/40 to-[#fafaf9] dark:from-[#14161f] dark:via-[#0e1017] dark:to-[#0d0e12]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-8 text-white shadow-xl shadow-orange-500/15">
            <div className="max-w-4xl">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
                Fresh Campus Dining. <br />
                <span className="text-amber-200">Zero Wait, Zero Queue.</span>
              </h2>
              <p className="mt-3 text-sm text-orange-100 leading-relaxed font-medium">
                Browse our daily dishes, order between classes, and collect your food without waiting in queues.
              </p>

              <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="relative flex flex-1 max-w-xl items-center shadow-lg shadow-black/10 rounded-2xl">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setDropdownOpen((prev) => !prev)}
                      className="flex h-11 items-center gap-1.5 rounded-l-2xl bg-white dark:bg-[#161822] px-4 text-xs font-bold text-stone-800 dark:text-stone-100 hover:bg-stone-50 dark:hover:bg-white/5 transition border-r border-stone-200 dark:border-white/10 whitespace-nowrap shadow-xs"
                    >
                      <span>{currentCategoryLabel}</span>
                      <ChevronDown className="h-3.5 w-3.5 text-stone-500 dark:text-stone-400" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute left-0 top-full z-50 mt-1.5 w-52 max-h-60 overflow-y-auto rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] py-1.5 shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('all');
                            setDropdownOpen(false);
                          }}
                          className="block w-full px-4 py-2 text-left text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-orange-50 dark:hover:bg-white/5 hover:text-[#ff5e3a]"
                        >
                          All Categories
                        </button>
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setDropdownOpen(false);
                            }}
                            className="block w-full px-4 py-2 text-left text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-orange-50 dark:hover:bg-white/5 hover:text-[#ff5e3a]"
                          >
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search meals, snacks, canteen specials, drinks..."
                    className="h-11 w-full bg-white dark:bg-[#161822] px-4 text-xs font-medium text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none"
                  />

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="flex h-11 items-center px-2 bg-white dark:bg-[#161822] text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
                      title="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    className="flex h-11 w-12 items-center justify-center rounded-r-2xl bg-white dark:bg-[#161822] text-[#ff5e3a] hover:bg-orange-50 dark:hover:bg-white/5 transition border-l border-stone-200 dark:border-white/10 shadow-xs"
                    title="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/menu"
                    className="rounded-2xl bg-white dark:bg-[#161822] border border-transparent dark:border-white/10 px-5 py-3 text-xs font-black text-[#ff5e3a] hover:bg-orange-50 dark:hover:bg-white/5 transition shadow-lg shadow-black/5 active:scale-95 whitespace-nowrap"
                  >
                    Explore Today&apos;s Menu
                  </Link>
                  <Link
                    href="/menu"
                    className="rounded-2xl border border-white/40 bg-white/10 backdrop-blur-xs px-5 py-3 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95 whitespace-nowrap"
                  >
                    View Menu
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 flex-1 w-full">
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isSearching ? (
          <section className="mt-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-[#ff5e3a]" />
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-stone-900 dark:text-white">
                    Search Results
                  </h2>
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  Found {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'} for &ldquo;<span className="font-semibold text-stone-800 dark:text-stone-200">{searchQuery.trim()}</span>&rdquo;
                  {selectedCategory !== 'all' && (
                    <span className="ml-1 text-stone-400">
                      in <span className="font-bold text-[#ff5e3a]">{currentCategoryLabel}</span>
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {selectedCategory !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 transition"
                  >
                    Clear Category Filter
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1 rounded-xl bg-stone-100 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-white/15 transition"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Clear Search</span>
                </button>
              </div>
            </div>

            {searchResults.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-dashed border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822]/60 p-12 text-center">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" />
                <h3 className="mt-4 text-base font-bold text-stone-800 dark:text-stone-200">
                  No dishes found
                </h3>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  We couldn&apos;t find any items matching &ldquo;{searchQuery.trim()}&rdquo;. Try another dish, snack, or beverage.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20"
                  >
                    Browse All Dishes
                  </button>
                  {selectedCategory !== 'all' && (
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className="rounded-xl border border-stone-300 dark:border-white/10 px-5 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300"
                    >
                      Search All Categories
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-stone-100 dark:divide-white/10 rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#161822] shadow-sm overflow-hidden">
                {searchResults.map((product) => {
                  const inCartQty = cartQuantityMap.get(product.id) || 0;
                  const isTracked = product.track_inventory !== false && Boolean(product.track_inventory);
                  const maxStock = isTracked ? (product.stock_quantity ?? 0) : 999;
                  const isOutOfStock = isTracked && maxStock <= 0;
                  const cannotIncrement = !product.is_available || isOutOfStock || (isTracked && inCartQty >= maxStock);

                  return (
                    <div
                      key={product.id}
                      onClick={() => recordItemClick(product.id)}
                      className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-stone-50/70 dark:hover:bg-white/[0.02] transition cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-stone-100 dark:bg-white/5 flex items-center justify-center border border-stone-100 dark:border-white/5">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <UtensilsCrossed className="h-7 w-7 text-stone-300 dark:text-stone-600" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          {product.category_name && (
                            <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                              {product.category_name}
                            </span>
                          )}
                          <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                            {product.name}
                          </h3>
                          {product.description && (
                            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400 line-clamp-1 sm:line-clamp-2">
                              {product.description}
                            </p>
                          )}
                          <div className="mt-2 font-mono text-sm sm:text-base font-black text-stone-900 dark:text-white tabular-nums">
                            ₹{(product.price / 100).toFixed(0)}
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {inCartQty > 0 ? (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 shadow-xs"
                          >
                            <button
                              type="button"
                              onClick={() => updateQuantity(product.id, inCartQty - 1)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white dark:bg-[#202230] text-stone-700 dark:text-white hover:bg-stone-100 dark:hover:bg-white/10 shadow-xs active:scale-95 transition"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[18px] text-center font-mono text-xs font-bold text-orange-950 dark:text-orange-200">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              disabled={cannotIncrement}
                              onClick={() => {
                                if (!cannotIncrement) {
                                  updateQuantity(product.id, inCartQty + 1);
                                }
                              }}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg active:scale-95 transition ${cannotIncrement ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xs hover:opacity-90'}`}
                              title={cannotIncrement ? 'Max stock reached' : 'Increase'}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : isOutOfStock ? (
                          <span className="rounded-xl bg-stone-100 dark:bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-stone-400 dark:text-stone-500">
                            Sold Out
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToCart({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                imageUrl: product.image_url,
                                categoryName: product.category_name,
                                trackInventory: product.track_inventory,
                                stockQuantity: product.stock_quantity,
                              });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            <section className="mt-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
                  Categories
                </h2>
                <Link
                  href="/menu"
                  className="text-xs font-bold text-[#ff5e3a] hover:text-orange-600 flex items-center gap-0.5"
                >
                  <span>See Menu</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="mt-2 flex items-center gap-4 overflow-x-auto py-4 px-3 -mx-3 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
                >
                  <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full shadow-xs transition-all duration-200 active:scale-95 ${
                    selectedCategory === 'all'
                      ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/25'
                      : 'bg-white dark:bg-[#161822] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-white/10 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:text-[#ff5e3a]'
                  }`}>
                    <Grid className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span className={`text-xs font-semibold transition-colors ${
                    selectedCategory === 'all' ? 'text-[#ff5e3a] font-bold' : 'text-stone-600 dark:text-stone-400 group-hover:text-[#ff5e3a]'
                  }`}>
                    All
                  </span>
                </button>

                {categories.map((cat) => {
                  const IconComp = getCategoryIcon(cat.name);
                  const isSelected = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
                      className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
                    >
                      <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full shadow-xs transition-all duration-200 active:scale-95 ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/25'
                          : 'bg-white dark:bg-[#161822] text-stone-700 dark:text-stone-200 border border-stone-200/80 dark:border-white/10 hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:text-[#ff5e3a]'
                      }`}>
                        <IconComp className="h-6 w-6 sm:h-7 sm:w-7" />
                      </div>
                      <span className={`text-xs font-semibold transition-colors ${
                        isSelected ? 'text-[#ff5e3a] font-bold' : 'text-stone-600 dark:text-stone-400 group-hover:text-[#ff5e3a]'
                      }`}>
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
                <p className="text-xs font-semibold">Loading freshly prepared canteen menu...</p>
              </div>
            ) : menuItems.length === 0 ? (
              <section className="mt-12 rounded-3xl border border-dashed border-stone-300 dark:border-white/10 bg-white dark:bg-[#161822]/60 p-12 text-center">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-stone-300 dark:text-stone-600" />
                <h3 className="mt-4 text-base font-bold text-stone-800 dark:text-stone-200">Canteen Menu Updating</h3>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                  Our kitchen team is currently refreshing today&apos;s menu. Check back shortly!
                </p>
                <Link
                  href="/menu"
                  className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  <span>Browse Menu</span>
                </Link>
              </section>
            ) : (
              <>
                {hotProducts.length > 0 && selectedCategory === 'all' && (
                  <section className="mt-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-[#ff5e3a] fill-[#ff5e3a]" />
                        <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
                          Hot Products
                        </h2>
                      </div>
                      <Link
                        href="/menu"
                        className="text-xs font-bold text-[#ff5e3a] hover:text-orange-600 flex items-center gap-0.5"
                      >
                        <span>View All</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>

                    <div className="mt-4 flex gap-4 overflow-x-auto pb-4 scrollbar-none sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible">
                      {hotProducts.map((product) => {
                        const inCartQty = cartQuantityMap.get(product.id) || 0;

                        return (
                          <div
                            key={product.id}
                            onClick={() => recordItemClick(product.id)}
                            className="w-72 sm:w-auto flex-shrink-0 overflow-hidden rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white dark:bg-[#161822] shadow-sm hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition flex flex-col justify-between cursor-pointer"
                          >
                            <div className="relative h-44 w-full overflow-hidden bg-stone-100 dark:bg-white/5 flex items-center justify-center">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-full w-full object-cover transition duration-300 hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 text-stone-400">
                                  <UtensilsCrossed className="h-8 w-8" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Cafteria CEV</span>
                                </div>
                              )}

                              {product.category_name && (
                                <span className="absolute left-3 top-3 rounded-full bg-stone-900/80 dark:bg-black/70 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                                  {product.category_name}
                                </span>
                              )}
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                                  {product.name}
                                </h3>
                                {product.description && (
                                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-stone-100 dark:border-white/10 pt-3">
                                <span className="font-mono text-base font-black text-stone-900 dark:text-white tabular-nums">
                                  ₹{(product.price / 100).toFixed(0)}
                                </span>

                                {(() => {
                                  const isTracked = product.track_inventory !== false && Boolean(product.track_inventory);
                                  const maxStock = isTracked ? (product.stock_quantity ?? 0) : 999;
                                  const isOutOfStock = isTracked && maxStock <= 0;
                                  const cannotIncrement = !product.is_available || isOutOfStock || (isTracked && inCartQty >= maxStock);

                                  if (inCartQty > 0) {
                                    return (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-2 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 shadow-xs"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(product.id, inCartQty - 1)}
                                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-white dark:bg-[#202230] text-stone-700 dark:text-white hover:bg-stone-100 dark:hover:bg-white/10 shadow-xs active:scale-95 transition"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="min-w-[16px] text-center font-mono text-xs font-bold text-orange-950 dark:text-orange-200">
                                          {inCartQty}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={cannotIncrement}
                                          onClick={() => {
                                            if (!cannotIncrement) {
                                              updateQuantity(product.id, inCartQty + 1);
                                            }
                                          }}
                                          className={`flex h-6 w-6 items-center justify-center rounded-lg active:scale-95 transition ${cannotIncrement ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60' : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xs hover:opacity-90'}`}
                                          title={cannotIncrement ? 'Max stock reached' : 'Increase'}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </button>
                                      </div>
                                    );
                                  }

                                  if (isOutOfStock) {
                                    return (
                                      <span className="rounded-xl bg-stone-100 dark:bg-white/10 px-3 py-1.5 text-xs font-semibold text-stone-400 dark:text-stone-500">
                                        Sold Out
                                      </span>
                                    );
                                  }

                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart({
                                          id: product.id,
                                          name: product.name,
                                          price: product.price,
                                          imageUrl: product.image_url,
                                          categoryName: product.category_name,
                                          trackInventory: product.track_inventory,
                                          stockQuantity: product.stock_quantity,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
                                    >
                                      <Plus className="h-3.5 w-3.5" />
                                      <span>Add</span>
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                <section className="mt-10 mb-8">
                  <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900 dark:text-white">
                        {currentCategoryLabel}
                      </h2>
                    </div>
                    <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                      {filteredProducts.length} items
                    </span>
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="mt-8 rounded-2xl border border-dashed border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822]/60 p-8 text-center text-xs text-stone-500 dark:text-stone-400">
                      No dishes available in this category.
                    </div>
                  ) : (
                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredProducts.map((product) => {
                        const inCartQty = cartQuantityMap.get(product.id) || 0;

                        return (
                          <div
                            key={product.id}
                            onClick={() => recordItemClick(product.id)}
                            className="flex gap-3 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-3 shadow-xs hover:shadow-md dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] transition cursor-pointer"
                          >
                            <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-white/5 flex items-center justify-center">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <UtensilsCrossed className="h-6 w-6 text-stone-300 dark:text-stone-600" />
                              )}
                            </div>

                            <div className="flex flex-1 flex-col justify-between">
                              <div>
                                {product.category_name && (
                                  <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                                    {product.category_name}
                                  </span>
                                )}
                                <h3 className="mt-0.5 text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100 line-clamp-1">
                                  {product.name}
                                </h3>
                                {product.description && (
                                  <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                                    {product.description}
                                  </p>
                                )}
                              </div>

                              <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-100 dark:border-white/10">
                                <span className="font-mono text-sm font-black text-stone-900 dark:text-white tabular-nums">
                                  ₹{(product.price / 100).toFixed(0)}
                                </span>

                                {(() => {
                                  const isTracked = product.track_inventory !== false && Boolean(product.track_inventory);
                                  const maxStock = isTracked ? (product.stock_quantity ?? 0) : 999;
                                  const isOutOfStock = isTracked && maxStock <= 0;
                                  const cannotIncrement = !product.is_available || isOutOfStock || (isTracked && inCartQty >= maxStock);

                                  if (inCartQty > 0) {
                                    return (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1.5 rounded-lg border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-950/40 px-1.5 py-0.5 shadow-xs"
                                      >
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(product.id, inCartQty - 1)}
                                          className="flex h-5 w-5 items-center justify-center rounded-md bg-white dark:bg-[#202230] text-stone-700 dark:text-white shadow-xs"
                                        >
                                          <Minus className="h-2.5 w-2.5" />
                                        </button>
                                        <span className="min-w-[14px] text-center font-mono text-xs font-bold text-orange-950 dark:text-orange-200">
                                          {inCartQty}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={cannotIncrement}
                                          onClick={() => {
                                            if (!cannotIncrement) {
                                              updateQuantity(product.id, inCartQty + 1);
                                            }
                                          }}
                                          className={`flex h-5 w-5 items-center justify-center rounded-md shadow-xs ${
                                            cannotIncrement
                                              ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed opacity-60'
                                              : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white'
                                          }`}
                                          title={cannotIncrement ? 'Max stock reached' : 'Increase'}
                                        >
                                          <Plus className="h-2.5 w-2.5" />
                                        </button>
                                      </div>
                                    );
                                  }

                                  if (isOutOfStock) {
                                    return (
                                      <span className="rounded-lg bg-stone-100 dark:bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-stone-400 dark:text-stone-500">
                                        Sold Out
                                      </span>
                                    );
                                  }

                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToCart({
                                          id: product.id,
                                          name: product.name,
                                          price: product.price,
                                          imageUrl: product.image_url,
                                          categoryName: product.category_name,
                                          trackInventory: product.track_inventory,
                                          stockQuantity: product.stock_quantity,
                                        });
                                      }}
                                      className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:opacity-90 transition active:scale-95"
                                    >
                                      <Plus className="h-3 w-3" />
                                      <span>Add</span>
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </>
        )}
      </main>

      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#161822] p-6 shadow-2xl border border-stone-200 dark:border-white/10 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#ff5e3a]" />
                <h3 className="text-base font-black text-stone-900 dark:text-white">Filter Categories</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(false)}
                className="rounded-full p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-700 dark:text-stone-200 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  setShowFilterModal(false);
                }}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                    : 'bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Grid className="h-4 w-4" />
                  <span>All Dishes</span>
                </div>
                <span className="text-[11px] opacity-80">{menuItems.filter((m) => m.is_available).length}</span>
              </button>

              {categories.map((cat) => {
                const count = menuItems.filter((i) => i.category_id === cat.id && i.is_available).length;
                const isSelected = selectedCategory === cat.id;
                const IconComp = getCategoryIcon(cat.name);

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setShowFilterModal(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                        : 'bg-stone-50 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComp className="h-4 w-4" />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-[11px] opacity-80">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {itemCount > 0 && (
        <div className="fixed floating-cart-bottom left-3 right-3 z-40 max-w-md mx-auto rounded-2xl border border-orange-200 dark:border-orange-500/30 bg-white/95 dark:bg-[#161822]/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm flex-shrink-0">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} &bull; Lock: {formatTimer(remainingSeconds)}
                </p>
                <p className="font-mono text-base font-extrabold text-stone-900 dark:text-white tabular-nums">
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
    </div>
  );
}
