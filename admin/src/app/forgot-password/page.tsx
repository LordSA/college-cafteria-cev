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
      <main className="flex-1 flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8 bg-white text-[#252525] min-h-screen">
        <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-3xl border border-[#EEEEEE] shadow-sm">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF7F0] border border-[#F47721]/30 text-[#F47721] shadow-xs">
              <KeyRound className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721] block mt-4">
              Cafeteria.cev • Account Recovery
            </span>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525]">Reset Admin Credentials</h1>
            <p className="mt-1 text-xs text-[#666666]">
              Dispatches password recovery instructions to registered administrator accounts
            </p>
          </div>

          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 rounded-2xl border border-green-200 bg-green-50 p-4 text-xs text-[#269B62]">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-[#269B62] mt-0.5" />
                <div>
                  <p className="font-bold text-[#269B62]">Recovery email dispatched</p>
                  <p className="mt-1 text-[#666666]">
                    If {email} is associated with an active administrator account, reset instructions have been sent.
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] py-2.5 text-xs font-bold text-[#252525] hover:text-[#F47721] transition active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Administrator Login</span>
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-[#D94A43]">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43] mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="email">
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
                      className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white pl-9 pr-3.5 py-2.5 text-xs text-[#252525] placeholder:text-[#888888] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-[#888888]" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-4 py-3 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition active:scale-95"
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

              <div className="text-center pt-2 border-t border-[#EEEEEE]">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#666666] hover:text-[#F47721] transition"
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
