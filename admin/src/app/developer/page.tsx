'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Loader2,
  ArrowLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Activity,
  UserCheck,
  CreditCard,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  display_name: string | null;
  app_role: 'developer' | 'admin' | 'retail' | 'staff' | 'customer';
  account_type: string;
  created_at: string;
}

interface DiagnosticsData {
  timestamp: string;
  environment: string;
  paymentMode: string;
  paymentProvider: string;
  totalUsers: number;
  totalOrders: number;
  unresolvedWebhooks: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export default function DeveloperPage() {
  const router = useRouter();
  const { adminUser, isDeveloper, loading: authLoading, session } = useAdminAuth();

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
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

  const loadData = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const headers = { Authorization: `Bearer ${session.access_token}` };

      const [usersRes, diagRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/users`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/admin/diagnostics`, { headers }).catch(() => null),
      ]);

      if (usersRes && usersRes.ok) {
        const uJson = await usersRes.json();
        if (uJson.success) setUsers(uJson.data || []);
      }

      if (diagRes && diagRes.ok) {
        const dJson = await diagRes.json();
        if (dJson.success) setDiagnostics(dJson.data || null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load developer system metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.access_token && isDeveloper) {
      loadData();
    }
  }, [session, isDeveloper]);

  const handleRoleChange = async (targetUserId: string, nextRole: string) => {
    if (!session?.access_token) return;

    setUpdatingUserId(targetUserId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${targetUserId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update user authorization role');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, app_role: nextRole as any } : u))
      );
      setSuccessMessage(`Updated authorization for user to ${nextRole.toUpperCase()}.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Role change failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.display_name && u.display_name.toLowerCase().includes(q)) ||
      u.app_role.toLowerCase().includes(q)
    );
  });

  if (authLoading || !adminUser || !isDeveloper) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-white">
          <div className="flex flex-col items-center gap-3 text-[#666666]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
            <p className="text-xs font-semibold">Verifying developer clearance...</p>
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
        <Header />
        <main className="flex-1 pt-8 pb-24 md:py-8 px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#EEEEEE] pb-6">
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="rounded-xl border border-[#EEEEEE] bg-white p-2 text-[#666666] hover:text-[#252525] hover:bg-gray-50 transition"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#F47721]">
                    Cafeteria.cev • Core Console
                  </span>
                  <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                    Developer & System Diagnostics
                  </h1>
                  <p className="mt-1 text-xs text-[#666666]">
                    Configure user access control tiers, verify HMAC signature webhooks, and check payment runtimes
                  </p>
                </div>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Diagnostics</span>
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

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="text-xs font-semibold">Payment Engine</span>
                  <CreditCard className="h-4 w-4 text-[#F47721]" />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-black text-[#252525] uppercase">
                    {diagnostics?.paymentProvider || 'Razorpay'}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#269B62]">
                    ({diagnostics?.paymentMode || 'Test'} Mode)
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-[#888888]">Paise integer calculations verified</p>
              </div>

              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="text-xs font-semibold">Total Accounts</span>
                  <UserCheck className="h-4 w-4 text-[#F47721]" />
                </div>
                <div className="mt-3 text-xl font-black text-[#252525]">
                  {users.length}
                </div>
                <p className="mt-1 text-[11px] text-[#888888]">Across all roles and permissions</p>
              </div>

              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="text-xs font-semibold">Lifecycle Orders</span>
                  <Activity className="h-4 w-4 text-[#F47721]" />
                </div>
                <div className="mt-3 text-xl font-black text-[#252525]">
                  {diagnostics?.totalOrders ?? '—'}
                </div>
                <p className="mt-1 text-[11px] text-[#888888]">Strict 3-stage order pipeline</p>
              </div>

              <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                <div className="flex items-center justify-between text-[#666666]">
                  <span className="text-xs font-semibold">Pending Webhook Events</span>
                  <Server className="h-4 w-4 text-[#269B62]" />
                </div>
                <div className="mt-3 text-xl font-black text-[#252525]">
                  {diagnostics?.unresolvedWebhooks ?? 0}
                </div>
                <p className="mt-1 text-[11px] text-[#888888]">HMAC SHA-256 deduplicated</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-[#EEEEEE] shadow-xs overflow-hidden">
              <div className="p-5 border-b border-[#EEEEEE] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAFA]">
                <div>
                  <h2 className="text-sm font-bold text-[#252525] tracking-wide">
                    Account Roles & Privileges
                  </h2>
                  <p className="text-xs text-[#666666] mt-0.5">
                    Assign administrative, retail, or staff authority. Developer rights cannot be stripped from the last superadmin.
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter users..."
                    className="w-full rounded-xl bg-white border border-[#EEEEEE] hover:border-gray-300 pl-9 pr-4 py-1.5 text-xs font-medium text-[#252525] placeholder:text-[#888888] focus:outline-none focus:border-[#F47721] focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                  />
                  <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-[#888888]" />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#252525]">
                  <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                    <tr>
                      <th className="px-6 py-3.5 font-bold">User</th>
                      <th className="px-6 py-3.5 font-bold">Email</th>
                      <th className="px-6 py-3.5 font-bold">Classification</th>
                      <th className="px-6 py-3.5 font-bold">Current Role</th>
                      <th className="px-6 py-3.5 font-bold text-right">Assign Authority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE] font-medium">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#666666]">
                          <Loader2 className="h-6 w-6 animate-spin text-[#F47721] mx-auto mb-2" />
                          <span>Loading user directory...</span>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-[#666666]">
                          No users match the search filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-bold text-[#252525]">
                              {u.display_name || 'Unnamed Diner'}
                            </div>
                            <div className="text-[10px] font-mono text-[#888888] mt-0.5">
                              {u.id.slice(0, 12)}...
                            </div>
                          </td>
                          <td className="px-6 py-4 text-[#666666]">
                            {u.email}
                          </td>
                          <td className="px-6 py-4 capitalize text-[#666666]">
                            {u.account_type || 'student'}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                u.app_role === 'developer'
                                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                                  : u.app_role === 'admin'
                                  ? 'bg-[#FFF7F0] border-[#F47721]/30 text-[#F47721]'
                                  : u.app_role === 'retail'
                                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                                  : u.app_role === 'staff'
                                  ? 'bg-green-50 border-green-200 text-[#269B62]'
                                  : 'bg-[#FAFAFA] border-[#EEEEEE] text-[#666666]'
                              }`}
                            >
                              {u.app_role.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {updatingUserId === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-[#F47721]" />
                              ) : (
                                <select
                                  value={u.app_role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  className="rounded-lg bg-white border border-[#EEEEEE] px-2.5 py-1 text-xs font-semibold text-[#252525] focus:outline-none focus:border-[#F47721]"
                                >
                                  <option value="customer">Customer</option>
                                  <option value="staff">Staff (QR Only)</option>
                                  <option value="retail">Retail (Inventory & Orders)</option>
                                  <option value="admin">Admin</option>
                                  <option value="developer">Developer</option>
                                </select>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
