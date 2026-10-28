'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Utensils,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Camera,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
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
  created_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function AdminMenuPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceRupees, setPriceRupees] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [uploadedImageKey, setUploadedImageKey] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, authLoading, router]);

  const loadData = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/menu`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/admin/categories`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);

      const menuBody = await menuRes.json();
      const catBody = await catRes.json();

      if (!menuRes.ok || !menuBody.success) {
        throw new Error(menuBody.error?.message || 'Failed to fetch menu items');
      }

      setMenuItems(menuBody.data || []);
      setCategories(catBody.data || []);
      if (catBody.data?.length > 0 && !categoryId) {
        setCategoryId(catBody.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading menu catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      loadData();
    }
  }, [session]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.access_token) return;

    setImageUploadError(null);
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
      setImageUploadError('Please choose a valid food image (JPEG, PNG, WebP, or AVIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Food image cannot exceed 5MB in size');
      return;
    }

    setUploadingImage(true);
    try {
      const presignRes = await fetch(`${API_BASE_URL}/api/v1/uploads/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          file_type: 'food_image',
          content_type: file.type,
          file_size: file.size,
        }),
      });

      const presignBody = await presignRes.json();
      if (!presignRes.ok || !presignBody.success) {
        throw new Error(presignBody.error?.message || 'Failed to authorize image upload');
      }

      const { upload_url, object_key, public_url } = presignBody.data;

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload food image binary to storage provider');
      }

      setUploadedImageKey(object_key);
      setPreviewImageUrl(public_url || URL.createObjectURL(file));
    } catch (err: any) {
      setImageUploadError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    const parsedPrice = parseFloat(priceRupees);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please provide a valid item price in rupees');
      return;
    }

    if (!categoryId) {
      setError('Please select a menu category');
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const pricePaise = Math.round(parsedPrice * 100);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category_id: categoryId,
          name: name.trim(),
          description: description.trim() || null,
          price: pricePaise,
          image_key: uploadedImageKey,
          is_available: isAvailable,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to save menu item');
      }

      setName('');
      setDescription('');
      setPriceRupees('');
      setUploadedImageKey(null);
      setPreviewImageUrl(null);
      setShowAddForm(false);
      setSuccess('Menu item created successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create menu item');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    if (!session?.access_token) return;

    setActionInProgress(item.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/menu/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_available: !item.is_available,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to toggle availability');
      }

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle availability');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleArchiveItem = async (itemId: string) => {
    if (!session?.access_token) return;

    if (!confirm('Are you sure you want to archive this menu item? It will be removed from customer view.')) {
      return;
    }

    setActionInProgress(itemId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to archive item');
      }

      setSuccess('Menu item archived.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to archive item');
    } finally {
      setActionInProgress(null);
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
                  ALEXATEL • Catalog Roster
                </span>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Menu Item Management
                </h1>
                <p className="mt-1 text-xs text-stone-400">
                  Daily canteen dishes, instantaneous 86 availability toggles, and food catalog uploads
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white disabled:opacity-50 transition shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#9d8bf0] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a4c6] px-4 py-2 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 transition"
              >
                {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                <span>{showAddForm ? 'Close Form' : 'New Menu Item'}</span>
              </button>
            </div>
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

          {showAddForm && (
            <div className="rounded-3xl border border-[#22242e] bg-[#17181f] p-6 shadow-2xl backdrop-blur-md">
              <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Utensils className="h-4 w-4 text-[#f5a4c6]" />
                <span>Add Fresh Dish to Daily Menu</span>
              </h2>

              <form onSubmit={handleCreateItem} className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="itemCategory">
                      Category
                    </label>
                    <select
                      id="itemCategory"
                      required
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {!c.is_active ? '(Inactive)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="itemName">
                      Item Name
                    </label>
                    <input
                      id="itemName"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Masala Dosa, Paneer Roll, Cold Coffee"
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="itemPrice">
                      Price in ₹ (Paise calculated automatically)
                    </label>
                    <input
                      id="itemPrice"
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      value={priceRupees}
                      onChange={(e) => setPriceRupees(e.target.value)}
                      placeholder="45.00"
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="itemDesc">
                      Description (Optional)
                    </label>
                    <textarea
                      id="itemDesc"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Served with fresh coconut chutney and hot sambar."
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="block text-xs font-semibold text-stone-300 mb-1.5">Food Catalog Image</span>
                    <div className="flex items-center gap-4">
                      <div className="h-28 w-28 rounded-2xl bg-[#101114] border border-[#282a38] overflow-hidden flex items-center justify-center relative">
                        {previewImageUrl ? (
                          <img src={previewImageUrl} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                          <Utensils className="h-8 w-8 text-stone-700" />
                        )}
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-[#101114]/80 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-[#9d8bf0]" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingImage}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#101114] px-4 py-1.5 text-xs font-bold text-stone-200 hover:bg-[#232533] disabled:opacity-50 transition"
                        >
                          <Camera className="h-3.5 w-3.5 text-[#9d8bf0]" />
                          <span>{previewImageUrl ? 'Replace Image' : 'Select Food Image'}</span>
                        </button>
                        <p className="text-[11px] text-stone-400 leading-tight">
                          JPEG, PNG, WebP or AVIF (Max 5MB). Storage upload authorized by backend.
                        </p>
                        {uploadedImageKey && (
                          <p className="text-[10px] text-emerald-400 font-mono truncate max-w-[200px]">
                            {uploadedImageKey}
                          </p>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </div>
                    </div>
                    {imageUploadError && (
                      <p className="mt-2 text-xs text-rose-400">{imageUploadError}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-stone-300">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={(e) => setIsAvailable(e.target.checked)}
                        className="rounded border-[#282a38] bg-[#101114] text-[#f5a4c6] focus:ring-0"
                      />
                      <span>Mark available for immediate ordering</span>
                    </label>
                  </div>

                  <div className="pt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="rounded-full border border-[#282a38] bg-[#101114] px-4 py-2 text-xs font-bold text-stone-300 hover:bg-[#232533] transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#f5a4c6] px-5 py-2 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Saving Dish...</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Save Menu Item</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
              <p className="text-xs font-semibold">Fetching active menu catalog...</p>
            </div>
          ) : menuItems.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#22242e] bg-[#17181f]/40 p-12 text-center">
              <Utensils className="mx-auto h-8 w-8 text-stone-600" />
              <h3 className="mt-3 text-sm font-bold text-stone-300">No Dishes in Menu</h3>
              <p className="mt-1 text-xs text-stone-500">
                Click &quot;New Menu Item&quot; to add your first dish.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#22242e] bg-[#17181f] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-[#121316] uppercase text-[10px] tracking-wider text-stone-400 border-b border-[#22242e]">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">Dish Details</th>
                      <th className="px-6 py-3.5 font-bold">Category</th>
                      <th className="px-6 py-3.5 font-bold">Price (₹)</th>
                      <th className="px-6 py-3.5 font-bold">Kitchen Availability</th>
                      <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22242e] font-medium">
                    {menuItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1a1b24] transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-[#101114] border border-[#282a38] overflow-hidden flex items-center justify-center flex-shrink-0">
                              {item.image_url ? (
                                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                              ) : (
                                <Utensils className="h-5 w-5 text-stone-700" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm">{item.name}</div>
                              {item.description && (
                                <p className="text-[11px] text-stone-400 line-clamp-1 max-w-xs mt-0.5">
                                  {item.description}
                                </p>
                              )}
                              {item.is_archived && (
                                <span className="inline-block rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold px-2 py-0.5 mt-1">
                                  Archived
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="rounded-full bg-[#101114] px-2.5 py-0.5 text-[11px] font-semibold text-stone-300 border border-[#282a38]">
                            {item.category_name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-sm font-extrabold text-white tabular-nums">
                          ₹{(item.price / 100).toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleAvailability(item)}
                            disabled={actionInProgress === item.id || item.is_archived}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-xs ${
                              item.is_available
                                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                            }`}
                          >
                            {item.is_available ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                <span>Available</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                                <span>Sold Out (86)</span>
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleArchiveItem(item.id)}
                            disabled={actionInProgress === item.id || item.is_archived}
                            title="Archive menu item"
                            className="inline-flex items-center justify-center rounded-full border border-[#282a38] bg-[#101114] p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-500/15 disabled:opacity-30 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
