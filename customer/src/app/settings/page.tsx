'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
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
  Building2,
  Check,
  Link as LinkIcon,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, session, loading, signOut, refreshProfile } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [teacherId, setTeacherId] = useState('');
  const [teacherIdLoading, setTeacherIdLoading] = useState(false);
  const [teacherIdSuccess, setTeacherIdSuccess] = useState<string | null>(null);
  const [teacherIdError, setTeacherIdError] = useState<string | null>(null);

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [googleSuccess, setGoogleSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile?.teacher_id) {
      setTeacherId(profile.teacher_id);
    }
  }, [profile]);

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
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSaveTeacherId = async (e: FormEvent) => {
    e.preventDefault();
    setTeacherIdError(null);
    setTeacherIdSuccess(null);

    const trimmed = teacherId.trim().toUpperCase();
    if (!trimmed) {
      setTeacherIdError('Please enter your Teacher ID');
      return;
    }

    const validFormat = /^[A-Za-z0-9\-_]{3,20}$/.test(trimmed);
    if (!validFormat) {
      setTeacherIdError('Teacher ID must be 3–20 alphanumeric characters (letters, numbers, hyphens, underscores)');
      return;
    }

    setTeacherIdLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/me/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          teacher_id: trimmed,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to save Teacher ID');
      }

      setTeacherIdSuccess('Teacher ID saved and submitted for administrator verification!');
      refreshProfile();
      setTimeout(() => setTeacherIdSuccess(null), 4000);
    } catch (err: any) {
      setTeacherIdError(err.message || 'Failed to save Teacher ID');
    } finally {
      setTeacherIdLoading(false);
    }
  };

  const handleLinkGoogle = async () => {
    setGoogleLoading(true);
    setGoogleError(null);
    setGoogleSuccess(null);
    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/settings` : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
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
        <main className="flex-1 flex items-center justify-center py-20 pb-28 md:pb-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#ff5e3a]" />
        </main>
        <Footer />
      </>
    );
  }

  const isGoogleLinked =
    (user as any)?.identities?.some((id: any) => id.provider === 'google') ||
    (user as any)?.app_metadata?.providers?.includes('google');

  const approvalStatus = profile?.staff_approval_status || 'not_requested';
  const isApprovedFaculty = approvalStatus === 'approved';
  const isPendingFaculty = approvalStatus === 'pending';

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-stone-50/50 pb-28 md:pb-12">
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-5">
            <div>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#ff5e3a] transition mb-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back to Profile</span>
              </Link>
              <h1 className="text-2xl font-black tracking-tight text-stone-900">
                Account Settings
              </h1>
              <p className="mt-1 text-xs text-stone-500">
                Manage your credentials, security preferences, and official campus affiliations
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <User className="h-4 w-4 text-[#ff5e3a]" />
              <h2 className="text-sm font-bold text-stone-900">Account Information</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <span className="text-stone-400 font-medium">Email Address</span>
                <p className="font-bold text-stone-900 mt-0.5">{user.email}</p>
              </div>

              <div>
                <span className="text-stone-400 font-medium">Account Role</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-bold text-stone-900 capitalize">
                    {profile?.account_type || 'Student'}
                  </span>
                  <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-[#ff5e3a] uppercase">
                    {profile?.app_role || 'Customer'}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[#ff5e3a]" />
                    <span>Official Teacher ID</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Faculty identifier used to verify campus dining benefits and Pay Later eligibility.
                  </p>
                </div>

                {isApprovedFaculty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Faculty
                  </span>
                ) : isPendingFaculty ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    Pending Verification
                  </span>
                ) : null}
              </div>

              {teacherIdSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{teacherIdSuccess}</span>
                </div>
              )}

              {teacherIdError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{teacherIdError}</span>
                </div>
              )}

              <form onSubmit={handleSaveTeacherId} className="flex gap-2">
                <input
                  type="text"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  placeholder="e.g. CEV-T-1042"
                  maxLength={20}
                  className="flex-1 rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                />
                <button
                  type="submit"
                  disabled={teacherIdLoading}
                  className="rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-stone-800 transition disabled:opacity-50"
                >
                  {teacherIdLoading ? 'Saving...' : 'Save ID'}
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200/80 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Shield className="h-4 w-4 text-[#ff5e3a]" />
              <h2 className="text-sm font-bold text-stone-900">Account Security</h2>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-[#ff5e3a]" />
                  <span>Change Password</span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Set a new password for signing into your Cafteria customer account.
                </p>
              </div>

              {passwordSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1" htmlFor="newPassword">
                      New Password
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1" htmlFor="confirmPassword">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="w-full rounded-xl border border-stone-300 px-3.5 py-2 text-xs text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] px-4 py-2 text-xs font-bold text-white shadow-xs hover:opacity-95 transition disabled:opacity-50"
                >
                  {passwordLoading ? 'Updating Password...' : 'Update Password'}
                </button>
              </form>
            </div>

            <div className="border-t border-stone-100 pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-[#ff5e3a]" />
                    <span>Google Account Binding</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Link your college Google account for single click sign-in.
                  </p>
                </div>

                {isGoogleLinked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                    <Check className="h-3 w-3" />
                    Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleLinkGoogle}
                    disabled={googleLoading}
                    className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition shadow-xs disabled:opacity-50"
                  >
                    {googleLoading ? 'Connecting...' : 'Link Google'}
                  </button>
                )}
              </div>

              {googleSuccess && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                  <span>{googleSuccess}</span>
                </div>
              )}

              {googleError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                  <span>{googleError}</span>
                </div>
              )}
            </div>

            <div className="border-t border-stone-100 pt-5 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-stone-900">Sign Out</h3>
                <p className="text-[11px] text-stone-500">Sign out of this browser session.</p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
