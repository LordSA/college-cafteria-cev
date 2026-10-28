'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { supabase } from '../../lib/supabase';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters in length');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw updateError;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update password. Session may have expired.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 bg-[#fafaf9]">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-900">
              Set New Password
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Choose a secure password with at least 6 characters
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Password updated successfully! Redirecting to login...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="password">
                New Password (min. 6 characters)
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="confirmPassword">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <span>Save New Password</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-stone-100">
            <Link
              href="/login"
              className="text-xs font-bold text-[#ff5e3a] hover:underline"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
