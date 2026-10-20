'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { supabase } from '../../lib/supabase';
import { KeyRound, Mail, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please provide your registered administrator email address');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : 'http://localhost:3001/reset-password';

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        throw resetError;
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch recovery link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
        <div className="w-full max-w-md space-y-8 bg-slate-900/90 p-8 rounded-2xl border border-slate-800 shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-950/80 border border-indigo-800 text-indigo-400">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Reset Admin Credentials</h1>
            <p className="mt-1 text-xs text-slate-400">
              Dispatches password recovery instructions to registered administrator accounts
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-lg border border-emerald-800/60 bg-emerald-950/50 p-4 text-xs text-emerald-300">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-200">Recovery email dispatched</p>
                  <p className="mt-1 text-slate-300">
                    If {email} is associated with an active administrator account, reset instructions have been sent.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Administrator Login</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-rose-800/60 bg-rose-950/50 p-3.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1" htmlFor="email">
                    Administrator College Email
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@college.edu"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-9 pr-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Sending link...</span>
                    </>
                  ) : (
                    'Send Password Reset Instructions'
                  )}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-800">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  <ArrowLeft className="h-3 w-3" />
                  <span>Back to Administrator Login</span>
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
