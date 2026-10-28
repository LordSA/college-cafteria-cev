'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { supabase } from '../../lib/supabase';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password || !confirmPassword) {
      setError('Please provide both password fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must contain at least 6 characters');
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
    } catch (err: any) {
      setError(err.message || 'Failed to update administrator credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#101114] text-slate-100 min-h-screen">
        <div className="w-full max-w-md space-y-6 bg-[#17181f] p-8 rounded-3xl border border-[#22242e] shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5a4c6]/15 border border-[#f5a4c6]/30 text-[#f5a4c6]">
              <Lock className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6] block mt-4">
              ALEXATEL • Password Update
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Update Admin Password</h1>
            <p className="mt-1 text-xs text-stone-400">
              Set new access credentials for canteen administration
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>Password successfully updated! Redirecting to login...</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="password">
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
                className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-4 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="confirmPassword">
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
                className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-4 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
              />
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-full bg-[#f5a4c6] px-4 py-3 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 disabled:opacity-50 transition active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating credentials...</span>
                </>
              ) : (
                <>
                  <span>Save New Credentials</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-[#22242e]">
            <Link
              href="/login"
              className="text-xs font-bold text-stone-400 hover:text-white transition"
            >
              Back to Administrator Login
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
