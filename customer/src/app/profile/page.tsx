'use client';

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Settings,
  Camera,
  X,
  CreditCard,
  Building2,
  UploadCloud,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, session, loading, updateProfileInfo, updateAvatarKey, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const [pendingPayLater, setPendingPayLater] = useState<{
    total_pending: number;
    order_count: number;
    orders: any[];
  }>({ total_pending: 0, order_count: 0, orders: [] });
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleMethod, setSettleMethod] = useState<'wallet' | 'upi'>('wallet');
  const [upiRef, setUpiRef] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccess, setSettleSuccess] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const isFacultyOrStaff = ['faculty', 'staff'].includes(
    profile?.approved_account_type || profile?.account_type || ''
  );

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
    if (profile?.phone) {
      setPhoneNumber(profile.phone);
    } else if (user?.user_metadata?.phone) {
      setPhoneNumber(user.user_metadata.phone);
    }
  }, [profile, user]);

  const loadPayLaterData = async () => {
    if (!session?.access_token || !isFacultyOrStaff) return;
    try {
      const [plRes, wRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/orders/pay-later/pending`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
        fetch(`${API_BASE_URL}/api/v1/wallet/me`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        }),
      ]);
      if (plRes.ok) {
        const plJson = await plRes.json();
        if (plJson.success && plJson.data) {
          setPendingPayLater(plJson.data);
        }
      }
      if (wRes.ok) {
        const wJson = await wRes.json();
        if (wJson.success && wJson.data) {
          setWalletBalance(wJson.data.balance);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadPayLaterData();
  }, [session, isFacultyOrStaff]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAvatarError('Please upload a JPEG, PNG, or WebP image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image file size must be less than 5MB');
      return;
    }

    setAvatarError(null);
    setPreviewFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmUpload = async () => {
    if (!previewFile || !session?.access_token) return;

    setUploadingAvatar(true);
    setAvatarError(null);

    try {
      const presignRes = await fetch(`${API_BASE_URL}/api/v1/uploads/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          upload_type: 'avatar',
          file_name: previewFile.name,
          content_type: previewFile.type,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok || !presignData.success) {
        throw new Error(presignData.error?.message || 'Failed to initialize upload');
      }

      const { upload_url, key } = presignData.data;

      const uploadDirect = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': previewFile.type,
        },
        body: previewFile,
      });

      if (!uploadDirect.ok) {
        throw new Error('Failed to upload image to storage');
      }

      const verifyRes = await fetch(`${API_BASE_URL}/api/v1/uploads/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          key,
          upload_type: 'avatar',
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error?.message || 'Failed to verify uploaded image');
      }

      await updateAvatarKey(key);
      await refreshProfile();
      handleCancelPreview();
    } catch (err: any) {
      setAvatarError(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setSaveError('Display name cannot be empty');
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await updateProfileInfo({
        displayName: displayName.trim(),
        phone: phoneNumber.trim() || undefined,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile information');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSettleDues = async () => {
    setSettling(true);
    setSettleError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/orders/pay-later/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          settlement_method: settleMethod,
          upi_reference: settleMethod === 'upi' ? upiRef.trim() || undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to settle dues');
      }
      setSettleSuccess('Dues settled successfully!');
      setTimeout(() => {
        setShowSettleModal(false);
        setSettleSuccess(null);
        loadPayLaterData();
        refreshProfile();
      }, 1500);
    } catch (err: any) {
      setSettleError(err.message || 'Error settling dues');
    } finally {
      setSettling(false);
    }
  };

  if (loading || !user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 pb-28 md:pb-16">
          <div className="flex flex-col items-center gap-3 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
            <p className="text-xs font-semibold">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const roleLabel =
    profile?.app_role === 'admin' || profile?.app_role === 'developer'
      ? 'Administrator'
      : profile?.account_type === 'staff' || profile?.approved_account_type === 'staff'
      ? 'Faculty / Staff'
      : 'Student';

  const avatarDisplayUrl = profile?.avatar_url || (profile?.avatar_key ? `${API_BASE_URL}/api/v1/uploads/avatar?key=${profile.avatar_key}` : null);

  return (
    <>
      <Header />
      <main className="flex-1 pb-28 md:pb-16">
        <section className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] py-10 text-white shadow-md">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="relative">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-white border-2 border-white shadow-lg flex items-center justify-center">
                    {avatarDisplayUrl ? (
                      <img
                        src={avatarDisplayUrl}
                        alt={displayName || 'Avatar'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-orange-100 text-[#ff5e3a] font-black text-2xl">
                        {(displayName || user.email || 'D').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Change profile photo"
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white shadow-md transition hover:bg-stone-800 active:scale-90 border-2 border-white"
                  >
                    <Camera className="h-4 w-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    {displayName || 'Campus Diner'}
                  </h1>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#ff5e3a] shadow-xs">
                      {roleLabel}
                    </span>
                    {profile?.teacher_id && (
                      <span className="font-mono text-xs font-bold text-orange-100">
                        ID: {profile.teacher_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Link
                href="/settings"
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95 shadow-xs"
                aria-label="Account Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {avatarError && (
          <div className="mx-auto max-w-4xl px-4 sm:px-6 pt-4">
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{avatarError}</span>
            </div>
          </div>
        )}

        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
          {isFacultyOrStaff && (
            <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">
                      Faculty / Staff Pay Later Account
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-stone-900">
                    Outstanding Balance: ₹{((pendingPayLater.total_pending || 0) / 100).toFixed(2)}
                  </h2>
                  <p className="text-xs text-stone-500">
                    {pendingPayLater.order_count > 0
                      ? `${pendingPayLater.order_count} pending order(s) awaiting payment settlement`
                      : 'All past meals settled. Zero pending dues.'}
                  </p>
                </div>

                {pendingPayLater.total_pending > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSettleModal(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 transition"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Clear Dues Now</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-[#ff5e3a]" />
              <span>Personal Profile Information</span>
            </h2>

            {saveSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>Profile details saved successfully!</span>
              </div>
            )}

            {saveError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="displayName">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="phone">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Enter 10-digit mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-stone-300 pl-9 pr-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="email">
                  College Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3.5 py-2.5 text-xs text-stone-500 cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>

                <Link
                  href="/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Security & Settings</span>
                </Link>
              </div>
            </form>
          </div>
        </section>

        {previewUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-stone-900">Preview Profile Photo</h3>
                <button
                  type="button"
                  onClick={handleCancelPreview}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex justify-center py-4">
                <div className="h-40 w-40 rounded-full overflow-hidden border-4 border-[#ff5e3a] shadow-lg">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <p className="text-center text-xs text-stone-500">
                This image will represent your identity across canteen orders and receipts.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmUpload}
                  disabled={uploadingAvatar}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition"
                >
                  {uploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-4 w-4" />
                      <span>Confirm & Upload</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCancelPreview}
                  disabled={uploadingAvatar}
                  className="rounded-xl border border-stone-300 px-4 py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-stone-900">Settle Pay Later Dues</h3>
                </div>
                <button
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
                  Total Outstanding Dues
                </span>
                <p className="mt-1 font-mono text-3xl font-extrabold text-stone-900">
                  ₹{((pendingPayLater.total_pending || 0) / 100).toFixed(2)}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  Across {pendingPayLater.order_count} pending meal order(s)
                </p>
              </div>

              {settleSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{settleSuccess}</span>
                </div>
              )}

              {settleError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{settleError}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-700">Choose Settlement Method</label>

                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                    settleMethod === 'wallet'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="settle_method"
                    value="wallet"
                    checked={settleMethod === 'wallet'}
                    onChange={() => setSettleMethod('wallet')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-900">Deduct from Canteen Wallet</span>
                      {walletBalance !== null && (
                        <span className="font-mono text-xs font-bold text-emerald-700">
                          ₹{(walletBalance / 100).toFixed(2)} available
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Instantly clears dues using your current wallet credit balance.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                    settleMethod === 'upi'
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-600'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="settle_method"
                    value="upi"
                    checked={settleMethod === 'upi'}
                    onChange={() => setSettleMethod('upi')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <span className="text-xs font-bold text-stone-900">Direct UPI Settlement</span>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Pay via GooglePay, PhonePe, or Paytm and provide transaction reference.
                    </p>
                  </div>
                </label>

                {settleMethod === 'upi' && (
                  <div className="pt-1">
                    <label className="block text-[11px] font-bold text-stone-700 mb-1" htmlFor="upiRef">
                      UPI Reference Number (Optional)
                    </label>
                    <input
                      id="upiRef"
                      type="text"
                      placeholder="e.g. 429381749281"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono font-medium text-stone-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSettleDues}
                  disabled={settling}
                  className="flex-1 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50"
                >
                  {settling ? 'Settling Dues...' : `Confirm & Settle ₹${((pendingPayLater.total_pending || 0) / 100).toFixed(2)}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  disabled={settling}
                  className="rounded-xl border border-stone-300 px-4 py-3 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
