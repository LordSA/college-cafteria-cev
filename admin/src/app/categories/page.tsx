'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session } = useAdminAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, authLoading, router]);

  const loadCategories = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch categories');
      }

      setCategories(body.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      loadCategories();
    }
  }, [session]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!name.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          sort_order: Number(sortOrder),
          is_active: true,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create category');
      }

      setName('');
      setDescription('');
      setSortOrder(0);
      setSuccess('Category created successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (category: Category) => {
    if (!session?.access_token) return;

    setTogglingId(category.id);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${category.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_active: !category.is_active,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update category status');
      }

      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle category');
    } finally {
      setTogglingId(null);
    }
  };

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-[#101114]">
          <div className="flex flex-col items-center gap-3 text-stone-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
            <p className="text-xs font-semibold">Verifying administrator authorization...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-[#101114] text-slate-100 min-h-screen">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#22242e] pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#282a38] bg-[#17181f] p-2 text-stone-400 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">
                  ALEXATEL • Taxonomy Controls
                </span>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Menu Categories
                </h1>
                <p className="mt-1 text-xs text-stone-400">
                  Organize daily canteen menus, breakfast sections, and snack stations
                </p>
              </div>
            </div>

            <button
              onClick={loadCategories}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white disabled:opacity-50 transition shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#9d8bf0] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="rounded-3xl border border-[#22242e] bg-[#17181f] p-6 shadow-xl">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Plus className="h-4 w-4 text-[#f5a4c6]" />
                  <span>Create New Category</span>
                </h2>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="catName">
                      Category Name
                    </label>
                    <input
                      id="catName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Hot Breakfast, Beverages, Rice Meals..."
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="catDesc">
                      Description (Optional)
                    </label>
                    <textarea
                      id="catDesc"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Served daily 8:00 AM - 11:00 AM"
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="catOrder">
                      Display Sort Order
                    </label>
                    <input
                      id="catOrder"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#f5a4c6] px-4 py-2.5 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 focus:outline-none disabled:opacity-50 transition"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Category</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-[#22242e] bg-[#17181f] shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-[#22242e] bg-[#121316] flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[#9d8bf0]" />
                    <span>Existing Categories ({categories.length})</span>
                  </h2>
                </div>

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
                    <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
                    <p className="text-xs font-semibold">Loading catalog categories...</p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="p-12 text-center text-stone-500 text-xs">
                    No categories registered yet. Create your first category above.
                  </div>
                ) : (
                  <div className="divide-y divide-[#22242e]">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-[#1a1b24] transition text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{cat.name}</span>
                            <span className="font-mono text-[10px] text-stone-400 bg-[#101114] border border-[#282a38] px-2 py-0.5 rounded-full">
                              Order #{cat.sort_order}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="mt-1 text-stone-400 text-[11px]">{cat.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(cat)}
                            disabled={togglingId === cat.id}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                              cat.is_active
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-[#101114] border border-[#282a38] text-stone-400 hover:bg-[#232533] hover:text-white'
                            }`}
                          >
                            {cat.is_active ? (
                              <>
                                <ToggleRight className="h-4 w-4 text-emerald-400" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 text-stone-500" />
                                <span>Inactive</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
