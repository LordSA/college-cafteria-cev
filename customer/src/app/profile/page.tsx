'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Lock,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Camera,
  Clock,
  XCircle,
  Mail,
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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: any) {
      setAvatarError(err.message || 'Avatar upload failed');
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

  const accountType = profile?.approved_account_type || profile?.account_type || 'student';
  const staffStatus = profile?.staff_approval_status || 'not_requested';
  const appRole = profile?.app_role || 'customer';
  const isEmailVerified = Boolean(user.email_confirmed_at);

  return (
    <>
      <Header />
      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">Account Profile</h1>
              <p className="mt-1 text-xs text-stone-500">Manage your dining profile, verification, and credentials</p>
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
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-2 mb-6">
                  <User className="h-4 w-4 text-amber-600" />
                  <span>Profile Picture & Details</span>
                </h2>

                <div className="flex items-center gap-5 pb-6 mb-6 border-b border-stone-100">
                  <div className="relative group">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-stone-100 border-2 border-stone-200 flex items-center justify-center">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-stone-400" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-0 right-0 rounded-full bg-amber-600 p-1.5 text-white shadow hover:bg-amber-700 disabled:opacity-50 transition"
                      title="Upload new picture"
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
                    <h3 className="text-sm font-bold text-stone-900">{profile?.display_name || 'Campus Diner'}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{user.email}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {uploadingAvatar ? 'Uploading avatar...' : 'Change avatar (Max 2MB)'}
                    </button>
                  </div>
                </div>

                {avatarSuccess && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span>Avatar updated successfully!</span>
                  </div>
                )}

                {avatarError && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                    <span>{avatarError}</span>
                  </div>
                )}

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
                  <span>Security & Verification</span>
                </h2>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-stone-500 block mb-1">Email Verification</span>
                    {isEmailVerified ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Email Confirmed</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 font-medium text-amber-800 border border-amber-200">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                          <span>Unverified</span>
                        </div>
                        <div>
                          <Link
                            href={`/verify-email?email=${encodeURIComponent(user.email || '')}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-800 underline"
                          >
                            <Mail className="h-3 w-3" />
                            <span>Verify your inbox now</span>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>

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

                  {profile?.requested_account_type === 'staff' && (
                    <div>
                      <span className="text-stone-500 block mb-1">Staff Verification Status</span>
                      {staffStatus === 'pending' && (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 font-medium text-amber-800 border border-amber-200">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          <span>Pending Admin Review</span>
                        </div>
                      )}
                      {staffStatus === 'approved' && (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>Staff Approved</span>
                        </div>
                      )}
                      {staffStatus === 'rejected' && (
                        <div className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 font-medium text-rose-800 border border-rose-200">
                          <XCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>Staff Request Rejected</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <span className="text-stone-500 block mb-1">Platform Privilege</span>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2.5 py-1 font-medium text-stone-800 border border-stone-200">
                      <Lock className="h-3.5 w-3.5 text-stone-400" />
                      <span className="capitalize">{appRole}</span>
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
        </div>
      </main>
      <Footer />
    </>
  );
}
