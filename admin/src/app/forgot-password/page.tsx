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
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-[#101114] text-slate-100 min-h-screen">
        <div className="w-full max-w-md space-y-6 bg-[#17181f] p-8 rounded-3xl border border-[#22242e] shadow-2xl">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5a4c6]/15 border border-[#f5a4c6]/30 text-[#f5a4c6]">
              <KeyRound className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6] block mt-4">
              ALEXATEL • Account Recovery
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Reset Admin Credentials</h1>
            <p className="mt-1 text-xs text-stone-400">
              Dispatches password recovery instructions to registered administrator accounts
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-200">Recovery email dispatched</p>
                  <p className="mt-1 text-stone-300">
                    If {email} is associated with an active administrator account, reset instructions have been sent.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-[#282a38] bg-[#101114] py-2.5 text-xs font-bold text-stone-200 hover:bg-[#232533] transition"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Administrator Login</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-3.5 text-xs text-rose-300">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1" htmlFor="email">
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
                      className="w-full rounded-xl border border-[#2b2d3b] bg-[#101114] pl-9 pr-3.5 py-2.5 text-xs text-white placeholder:text-stone-500 focus:border-[#f5a4c6] focus:outline-none focus:ring-1 focus:ring-[#f5a4c6]"
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-full bg-[#f5a4c6] px-4 py-3 text-xs font-black text-[#101114] shadow-md shadow-[#f5a4c6]/20 hover:opacity-90 disabled:opacity-50 transition active:scale-95"
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

              <div className="text-center pt-2 border-t border-[#22242e]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-white transition"
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
