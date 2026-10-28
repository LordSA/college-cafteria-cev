'use client';

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Shield,
  GraduationCap,
  Briefcase,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Camera,
  Mail,
  ReceiptText,
  Wallet,
  ShoppingBag,
  ArrowRight,
  UtensilsCrossed,
  CreditCard,
  QrCode,
  X,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, session, loading, signOut, updateDisplayName, updateAvatarKey, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState(false);

  const [pendingPayLater, setPendingPayLater] = useState<{
    total_pending: number;
    order_count: number;
    orders: any[];
  }>({ total_pending: 0, order_count: 0, orders: [] });
  const [payLaterLoading, setPayLaterLoading] = useState(false);
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
  }, [profile]);

  useEffect(() => {
    async function loadAvatar() {
      if (!profile?.avatar_key || !session?.access_token) {
        setAvatarUrl(null);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/uploads/avatar`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data?.display_url) {
            setAvatarUrl(body.data.display_url);
          }
        }
      } catch {
        setAvatarUrl(null);
      }
    }

    loadAvatar();
  }, [profile?.avatar_key, session]);

  const loadPayLaterData = async () => {
    if (!session?.access_token || !isFacultyOrStaff) return;
    setPayLaterLoading(true);
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
    setPayLaterLoading(false);
  };

  useEffect(() => {
    loadPayLaterData();
  }, [session, isFacultyOrStaff]);

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
      setSettleSuccess(`Cleared ₹${(data.data.total_settled / 100).toFixed(2)} via ${settleMethod === 'wallet' ? 'Testing Wallet' : 'UPI'}!`);
      await loadPayLaterData();
      setTimeout(() => {
        setShowSettleModal(false);
        setSettleSuccess(null);
        setUpiRef('');
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Settlement failed';
      setSettleError(msg);
    } finally {
      setSettling(false);
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);

    if (!displayName.trim()) {
      setSaveError('Display name cannot be empty');
      return;
    }

    setSaving(true);
    const result = await updateDisplayName(displayName.trim());
    setSaving(false);

    if (!result.success) {
      setSaveError(result.error || 'Failed to update profile');
    } else {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.access_token) return;

    setAvatarError(null);
    setAvatarSuccess(false);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError('Please select a valid image file (JPEG, PNG, WebP, or AVIF)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Avatar image must not exceed 2MB in size');
      return;
    }

    setUploadingAvatar(true);
    try {
      const presignRes = await fetch(`${API_BASE_URL}/api/v1/uploads/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          file_type: 'profile_image',
          content_type: file.type,
          file_size: file.size,
        }),
      });

      const presignBody = await presignRes.json();
      if (!presignRes.ok || !presignBody.success) {
        throw new Error(presignBody.error?.message || 'Failed to obtain upload authorization');
      }

      const { upload_url, object_key } = presignBody.data;

      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image data to storage provider');
      }

      const updateResult = await updateAvatarKey(object_key);
      if (!updateResult.success) {
        throw new Error(updateResult.error || 'Failed to link avatar to profile');
      }

      await refreshProfile();
      setAvatarSuccess(true);
      setTimeout(() => setAvatarSuccess(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Avatar upload failed';
      setAvatarError(msg);
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 pb-28 md:pb-16">
          <div className="flex flex-col items-center gap-3 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
            <p className="text-xs font-semibold">Loading profile credentials...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const accountType = profile?.approved_account_type || profile?.account_type || 'student';
  const isEmailVerified = Boolean(user.email_confirmed_at);

  return (
    <>
      <Header />
      <main className="flex-1 pb-28 md:pb-16">
        <section className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] py-10 text-white shadow-md">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-md">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl sm:text-3xl font-black text-white">
                        {(displayName || 'C').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute bottom-0 right-0 rounded-full bg-white text-[#ff5e3a] p-1.5 shadow-md hover:bg-orange-50 disabled:opacity-50 transition active:scale-95"
                    title="Change picture"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                    Hi {displayName || 'Diner'}
                  </h1>
                  <p className="mt-0.5 text-xs text-orange-100 font-medium">
                    {user.email} &bull; Cafteria CEV
                  </p>
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 backdrop-blur-md px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-white/30 transition active:scale-95 self-start sm:self-auto"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-black text-stone-900 flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-[#ff5e3a]" />
                  <span>Profile Information</span>
                </h2>

                {avatarSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Avatar updated successfully!</span>
                  </div>
                )}

                {avatarError && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Display name updated successfully!</span>
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
                </form>
              </div>

              {isFacultyOrStaff && (
                <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-white p-6 shadow-xs">
                  <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-indigo-600" />
                      <h2 className="text-base font-black text-stone-900">Pay Later Account</h2>
                    </div>
                    <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold text-indigo-800">
                      Faculty & Staff Benefit
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-stone-500 font-medium">Pending Dues to Pay Later</span>
                      <div className="mt-1 flex items-baseline gap-2">
                        {payLaterLoading ? (
                          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                        ) : (
                          <span className="font-mono text-2xl font-black text-stone-900 tabular-nums">
                            ₹{(pendingPayLater.total_pending / 100).toFixed(2)}
                          </span>
                        )}
                        {pendingPayLater.order_count > 0 && (
                          <span className="text-xs text-stone-500 font-semibold">
                            ({pendingPayLater.order_count} unpaid {pendingPayLater.order_count === 1 ? 'order' : 'orders'})
                          </span>
                        )}
                      </div>
                    </div>

                    {pendingPayLater.total_pending > 0 ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSettleError(null);
                          setSettleSuccess(null);
                          setShowSettleModal(true);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:opacity-95 transition active:scale-95 whitespace-nowrap"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>Settle Dues Now</span>
                      </button>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>All Dues Cleared</span>
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-[11px] text-stone-500 border-t border-indigo-100 pt-3 leading-relaxed">
                    As a verified campus faculty/staff member, you can place canteen orders without upfront payment and settle your tab anytime using your Testing Wallet balance or direct UPI.
                  </p>
                </div>
              )}

              <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-black text-stone-900 mb-4">
                  Quick Actions
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Link
                    href="/orders"
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 p-4 hover:border-orange-300 hover:bg-orange-50/40 transition"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-[#ff5e3a]">
                      <ReceiptText className="h-5 w-5" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-stone-900">
                      <span>My Orders</span>
                      <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                    </div>
                  </Link>

                  <Link
                    href="/wallet"
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 p-4 hover:border-orange-300 hover:bg-orange-50/40 transition"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-stone-900">
                      <span>Testing Wallet</span>
                      <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                    </div>
                  </Link>

                  <Link
                    href="/cart"
                    className="flex flex-col justify-between rounded-2xl border border-stone-200 p-4 hover:border-orange-300 hover:bg-orange-50/40 transition"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-stone-900">
                      <span>Food Cart</span>
                      <ArrowRight className="h-3.5 w-3.5 text-stone-400" />
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
                <h2 className="text-base font-black text-stone-900 flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-[#ff5e3a]" />
                  <span>Account Status</span>
                </h2>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-stone-500 block mb-1">Email Verification</span>
                    {isEmailVerified ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Email Confirmed</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 font-bold text-amber-800 border border-amber-200">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Unverified</span>
                        </div>
                        <div>
                          <Link
                            href={`/verify-email?email=${encodeURIComponent(user.email || '')}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ff5e3a] hover:underline"
                          >
                            <Mail className="h-3 w-3" />
                            <span>Verify your email now</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-stone-500 block mb-1">Classification</span>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 font-bold text-stone-800 border border-stone-200">
                      {accountType === 'staff' ? (
                        <>
                          <Briefcase className="h-3.5 w-3.5 text-[#ff5e3a]" />
                          <span>Faculty / Staff</span>
                        </>
                      ) : (
                        <>
                          <GraduationCap className="h-3.5 w-3.5 text-[#ff5e3a]" />
                          <span>Student</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 block mb-1">Campus Dining Platform</span>
                    <div className="flex items-center gap-1.5 text-stone-700 font-bold">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-[#ff5e3a]" />
                      <span>Cafteria CEV</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 block mb-1">Member Since</span>
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {showSettleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-600" />
                  <h3 className="text-base font-black text-stone-900">Settle Pay Later Dues</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-indigo-50/60 p-4 border border-indigo-100 text-center">
                <span className="text-xs text-indigo-900 font-semibold">Total Outstanding Balance</span>
                <p className="font-mono text-2xl font-black text-indigo-700 mt-0.5">
                  ₹{(pendingPayLater.total_pending / 100).toFixed(2)}
                </p>
                <span className="text-[11px] text-indigo-600 font-medium">
                  {pendingPayLater.order_count} pending {pendingPayLater.order_count === 1 ? 'order' : 'orders'}
                </span>
              </div>

              {settleSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{settleSuccess}</span>
                </div>
              )}

              {settleError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 font-semibold">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{settleError}</span>
                </div>
              )}

              <div className="mt-5 space-y-3">
                <span className="block text-xs font-bold text-stone-700">Choose Settlement Method</span>

                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                    settleMethod === 'wallet'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="settle_method"
                    value="wallet"
                    checked={settleMethod === 'wallet'}
                    onChange={() => setSettleMethod('wallet')}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                      <span className="flex items-center gap-1.5">
                        <Wallet className="h-4 w-4 text-emerald-600" />
                        <span>Testing Wallet</span>
                      </span>
                      <span className="font-mono text-emerald-700">
                        ₹{((walletBalance || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-normal">
                      Deduct directly from your available testing wallet credits.
                    </p>
                    {walletBalance !== null && walletBalance < pendingPayLater.total_pending && (
                      <span className="mt-1 block text-[10px] font-bold text-rose-600">
                        Insufficient wallet balance. Please use UPI or request demo credits.
                      </span>
                    )}
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 cursor-pointer transition ${
                    settleMethod === 'upi'
                      ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="settle_method"
                    value="upi"
                    checked={settleMethod === 'upi'}
                    onChange={() => setSettleMethod('upi')}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-stone-900">
                      <span className="flex items-center gap-1.5">
                        <QrCode className="h-4 w-4 text-indigo-600" />
                        <span>Pay via UPI (GPay / PhonePe / Paytm)</span>
                      </span>
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800">
                        Instant
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-stone-500 leading-normal">
                      Canteen VPA: <span className="font-mono font-bold text-stone-800">cafteria.cev@upi</span>
                    </p>
                    {settleMethod === 'upi' && (
                      <div className="mt-2.5">
                        <input
                          type="text"
                          placeholder="Optional UPI UTR / Ref Number"
                          value={upiRef}
                          onChange={(e) => setUpiRef(e.target.value)}
                          className="w-full rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-900 placeholder-stone-400 focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={settling || (settleMethod === 'wallet' && (walletBalance || 0) < pendingPayLater.total_pending)}
                  onClick={handleSettleDues}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
                >
                  {settling ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-3.5 w-3.5" />
                      <span>Confirm & Clear Dues</span>
                    </>
                  )}
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
