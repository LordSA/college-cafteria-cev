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
        <main className="flex-1 flex items-center justify-center py-20 bg-slate-950">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Verifying administrator authorization...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-400 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Staff Verification Requests</h1>
                <p className="mt-1 text-xs text-slate-400">
                  Review and approve faculty/staff dining access for registered campus accounts
                </p>
              </div>
            </div>

            <button
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-950/50 border border-emerald-800/60 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-800/60 bg-rose-950/50 p-4 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <p className="text-xs font-medium">Fetching pending verification requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
              <Users className="mx-auto h-8 w-8 text-slate-600" />
              <h3 className="mt-3 text-sm font-bold text-slate-300">No Pending Requests</h3>
              <p className="mt-1 text-xs text-slate-500">
                All staff registration requests have been reviewed and processed.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">Applicant</th>
                      <th className="px-6 py-3.5 font-bold">Requested Classification</th>
                      <th className="px-6 py-3.5 font-bold">Submitted Date</th>
                      <th className="px-6 py-3.5 font-bold">Current Status</th>
                      <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {requests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-800/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-white">
                            {req.display_name || 'Unnamed Diner'}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-slate-500" />
                            <span>{req.users?.email || req.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 text-[11px] text-indigo-300">
                            Faculty / Staff
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                            <Clock className="h-3 w-3" />
                            <span>Pending Review</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDecision(req.id, 'approve')}
                              disabled={actionInProgress === req.id}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-rose-400 disabled:opacity-50 transition"
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
