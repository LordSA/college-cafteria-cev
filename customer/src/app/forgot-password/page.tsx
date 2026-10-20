'use client';

import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-stone-200 shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">Forgot Password</h1>
            <p className="mt-1 text-xs text-stone-500">
              Enter your email to receive password reset instructions
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-semibold">Reset instructions sent</p>
                  <p className="mt-1 text-stone-600">
                    If an account exists for {email}, a recovery link has been dispatched to your inbox.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Login</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1" htmlFor="email">
                    College Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rohan@college.edu"
                      className="w-full rounded-lg border border-stone-300 pl-9 pr-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    'Send Password Reset Link'
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-stone-100">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-800"
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
