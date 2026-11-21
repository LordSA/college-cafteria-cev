'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, AccountType } from '../../context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { AlertCircle, Loader2, GraduationCap, Briefcase, Globe, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const { user, loading, signUp, signInWithGoogle } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const { activeTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>('student');
  const [teacherId, setTeacherId] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string>('/');

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!displayName.trim() || !email || !password || !confirmPassword) {
      setFormError('Please complete all required fields');
      return;
    }

    if (accountType === 'staff_t') {
      const trimmedTid = teacherId.trim();
      if (!trimmedTid) {
        setFormError('Teacher ID is required for faculty/teacher registration');
        return;
      }
      if (trimmedTid.length < 3 || trimmedTid.length > 20) {
        setFormError('Teacher ID must be between 3 and 20 characters');
        return;
      }
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
      teacherId: accountType === 'staff_t' ? teacherId.trim().toUpperCase() : undefined,
    });
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Registration failed. Please try again.');
    } else {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    }
  };

  const handleGoogleSignUp = async () => {
    setFormError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.success) {
      setFormError(result.error || 'Google sign-up failed');
    }
  };

  return (
    <main className="h-[100dvh] overflow-hidden flex flex-col lg:flex-row bg-[#fafaf9] dark:bg-[#0d0e12] transition-colors duration-200">
      <div className="w-full h-full lg:w-[45%] xl:w-[40%] flex flex-col justify-between px-6 py-4 sm:px-10 sm:py-6 lg:px-12 lg:py-6 bg-white dark:bg-[#161820] lg:border-r border-stone-200/80 dark:border-white/10 overflow-y-auto lg:overflow-hidden">

        <div className="flex items-center shrink-0">
          <Link href="/" className="inline-flex items-center">
            <img
              src={activeTheme === 'dark' ? '/logo/logo_clr.svg' : '/logo/logo_clr.svg'}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
            <img
              src={activeTheme === 'dark' ? '/logo title.svg' : '/lg_title_blk.svg'}
              alt="title"
              className="px-3 pt-2 h-8 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="w-full max-w-sm mx-auto my-auto py-2 space-y-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 dark:text-white">
              Get started
            </h1>
            <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mt-0.5">
              Create a new account
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-2 text-[11px] text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleSignUp}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-2xl bg-stone-50/60 dark:bg-white/[0.04] border border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200 font-bold text-xs hover:bg-stone-100/80 dark:hover:bg-white/[0.08] transition active:scale-95 disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#ff5e3a]" />
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200 dark:bg-white/10" />
              <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                or
              </span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-white/10" />
            </div>
          </div>

          <form className="space-y-2" onSubmit={handleSubmit}>
            <div>
              <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1" htmlFor="displayName">
                Full Name
              </label>
              <input
                id="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu"
                className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1">
                Campus Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountType('student')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-xs font-bold transition active:scale-95 ${accountType === 'student'
                    ? 'border-[#ff5e3a] bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 text-[#ff5e3a] shadow-xs'
                    : 'border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-300'
                    }`}
                >
                  <GraduationCap className="h-3.5 w-3.5" />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('staff_t')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-xs font-bold transition active:scale-95 ${accountType === 'staff_t'
                    ? 'border-[#ff5e3a] bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 text-[#ff5e3a] shadow-xs'
                    : 'border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-300'
                    }`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Teacher</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('guest')}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-1.5 px-2 text-xs font-bold transition active:scale-95 ${accountType === 'guest'
                    ? 'border-[#ff5e3a] bg-[#ff5e3a]/10 dark:bg-[#ff5e3a]/15 text-[#ff5e3a] shadow-xs'
                    : 'border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-white/[0.03] text-stone-600 dark:text-stone-300'
                    }`}
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Guest</span>
                </button>
              </div>
            </div>

            {accountType === 'staff_t' && (
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1" htmlFor="teacherId">
                  Teacher ID
                </label>
                <input
                  id="teacherId"
                  type="text"
                  required
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value.toUpperCase())}
                  placeholder="e.g. CEV-FAC-102"
                  className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-3.5 py-2 pr-9 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-500 dark:text-stone-400 mb-1" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
                />
              </div>
            </div>

            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className="flex items-start gap-2 text-left text-xs text-stone-600 dark:text-stone-400"
              >
                {acceptedTerms ? (
                  <CheckSquare className="h-4 w-4 text-[#ff5e3a] flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 text-stone-300 dark:text-stone-600 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-[11px] leading-snug">
                  I agree to the{' '}
                  <Link href="/terms" className="text-[#ff5e3a] font-bold hover:underline" onClick={(e) => e.stopPropagation()}>
                    Terms
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
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#ff5e3a] hover:bg-[#ff4b4b] py-2.5 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/25 transition active:scale-95 disabled:opacity-50 mt-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-[#ff5e3a] hover:underline"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="hidden sm:block" />
      </div>

      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] h-full relative overflow-hidden bg-stone-100 dark:bg-[#0d0e12]">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
          alt="Freshly prepared canteen meals"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
    </main>
  );
}