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
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#101114]">
        <div className="w-full max-w-md space-y-6 bg-[#17181f] p-8 rounded-3xl border border-[#22242e] shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5a4c6]/15 text-[#f5a4c6] border border-[#f5a4c6]/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6] block mt-4">
              ALEXATEL • Cafteria
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Operations Sign In</h1>
            <p className="mt-1 text-xs text-stone-400">Management & Kitchen Operations Portal</p>
          </div>

          <div className="rounded-2xl bg-amber-950/20 border border-amber-800/40 p-3.5 text-left">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-200">
                Restricted portal. Administrative accounts are provisioned exclusively through authorized university backend channels.
              </p>
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="email">
                Administrator Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@college.edu"
                className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-300" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-[#f5a4c6] hover:opacity-80"
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
                className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] px-4 py-2.5 text-sm text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#f5a4c6] py-3 text-xs font-black text-[#101114] shadow-lg shadow-[#f5a4c6]/20 hover:opacity-90 disabled:opacity-50 transition active:scale-95"
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

          <div className="text-center pt-2 border-t border-[#22242e]">
            <p className="text-[11px] text-stone-400">
              Need customer ordering?{' '}
              <a href="http://localhost:3000" className="text-[#9d8bf0] hover:underline font-bold">
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
