'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { adminUser, adminProfile, isUnauthorized, loading, signIn } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-[#EEEEEE] shadow-sm">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900 dark:text-white leading-[1.1]">
              <img src="/logo/logo_clr.svg" alt="icon" className="h-16 w-full object-contain drop-shadow-md" />
              <img
                src='/lg_title_blk.svg'
                alt="Cafeteria CEV title"
                className="mt-4 h-6 w-full object-contain drop-shadow-md"
              />
            </h1>
            <h1 className="mt-6 text-2xl font-black tracking-tight text-[#252525]">Sign In</h1>
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
                Email Address
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

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-4 py-2.5 pr-12 text-sm text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#F47721] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] py-3 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
