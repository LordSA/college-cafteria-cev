'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  Shield,
  GraduationCap,
  Briefcase,
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, signOut, updateDisplayName } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleUpdate = async (e: React.FormEvent) => {
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

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading || !user) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
            <p className="text-xs font-medium">Verifying account credentials...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const accountType = profile?.account_type || 'student';
  const appRole = profile?.app_role || 'customer';

  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">Account Profile</h1>
              <p className="mt-1 text-xs text-stone-500">Manage your dining profile and campus credentials</p>
            </div>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 hover:text-rose-700 transition"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="md:col-span-2 space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
                  <User className="h-4 w-4 text-amber-600" />
                  <span>Personal Details</span>
                </h2>

                {saveSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Display name updated successfully!</span>
                  </div>
                )}

                {saveError && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{saveError}</span>
                  </div>
                )}

                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="displayName">
                      Display Name
                    </label>
                    <input
                      id="displayName"
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full rounded-lg border border-stone-300 px-3.5 py-2 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="email">
                      College Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      disabled
                      value={user.email || ''}
                      className="w-full rounded-lg border border-stone-200 bg-stone-100 px-3.5 py-2 text-sm text-stone-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-[11px] text-stone-400">Email is tied to your university authentication record.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition"
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
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-4">
                  <Shield className="h-4 w-4 text-amber-600" />
                  <span>Security & Roles</span>
                </h2>

                <div className="space-y-3.5 text-xs">
                  <div>
                    <span className="text-stone-500 block mb-1">Account Classification</span>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 font-medium text-stone-800 border border-stone-200">
                      {accountType === 'staff' ? (
                        <>
                          <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                          <span>Faculty / Staff</span>
                        </>
                      ) : (
                        <>
                          <GraduationCap className="h-3.5 w-3.5 text-amber-600" />
                          <span>Student</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 block mb-1">Platform Privilege</span>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 font-medium text-stone-800 border border-stone-200">
                      <Lock className="h-3.5 w-3.5 text-stone-400" />
                      <span className="capitalize">{appRole}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-stone-500 block mb-1">Account Created</span>
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <Calendar className="h-3.5 w-3.5 text-stone-400" />
                      <span>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <div className="rounded-lg bg-amber-50/70 p-3 border border-amber-200/60">
                      <div className="flex items-start gap-2">
                        <Lock className="h-3.5 w-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-amber-900">
                          Role and account classifications are guarded by Supabase Row Level Security (RLS) triggers.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
