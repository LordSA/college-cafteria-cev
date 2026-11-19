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
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-[#EEEEEE] shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7F0] text-[#F47721] border border-[#F47721]/30 shadow-xs">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721] block mt-4">
              Cafeteria.cev
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525]">Operations Sign In</h1>
            <p className="mt-1 text-xs text-[#666666]">Management & Kitchen Operations Portal</p>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-left">
            <div className="flex items-start gap-2.5">
              <Lock className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-amber-800">
                Restricted portal. Administrative accounts are provisioned exclusively through authorized university backend channels.
              </p>
            </div>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-[#D94A43]">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43] mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="email">
                Administrator Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@college.edu"
                className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-4 py-2.5 text-sm text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#252525]" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-bold text-[#F47721] hover:underline"
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
                className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-4 py-2.5 text-sm text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] py-3 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition active:scale-95"
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

          <div className="text-center pt-2 border-t border-[#EEEEEE]">
            <p className="text-[11px] text-[#666666]">
              Need customer ordering?{' '}
              <a href="http://localhost:3000" className="text-[#F47721] hover:underline font-bold">
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
