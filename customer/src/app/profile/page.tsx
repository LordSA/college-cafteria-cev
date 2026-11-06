'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  User,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Phone,
  CreditCard,
  QrCode,
  X,
  Wallet,
  Settings,
  Link as LinkIcon,
  Check,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

const PRESET_AVATARS = [
  { id: '/avatars/avatar-1.svg', name: 'Student' },
  { id: '/avatars/avatar-2.svg', name: 'Scholar' },
  { id: '/avatars/avatar-3.svg', name: 'Chef' },
  { id: '/avatars/avatar-4.svg', name: 'Foodie' },
  { id: '/avatars/avatar-5.svg', name: 'Coffee' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, session, loading, signOut, updateProfileInfo, updateAvatarKey, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('/avatars/avatar-1.svg');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [bindingGoogle, setBindingGoogle] = useState(false);
  const [googleSuccess, setGoogleSuccess] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);

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
    if (profile?.phone) {
      setPhoneNumber(profile.phone);
    } else if (user?.user_metadata?.phone) {
      setPhoneNumber(user.user_metadata.phone);
    }
    if (profile?.avatar_key && PRESET_AVATARS.some((a) => a.id === profile.avatar_key)) {
      setSelectedAvatar(profile.avatar_key);
    }
  }, [profile, user]);

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

  const handleSelectAvatar = async (avatarId: string) => {
    setSelectedAvatar(avatarId);
    try {
      await updateAvatarKey(avatarId);
    } catch {}
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

  const handleBindGoogle = async () => {
    setBindingGoogle(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) {
        throw error;
      }
      setGoogleSuccess('Redirecting to Google authorization...');
    } catch (err: any) {
      setGoogleError(err.message || 'Failed to initiate Google account link');
    } finally {
      setBindingGoogle(false);
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
            <p className="text-xs font-semibold">Loading profile...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const roleLabel =
    profile?.app_role === 'admin'
      ? 'Administrator'
      : profile?.account_type === 'staff' || profile?.approved_account_type === 'staff'
      ? 'Faculty / Staff'
      : 'Student';

  const isGoogleLinked =
    (user as any)?.identities?.some((id: any) => id.provider === 'google') ||
    (user as any)?.app_metadata?.providers?.includes('google');

  return (
    <>
      <Header />
      <main className="flex-1 pb-28 md:pb-16">
        <section className="bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] py-10 text-white shadow-md">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center shadow-md p-1 bg-white">
                <img
                  src={selectedAvatar}
                  alt={displayName || 'Avatar'}
                  className="h-full w-full object-contain rounded-full"
                />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {displayName || 'Diner'}
                </h1>
                <div className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#ff5e3a] shadow-xs">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-black text-stone-900 mb-2">Choose Avatar</h2>
            <p className="text-xs text-stone-500 mb-4">Select an avatar representation for your campus account.</p>
            <div className="grid grid-cols-5 gap-3 max-w-md">
              {PRESET_AVATARS.map((avatar) => {
                const isSelected = selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => handleSelectAvatar(avatar.id)}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border-2 transition active:scale-95 ${
                      isSelected
                        ? 'border-[#ff5e3a] bg-orange-50/50 shadow-xs'
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                    }`}
                  >
                    <div className="h-12 w-12 rounded-full overflow-hidden bg-white p-1 border border-stone-100 flex items-center justify-center">
                      <img src={avatar.id} alt={avatar.name} className="h-full w-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-stone-700">{avatar.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-[#ff5e3a]" />
              <span>Profile Information</span>
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

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-black text-stone-900 flex items-center gap-2 mb-4">
              <Settings className="h-4 w-4 text-[#ff5e3a]" />
              <span>Settings & Connected Accounts</span>
            </h2>

            {googleSuccess && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{googleSuccess}</span>
              </div>
            )}

            {googleError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <span>{googleError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center">
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900">Google Account</h3>
                  <p className="text-[11px] text-stone-500">
                    {isGoogleLinked
                      ? 'Your campus Google account is linked for single click sign-in.'
                      : 'Bind your Google account with this email for quick sign-in.'}
                  </p>
                </div>
              </div>

              <div>
                {isGoogleLinked ? (
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Connected</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleBindGoogle}
                    disabled={bindingGoogle}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-bold text-stone-800 shadow-xs hover:bg-stone-50 disabled:opacity-50 transition active:scale-95"
                  >
                    {bindingGoogle ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <LinkIcon className="h-3.5 w-3.5" />
                    )}
                    <span>Bind Google Account</span>
                  </button>
                )}
              </div>
            </div>
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
            </div>
          )}

          <div className="pt-4 border-t border-stone-200 flex justify-center">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm px-8 py-3.5 shadow-md shadow-red-500/20 transition active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
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
