'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth, AccountType } from '../../context/AuthContext';
import { UserPlus, AlertCircle, Loader2, GraduationCap, Briefcase, CheckSquare, Square, UtensilsCrossed, ArrowRight } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading, signUp } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string>('/profile');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const red = params.get('redirect');
      if (red) {
        setRedirectPath(red);
      }
    }
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectPath);
    }
  }, [user, loading, router, redirectPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!displayName.trim() || !email || !password || !confirmPassword) {
      setFormError('Please complete all required fields');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters in length');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }

    if (!acceptedTerms) {
      setFormError('You must accept the Canteen Usage Terms to proceed');
      return;
    }

    setSubmitting(true);
    const result = await signUp({
      displayName: displayName.trim(),
      email,
      password,
      accountType,
    });
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Registration failed. Please try again.');
    } else {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#fafaf9]">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-900">
              Join Cafteria CEV
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Create an account for queue-free digital dining
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="displayName">
                Full Name
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Rohan Sharma"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="email">
                College Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Campus Classification
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('student')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                    accountType === 'student'
                      ? 'border-[#ff5e3a] bg-orange-50 text-[#ff5e3a] shadow-xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <GraduationCap className="h-4 w-4" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('staff')}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition ${
                    accountType === 'staff'
                      ? 'border-[#ff5e3a] bg-orange-50 text-[#ff5e3a] shadow-xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <Briefcase className="h-4 w-4" />
                  <span>Faculty / Staff</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                />
              </div>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className="flex items-start gap-2 text-left text-xs text-stone-600"
              >
                {acceptedTerms ? (
                  <CheckSquare className="h-4 w-4 text-[#ff5e3a] flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 text-stone-300 flex-shrink-0 mt-0.5" />
                )}
                <span>
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#ff5e3a] font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                    Terms & Conditions
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[#ff5e3a] font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                    Privacy Policy
                  </Link>
                </span>
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="border-t border-stone-100 pt-4 text-center">
            <p className="text-xs text-stone-500">
              Already have an account?{' '}
              <Link
                href={`/login${redirectPath !== '/profile' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
                className="font-bold text-[#ff5e3a] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
