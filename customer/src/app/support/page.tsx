'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAuth } from '../../context/AuthContext';
import {
  LifeBuoy,
  Bug,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserTicket {
  id: string;
  ticket_number: string;
  type: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  developer_notes?: string | null;
  created_at: string;
}

export default function CustomerSupportPage() {
  const { user, profile, session } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'bug' | 'complaint' | 'feedback' | 'inquiry' | 'other'>('bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTicket, setSubmittedTicket] = useState<{ ticket_number: string } | null>(null);

  const [myTickets, setMyTickets] = useState<UserTicket[]>([]);

  useEffect(() => {
    if (profile?.display_name && !name) setName(profile.display_name);
    if (user?.email && !email) setEmail(user.email);
  }, [user, profile]);

  const loadMyTickets = async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/support/me`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setMyTickets(json.data || []);
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (session?.access_token) {
      loadMyTickets();
    }
  }, [session?.access_token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/support`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          type,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Could not submit support ticket');
      }

      setSubmittedTicket(body.data);
      setSubject('');
      setMessage('');
      if (session?.access_token) {
        loadMyTickets();
      }
    } catch (err: any) {
      setError(err.message || 'Error submitting ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Header />

      <div className="md:hidden">
        <header className="rounded-b-[2.5rem] bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-5 pb-7 text-white shadow-xl shadow-orange-500/15">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white mb-2">
            <LifeBuoy className="h-3 w-3" />
            <span>Campus Help Desk</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-0.5">
            Support & Feedback
          </h1>
          <p className="mt-1 text-xs text-orange-100">
            Report bugs, submit complaints, or share suggestions directly with developers
          </p>
        </header>
      </div>

      <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8 pb-32 md:pb-16 bg-[#FAFAFA] dark:bg-[#0c0d11] min-h-[80vh]">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="hidden md:block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#ff5e3a] via-[#ff7043] to-[#ffa040] p-8 text-white shadow-xl shadow-orange-500/15">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white mb-3">
                <LifeBuoy className="h-3.5 w-3.5" />
                <span>Cafteria CEV Campus Support</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Help & Feedback Center</h1>
              <p className="mt-1 text-xs text-orange-100 max-w-lg">
                Have an issue at the counter, a payment query, or a feature request? Let us know and our developers will look into it.
              </p>
            </div>
          </div>

          {submittedTicket ? (
            <div className="rounded-3xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-[#161822] p-6 sm:p-8 text-center space-y-4 shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-[#269B62]">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
                  Ticket Created
                </span>
                <h2 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                  #{submittedTicket.ticket_number}
                </h2>
                <p className="mt-2 text-xs text-stone-600 dark:text-stone-300 max-w-md mx-auto leading-relaxed">
                  Your ticket has been recorded. An acknowledgment email has been dispatched to{' '}
                  <strong className="text-stone-900 dark:text-white">{email}</strong>. Our developer team will inspect your report promptly.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setSubmittedTicket(null)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#ff5e3a] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-orange-500/20 hover:bg-[#e04f2c] transition"
                >
                  <span>Submit Another Report</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h2 className="text-base font-bold text-stone-900 dark:text-white">File a Ticket</h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Choose a category and describe the situation in detail
                </p>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/20 p-4 text-xs text-rose-800 dark:text-rose-300">
                  <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 mb-2">
                    What is this regarding?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <button
                      type="button"
                      onClick={() => setType('bug')}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                        type === 'bug'
                          ? 'border-[#ff5e3a] bg-orange-50/70 dark:bg-orange-950/30 text-[#ff5e3a]'
                          : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#121316] text-stone-600 dark:text-stone-400 hover:border-stone-300'
                      }`}
                    >
                      <Bug className="h-4 w-4" />
                      <span>Bug Report</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('complaint')}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                        type === 'complaint'
                          ? 'border-[#ff5e3a] bg-orange-50/70 dark:bg-orange-950/30 text-[#ff5e3a]'
                          : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#121316] text-stone-600 dark:text-stone-400 hover:border-stone-300'
                      }`}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Complaint</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('feedback')}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                        type === 'feedback'
                          ? 'border-[#ff5e3a] bg-orange-50/70 dark:bg-orange-950/30 text-[#ff5e3a]'
                          : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#121316] text-stone-600 dark:text-stone-400 hover:border-stone-300'
                      }`}
                    >
                      <Lightbulb className="h-4 w-4" />
                      <span>Feedback</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('inquiry')}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                        type === 'inquiry'
                          ? 'border-[#ff5e3a] bg-orange-50/70 dark:bg-orange-950/30 text-[#ff5e3a]'
                          : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#121316] text-stone-600 dark:text-stone-400 hover:border-stone-300'
                      }`}
                    >
                      <HelpCircle className="h-4 w-4" />
                      <span>Inquiry</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setType('other')}
                      className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition ${
                        type === 'other'
                          ? 'border-[#ff5e3a] bg-orange-50/70 dark:bg-orange-950/30 text-[#ff5e3a]'
                          : 'border-stone-200 dark:border-white/10 bg-white dark:bg-[#121316] text-stone-600 dark:text-stone-400 hover:border-stone-300'
                      }`}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Other</span>
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-[#121316] px-4 py-2.5 text-xs text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@cev.ac.in"
                      className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-[#121316] px-4 py-2.5 text-xs text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Subject / Short Summary
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Order #145 token scan didn't register at Counter 1"
                    className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-[#121316] px-4 py-2.5 text-xs text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                    Detailed Message
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Provide details about what happened, steps to reproduce, or your recommendations..."
                    className="w-full rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/50 dark:bg-[#121316] p-4 text-xs text-stone-900 dark:text-white focus:border-[#ff5e3a] focus:outline-none transition leading-relaxed"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#ff5e3a] hover:bg-[#e04f2c] px-8 py-3 text-xs font-bold text-white shadow-lg shadow-orange-500/20 disabled:opacity-50 transition active:scale-95"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Ticket...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Ticket</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {session?.access_token && myTickets.length > 0 && (
            <div className="rounded-3xl border border-stone-200 dark:border-white/10 bg-white dark:bg-[#161822] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-white/5 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Your Past Tickets ({myTickets.length})
                </h3>
              </div>

              <div className="divide-y divide-stone-100 dark:divide-white/5">
                {myTickets.map((t) => (
                  <div key={t.id} className="py-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#ff5e3a]">
                          #{t.ticket_number}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-stone-400">
                          ({t.type})
                        </span>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        t.status === 'resolved' || t.status === 'closed'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-500/30 dark:text-emerald-300'
                          : t.status === 'in_progress'
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/30 dark:border-blue-500/30 dark:text-blue-300'
                          : 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-500/30 dark:text-amber-300'
                      }`}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-stone-900 dark:text-white">
                      {t.subject}
                    </p>
                    <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2">
                      {t.message}
                    </p>

                    {t.developer_notes && (
                      <div className="mt-2 p-2.5 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/5 text-[11px] text-stone-700 dark:text-stone-300">
                        <span className="font-bold text-[#ff5e3a]">Developer Note: </span>
                        <span>{t.developer_notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
