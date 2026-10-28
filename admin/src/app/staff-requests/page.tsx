'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Mail,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface StaffRequest {
  id: string;
  display_name: string | null;
  account_type: string;
  requested_account_type: string;
  approved_account_type: string;
  staff_approval_status: 'pending' | 'approved' | 'rejected' | 'not_requested';
  created_at: string;
  users?: {
    email?: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function StaffRequestsPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session } = useAdminAuth();

  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, authLoading, router]);

  const loadRequests = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to fetch staff requests');
      }

      setRequests(body.data || []);
    } catch (err: any) {
      setError(err.message || 'Error loading staff requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      loadRequests();
    }
  }, [session]);

  const handleDecision = async (userId: string, decision: 'approve' | 'reject') => {
    if (!session?.access_token) return;

    setActionInProgress(userId);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/${userId}/${decision}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || `Failed to ${decision} staff request`);
      }

      setSuccessMessage(
        decision === 'approve'
          ? 'Staff request approved successfully.'
          : 'Staff request rejected. User account remains as student.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setActionInProgress(null);
    }
  };

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-[#101114]">
          <div className="flex flex-col items-center gap-3 text-stone-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
            <p className="text-xs font-semibold">Verifying administrator authorization...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 bg-[#101114] text-slate-100 min-h-screen">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#22242e] pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#282a38] bg-[#17181f] p-2 text-stone-400 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#f5a4c6]">
                  ALEXATEL • Access Verification
                </span>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Staff Verification Requests
                </h1>
                <p className="mt-1 text-xs text-stone-400">
                  Review and approve faculty/staff dining access and pay-later privileges
                </p>
              </div>
            </div>

            <button
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white disabled:opacity-50 transition shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#9d8bf0] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-stone-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
              <p className="text-xs font-semibold">Fetching pending verification requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#22242e] bg-[#17181f]/40 p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-stone-600" />
              <h3 className="mt-3 text-sm font-bold text-stone-300">No Pending Requests</h3>
              <p className="mt-1 text-xs text-stone-500">
                All staff registration requests have been reviewed and processed.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#22242e] bg-[#17181f] shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-300">
                  <thead className="bg-[#121316] uppercase text-[10px] tracking-wider text-stone-400 border-b border-[#22242e]">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">Applicant</th>
                      <th className="px-6 py-3.5 font-bold">Requested Classification</th>
                      <th className="px-6 py-3.5 font-bold">Submitted Date</th>
                      <th className="px-6 py-3.5 font-bold">Current Status</th>
                      <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22242e] font-medium">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#1a1b24] transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">
                            {req.display_name || 'Unnamed Diner'}
                          </div>
                          <div className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-stone-500" />
                            <span>{req.users?.email || req.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#9d8bf0]/15 border border-[#9d8bf0]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#9d8bf0]">
                            Faculty / Staff
                          </span>
                        </td>
                        <td className="px-6 py-4 text-stone-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-stone-500" />
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#ea9955]/15 border border-[#ea9955]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#ea9955]">
                            <Clock className="h-3 w-3" />
                            <span>Pending Review</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDecision(req.id, 'approve')}
                              disabled={actionInProgress === req.id}
                              className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50 transition"
                            >
                              {actionInProgress === req.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              )}
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleDecision(req.id, 'reject')}
                              disabled={actionInProgress === req.id}
                              className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 border border-rose-500/30 px-3 py-1 text-xs font-bold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50 transition"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
