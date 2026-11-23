'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Shield,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  User,
  Link as LinkIcon,
  X,
  Smartphone,
  Moon,
  Sun,
  Palette,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();
  const { themeMode, setThemeMode } = useTheme();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSuccess, setGoogleSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters in length');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setPasswordSuccess('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess(null);
        setShowPasswordModal(false);
      }, 1200);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setGoogleError(null);
    setGoogleSuccess(null);
    setGoogleLoading(true);

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/settings` : undefined;
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
      setGoogleSuccess('Redirecting to Google authorization...');
    } catch (err: any) {
      setGoogleError(err.message || 'Failed to connect Google account');
      setGoogleLoading(false);
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
        <main className="flex-1 flex items-center justify-center py-20 pb-28 md:pb-12 bg-[#fafaf9] dark:bg-[#0d0e12]">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
        </main>
        <Footer />
      </>
    );
  }

  const isGoogleLinked =
    (user as any)?.identities?.some((id: any) => id.provider === 'google') ||
    (user as any)?.app_metadata?.providers?.includes('google');

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-stone-50/50 dark:bg-[#0d0e12] pb-28 md:pb-12 transition-colors duration-200">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-white/10 pb-5">
            <div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-[#ff5e3a] transition mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Profile</span>
              </Link>
              <h1 className="text-2xl font-black tracking-tight text-stone-900 dark:text-white">
                Account Settings
              </h1>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-[#161820]/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-[#ff5e3a]" />
                <h2 className="text-sm font-bold text-stone-900 dark:text-white">Theme</h2>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setThemeMode('device')}
                className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-full border transition active:scale-95 ${themeMode === 'device'
                  ? 'border-[#ff5e3a] bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 text-[#ff5e3a] font-bold shadow-xs'
                  : 'border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-300 hover:border-stone-300 dark:hover:border-white/20'
                  }`}
              >
                <Smartphone className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('dark')}
                className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-full border transition active:scale-95 ${themeMode === 'dark'
                  ? 'border-[#ff5e3a] bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 text-[#ff5e3a] font-bold shadow-xs'
                  : 'border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-300 hover:border-stone-300 dark:hover:border-white/20'
                  }`}
              >
                <Moon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={() => setThemeMode('light')}
                className={`flex flex-col items-center justify-center gap-1 p-3.5 rounded-full border transition active:scale-95 ${themeMode === 'light'
                  ? 'border-[#ff5e3a] bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 text-[#ff5e3a] font-bold shadow-xs'
                  : 'border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-300 hover:border-stone-300 dark:hover:border-white/20'
                  }`}
              >
                <Sun className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-[#161820]/80 backdrop-blur-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-stone-100 dark:border-white/10 pb-3">
              <User className="h-4 w-4 text-[#ff5e3a]" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Account Information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-stone-400 dark:text-stone-500 font-medium">Email Address</span>
                <p className="font-bold text-stone-900 dark:text-white mt-0.5">{user.email}</p>
              </div>

              <div>
                <span className="text-stone-400 dark:text-stone-500 font-medium">Role</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-bold text-stone-900 dark:text-white capitalize">
                    {profile?.account_type === 'staff_t' ? 'Teacher / Faculty' : profile?.account_type === 'guest' ? 'Guest Diner' : 'Student'}
                  </span>
                  <span className="rounded-full bg-orange-100 dark:bg-orange-950/40 px-2 py-0.5 text-[10px] font-bold text-[#ff5e3a] uppercase">
                    {profile?.app_role || 'Customer'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 dark:border-white/10 bg-white/85 dark:bg-[#161820]/80 backdrop-blur-xl p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-stone-100 dark:border-white/10 pb-3">
              <Shield className="h-4 w-4 text-[#ff5e3a]" />
              <h2 className="text-sm font-bold text-stone-900 dark:text-white">Security</h2>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <span>Change Password</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Update your account password
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setNewPassword('');
                    setConfirmPassword('');
                    setShowPasswordModal(true);
                  }}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 transition active:scale-95 self-start sm:self-auto"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Change Password</span>
                </button>
              </div>
            </div>

            <div className="border-t border-stone-100 dark:border-white/10 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 dark:text-white flex items-center gap-1.5">
                    <span>Google Account Binding</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Link your Google account
                  </p>
                </div>

                {isGoogleLinked ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                    <LinkIcon className="h-2.5 w-2.5 text-emerald-800" />
                    Binded
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkGoogle}
                    disabled={googleLoading}
                    className="rounded-full border border-stone-300 dark:border-white/20 bg-white dark:bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.08] transition shadow-xs disabled:opacity-50"
                  >
                    {googleLoading ? 'Connecting...' : 'Link Google'}
                  </button>
                )}
              </div>

              {googleSuccess && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{googleSuccess}</span>
                </div>
              )}

              {googleError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 dark:border-white/10 pt-5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-stone-900 dark:text-white">Sign Out</h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">Sign out of this browser session.</p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition shadow-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#161820] border border-stone-200 dark:border-white/10 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-stone-900 dark:text-white">Change Account Password</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Set a new password for signing into Cafeteria CEV</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="rounded-full p-1 text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {passwordSuccess && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-2.5 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1" htmlFor="modalNewPassword">
                    New Password
                  </label>
                  <input
                    id="modalNewPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full rounded-xl border border-stone-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-700 dark:text-stone-300 mb-1" htmlFor="modalConfirmPassword">
                    Confirm New Password
                  </label>
                  <input
                    id="modalConfirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type password"
                    className="w-full rounded-xl border border-stone-300 dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-2.5 text-xs text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-2.5 text-xs font-bold text-white shadow-xs hover:opacity-95 disabled:opacity-50 transition"
                  >
                    {passwordLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Password</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={passwordLoading}
                    className="rounded-xl border border-stone-300 dark:border-white/20 px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-white/[0.08] transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
