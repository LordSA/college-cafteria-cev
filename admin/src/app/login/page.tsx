'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldCheck, AlertCircle, Loader2, Lock } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminUser, adminProfile, isUnauthorized, loading, signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) {
      if (adminUser && adminProfile?.app_role === 'admin') {
        router.push('/');
      } else if (adminUser && isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, adminProfile, isUnauthorized, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      setFormError('Please enter both administrator email and password');
      return;
    }

    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);

    if (!result.success) {
      if (result.isUnauthorized) {
        router.push('/unauthorized');
      } else {
        setFormError(result.error || 'Authentication failed. Please verify credentials.');
      }
    } else {
      router.push('/');
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="w-full max-w-md space-y-8 bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Cafteria Admin</h1>
            <p className="mt-1 text-xs text-slate-400">Management & Kitchen Operations Sign In</p>
          </div>

          <div className="rounded-lg bg-amber-950/40 border border-amber-800/60 p-3 text-left">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-200">
                Restricted portal. Administrative accounts are provisioned exclusively through authorized university backend channels.
              </p>
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="email">
                Administrator Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@college.edu"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-medium text-indigo-400 hover:text-indigo-300"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                'Access Operations Portal'
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800">
            <p className="text-[11px] text-slate-500">
              Need customer ordering?{' '}
              <a href="http://localhost:3000" className="text-indigo-400 hover:text-indigo-300 font-medium">
                Switch to Customer Portal
              </a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
