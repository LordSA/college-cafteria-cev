'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import { useAdminAuth, AdminRole } from '../../context/AdminAuthContext';
import {
  Terminal,
  ShieldAlert,
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

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!session?.access_token) return;

    setUpdatingUserId(userId);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update user role');
      }

      setSuccessMessage(`User role successfully changed to ${newRole}`);
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Action failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.display_name && u.display_name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      u.app_role.toLowerCase().includes(q)
    );
  });

  if (authLoading || !adminUser || !isDeveloper) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center py-20 bg-[#101114]">
          <div className="flex flex-col items-center gap-3 text-stone-400">
            <Loader2 className="h-8 w-8 animate-spin text-[#9d8bf0]" />
            <p className="text-xs font-semibold">Verifying developer privileges...</p>
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
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#22242e] pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="rounded-full border border-[#282a38] bg-[#17181f] p-2 text-stone-400 hover:text-white transition"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#9d8bf0]">
                    ALEXATEL • Developer Authority
                  </span>
                  <span className="rounded-full bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[9px] font-bold text-purple-300">
                    SUPERADMIN
                  </span>
                </div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
                  Developer Console & Access Control
                </h1>
                <p className="mt-1 text-xs text-stone-400">
                  Manage user roles, inspect infrastructure diagnostics, and monitor system payment health
                </p>
              </div>
            </div>

            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#282a38] bg-[#17181f] px-4 py-2 text-xs font-bold text-stone-200 hover:bg-[#232533] hover:text-white disabled:opacity-50 transition shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#9d8bf0] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-xs font-semibold">Payment Engine</span>
                <CreditCard className="h-4 w-4 text-[#f5a4c6]" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-black text-white uppercase">
                  {diagnostics?.paymentProvider || 'Razorpay'}
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-400">
                  ({diagnostics?.paymentMode || 'Test'} Mode)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-stone-500">Paise integer calculations verified</p>
            </div>

            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-xs font-semibold">Total Accounts</span>
                <UserCheck className="h-4 w-4 text-[#9d8bf0]" />
              </div>
              <div className="mt-3 text-xl font-black text-white">
                {users.length}
              </div>
              <p className="mt-1 text-[11px] text-stone-500">Across all roles and permissions</p>
            </div>

            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-xs font-semibold">Lifecycle Orders</span>
                <Activity className="h-4 w-4 text-[#ea9955]" />
              </div>
              <div className="mt-3 text-xl font-black text-white">
                {diagnostics?.totalOrders ?? '—'}
              </div>
              <p className="mt-1 text-[11px] text-stone-500">Strict 3-stage order pipeline</p>
            </div>

            <div className="rounded-2xl bg-[#17181f] border border-[#22242e] p-5 shadow-lg">
              <div className="flex items-center justify-between text-stone-400">
                <span className="text-xs font-semibold">Pending Webhook Events</span>
                <Server className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-3 text-xl font-black text-white">
                {diagnostics?.unresolvedWebhooks ?? 0}
              </div>
              <p className="mt-1 text-[11px] text-stone-500">HMAC SHA-256 deduplicated</p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#17181f] border border-[#22242e] shadow-xl overflow-hidden">
            <div className="p-5 border-b border-[#22242e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white tracking-wide">
                  Account Roles & Privileges
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Assign administrative, retail, or staff authority. Developer rights cannot be stripped from the last superadmin.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter users..."
                  className="w-full rounded-full bg-[#121316] border border-[#282a38] pl-9 pr-4 py-1.5 text-xs font-medium text-white placeholder-stone-500 focus:outline-none focus:border-[#9d8bf0]"
                />
                <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-stone-500" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-[#121316] uppercase text-[10px] tracking-wider text-stone-400 border-b border-[#22242e]">
                  <tr>
                    <th className="px-6 py-3.5 font-bold">User</th>
                    <th className="px-6 py-3.5 font-bold">Email</th>
                    <th className="px-6 py-3.5 font-bold">Classification</th>
                    <th className="px-6 py-3.5 font-bold">Current Role</th>
                    <th className="px-6 py-3.5 font-bold text-right">Assign Authority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22242e] font-medium">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-500">
                        <Loader2 className="h-6 w-6 animate-spin text-[#9d8bf0] mx-auto mb-2" />
                        <span>Loading user directory...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-stone-500">
                        No users match the search filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#1a1b24] transition">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white">
                            {u.display_name || 'Unnamed Diner'}
                          </div>
                          <div className="text-[10px] font-mono text-stone-500 mt-0.5">
                            {u.id.slice(0, 12)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 text-stone-300">
                          {u.email}
                        </td>
                        <td className="px-6 py-4 capitalize text-stone-400">
                          {u.account_type || 'student'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              u.app_role === 'developer'
                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
                                : u.app_role === 'admin'
                                ? 'bg-pink-500/15 border-pink-500/30 text-pink-300'
                                : u.app_role === 'retail'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                                : u.app_role === 'staff'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                : 'bg-stone-800 border-stone-700 text-stone-400'
                            }`}
                          >
                            {u.app_role.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {updatingUserId === u.id ? (
                              <Loader2 className="h-4 w-4 animate-spin text-[#9d8bf0]" />
                            ) : (
                              <select
                                value={u.app_role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="rounded-lg bg-[#121316] border border-[#2e3140] px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-[#9d8bf0]"
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
    </>
  );
}
