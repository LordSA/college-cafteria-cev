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
  Menu as MenuIcon,
  Flame,
  Loader2,
  AlertCircle,
  Grid,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { AmazonHeader } from '../components/AmazonHeader';
import { SidebarDrawer } from '../components/SidebarDrawer';
import { Footer } from '../components/Footer';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

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
  const { user, profile } = useAuth();
  const { items: cartItems, addItem, updateQuantity } = useCart();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Kaliraj';

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, menuRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/categories`),
          fetch(`${API_BASE_URL}/api/v1/menu`),
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

  const cartQuantityMap = useMemo(() => {
    return new Map(cartItems.map((item) => [item.id, item.quantity]));
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category_id === selectedCategory;

      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  const hotProducts = useMemo(() => {
    return menuItems.filter((item) => item.is_available).slice(0, 6);
  }, [menuItems]);

  const handleAddToCart = (item: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    categoryName?: string;
  }) => {
    if (!user) {
      router.push('/login?redirect=/cart');
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.imageUrl,
      category_name: item.categoryName,
    });
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 flex flex-col pb-24 md:pb-0">
      <SidebarDrawer isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <AmazonHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

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

            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation sidebar"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95 shadow-xs"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-full bg-white px-4 py-3 text-stone-800 shadow-xl shadow-black/5">
            <div className="flex flex-1 items-center gap-3">
              <Search className="h-5 w-5 text-[#ff5e3a]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search meals, snacks, drinks..."
                className="w-full bg-transparent text-sm font-medium text-stone-900 placeholder-stone-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              title="Filter"
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-500 hover:bg-stone-100 transition"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </header>
      </div>

      <div className="hidden md:block py-6 bg-gradient-to-b from-orange-50/70 via-stone-50/40 to-[#fafaf9]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-8 text-white shadow-xl shadow-orange-500/15">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
                Fresh Campus Dining. <br />
                <span className="text-amber-200">Zero Wait, Zero Queue.</span>
              </h2>
              <p className="mt-3 text-sm text-orange-100 leading-relaxed font-medium">
                Browse our daily dishes, order between classes, and collect your food without waiting in queues.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/menu"
                  className="rounded-2xl bg-white px-6 py-3 text-xs font-black text-[#ff5e3a] hover:bg-orange-50 transition shadow-lg shadow-black/5 active:scale-95"
                >
                  Explore Today's Menu
                </Link>
                <Link
                  href="/categories"
                  className="rounded-2xl border border-white/40 bg-white/10 backdrop-blur-xs px-5 py-3 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
                >
                  View Categories
                </Link>
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

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
              Categories
            </h2>
            <Link
              href="/categories"
              className="text-xs font-bold text-[#ff5e3a] hover:text-orange-600 flex items-center gap-0.5"
            >
              <span>See All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
            >
              <div
                className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full transition-all duration-200 ${
                  selectedCategory === 'all'
                    ? 'bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-lg shadow-orange-500/30 scale-105'
                    : 'bg-white text-stone-700 border border-stone-200/80 shadow-xs hover:border-amber-300 hover:scale-105'
                }`}
              >
                <Grid className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <span
                className={`text-xs font-semibold ${
                  selectedCategory === 'all'
                    ? 'text-[#ff4b4b] font-bold'
                    : 'text-stone-600 group-hover:text-stone-900'
                }`}
              >
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
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
                >
                  <div
                    className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-lg shadow-orange-500/30 scale-105'
                        : 'bg-white text-stone-700 border border-stone-200/80 shadow-xs hover:border-amber-300 hover:scale-105'
                    }`}
                  >
                    <IconComp className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isSelected
                        ? 'text-[#ff4b4b] font-bold'
                        : 'text-stone-600 group-hover:text-stone-900'
                    }`}
                  >
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
          <section className="mt-12 rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-stone-300" />
            <h3 className="mt-4 text-base font-bold text-stone-800">Canteen Menu Updating</h3>
            <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">
              Our kitchen team is currently refreshing today's menu. Check back shortly or browse categories!
            </p>
            <Link
              href="/categories"
              className="mt-6 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20"
            >
              <Grid className="h-4 w-4" />
              <span>Browse Categories</span>
            </Link>
          </section>
        ) : (
          <>
            {hotProducts.length > 0 && (
              <section className="mt-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-[#ff5e3a] fill-[#ff5e3a]" />
                    <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
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
                        className="w-72 sm:w-auto flex-shrink-0 overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm hover:shadow-md transition flex flex-col justify-between"
                      >
                        <div className="relative h-44 w-full overflow-hidden bg-stone-100 flex items-center justify-center">
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
                            <span className="absolute left-3 top-3 rounded-full bg-stone-900/80 px-2.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-xs">
                              {product.category_name}
                            </span>
                          )}
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h3 className="text-base font-bold text-stone-900 line-clamp-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                                {product.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                            <span className="font-mono text-base font-black text-stone-900 tabular-nums">
                              ₹{(product.price / 100).toFixed(0)}
                            </span>

                            {inCartQty > 0 ? (
                              <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1 shadow-xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(product.id, inCartQty - 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 shadow-xs active:scale-95 transition"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="min-w-[16px] text-center font-mono text-xs font-bold text-orange-950">
                                  {inCartQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(product.id, inCartQty + 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:opacity-90 shadow-xs active:scale-95 transition"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleAddToCart({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                    imageUrl: product.image_url,
                                    categoryName: product.category_name,
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Add</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <section className="mt-10 mb-8">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
                    Available in Kitchen
                  </h2>
                </div>
                <span className="text-xs text-stone-500 font-medium">
                  {filteredProducts.length} items
                </span>
              </div>

              {filteredProducts.length === 0 ? (
                <div className="mt-8 rounded-2xl border border-dashed border-stone-200 bg-white p-8 text-center text-xs text-stone-500">
                  No dishes match your search or filter.
                </div>
              ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProducts.map((product) => {
                    const inCartQty = cartQuantityMap.get(product.id) || 0;

                    return (
                      <div
                        key={product.id}
                        className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-xs hover:shadow-md transition"
                      >
                        <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100 flex items-center justify-center">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <UtensilsCrossed className="h-6 w-6 text-stone-300" />
                          )}
                          {!product.is_available && (
                            <span className="absolute inset-0 bg-stone-900/60 flex items-center justify-center text-[10px] font-bold text-white uppercase">
                              Sold Out
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            {product.category_name && (
                              <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                                {product.category_name}
                              </span>
                            )}
                            <h3 className="mt-0.5 text-xs sm:text-sm font-bold text-stone-900 line-clamp-1">
                              {product.name}
                            </h3>
                            {product.description && (
                              <p className="mt-0.5 text-[11px] text-stone-500 line-clamp-2">
                                {product.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-100">
                            <span className="font-mono text-sm font-black text-stone-900 tabular-nums">
                              ₹{(product.price / 100).toFixed(0)}
                            </span>

                            {product.is_available ? (
                              inCartQty > 0 ? (
                                <div className="flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-1.5 py-0.5 shadow-xs">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, inCartQty - 1)}
                                    className="flex h-5 w-5 items-center justify-center rounded-md bg-white text-stone-700 shadow-xs"
                                  >
                                    <Minus className="h-2.5 w-2.5" />
                                  </button>
                                  <span className="min-w-[14px] text-center font-mono text-xs font-bold text-orange-950">
                                    {inCartQty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(product.id, inCartQty + 1)}
                                    className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xs"
                                  >
                                    <Plus className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAddToCart({
                                      id: product.id,
                                      name: product.name,
                                      price: product.price,
                                      imageUrl: product.image_url,
                                      categoryName: product.category_name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:opacity-90 transition active:scale-95"
                                >
                                  <Plus className="h-3 w-3" />
                                  <span>Add</span>
                                </button>
                              )
                            ) : (
                              <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-400">
                                Sold Out
                              </span>
                            )}
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
      </main>

      <Footer />
    </div>
  );
}
