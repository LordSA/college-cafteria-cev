'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import {
  UtensilsCrossed,
  ArrowRight,
  Loader2,
  Grid,
  AlertCircle,
  Coffee,
  Wine,
  Cake,
  Pizza,
  Apple,
  Cookie,
  Flame,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

function getCategoryIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('coffee') || lower.includes('tea')) return Coffee;
  if (lower.includes('juice') || lower.includes('drink') || lower.includes('beverage')) return Wine;
  if (lower.includes('cake') || lower.includes('bakery') || lower.includes('dessert')) return Cake;
  if (lower.includes('pizza') || lower.includes('burger') || lower.includes('fast')) return Pizza;
  if (lower.includes('fruit') || lower.includes('salad')) return Apple;
  if (lower.includes('snack') || lower.includes('bites')) return Cookie;
  return UtensilsCrossed;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/categories`);
        if (!res.ok) {
          throw new Error('Unable to connect to canteen catalog');
        }
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data.filter((c: Category) => c.is_active));
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to load categories';
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 pb-16">
        <section className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] py-12 text-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-sm">
                <Grid className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Menu Categories
                </h1>
                <p className="mt-1 text-xs text-orange-100 font-medium">
                  Cafteria CEV &bull; Browse all canteen sections and dishes
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          {error && (
            <div className="mb-6 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-stone-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
              <p className="text-xs font-semibold">Loading menu categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center">
              <UtensilsCrossed className="mx-auto h-10 w-10 text-stone-300" />
              <h3 className="mt-3 text-base font-bold text-stone-800">No categories found</h3>
              <p className="mt-1 text-xs text-stone-500">
                Menu categories will appear here once published by the canteen kitchen.
              </p>
              <Link
                href="/menu"
                className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-md shadow-orange-500/20"
              >
                <span>View Full Menu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/menu"
                className="group flex flex-col justify-between rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50/70 to-rose-50/50 p-6 shadow-xs hover:shadow-md transition active:scale-98"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
                    <Flame className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-stone-900 group-hover:text-[#ff5e3a] transition">
                    All Dishes
                  </h3>
                  <p className="mt-1 text-xs text-stone-500 leading-relaxed">
                    Browse every available dish, snack, and drink across our entire canteen catalog.
                  </p>
                </div>
                <div className="mt-6 flex items-center justify-between text-xs font-bold text-[#ff5e3a] pt-4 border-t border-orange-200/50">
                  <span>Explore All</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                </div>
              </Link>

              {categories.map((cat) => {
                const IconComponent = getCategoryIcon(cat.name);

                return (
                  <Link
                    key={cat.id}
                    href={`/menu?category=${cat.id}`}
                    className="group flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 shadow-xs hover:border-orange-300 hover:shadow-md transition active:scale-98"
                  >
                    <div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#ff5e3a] group-hover:bg-[#ff5e3a] group-hover:text-white transition shadow-xs">
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <h3 className="mt-4 text-lg font-black text-stone-900 group-hover:text-[#ff5e3a] transition">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="mt-1 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-6 flex items-center justify-between text-xs font-bold text-stone-600 group-hover:text-[#ff5e3a] pt-4 border-t border-stone-100">
                      <span>View Dishes</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
