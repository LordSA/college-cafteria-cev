'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { supabase } from '../../lib/supabase';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Mail,
  Calendar,
  RefreshCw,
} from 'lucide-react';

interface StaffRequest {
  id: string;
  display_name: string | null;
  teacher_id?: string | null;
  email?: string | null;
  account_type: string;
  requested_account_type: string;
  approved_account_type: string;
  staff_approval_status: 'pending' | 'approved' | 'rejected' | 'not_requested';
  created_at: string;
  users?: {
    email?: string;
  };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function StaffRequestsPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canReviewStaff } = useAdminAuth();

  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canReviewStaff) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, canReviewStaff, authLoading, router]);

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
      try {
        const { data: directProfiles, error: directErr } = await supabase
          .from('profiles')
          .select('id, display_name, teacher_id, account_type, requested_account_type, approved_account_type, staff_approval_status, created_at')
          .in('staff_approval_status', ['pending', 'approved', 'rejected'])
          .order('created_at', { ascending: false });

        if (!directErr && directProfiles) {
          setRequests(directProfiles as any[]);
          setError(null);
        } else {
          setError(err.message || 'Error loading staff requests');
        }
      } catch {
        setError(err.message || 'Error loading staff requests');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      loadRequests();
    }
  }, [adminUser, isUnauthorized, session?.access_token]);

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    if (!session?.access_token) return;

    setActionInProgress(id);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: decision }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || `Failed to ${decision} request`);
      }

      setSuccessMessage(`Successfully ${decision}d staff request.`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadRequests();
    } catch (err: any) {
      setError(err.message || `Error processing staff ${decision}`);
    } finally {
      setActionInProgress(null);
    }
  };

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center py-20 bg-white">
          <div className="flex flex-col items-center gap-3 text-[#666666]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
            <p className="text-xs font-semibold">Verifying...</p>
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
              <div className="flex items-center gap-3">
                <div>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                    Faculty Requests
                  </h1>
                  <p className="mt-1 text-xs text-[#666666]">
                    Review and approve faculty/teacher
                  </p>
                </div>
              </div>

              <button
                onClick={loadRequests}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
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

            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-[#D94A43]">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#D94A43] mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span>{error}</span>
                  {error.includes('profiles.email') && (
                    <span className="text-[11px] text-[#666666]">
                      The backend or database schema is missing the profile email column. Run the migration in Supabase SQL editor: <code className="bg-[#FAFAFA] px-1 py-0.5 rounded text-[#252525]">ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;</code> and redeploy the backend.
                    </span>
                  )}
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                <p className="text-xs font-semibold">Fetching requests...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                <Users className="mx-auto h-8 w-8 text-[#888888]" />
                <h3 className="mt-3 text-sm font-bold text-[#252525]">No Pending Requests</h3>
                <p className="mt-1 text-xs text-[#666666]">
                  All staff registration requests have been reviewed and processed.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-[#252525]">
                    <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                      <tr>
                        <th className="px-6 py-3.5 font-bold">Applicant</th>
                        <th className="px-6 py-3.5 font-bold">Requested Classification</th>
                        <th className="px-6 py-3.5 font-bold">Submitted Date</th>
                        <th className="px-6 py-3.5 font-bold">Current Status</th>
                        <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEEEEE] font-medium">
                      {requests.map((req) => (
                        <tr key={req.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#252525] flex items-center gap-2">
                              <span>{req.display_name || 'Unnamed Diner'}</span>
                              {req.teacher_id && (
                                <span className="rounded-md bg-[#FAFAFA] border border-[#EEEEEE] px-1.5 py-0.5 text-[10px] font-mono text-[#F47721]">
                                  ID: {req.teacher_id}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#666666] flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3 text-[#888888]" />
                              <span>{req.email || req.users?.email || req.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7F0] border border-[#F47721]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#F47721]">
                              Faculty / Staff
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#666666]">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-[#888888]" />
                              <span>{new Date(req.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                              <Clock className="h-3 w-3" />
                              <span>Pending Review</span>
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDecision(req.id, 'approve')}
                                disabled={actionInProgress === req.id}
                                className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs font-bold text-[#269B62] hover:bg-green-100 disabled:opacity-50 transition"
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
                                className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-[#D94A43] hover:bg-red-100 disabled:opacity-50 transition"
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
      </div>
    </div>
  );
}
