'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Loader2, AlertCircle } from 'lucide-react';

export function WelcomeLanding() {
  const { signInWithGoogle } = useAuth();
  const { activeTheme } = useTheme();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);
    if (!result.success) {
      setError(result.error || 'Google sign-in failed');
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#fafaf9] dark:bg-[#0d0e12] transition-colors duration-200">
      <div className="absolute inset-x-0 top-0 h-[52%] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80&fit=crop"
          alt="Campus Canteen Food"
          className="w-full h-full object-cover opacity-85 dark:opacity-40 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-[#fafaf9] dark:to-[#0d0e12]" />
      </div>

      <div className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center gap-2.5">
          <img
            src={activeTheme === 'dark' ? '/logo/logo_white.svg' : '/logo/logo_white.svg'}
            alt="Cafeteria CEV Logo"
            className="h-10 w-10 object-contain drop-shadow-md"
          />
          <img
            src='/logo title.svg'
            alt="Cafeteria CEV title"
            className="h-4 w-full object-contain drop-shadow-md"
          />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-12 pt-16 flex flex-col justify-end space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-stone-900 dark:text-white leading-[1.1]">
            Welcome to <br />
            <img
              src={activeTheme === 'dark' ? '/logo title.svg' : '/lg_title_blk.svg'}
              alt="Cafeteria CEV title"
              className="h-12 w-full object-contain drop-shadow-md"
            />
          </h1>
          <p className="text-sm text-stone-600 dark:text-stone-300 font-medium">
            Order ahead, skip the queue, pick up fresh hot meals
          </p>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/90 dark:bg-rose-950/40 backdrop-blur-md p-3 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-3.5 pt-2">
          <Link
            href="/signup"
            className="w-full flex items-center justify-center py-4 px-6 rounded-full bg-[#17181f] text-white dark:bg-white dark:text-stone-900 font-bold text-sm tracking-wide shadow-xl hover:opacity-90 transition active:scale-95"
          >
            Start with email
          </Link>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-stone-300/80 dark:bg-white/15" />
            <span className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Sign in with
            </span>
            <div className="flex-1 h-px bg-stone-300/80 dark:bg-white/15" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-full bg-white dark:bg-white/[0.06] border border-stone-200 dark:border-white/15 text-stone-800 dark:text-white font-bold text-sm shadow-sm hover:bg-stone-50 dark:hover:bg-white/[0.1] transition active:scale-95 disabled:opacity-50"
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

        <div className="text-center pt-2">
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
    </main>
  );
}
