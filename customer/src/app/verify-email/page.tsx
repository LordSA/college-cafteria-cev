'use client';

import { useState, useEffect, Suspense, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshProfile } = useAuth();

  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [cooldown]);

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanToken = token.trim();
    if (!email.trim() || !cleanToken) {
      setError('Please provide both your email address and the 6-digit verification code');
      return;
    }

    setVerifying(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: cleanToken,
        type: 'signup',
      });

      if (verifyError) {
        throw verifyError;
      }

      if (data.session) {
        await refreshProfile();
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/profile');
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. The code may be invalid or expired.';
      setError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email.trim()) return;

    setError(null);
    setResending(true);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (resendError) {
        throw resendError;
      }

      setCooldown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to resend code. Please try again later.';
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20">
          <Mail className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-900">
          Verify Your Email
        </h1>
        <p className="mt-1 text-xs text-stone-500">
          Enter the 6-digit verification code sent to your college inbox
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span>Email successfully verified! Redirecting to your profile...</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleVerify}>
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="email">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@college.edu"
            className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="token">
            6-Digit Verification Code (OTP)
          </label>
          <input
            id="token"
            type="text"
            required
            maxLength={10}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="123456"
            className="w-full tracking-widest text-center font-mono text-lg rounded-xl border border-stone-300 px-3.5 py-2.5 text-stone-900 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
          />
        </div>

        <button
          type="submit"
          disabled={verifying || success}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
        >
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Verifying code...</span>
            </>
          ) : (
            <>
              <span>Confirm Verification</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="flex items-center justify-between pt-4 border-t border-stone-100 text-xs">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || !email.trim()}
          className="inline-flex items-center gap-1.5 font-bold text-[#ff5e3a] hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
          <span>{cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend Code'}</span>
        </button>

        <Link href="/login" className="font-semibold text-stone-500 hover:text-stone-700 transition">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 bg-[#fafaf9]">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-stone-500 text-xs font-medium">
              <Loader2 className="h-4 w-4 animate-spin text-[#ff5e3a]" />
              <span>Loading verification...</span>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
