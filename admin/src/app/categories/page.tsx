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
        <main className="flex-1 flex items-center justify-center py-20 bg-slate-950">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Verifying administrator authorization...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Menu Categories</h1>
                <p className="mt-1 text-xs text-slate-400">
                  Organize daily canteen menus, breakfast sections, and snack stations
                </p>
              </div>
            </div>

            <button
              onClick={loadCategories}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-800/60 bg-rose-950/50 p-4 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
                <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                  <Plus className="h-4 w-4 text-indigo-400" />
                  <span>Create New Category</span>
                </h2>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="catName">
                      Category Name
                    </label>
                    <input
                      id="catName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Hot Breakfast, Beverages, Rice Meals..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="catDesc">
                      Description (Optional)
                    </label>
                    <textarea
                      id="catDesc"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Served daily 8:00 AM - 11:00 AM"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="catOrder">
                      Display Sort Order
                    </label>
                    <input
                      id="catOrder"
                      type="number"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none disabled:opacity-50 transition"
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
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <span>Existing Categories ({categories.length})</span>
                  </h2>
                </div>

                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                    <p className="text-xs font-medium">Loading catalog categories...</p>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    No categories registered yet. Create your first category above.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800">
                    {categories.map((cat) => (
                      <div
                        key={cat.id}
                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{cat.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              Order #{cat.sort_order}
                            </span>
                          </div>
                          {cat.description && (
                            <p className="mt-1 text-slate-400 text-[11px]">{cat.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleActive(cat)}
                            disabled={togglingId === cat.id}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                              cat.is_active
                                ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/60'
                                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
                            }`}
                          >
                            {cat.is_active ? (
                              <>
                                <ToggleRight className="h-4 w-4 text-emerald-400" />
                                <span>Active</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="h-4 w-4 text-slate-500" />
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
