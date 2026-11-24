'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Bug,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  X,
  Mail,
  Eye,
  Check,
} from 'lucide-react';

interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id?: string | null;
  name: string;
  email: string;
  type: 'bug' | 'complaint' | 'feedback' | 'inquiry' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  developer_notes?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminSupportPage() {
  const router = useRouter();
  const { adminUser, isDeveloper, loading: authLoading, session } = useAdminAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketStatus, setTicketStatus] = useState<SupportTicket['status']>('open');
  const [ticketPriority, setTicketPriority] = useState<SupportTicket['priority']>('normal');
  const [developerNotes, setDeveloperNotes] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const [savingTicket, setSavingTicket] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (!isDeveloper) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isDeveloper, authLoading, router]);

  const loadTickets = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const url = new URL(`${API_BASE_URL}/api/v1/admin/support`);
      if (statusFilter !== 'all') url.searchParams.set('status', statusFilter);
      if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);
      if (searchQuery.trim()) url.searchParams.set('q', searchQuery.trim());
      url.searchParams.set('t', Date.now().toString());

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to load support tickets');
      }

      setTickets(body.data || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error loading tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token && isDeveloper) {
      loadTickets();
    }
  }, [session?.access_token, isDeveloper, statusFilter, typeFilter]);

  const handleOpenTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setTicketStatus(ticket.status);
    setTicketPriority(ticket.priority);
    setDeveloperNotes(ticket.developer_notes || '');
    setReplyMessage('');
    setErrorMessage(null);
  };

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !session?.access_token) return;

    setSavingTicket(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/support/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          status: ticketStatus,
          priority: ticketPriority,
          developer_notes: developerNotes.trim() || undefined,
          reply_to_user: replyMessage.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update support ticket');
      }

      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? (body.data as SupportTicket) : t))
      );

      setSuccessMessage(body.message || 'Ticket updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
      setSelectedTicket(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating ticket');
    } finally {
      setSavingTicket(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    if (!q) return true;
    return (
      t.ticket_number.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      t.subject.toLowerCase().includes(q) ||
      t.message.toLowerCase().includes(q)
    );
  });

  const totalCount = tickets.length;
  const openBugsCount = tickets.filter((t) => t.type === 'bug' && t.status === 'open').length;
  const openComplaintsCount = tickets.filter((t) => t.type === 'complaint' && t.status === 'open').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  if (authLoading || !adminUser || !isDeveloper) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center py-20 bg-white">
          <div className="flex flex-col items-center gap-3 text-[#666666]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
            <p className="text-xs font-semibold">Verifying developer access...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#252525] flex flex-col md:flex-row select-none">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  Support Admin
                </h1>
              </div>

              <button
                onClick={loadTickets}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {successMessage && (
              <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 p-4 text-xs text-[#269B62]">
                <CheckCircle2 className="h-4 w-4 text-[#269B62] flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43]">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43] mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <span className="text-xs font-semibold text-[#666666]">Total Tickets</span>
                <div className="mt-2 text-2xl font-black text-[#252525]">{totalCount}</div>
              </div>

              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <span className="text-xs font-semibold text-[#666666]">Open Bugs</span>
                <div className="mt-2 text-2xl font-black text-[#D94A43]">{openBugsCount}</div>
              </div>

              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <span className="text-xs font-semibold text-[#666666]">Pending Complaints</span>
                <div className="mt-2 text-2xl font-black text-amber-600">{openComplaintsCount}</div>
              </div>

              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <span className="text-xs font-semibold text-[#666666]">Resolved</span>
                <div className="mt-2 text-2xl font-black text-[#269B62]">{resolvedCount}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-[#EEEEEE] shadow-xs overflow-hidden">
              <div className="p-4 border-b border-[#EEEEEE] bg-[#FAFAFA] flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full md:w-auto">
                  <span className="text-xs font-bold text-[#888888] mr-1">Status:</span>
                  {['all', 'open', 'in_progress', 'resolved', 'closed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${statusFilter === st
                        ? 'bg-[#F47721] text-white shadow-2xs'
                        : 'bg-white border border-[#EEEEEE] text-[#666666] hover:bg-[#FFF7F0]'
                        }`}
                    >
                      {st.toUpperCase()}
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#888888] mx-1">| Type:</span>
                  {['all', 'bug', 'complaint', 'feedback', 'inquiry'].map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setTypeFilter(tp)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${typeFilter === tp
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : 'bg-white border border-[#EEEEEE] text-[#666666] hover:bg-purple-50'
                        }`}
                    >
                      {tp.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="relative w-full md:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full rounded-xl bg-white border border-[#EEEEEE] pl-9 pr-3 py-1.5 text-xs text-[#252525] focus:outline-none focus:border-[#F47721]"
                  />
                  <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-[#888888]" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#252525]">
                  <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">Ticket</th>
                      <th className="px-6 py-3.5 font-bold">Category</th>
                      <th className="px-6 py-3.5 font-bold">Reporter</th>
                      <th className="px-6 py-3.5 font-bold">Subject</th>
                      <th className="px-6 py-3.5 font-bold">Status</th>
                      <th className="px-6 py-3.5 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#666666]">
                          <Loader2 className="h-6 w-6 animate-spin text-[#F47721] mx-auto mb-2" />
                          <span>Loading support tickets...</span>
                        </td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-[#666666]">
                          No support tickets found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map((t) => (
                        <tr key={t.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-[#F47721]">
                            #{t.ticket_number}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 uppercase text-[10px] font-bold text-[#666666]">
                              {t.type === 'bug' && <Bug className="h-3 w-3 text-red-500" />}
                              {t.type === 'complaint' && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                              {t.type === 'feedback' && <Lightbulb className="h-3 w-3 text-emerald-500" />}
                              {t.type === 'inquiry' && <HelpCircle className="h-3 w-3 text-blue-500" />}
                              {t.type === 'other' && <MessageSquare className="h-3 w-3 text-purple-500" />}
                              <span>{t.type}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#252525]">{t.name}</div>
                            <div className="text-[10px] text-[#888888]">{t.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-[#252525] line-clamp-1">{t.subject}</p>
                            <p className="text-[11px] text-[#888888] line-clamp-1">{t.message}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${t.status === 'resolved' || t.status === 'closed'
                              ? 'bg-green-50 border-green-200 text-[#269B62]'
                              : t.status === 'in_progress'
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-amber-50 border-amber-200 text-amber-700'
                              }`}>
                              {t.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenTicket(t)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1.5 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-2xs"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Inspect</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedTicket && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#F47721]">
                        #{selectedTicket.ticket_number}
                      </span>
                      <span className="text-xs uppercase font-bold text-[#888888]">
                        ({selectedTicket.type})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-bold text-[#252525]">{selectedTicket.subject}</h3>
                      <p className="text-xs text-[#666666] mt-0.5">
                        Reported by <strong>{selectedTicket.name}</strong> ({selectedTicket.email}) •{' '}
                        {new Date(selectedTicket.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#EEEEEE] text-xs text-[#252525] leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.message}
                    </div>
                  </div>

                  <form onSubmit={handleUpdateTicket} className="space-y-4 pt-2 border-t border-[#EEEEEE]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1">Status</label>
                        <select
                          value={ticketStatus}
                          onChange={(e) => setTicketStatus(e.target.value as any)}
                          className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                        >
                          <option value="open">Open (Needs Attention)</option>
                          <option value="in_progress">In Progress (Investigating)</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1">Priority</label>
                        <select
                          value={ticketPriority}
                          onChange={(e) => setTicketPriority(e.target.value as any)}
                          className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Internal Developer Notes</label>
                      <input
                        type="text"
                        value={developerNotes}
                        onChange={(e) => setDeveloperNotes(e.target.value)}
                        placeholder="Internal comments for developer team..."
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      />
                    </div>

                    <div className="rounded-2xl border border-orange-200 bg-[#FFF7F0]/40 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F47721]">
                        <Mail className="h-3.5 w-3.5" />
                        <span>Send Response Email to {selectedTicket.email}</span>
                      </div>
                      <textarea
                        rows={3}
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        placeholder="Type your message to the user here. It will be sent via SMTP directly to their inbox..."
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white p-3 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedTicket(null)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingTicket}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition"
                      >
                        {savingTicket ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Save & Dispatch</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
