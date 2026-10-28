'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  UtensilsCrossed,
  Coffee,
  Gift,
  Wine,
  Cake,
  Pizza,
  Apple,
  Star,
  Clock,
  Plus,
  Minus,
  ChevronRight,
  Menu as MenuIcon,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { AmazonHeader } from '../components/AmazonHeader';
import { SidebarDrawer } from '../components/SidebarDrawer';
import { Footer } from '../components/Footer';

interface CategoryItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  isSpecial?: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  counterName: string;
  cuisines: string;
  price: number;
  rating: number;
  ordersCount: string;
  prepTime: string;
  imageUrl: string;
  category: string;
  discountBadge?: string;
  isAvailable: boolean;
  isHot?: boolean;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'all', name: 'Meals', icon: UtensilsCrossed, isSpecial: true },
  { id: 'coffee', name: 'Coffee', icon: Coffee },
  { id: 'gifts', name: 'Gifts', icon: Gift },
  { id: 'juice', name: 'Juice', icon: Wine },
  { id: 'cake', name: 'Cake', icon: Cake },
  { id: 'pizza', name: 'Pizza', icon: Pizza },
  { id: 'fruits', name: 'Fruits', icon: Apple },
];

const DEFAULT_HOT_PRODUCTS: ProductItem[] = [
  {
    id: 'prod-burger-1',
    name: 'Crispy Double Patty Burger',
    counterName: 'Snacks Counter #1',
    cuisines: 'Burgers, Fast Food',
    price: 12000,
    rating: 4.8,
    ordersCount: '12K+ orders',
    prepTime: '8 Min',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
    category: 'all',
    discountBadge: '50% OFF',
    isAvailable: true,
    isHot: true,
  },
  {
    id: 'prod-pizza-1',
    name: 'Farmhouse Loaded Pizza',
    counterName: 'Hot Oven Station',
    cuisines: 'Italian, Pizza',
    price: 15000,
    rating: 4.7,
    ordersCount: '9K+ orders',
    prepTime: '12 Min',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600&auto=format&fit=crop&q=80',
    category: 'pizza',
    discountBadge: 'Hot Deal',
    isAvailable: true,
    isHot: true,
  },
  {
    id: 'prod-coffee-1',
    name: 'Frosted Cold Coffee with Cream',
    counterName: 'Beverages Bar',
    cuisines: 'Chilled Drinks, Shakes',
    price: 6000,
    rating: 4.9,
    ordersCount: '15K+ orders',
    prepTime: '4 Min',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    category: 'coffee',
    isAvailable: true,
    isHot: true,
  },
  {
    id: 'prod-meals-1',
    name: 'Executive South Indian Lunch Thali',
    counterName: 'Main Meal Counter',
    cuisines: 'Rice, Sambar, Poriyal, Curd',
    price: 9000,
    rating: 4.8,
    ordersCount: '18K+ orders',
    prepTime: '5 Min',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
    category: 'all',
    isAvailable: true,
    isHot: true,
  },
  {
    id: 'prod-juice-1',
    name: 'Cold Pressed Orange & Mint Juice',
    counterName: 'Fresh Juice Bar',
    cuisines: 'Healthy, Citrus Detox',
    price: 5000,
    rating: 4.6,
    ordersCount: '7K+ orders',
    prepTime: '3 Min',
    imageUrl: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
    category: 'juice',
    isAvailable: true,
    isHot: true,
  },
  {
    id: 'prod-cake-1',
    name: 'Belgian Chocolate Truffle Pastry',
    counterName: 'Bakery Display',
    cuisines: 'Bakery, Desserts',
    price: 7500,
    rating: 4.8,
    ordersCount: '6K+ orders',
    prepTime: '2 Min',
    imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80',
    category: 'cake',
    isAvailable: true,
    isHot: true,
  },
  {
    id: 'prod-fruits-1',
    name: 'Fresh Exotic Fruit Salad Bowl',
    counterName: 'Nutrition Hub',
    cuisines: 'Seasonal Fruits & Honey',
    price: 8000,
    rating: 4.7,
    ordersCount: '5K+ orders',
    prepTime: '4 Min',
    imageUrl: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=600&auto=format&fit=crop&q=80',
    category: 'fruits',
    isAvailable: true,
    isHot: false,
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function CustomerHomePage() {
  const { user, profile } = useAuth();
  const { items: cartItems, addItem, updateQuantity } = useCart();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dbProducts, setDbProducts] = useState<ProductItem[]>([]);

  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Kaliraj';

  useEffect(() => {
    async function fetchMenuCatalog() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/menu`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: ProductItem[] = json.data.map((item: any, idx: number) => ({
            id: item.id,
            name: item.name,
            counterName: item.category_name ? `${item.category_name} Section` : 'Kitchen Counter #1',
            cuisines: item.category_name || 'Canteen Daily Special',
            price: item.price,
            rating: Number((4.5 + (idx % 5) * 0.1).toFixed(1)),
            ordersCount: `${(3 + (idx % 6) * 2)}K+ orders`,
            prepTime: `${5 + (idx % 4) * 3} Min`,
            imageUrl: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
            category: item.category_name ? item.category_name.toLowerCase() : 'all',
            isAvailable: Boolean(item.is_available),
            isHot: idx % 2 === 0,
          }));
          setDbProducts(mapped);
        }
      } catch { }
    }

    fetchMenuCatalog();
  }, []);

  const allProducts = useMemo(() => {
    if (dbProducts.length > 0) {
      return [...dbProducts, ...DEFAULT_HOT_PRODUCTS.filter((dp) => !dbProducts.some((p) => p.name.toLowerCase() === dp.name.toLowerCase()))];
    }
    return DEFAULT_HOT_PRODUCTS;
  }, [dbProducts]);

  const cartQuantityMap = useMemo(() => {
    return new Map(cartItems.map((item) => [item.id, item.quantity]));
  }, [cartItems]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((product) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        product.category === selectedCategory ||
        product.category.includes(selectedCategory);

      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.counterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.cuisines.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [allProducts, selectedCategory, searchQuery]);

  const hotBestsellers = useMemo(() => {
    return allProducts.filter((p) => p.isAvailable && (p.isHot || p.rating >= 4.7)).slice(0, 6);
  }, [allProducts]);

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 flex flex-col pb-24 md:pb-0">
      <SidebarDrawer isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <AmazonHeader
        onOpenSidebar={() => setIsSidebarOpen(true)}
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
                <span>CEV College Canteen &bull; Counter #1</span>
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
                placeholder="Search hot meals, snacks, coffee, juices..."
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
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl text-white">
                Fresh College Canteen Meals. <br />
                <span className="text-amber-200">Zero Wait, Zero Queue.</span>
              </h2>
              <p className="mt-3 text-sm text-orange-100 leading-relaxed font-medium">
                Pre-order hot meals, snacks, and chilled drinks directly with instant Checkout.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/menu"
                  className="rounded-2xl bg-white px-6 py-3 text-xs font-black text-[#ff5e3a] hover:bg-orange-50 transition shadow-lg shadow-black/5 active:scale-95"
                >
                  Explore Today's Menu
                </Link>
                <Link
                  href="/payment-faq"
                  className="rounded-2xl border border-white/40 bg-white/10 backdrop-blur-xs px-5 py-3 text-xs font-bold text-white hover:bg-white/20 transition active:scale-95"
                >
                  How Pre-Orders Work
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 flex-1 w-full">
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
              Categories
            </h2>
            <Link
              href="/menu"
              className="text-xs font-bold text-[#ff5e3a] hover:text-orange-600 flex items-center gap-0.5"
            >
              <span>See Full Menu</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-4 flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="flex flex-col items-center gap-2 flex-shrink-0 group focus:outline-none"
                >
                  <div
                    className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full transition-all duration-200 ${isSelected || (cat.isSpecial && selectedCategory === 'all')
                      ? 'bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-lg shadow-orange-500/30 scale-105'
                      : 'bg-white text-stone-700 border border-stone-200/80 shadow-xs hover:border-amber-300 hover:scale-105'
                      }`}
                  >
                    <IconComp className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <span
                    className={`text-xs font-semibold ${isSelected || (cat.isSpecial && selectedCategory === 'all')
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

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-[#ff5e3a] fill-[#ff5e3a]" />
                <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
                  Hot Products (Most Ordered & Clicked)
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Campus canteen favorites ordered most frequently today
              </p>
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
            {hotBestsellers.map((product) => {
              const inCartQty = cartQuantityMap.get(product.id) || 0;

              return (
                <div
                  key={product.id}
                  className="w-72 sm:w-auto flex-shrink-0 overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div className="relative h-44 w-full overflow-hidden bg-stone-100">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-300 hover:scale-105"
                      loading="lazy"
                    />

                    <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-stone-900 shadow-md backdrop-blur-xs">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span>{product.rating}</span>
                      <span className="text-[10px] text-stone-400 font-normal">
                        ({product.ordersCount})
                      </span>
                    </div>

                    {product.discountBadge ? (
                      <div className="absolute right-3 top-3 flex h-11 w-11 flex-col items-center justify-center rounded-full bg-[#fde047] text-stone-900 shadow-md font-black text-center leading-none border-2 border-dashed border-amber-600">
                        <span className="text-[8px] font-bold uppercase">Hot</span>
                        <span className="text-[10px] font-black">{product.discountBadge}</span>
                      </div>
                    ) : (
                      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[#ff5e3a] text-white px-2.5 py-0.5 text-[10px] font-black shadow-md uppercase">
                        <TrendingUp className="h-3 w-3" />
                        <span>Hot</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                          {product.counterName}
                        </span>
                        <span className="text-[11px] text-stone-400 font-medium">
                          {product.ordersCount}
                        </span>
                      </div>
                      <h3 className="mt-1 text-base font-bold text-stone-900 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-500 line-clamp-1 font-medium">
                        {product.cuisines}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
                      <div className="flex items-center gap-1 text-xs font-bold text-stone-600">
                        <Clock className="h-3.5 w-3.5 text-stone-400" />
                        <span>{product.prepTime}</span>
                      </div>

                      <div className="flex items-center gap-3">
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
                              addItem({
                                id: product.id,
                                name: product.name,
                                price: product.price,
                                image_url: product.imageUrl,
                                category_name: product.counterName,
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
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-10 mb-8">
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base sm:text-lg font-black tracking-tight text-stone-900">
                Available & Fresh in Kitchen Now
              </h2>
            </div>
            <span className="text-xs text-stone-500 font-medium">
              {filteredProducts.length} items ready
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const inCartQty = cartQuantityMap.get(product.id) || 0;

              return (
                <div
                  key={product.id}
                  className="flex gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-xs hover:shadow-md transition"
                >
                  <div className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-stone-100">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    {product.isHot && (
                      <span className="absolute left-1 top-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9px] font-black text-white uppercase tracking-wider">
                        Hot
                      </span>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#ff5e3a] uppercase tracking-wider">
                          {product.counterName}
                        </span>
                        <div className="flex items-center gap-0.5 text-[11px] font-bold text-amber-700">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{product.rating}</span>
                        </div>
                      </div>
                      <h3 className="mt-1 text-xs sm:text-sm font-bold text-stone-900 line-clamp-1">
                        {product.name}
                      </h3>
                      <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3 text-stone-400" />
                        <span>{product.prepTime}</span>
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between pt-2 border-t border-stone-100">
                      <span className="font-mono text-sm font-black text-stone-900 tabular-nums">
                        ₹{(product.price / 100).toFixed(0)}
                      </span>

                      {inCartQty > 0 ? (
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
                            addItem({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                              image_url: product.imageUrl,
                              category_name: product.counterName,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 px-3 py-1 text-xs font-bold text-white shadow-sm hover:opacity-90 transition active:scale-95"
                        >
                          <Plus className="h-3 w-3" />
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
      </main>

      <Footer />
    </div>
  );
}
