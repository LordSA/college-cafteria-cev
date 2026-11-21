'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Layers,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Edit3,
  Trash2,
  X,
  Check,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSortOrder, setEditSortOrder] = useState<number>(0);
  const [editIsActive, setEditIsActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories?t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: 'no-store',
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch categories');
      }

      const catsList = Array.isArray(body.data)
        ? body.data
        : (body.data?.categories || []);

      setCategories(catsList);
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
          description: description.trim() || undefined,
          sort_order: sortOrder,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create category');
      }

      setName('');
      setDescription('');
      setSortOrder(0);
      setSuccess('Category registered successfully.');
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
        throw new Error(body.error?.message || 'Failed to update category');
      }

      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || '');
    setEditSortOrder(cat.sort_order);
    setEditIsActive(cat.is_active);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !session?.access_token) return;

    if (!editName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
          sort_order: editSortOrder,
          is_active: editIsActive,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update category');
      }

      setEditingCategory(null);
      setSuccess('Category updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemoveCategory = async (cat: Category) => {
    if (!session?.access_token) return;

    if (!confirm(`Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(cat.id);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${cat.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to delete category');
      }

      setSuccess(`Category "${cat.name}" removed successfully.`);
      setTimeout(() => setSuccess(null), 3000);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setDeletingId(null);
    }
  };

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center py-20 bg-white">
          <div className="flex flex-col items-center gap-3 text-[#666666]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
            <p className="text-xs font-semibold">Verifying...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                    Categories
                  </h1>
                  <p className="mt-1 text-xs text-[#666666]">
                    Organize daily canteen menus, breakfast sections, and snack stations
                  </p>
                </div>
              </div>

              <button
                onClick={loadCategories}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {success && (
              <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 p-4 text-xs text-[#269B62]">
                <CheckCircle2 className="h-4 w-4 text-[#269B62] flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43]">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43] mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <div className="rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-sm">
                  <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2 mb-4">
                    <Plus className="h-4 w-4 text-[#F47721]" />
                    <span>Create New Category</span>
                  </h2>

                  <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="catName">
                        Category Name
                      </label>
                      <input
                        id="catName"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Hot Breakfast, Beverages, Rice Meals..."
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="catDesc">
                        Description (Optional)
                      </label>
                      <textarea
                        id="catDesc"
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Served daily 8:00 AM - 11:00 AM"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="catOrder">
                        Display Sort Order
                      </label>
                      <input
                        id="catOrder"
                        type="number"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creating}
                      className="w-full min-h-[44px] mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[#F47721] hover:bg-[#E06310] px-4 py-2.5 text-xs font-black text-white shadow-md shadow-[#F47721]/20 focus:outline-none disabled:opacity-50 transition active:scale-95"
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
                <div className="rounded-3xl border border-[#EEEEEE] bg-white shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
                    <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#F47721]" />
                      <span>Existing Categories ({categories.length})</span>
                    </h2>
                  </div>

                  {loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                      <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                      <p className="text-xs font-semibold">Loading catalog categories...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <div className="p-12 text-center text-[#666666] text-xs">
                      No categories registered yet. Create your first category above.
                    </div>
                  ) : (
                    <div className="divide-y divide-[#EEEEEE]">
                      {categories.map((cat) => (
                        <div
                          key={cat.id}
                          className="px-6 py-4 flex items-center justify-between hover:bg-[#FFF7F0]/30 transition text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#252525] text-sm">{cat.name}</span>
                              <span className="font-mono text-[10px] text-[#666666] bg-[#FAFAFA] border border-[#EEEEEE] px-2 py-0.5 rounded-full">
                                Order #{cat.sort_order}
                              </span>
                            </div>
                            {cat.description && (
                              <p className="mt-1 text-[#666666] text-[11px]">{cat.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openEditModal(cat)}
                              disabled={togglingId === cat.id || deletingId === cat.id}
                              title="Edit category"
                              className="inline-flex items-center justify-center rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-2 text-[#666666] hover:text-[#F47721] hover:bg-[#FFF7F0] disabled:opacity-30 transition"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(cat)}
                              disabled={togglingId === cat.id || deletingId === cat.id}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${cat.is_active
                                ? 'bg-green-50 border border-green-200 text-[#269B62] hover:bg-green-100'
                                : 'bg-[#FAFAFA] border border-[#EEEEEE] text-[#666666] hover:bg-gray-100 hover:text-[#252525]'
                                }`}
                            >
                              {cat.is_active ? (
                                <>
                                  <ToggleRight className="h-4 w-4 text-[#269B62]" />
                                  <span>Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 text-[#888888]" />
                                  <span>Inactive</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => handleRemoveCategory(cat)}
                              disabled={togglingId === cat.id || deletingId === cat.id}
                              title="Delete category"
                              className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-[#D94A43] hover:bg-red-100 disabled:opacity-30 transition"
                            >
                              {deletingId === cat.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
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

            {editingCategory && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-[#F47721]" />
                      <span>Edit Category</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCatName">
                        Category Name
                      </label>
                      <input
                        id="editCatName"
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCatDesc">
                        Description (Optional)
                      </label>
                      <textarea
                        id="editCatDesc"
                        rows={2}
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCatOrder">
                        Display Sort Order
                      </label>
                      <input
                        id="editCatOrder"
                        type="number"
                        value={editSortOrder}
                        onChange={(e) => setEditSortOrder(Number(e.target.value))}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#252525]">
                        <input
                          type="checkbox"
                          checked={editIsActive}
                          onChange={(e) => setEditIsActive(e.target.checked)}
                          className="rounded border-[#EEEEEE] text-[#F47721] focus:ring-0"
                        />
                        <span>Active category (visible on ordering menu)</span>
                      </label>
                    </div>

                    <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                      >
                        {savingEdit ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Update Category</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
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
