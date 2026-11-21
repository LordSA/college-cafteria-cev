'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { loadRazorpayScript } from '../../lib/razorpay';
import {
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  Settings,
  X,
  CreditCard,
  Pen,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const PRESET_AVATARS = [
  { id: 'avatar-1', label: 'Chef Hat', path: '/avatars/avatar-1.svg' },
  { id: 'avatar-2', label: 'Coffee Cup', path: '/avatars/avatar-2.svg' },
  { id: 'avatar-3', label: 'Campus Diner', path: '/avatars/avatar-3.svg' },
  { id: 'avatar-4', label: 'Burger Feast', path: '/avatars/avatar-4.svg' },
  { id: 'avatar-5', label: 'Fresh Snack', path: '/avatars/avatar-5.svg' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, session, loading, updateProfileInfo, updateAvatarKey, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null);

  const [pendingPayLater, setPendingPayLater] = useState<{
    total_pending: number;
    order_count: number;
    orders: any[];
  }>({ total_pending: 0, order_count: 0, orders: [] });
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState('');
  const [settling, setSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);
  const [settleSuccess, setSettleSuccess] = useState<string | null>(null);

  const isFacultyOrStaff = ['faculty', 'staff', 'staff_t'].includes(
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
      const plRes = await fetch(`${API_BASE_URL}/api/v1/orders/pay-later/pending`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (plRes.ok) {
        const plJson = await plRes.json();
        if (plJson.success && plJson.data) {
          setPendingPayLater(plJson.data);
        }
      }
    } catch { }
  };

  useEffect(() => {
    loadPayLaterData();
  }, [session, isFacultyOrStaff]);

  const handleSelectPresetAvatar = async (avatarPath: string) => {
    setUpdatingAvatar(true);
    setAvatarError(null);
    try {
      const res = await updateAvatarKey(avatarPath);
      if (!res.success) {
        throw new Error(res.error || 'Failed to update avatar');
      }
      setAvatarSuccess('Avatar updated successfully!');
      setTimeout(() => {
        setAvatarSuccess(null);
        setShowAvatarPicker(false);
        refreshProfile();
      }, 600);
    } catch (err: any) {
      setAvatarError(err.message || 'Error updating avatar');
    } finally {
      setUpdatingAvatar(false);
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

  const totalPendingRupees = (pendingPayLater.total_pending || 0) / 100;
  const parsedPayAmount = parseFloat(payAmountInput) || 0;
  const isPayAmountValid = parsedPayAmount > 0 && parsedPayAmount <= totalPendingRupees;
  const remainingDebt = Math.max(0, totalPendingRupees - parsedPayAmount);

  const openSettleModal = () => {
    setPayAmountInput(totalPendingRupees > 0 ? totalPendingRupees.toFixed(2) : '');
    setSettleError(null);
    setSettleSuccess(null);
    setShowSettleModal(true);
  };

  const handleSettleDues = async () => {
    if (!isPayAmountValid || !session?.access_token) return;
    setSettling(true);
    setSettleError(null);
    setSettleSuccess(null);

    const amountPaise = Math.round(parsedPayAmount * 100);

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded && typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Payment gateway failed to load. Please check your internet connection.');
      }

      const initRes = await fetch(`${API_BASE_URL}/api/v1/orders/pay-later/initiate-settlement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount: amountPaise }),
      });

      const initData = await initRes.json();
      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error?.message || 'Failed to initiate payment settlement');
      }

      const orderData = initData.data;

      if (orderData.razorpay_order_id && orderData.razorpay_order_id.startsWith('order_sim_')) {
        const verifyRes = await fetch(`${API_BASE_URL}/api/v1/orders/pay-later/verify-settlement`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            razorpay_order_id: orderData.razorpay_order_id,
            razorpay_payment_id: `pay_sim_${Date.now()}`,
            razorpay_signature: 'simulated_signature',
            amount: amountPaise,
          }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok || !verifyData.success) {
          throw new Error(verifyData.error?.message || 'Payment settlement failed');
        }

        setSettleSuccess(`Payment of ₹${(amountPaise / 100).toFixed(2)} received! Remaining dues: ₹${(verifyData.data.remaining_pending / 100).toFixed(2)}`);
        await loadPayLaterData();
        setTimeout(() => {
          setShowSettleModal(false);
          setSettleSuccess(null);
        }, 2000);
        return;
      }

      const options = {
        key: orderData.key_id || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'Cafteria CEV',
        description: 'Pay Later Faculty Dues Settlement',
        order_id: orderData.razorpay_order_id,
        prefill: orderData.prefill || {
          name: profile?.display_name || user?.email?.split('@')[0] || '',
          email: user?.email || '',
          contact: phoneNumber || '',
        },
        theme: { color: '#ff5e3a' },
        handler: async (resp: any) => {
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/api/v1/orders/pay-later/verify-settlement`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                amount: amountPaise,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error?.message || 'Payment verification failed');
            }

            setSettleSuccess(`Payment of ₹${(amountPaise / 100).toFixed(2)} received! Remaining dues: ₹${(verifyData.data.remaining_pending / 100).toFixed(2)}`);
            await loadPayLaterData();
            setTimeout(() => {
              setShowSettleModal(false);
              setSettleSuccess(null);
            }, 2000);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Settlement verification failed';
            setSettleError(msg);
          } finally {
            setSettling(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSettling(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setSettleError(resp.error?.description || 'Payment was cancelled or declined by your bank');
        setSettling(false);
      });
      rzp.open();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing settlement';
      setSettleError(msg);
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
      : profile?.account_type === 'staff_t'
        ? 'Teacher (Faculty)'
        : profile?.account_type === 'guest'
          ? 'Guest Diner'
          : 'Student';

  const avatarDisplayUrl = profile?.avatar_key?.startsWith('/')
    ? profile.avatar_key
    : profile?.avatar_url || (profile?.avatar_key ? `${API_BASE_URL}/api/v1/uploads/avatar?key=${profile.avatar_key}` : null);

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
                    onClick={() => setShowAvatarPicker(true)}
                    aria-label="Change profile avatar"
                    className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-stone-900 text-white shadow-md transition hover:bg-stone-800 active:scale-90 border-2 border-white"
                  >
                    <Pen className="h-4 w-4" />
                  </button>
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
                className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95 shadow-xs"
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
            <div className="rounded-3xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-indigo-50/40 dark:from-[#131525] dark:via-[#16182a] dark:to-[#121422] p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Faculty Pay Later Account
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-stone-900 dark:text-white">
                    Due Amount : ₹{((pendingPayLater.total_pending || 0) / 100).toFixed(2)}
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {pendingPayLater.order_count > 0
                      ? `${pendingPayLater.order_count} pending order(s) awaiting payment settlement`
                      : 'All past meals settled. Zero pending dues.'}
                  </p>
                </div>

                {pendingPayLater.total_pending > 0 && (
                  <button
                    type="button"
                    onClick={openSettleModal}
                    className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 transition"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Clear Dues</span>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 shadow-xs">
            <h2 className="text-base font-black text-stone-900 dark:text-white flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-[#ff5e3a]" />
              <span>Profile Information</span>
            </h2>

            {saveSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 p-3 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span>Profile details saved successfully!</span>
              </div>
            )}

            {saveError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-500/30 p-3 text-xs text-rose-800 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1" htmlFor="displayName">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-full border border-stone-300 dark:border-white/10 bg-white dark:bg-[#12131a] px-3.5 py-2.5 text-xs font-semibold text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1" htmlFor="phone">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400 dark:text-stone-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="Enter mobile number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-full border border-stone-300 dark:border-white/10 bg-white dark:bg-[#12131a] pl-9 pr-3.5 py-2.5 text-xs font-semibold text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full rounded-full border border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-white/5 px-3.5 py-2.5 text-xs text-stone-500 dark:text-stone-400 cursor-not-allowed"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Save</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </section>

        {showAvatarPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#161822] p-6 shadow-2xl border border-stone-200 dark:border-white/10 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-white">Choose Profile Avatar</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Select a preset to personalize your profile</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {avatarSuccess && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{avatarSuccess}</span>
                </div>
              )}

              {avatarError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <span>{avatarError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 py-2">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = profile?.avatar_key === av.path;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      disabled={updatingAvatar}
                      onClick={() => handleSelectPresetAvatar(av.path)}
                      className={`group relative flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border-2 transition active:scale-95 ${isSelected
                        ? 'border-[#ff5e3a] bg-orange-50 dark:bg-orange-950/30 shadow-xs'
                        : 'border-stone-200 dark:border-white/10 hover:border-orange-300 dark:hover:border-orange-500/50 hover:bg-stone-50 dark:hover:bg-white/5'
                        }`}
                    >
                      <div className="h-14 w-14 rounded-full overflow-hidden bg-white dark:bg-white/10 border border-stone-200 dark:border-white/10 p-1 flex items-center justify-center">
                        <img
                          src={av.path}
                          alt={av.label}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 group-hover:text-[#ff5e3a] truncate max-w-full">
                        {av.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#ff5e3a] text-white shadow-xs">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowAvatarPicker(false)}
                  disabled={updatingAvatar}
                  className="rounded-xl border border-stone-300 dark:border-white/10 bg-white dark:bg-[#161822] px-4 py-2 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {showSettleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#161822] p-6 shadow-2xl border border-stone-200 dark:border-white/10 space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#ff5e3a]" />
                  <h3 className="text-base font-bold text-stone-900 dark:text-white">Settle Pay Later Dues</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 hover:text-stone-600 dark:hover:text-stone-200 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl bg-orange-50/70 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-500/30 p-4 text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#ff5e3a] dark:text-orange-400">
                  Total Outstanding Dues
                </span>
                <p className="mt-1 font-mono text-3xl font-extrabold text-stone-900 dark:text-white">
                  ₹{totalPendingRupees.toFixed(2)}
                </p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  Across {pendingPayLater.order_count} pending meal order(s)
                </p>
              </div>

              {settleSuccess && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>{settleSuccess}</span>
                </div>
              )}

              {settleError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                  <span>{settleError}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                  Enter Payment Amount
                </label>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-base font-bold text-stone-500">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={totalPendingRupees}
                    value={payAmountInput}
                    onChange={(e) => setPayAmountInput(e.target.value)}
                    placeholder="Enter amount to pay"
                    className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#12131a] pl-8 pr-4 py-3 text-base font-mono font-bold text-stone-900 dark:text-white placeholder-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPayAmountInput(totalPendingRupees.toFixed(2))}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                      parsedPayAmount === totalPendingRupees
                        ? 'border-[#ff5e3a] bg-[#ff5e3a] text-white'
                        : 'border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:border-orange-300'
                    }`}
                  >
                    Pay Full (₹{totalPendingRupees.toFixed(2)})
                  </button>
                  {[500, 200, 100, 50]
                    .filter((val) => val < totalPendingRupees)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setPayAmountInput(val.toString())}
                        className={`rounded-full px-3 py-1 text-[11px] font-bold border transition ${
                          parsedPayAmount === val
                            ? 'border-[#ff5e3a] bg-[#ff5e3a] text-white'
                            : 'border-stone-200 dark:border-white/10 bg-stone-100 dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:border-orange-300'
                        }`}
                      >
                        ₹{val}
                      </button>
                    ))}
                </div>

                <div className="rounded-xl bg-stone-50 dark:bg-white/5 p-3 flex items-center justify-between text-xs">
                  <span className="text-stone-500 dark:text-stone-400 font-medium">Remaining Debt:</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-white">
                    ₹{remainingDebt.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleSettleDues}
                  disabled={settling || !isPayAmountValid}
                  className="flex-1 rounded-2xl bg-gradient-to-r from-[#ff5e3a] to-[#ff7844] py-3.5 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {settling ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <span>Pay ₹{isPayAmountValid ? parsedPayAmount.toFixed(2) : '0.00'} Online</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettleModal(false)}
                  disabled={settling}
                  className="rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] px-4 py-3.5 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/5 transition"
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
