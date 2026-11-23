'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Utensils,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Camera,
  Trash2,
  Check,
  X,
  Edit3,
  RotateCcw,
  Archive,
  Layers,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description?: string | null;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminMenuPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canManageMenu, role } = useAdminAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'dishes' | 'categories'>('dishes');
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

  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [catSortOrder, setCatSortOrder] = useState<number>(0);
  const [catCreating, setCatCreating] = useState(false);
  const [catTogglingId, setCatTogglingId] = useState<string | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [editCatDescription, setEditCatDescription] = useState('');
  const [editCatSortOrder, setEditCatSortOrder] = useState<number>(0);
  const [editCatIsActive, setEditCatIsActive] = useState(true);
  const [savingCatEdit, setSavingCatEdit] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriceRupees, setEditPriceRupees] = useState('');
  const [editIsAvailable, setEditIsAvailable] = useState(true);
  const [editIsArchived, setEditIsArchived] = useState(false);
  const [editUploadedImageKey, setEditUploadedImageKey] = useState<string | null>(null);
  const [editPreviewImageUrl, setEditPreviewImageUrl] = useState<string | null>(null);
  const [editUploadingImage, setEditUploadingImage] = useState(false);
  const [editImageUploadError, setEditImageUploadError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canManageMenu) {
        if (role === 'retail') {
          router.push('/inventory');
        } else if (role === 'printer') {
          router.push('/printer');
        } else {
          router.push('/unauthorized');
        }
      }
    }
  }, [adminUser, isUnauthorized, canManageMenu, role, authLoading, router]);

  const loadData = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const [menuRes, catRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/menu?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }),
        fetch(`${API_BASE_URL}/api/v1/admin/categories?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }),
      ]);

      const menuBody = await menuRes.json();
      const catBody = await catRes.json();

      if (!menuRes.ok || !menuBody.success) {
        throw new Error(menuBody.error?.message || 'Failed to fetch menu items');
      }
      if (!catRes.ok || !catBody.success) {
        throw new Error(catBody.error?.message || 'Failed to fetch categories');
      }

      const itemsList = Array.isArray(menuBody.data)
        ? menuBody.data
        : (menuBody.data?.items || []);
      const catsList = Array.isArray(catBody.data)
        ? catBody.data
        : (catBody.data?.categories || []);

      setMenuItems(itemsList);
      setCategories(catsList);

      if (catsList.length > 0 && !categoryId) {
        setCategoryId(catsList[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading menu data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      loadData();
    }
  }, [adminUser, isUnauthorized, session?.access_token]);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!session?.access_token) {
      setImageUploadError('Authentication session expired');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setImageUploadError('Allowed image formats: JPEG, PNG, WebP, AVIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError('Maximum file size is 5MB');
      return;
    }

    setUploadingImage(true);
    setImageUploadError(null);

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
          type: 'food',
          contentType: file.type,
        }),
      });

      const presignBody = await presignRes.json();
      if (!presignRes.ok || !presignBody.success) {
        throw new Error(presignBody.error?.message || 'Failed to get upload authorization');
      }

      const uploadUrl = presignBody.data?.uploadUrl || presignBody.data?.upload_url;
      const key = presignBody.data?.key || presignBody.data?.object_key;
      const publicUrl = presignBody.data?.publicUrl || presignBody.data?.public_url;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to storage bucket failed (HTTP ${uploadRes.status})`);
      }

      setUploadedImageKey(publicUrl || key);
      setPreviewImageUrl(URL.createObjectURL(file));
    } catch (err: any) {
      setImageUploadError(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    const parsedPrice = parseFloat(priceRupees);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please provide a valid price in ₹');
      return;
    }

    const priceInPaise = Math.round(parsedPrice * 100);

    setSubmitting(true);
    setError(null);

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
          description: description.trim() || undefined,
          price: priceInPaise,
          is_available: isAvailable,
          image_key: uploadedImageKey || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create menu item');
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

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setEditCategoryId(item.category_id);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditPriceRupees((item.price / 100).toString());
    setEditIsAvailable(item.is_available);
    setEditIsArchived(item.is_archived);
    setEditUploadedImageKey(item.image_key);
    setEditPreviewImageUrl(item.image_url);
    setEditImageUploadError(null);
  };

  const handleEditImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!session?.access_token) {
      setEditImageUploadError('Authentication session expired');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
      setEditImageUploadError('Allowed image formats: JPEG, PNG, WebP, AVIF');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setEditImageUploadError('Maximum file size is 5MB');
      return;
    }

    setEditUploadingImage(true);
    setEditImageUploadError(null);

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
          type: 'food',
          contentType: file.type,
        }),
      });

      const presignBody = await presignRes.json();
      if (!presignRes.ok || !presignBody.success) {
        throw new Error(presignBody.error?.message || 'Failed to get upload authorization');
      }

      const uploadUrl = presignBody.data?.uploadUrl || presignBody.data?.upload_url;
      const key = presignBody.data?.key || presignBody.data?.object_key;
      const publicUrl = presignBody.data?.publicUrl || presignBody.data?.public_url;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Upload to storage bucket failed (HTTP ${uploadRes.status})`);
      }

      setEditUploadedImageKey(publicUrl || key);
      setEditPreviewImageUrl(URL.createObjectURL(file));
    } catch (err: any) {
      setEditImageUploadError(err.message || 'Image upload failed');
    } finally {
      setEditUploadingImage(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !session?.access_token) return;

    const parsedPrice = parseFloat(editPriceRupees);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setError('Please provide a valid price in ₹');
      return;
    }

    setSavingEdit(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/menu/${editingItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          category_id: editCategoryId,
          name: editName.trim(),
          description: editDescription.trim() || null,
          price: Math.round(parsedPrice * 100),
          is_available: editIsAvailable,
          is_archived: editIsArchived,
          image_key: editUploadedImageKey,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update menu item');
      }

      setEditingItem(null);
      setSuccess('Menu item updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update menu item');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleArchive = async (item: MenuItem) => {
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
          is_archived: !item.is_archived,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update item status');
      }

      setSuccess(item.is_archived ? 'Item restored to active menu.' : 'Item archived.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update item status');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRemoveItem = async (item: MenuItem) => {
    if (!session?.access_token) return;

    if (!confirm(`Are you sure you want to permanently delete "${item.name}" from the menu? This action cannot be undone.`)) {
      return;
    }

    setActionInProgress(item.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/menu/${item.id}?permanent=true`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to remove menu item');
      }

      setSuccess(`"${item.name}" permanently removed.`);
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove menu item');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!catName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setCatCreating(true);
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
          name: catName.trim(),
          description: catDescription.trim() || undefined,
          sort_order: catSortOrder,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create category');
      }

      setCatName('');
      setCatDescription('');
      setCatSortOrder(0);
      setShowAddForm(false);
      setSuccess('Category created successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create category');
    } finally {
      setCatCreating(false);
    }
  };

  const handleToggleCategoryActive = async (cat: Category) => {
    if (!session?.access_token) return;

    setCatTogglingId(cat.id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${cat.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          is_active: !cat.is_active,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update category');
      }

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setCatTogglingId(null);
    }
  };

  const openEditCategoryModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditCatName(cat.name);
    setEditCatDescription(cat.description || '');
    setEditCatSortOrder(cat.sort_order || 0);
    setEditCatIsActive(cat.is_active);
    setError(null);
  };

  const handleSaveCategoryEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !session?.access_token) return;

    if (!editCatName.trim()) {
      setError('Category name cannot be empty');
      return;
    }

    setSavingCatEdit(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/categories/${editingCategory.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: editCatName.trim(),
          description: editCatDescription.trim() || null,
          sort_order: editCatSortOrder,
          is_active: editCatIsActive,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update category');
      }

      setEditingCategory(null);
      setSuccess('Category updated successfully.');
      setTimeout(() => setSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    } finally {
      setSavingCatEdit(false);
    }
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (!session?.access_token) return;

    if (!confirm(`Are you sure you want to delete category "${cat.name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingCatId(cat.id);
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
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
    } finally {
      setDeletingCatId(null);
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
                    Menu Management
                  </h1>
                  <p className="mt-1 text-xs text-[#666666]">
                    Daily cafeteria food catalog uploads
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 transition"
                >
                  {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{showAddForm ? 'Close Form' : activeTab === 'dishes' ? 'New Item' : 'New Category'}</span>
                </button>
              </div>
            </div>

            <div className="flex border-b border-[#EEEEEE] gap-8">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('dishes');
                  setShowAddForm(false);
                }}
                className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-px ${
                  activeTab === 'dishes'
                    ? 'border-[#F47721] text-[#F47721]'
                    : 'border-transparent text-[#666666] hover:text-[#252525]'
                }`}
              >
                <Utensils className="h-4 w-4" />
                <span>Menu Dishes ({menuItems.length})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('categories');
                  setShowAddForm(false);
                }}
                className={`pb-3 text-xs font-bold transition flex items-center gap-2 border-b-2 -mb-px ${
                  activeTab === 'categories'
                    ? 'border-[#F47721] text-[#F47721]'
                    : 'border-transparent text-[#666666] hover:text-[#252525]'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Categories ({categories.length})</span>
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

            {showAddForm && (
              <div className="rounded-3xl border border-[#EEEEEE] bg-white p-6 shadow-sm">
                {activeTab === 'dishes' ? (
                  <>
                    <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2 mb-4">
                      <Utensils className="h-4 w-4 text-[#F47721]" />
                      <span>Add Menu Item</span>
                    </h2>

                    <form onSubmit={handleCreateItem} className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="itemCategory">
                            Category
                          </label>
                          <select
                            id="itemCategory"
                            required
                            value={categoryId}
                            onChange={(e) => setCategoryId(e.target.value)}
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name} {!c.is_active ? '(Inactive)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="itemName">
                            Item Name
                          </label>
                          <input
                            id="itemName"
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Masala Dosa, Paneer Roll, Cold Coffee"
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="itemPrice">
                            Price (₹)
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
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="itemDesc">
                            Description (Optional)
                          </label>
                          <textarea
                            id="itemDesc"
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Served with fresh coconut chutney and hot sambar."
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="block text-xs font-semibold text-[#252525] mb-1.5">Food Catalog Image</span>
                          <div className="flex items-center gap-4">
                            <div className="h-28 w-28 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] overflow-hidden flex items-center justify-center relative">
                              {previewImageUrl ? (
                                <img src={previewImageUrl} alt="Preview" className="h-full w-full object-cover" />
                              ) : (
                                <Utensils className="h-8 w-8 text-[#888888]" />
                              )}
                              {uploadingImage && (
                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                  <Loader2 className="h-5 w-5 animate-spin text-[#F47721]" />
                                </div>
                              )}
                            </div>

                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-1.5 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition"
                              >
                                <Camera className="h-3.5 w-3.5 text-[#F47721]" />
                                <span>{previewImageUrl ? 'Replace Image' : 'Select Food Image'}</span>
                              </button>
                              <p className="text-[11px] text-[#666666] leading-tight">
                                JPEG, PNG, WebP or AVIF (Max 5MB).
                              </p>
                              {uploadedImageKey && (
                                <p className="text-[10px] text-[#269B62] font-mono truncate max-w-[200px]">
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
                            <p className="mt-2 text-xs text-[#D94A43]">{imageUploadError}</p>
                          )}
                        </div>

                        <div className="pt-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#252525]">
                            <input
                              type="checkbox"
                              checked={isAvailable}
                              onChange={(e) => setIsAvailable(e.target.checked)}
                              className="rounded border-[#EEEEEE] text-[#F47721] focus:ring-0"
                            />
                            <span>Mark available for immediate ordering</span>
                          </label>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Saving Dish...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Save Item</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </>
                ) : (
                  <>
                    <h2 className="text-sm font-bold text-[#252525] flex items-center gap-2 mb-4">
                      <Layers className="h-4 w-4 text-[#F47721]" />
                      <span>Add Menu Category</span>
                    </h2>

                    <form onSubmit={handleCreateCategory} className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="catName">
                            Category Name
                          </label>
                          <input
                            id="catName"
                            type="text"
                            required
                            value={catName}
                            onChange={(e) => setCatName(e.target.value)}
                            placeholder="e.g. Breakfast, Snacks, Beverages"
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="catSortOrder">
                            Display Sort Order
                          </label>
                          <input
                            id="catSortOrder"
                            type="number"
                            value={catSortOrder}
                            onChange={(e) => setCatSortOrder(parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="catDesc">
                            Description (Optional)
                          </label>
                          <textarea
                            id="catDesc"
                            rows={3}
                            value={catDescription}
                            onChange={(e) => setCatDescription(e.target.value)}
                            placeholder="Category summary..."
                            className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                          />
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowAddForm(false)}
                            className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={catCreating}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                          >
                            {catCreating ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Saving Category...</span>
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Save Category</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}

            {activeTab === 'dishes' ? (
              loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                  <p className="text-xs font-semibold">Fetching active menu catalog...</p>
                </div>
              ) : menuItems.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                  <Utensils className="mx-auto h-8 w-8 text-[#888888]" />
                  <h3 className="mt-3 text-sm font-bold text-[#252525]">No Dishes in Menu</h3>
                  <p className="mt-1 text-xs text-[#666666]">
                    Click &quot;New Item&quot; to add your first dish.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3.5 font-bold">Dish Details</th>
                          <th className="px-6 py-3.5 font-bold">Category</th>
                          <th className="px-6 py-3.5 font-bold">Price (₹)</th>
                          <th className="px-6 py-3.5 font-bold">Kitchen Availability</th>
                          <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] font-medium">
                        {menuItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-[#FAFAFA] border border-[#EEEEEE] overflow-hidden flex items-center justify-center flex-shrink-0">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <Utensils className="h-5 w-5 text-[#888888]" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-[#252525] text-sm">{item.name}</div>
                                  {item.description && (
                                    <p className="text-[11px] text-[#666666] line-clamp-1 max-w-xs mt-0.5">
                                      {item.description}
                                    </p>
                                  )}
                                  {item.is_archived && (
                                    <span className="inline-block rounded-full bg-red-50 border border-red-200 text-[#D94A43] text-[10px] font-bold px-2 py-0.5 mt-1">
                                      Archived
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="rounded-full bg-[#FAFAFA] px-2.5 py-0.5 text-[11px] font-semibold text-[#252525] border border-[#EEEEEE]">
                                {item.category_name || 'Uncategorized'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono text-sm font-extrabold text-[#252525] tabular-nums">
                              ₹{(item.price / 100).toFixed(2)}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleAvailability(item)}
                                disabled={actionInProgress === item.id || item.is_archived}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-xs ${item.is_available
                                  ? 'bg-green-50 border border-green-200 text-[#269B62] hover:bg-green-100'
                                  : 'bg-red-50 border border-red-200 text-[#D94A43] hover:bg-red-100'
                                  }`}
                              >
                                {item.is_available ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#269B62]" />
                                    <span>Available</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 text-[#D94A43]" />
                                    <span>Sold Out (86)</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditModal(item)}
                                  disabled={actionInProgress === item.id}
                                  title="Edit dish"
                                  className="inline-flex items-center justify-center rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-2 text-[#666666] hover:text-[#F47721] hover:bg-[#FFF7F0] disabled:opacity-30 transition"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleToggleArchive(item)}
                                  disabled={actionInProgress === item.id}
                                  title={item.is_archived ? 'Restore dish' : 'Archive dish'}
                                  className={`inline-flex items-center justify-center rounded-xl border p-2 transition disabled:opacity-30 ${item.is_archived
                                    ? 'border-green-200 bg-green-50 text-[#269B62] hover:bg-green-100'
                                    : 'border-amber-200 bg-amber-50 text-[#F59E0B] hover:bg-amber-100'
                                    }`}
                                >
                                  {item.is_archived ? <RotateCcw className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleRemoveItem(item)}
                                  disabled={actionInProgress === item.id}
                                  title="Permanently remove dish"
                                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-[#D94A43] hover:bg-red-100 disabled:opacity-30 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : (
              loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                  <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                  <p className="text-xs font-semibold">Fetching categories...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                  <Layers className="mx-auto h-8 w-8 text-[#888888]" />
                  <h3 className="mt-3 text-sm font-bold text-[#252525]">No Categories Configured</h3>
                  <p className="mt-1 text-xs text-[#666666]">
                    Click &quot;New Category&quot; to define your first menu category.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3.5 font-bold">Sort Order</th>
                          <th className="px-6 py-3.5 font-bold">Category Name</th>
                          <th className="px-6 py-3.5 font-bold">Description</th>
                          <th className="px-6 py-3.5 font-bold">Status</th>
                          <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] font-medium">
                        {categories.map((cat) => (
                          <tr key={cat.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-[#252525]">
                              {cat.sort_order ?? 0}
                            </td>
                            <td className="px-6 py-4 font-bold text-[#252525] text-sm">
                              {cat.name}
                            </td>
                            <td className="px-6 py-4 text-[#666666] max-w-xs truncate">
                              {cat.description || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => handleToggleCategoryActive(cat)}
                                disabled={catTogglingId === cat.id}
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition shadow-xs ${
                                  cat.is_active
                                    ? 'bg-green-50 border border-green-200 text-[#269B62] hover:bg-green-100'
                                    : 'bg-stone-100 border border-stone-200 text-stone-500 hover:bg-stone-200'
                                }`}
                              >
                                {cat.is_active ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-[#269B62]" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3.5 w-3.5 text-stone-500" />
                                    <span>Disabled</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditCategoryModal(cat)}
                                  title="Edit category"
                                  className="inline-flex items-center justify-center rounded-xl border border-[#EEEEEE] bg-[#FAFAFA] p-2 text-[#666666] hover:text-[#F47721] hover:bg-[#FFF7F0] transition"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(cat)}
                                  disabled={deletingCatId === cat.id}
                                  title="Delete category"
                                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 p-2 text-[#D94A43] hover:bg-red-100 disabled:opacity-30 transition"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            )}

            {editingItem && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-[#F47721]" />
                      <span>Edit Menu Item: {editingItem.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCategory">
                          Category
                        </label>
                        <select
                          id="editCategory"
                          required
                          value={editCategoryId}
                          onChange={(e) => setEditCategoryId(e.target.value)}
                          className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {!c.is_active ? '(Inactive)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editName">
                          Item Name
                        </label>
                        <input
                          id="editName"
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="e.g. Masala Dosa, Paneer Roll"
                          className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editPrice">
                          Price (₹)
                        </label>
                        <input
                          id="editPrice"
                          type="number"
                          step="0.5"
                          min="0"
                          required
                          value={editPriceRupees}
                          onChange={(e) => setEditPriceRupees(e.target.value)}
                          placeholder="45.00"
                          className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editDesc">
                          Description (Optional)
                        </label>
                        <textarea
                          id="editDesc"
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Dish details..."
                          className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <span className="block text-xs font-semibold text-[#252525] mb-1.5">Food Catalog Image</span>
                        <div className="flex items-center gap-4">
                          <div className="h-28 w-28 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] overflow-hidden flex items-center justify-center relative">
                            {editPreviewImageUrl ? (
                              <img src={editPreviewImageUrl} alt="Preview" className="h-full w-full object-cover" />
                            ) : (
                              <Utensils className="h-8 w-8 text-[#888888]" />
                            )}
                            {editUploadingImage && (
                              <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 className="h-5 w-5 animate-spin text-[#F47721]" />
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => editFileInputRef.current?.click()}
                              disabled={editUploadingImage}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-1.5 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition"
                            >
                              <Camera className="h-3.5 w-3.5 text-[#F47721]" />
                              <span>{editPreviewImageUrl ? 'Replace Image' : 'Select Food Image'}</span>
                            </button>
                            {editPreviewImageUrl && (
                              <div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditUploadedImageKey(null);
                                    setEditPreviewImageUrl(null);
                                  }}
                                  className="text-[11px] text-[#D94A43] hover:underline"
                                >
                                  Remove current image
                                </button>
                              </div>
                            )}
                            <p className="text-[11px] text-[#666666] leading-tight">
                              JPEG, PNG, WebP or AVIF (Max 5MB).
                            </p>
                            <input
                              ref={editFileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              onChange={handleEditImageFileChange}
                              className="hidden"
                            />
                          </div>
                        </div>
                        {editImageUploadError && (
                          <p className="mt-2 text-xs text-[#D94A43]">{editImageUploadError}</p>
                        )}
                      </div>

                      <div className="space-y-2 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#252525]">
                          <input
                            type="checkbox"
                            checked={editIsAvailable}
                            onChange={(e) => setEditIsAvailable(e.target.checked)}
                            className="rounded border-[#EEEEEE] text-[#F47721] focus:ring-0"
                          />
                          <span>Mark available for immediate ordering</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#252525]">
                          <input
                            type="checkbox"
                            checked={editIsArchived}
                            onChange={(e) => setEditIsArchived(e.target.checked)}
                            className="rounded border-[#EEEEEE] text-[#D94A43] focus:ring-0"
                          />
                          <span className="text-[#666666]">Archive this dish (hidden from customer menu)</span>
                        </label>
                      </div>

                      <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                        <button
                          type="button"
                          onClick={() => setEditingItem(null)}
                          className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingEdit || editUploadingImage}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                        >
                          {savingEdit ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Saving Changes...</span>
                            </>
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Update Dish</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingCategory && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-[#F47721]" />
                      <span>Edit Category: {editingCategory.name}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingCategory(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveCategoryEdit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCatName">
                        Category Name
                      </label>
                      <input
                        id="editCatName"
                        type="text"
                        required
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCatSort">
                        Sort Order
                      </label>
                      <input
                        id="editCatSort"
                        type="number"
                        value={editCatSortOrder}
                        onChange={(e) => setEditCatSortOrder(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editCatDesc">
                        Description
                      </label>
                      <textarea
                        id="editCatDesc"
                        rows={3}
                        value={editCatDescription}
                        onChange={(e) => setEditCatDescription(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div className="pt-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#252525]">
                        <input
                          type="checkbox"
                          checked={editCatIsActive}
                          onChange={(e) => setEditCatIsActive(e.target.checked)}
                          className="rounded border-[#EEEEEE] text-[#F47721] focus:ring-0"
                        />
                        <span>Category Active (visible to customers)</span>
                      </label>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingCatEdit}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                      >
                        {savingCatEdit ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Save Changes</span>
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
