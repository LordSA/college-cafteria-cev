'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { supabase } from '../../lib/supabase';
import { KeyRound, Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please provide your registered college email address');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'http://localhost:3000/reset-password';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        throw resetError;
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send recovery link. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 pb-28 md:pb-12 bg-[#fafaf9]">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#ff4b4b] to-[#ff7844] text-white shadow-md shadow-orange-500/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-stone-900">
              Forgot Password
            </h1>
            <p className="mt-1 text-xs text-stone-500">
              Enter your college email to receive password reset instructions
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-bold">Reset instructions sent</p>
                  <p className="mt-1 text-stone-600 leading-relaxed">
                    If an account exists for {email}, a recovery link has been dispatched to your inbox.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white py-2.5 text-xs font-bold text-stone-700 hover:bg-stone-50 transition active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Sign In</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1" htmlFor="email">
                    College Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@college.edu"
                      className="w-full rounded-xl border border-stone-300 pl-9 pr-3.5 py-2.5 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#ff5e3a] focus:outline-none focus:ring-1 focus:ring-[#ff5e3a]"
                    />
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff4b4b] to-[#ff7844] py-3 text-xs font-bold text-white shadow-md shadow-orange-500/25 hover:opacity-95 disabled:opacity-50 transition active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    <span>Send Password Reset Link</span>
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-stone-100">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#ff5e3a] hover:underline"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
