'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import {
  Utensils,
  Search,
  AlertCircle,
  Loader2,
  Filter,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Grid,
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function MenuPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items: cartItems, addItem, updateQuantity, itemCount, subtotal } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const matchesCategory =
      selectedCategory === 'all' || item.category_id === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleAddToCart = (item: MenuItem) => {
    if (!user) {
      router.push('/login?redirect=/menu');
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
      category_name: item.category_name,
    });
  };

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 pb-28">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#ff5e3a]">
                Cafteria CEV
              </span>
              <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-stone-900">
                Today's Menu
              </h1>
              <p className="mt-1 text-xs text-stone-500">
                Fresh meals, snacks, and beverages prepared daily
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                href="/categories"
                className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs hover:border-[#ff5e3a] transition"
              >
                <Grid className="h-4 w-4 text-[#ff5e3a]" />
                <span className="hidden sm:inline">All</span>
                <span>Categories</span>
              </Link>

              <div className="relative flex-1 md:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search dishes, snacks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-4 py-2 text-xs text-stone-900 placeholder-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <Filter className="h-3 w-3" />
              <span>All Dishes</span>
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`rounded-full px-4 py-1.5 text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
              <p className="text-xs font-medium">Loading freshly prepared canteen catalog...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <Utensils className="mx-auto h-8 w-8 text-stone-300" />
              <h3 className="mt-3 text-sm font-bold text-stone-800">No dishes match your selection</h3>
              <p className="mt-1 text-xs text-stone-500">
                Try selecting another category or adjusting your search keywords.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const inCartQuantity = cartQuantityMap.get(item.id) || 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm hover:shadow-md transition"
                  >
                    <div className="h-44 w-full bg-stone-100 relative overflow-hidden flex items-center justify-center">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1 text-stone-400">
                          <Utensils className="h-8 w-8" />
                          <span className="text-[10px] font-medium uppercase tracking-wider">Cafteria CEV</span>
                        </div>
                      )}
                      {item.category_name && (
                        <span className="absolute top-3 left-3 rounded-md bg-stone-900/80 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium text-white">
                          {item.category_name}
                        </span>
                      )}
                      <span
                        className={`absolute top-3 right-3 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          item.is_available
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.is_available ? (
                          <>
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>Available</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-2.5 w-2.5" />
                            <span>Sold Out</span>
                          </>
                        )}
                      </span>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-stone-900">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                        <div className="font-mono text-base font-extrabold text-stone-900 tabular-nums">
                          ₹{(item.price / 100).toFixed(2)}
                        </div>

                        {item.is_available ? (
                          inCartQuantity > 0 ? (
                            <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-2 py-1 shadow-sm">
                              <button
                                onClick={() => updateQuantity(item.id, inCartQuantity - 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-white text-stone-700 hover:bg-stone-100 transition shadow-xs"
                                title="Decrease"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="min-w-[18px] text-center font-mono text-xs font-bold text-orange-950">
                                {inCartQuantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, inCartQuantity + 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white transition shadow-xs"
                                title="Increase"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddToCart(item)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-3.5 py-1.5 text-xs font-bold text-white shadow-sm shadow-orange-500/20 hover:opacity-95 transition active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </button>
                          )
                        ) : (
                          <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-400">
                            Unavailable
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-orange-200 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md md:hidden">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] text-white shadow-sm">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-stone-500">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} in order
                </p>
                <p className="font-mono text-base font-extrabold text-stone-900 tabular-nums">
                  ₹{(subtotal / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <Link
              href="/cart"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 transition active:scale-95"
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
