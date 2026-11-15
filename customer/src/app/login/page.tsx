'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (!email || !password) {
      setFormError('Please enter both your email and password');
      return;
    }

    setSubmitting(true);
    const result = await signIn({ email, password });
    setSubmitting(false);

    if (!result.success) {
      setFormError(result.error || 'Authentication failed. Please check your credentials.');
    } else {
      router.push(redirectPath);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.success) {
      setFormError(result.error || 'Google sign-in failed');
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 bg-[#fafaf9] dark:bg-[#0d0e12] transition-colors duration-200">
        <div className="w-full max-w-sm space-y-6 bg-white/90 dark:bg-[#161820]/90 backdrop-blur-xl p-7 sm:p-8 rounded-3xl border border-stone-200/80 dark:border-white/10 shadow-xl">
          <div className="pt-1">
            <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-white">
              Login
            </h1>
          </div>

          {formError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs text-rose-800 dark:text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-4 py-3 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-white/[0.04] px-4 py-3 pr-11 text-xs font-medium text-stone-900 dark:text-white placeholder:text-stone-400 focus:border-[#ff5e3a] focus:bg-white dark:focus:bg-[#161820] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-3 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end mt-1.5">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-[#ff5e3a] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-full bg-[#ff5e3a] hover:bg-[#ff4b4b] py-3.5 px-4 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/25 transition active:scale-95 disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Login</span>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="font-bold text-[#ff5e3a] hover:underline"
              >
                Sign Up
              </Link>
            </p>
          </div>

          <div className="space-y-3.5 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-stone-200 dark:bg-white/10" />
              <span className="text-[11px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                Sign in with
              </span>
              <div className="flex-1 h-px bg-stone-200 dark:bg-white/10" />
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-full bg-white dark:bg-white/[0.05] border border-stone-200 dark:border-white/15 text-stone-700 dark:text-stone-200 font-bold text-xs shadow-sm hover:bg-stone-50 dark:hover:bg-white/[0.08] transition active:scale-95 disabled:opacity-50"
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
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
