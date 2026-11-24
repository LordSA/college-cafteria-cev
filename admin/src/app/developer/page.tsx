'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Loader2,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  X,
  Mail,
  Send,
  Eye,
  Check,
  Globe,
  Database,
  HardDrive,
} from 'lucide-react';

interface ManagedUser {
  id: string;
  email: string;
  display_name: string | null;
  app_role: 'developer' | 'admin' | 'retail' | 'staff' | 'printer' | 'customer';
  account_type: 'student' | 'staff_t' | string;
  created_at: string;
}

interface SystemHealthData {
  timestamp: string;
  total_response_time_ms: number;
  services: {
    api_root: { status: string; latency_ms: number };
    database: { status: string; latency_ms: number };
    razorpay_gateway: { status: string; configured: boolean; message: string; latency_ms: number };
    storage_provider: { provider: string; status: string };
    smtp_mailer: {
      configured: boolean;
      host: string | null;
      port: string;
      user: string | null;
      from: string | null;
      developer_email: string | null;
      status: string;
    };
  };
  env: {
    environment: string;
    payment_mode: string;
    payment_provider: string;
  };
}

interface PaymentTelemetryData {
  razorpay_gateway_payments: any[];
  razorpay_error: string | null;
  database_payments: any[];
  webhook_events: any[];
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function DeveloperPage() {
  const router = useRouter();
  const { adminUser, isDeveloper, loading: authLoading, session } = useAdminAuth();

  const [activeTab, setActiveTab] = useState<'users' | 'admins' | 'api_status' | 'payments' | 'smtp'>('users');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [paymentTelemetry, setPaymentTelemetry] = useState<PaymentTelemetryData | null>(null);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createAccountType, setCreateAccountType] = useState<'student' | 'staff_t'>('student');
  const [creatingUser, setCreatingUser] = useState(false);

  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editAccountType, setEditAccountType] = useState<'student' | 'staff_t'>('student');
  const [editRole, setEditRole] = useState<string>('customer');
  const [savingEdit, setSavingEdit] = useState(false);

  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'staff' | 'retail' | 'printer' | 'developer'>('admin');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  const [showAssignAdminModal, setShowAssignAdminModal] = useState(false);
  const [assignCandidateId, setAssignCandidateId] = useState('');
  const [assignRole, setAssignRole] = useState<'admin' | 'staff' | 'retail' | 'printer' | 'developer'>('admin');
  const [assigningAdmin, setAssigningAdmin] = useState(false);

  const [inspectingPayment, setInspectingPayment] = useState<any | null>(null);

  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);

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

      const [usersRes, healthRes, payRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/users?t=${Date.now()}`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/admin/system/health?t=${Date.now()}`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/admin/system/payments?t=${Date.now()}`, { headers }).catch(() => null),
      ]);

      if (usersRes && usersRes.ok) {
        const uJson = await usersRes.json();
        if (uJson.success) setUsers(uJson.data || []);
      }

      if (healthRes && healthRes.ok) {
        const hJson = await healthRes.json();
        if (hJson.success) setHealthData(hJson.data || null);
      }

      if (payRes && payRes.ok) {
        const pJson = await payRes.json();
        if (pJson.success) setPaymentTelemetry(pJson.data || null);
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
  }, [session?.access_token, isDeveloper]);

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

  const handleToggleClassification = async (user: ManagedUser) => {
    if (!session?.access_token) return;
    const nextType = user.account_type === 'staff_t' ? 'student' : 'staff_t';

    setUpdatingUserId(user.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ account_type: nextType }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update account classification');
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, account_type: nextType } : u))
      );
      setSuccessMessage(`User classification changed to ${nextType === 'staff_t' ? 'Teacher' : 'Student'}.`);
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Classification update failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleOpenEditUser = (user: ManagedUser) => {
    setEditingUser(user);
    setEditName(user.display_name || '');
    setEditEmail(user.email || '');
    setEditPassword('');
    setEditAccountType(user.account_type === 'staff_t' ? 'staff_t' : 'student');
    setEditRole(user.app_role);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !session?.access_token) return;

    setSavingEdit(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          display_name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword.trim() || undefined,
          account_type: editAccountType,
          app_role: editRole,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update user profile');
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
              ...u,
              display_name: editName.trim() || null,
              email: editEmail.trim(),
              account_type: editAccountType,
              app_role: editRole as any,
            }
            : u
        )
      );

      setSuccessMessage('User updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
      setEditingUser(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (user: ManagedUser) => {
    if (!session?.access_token) return;
    if (!confirm(`Are you sure you want to delete user "${user.display_name || user.email}"? This action is permanent.`)) {
      return;
    }

    setUpdatingUserId(user.id);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSuccessMessage('User account deleted.');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message || 'User deletion failed');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!createEmail.trim() || !createPassword.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }

    setCreatingUser(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: createEmail.trim(),
          password: createPassword.trim(),
          display_name: createName.trim() || undefined,
          account_type: createAccountType,
          app_role: 'customer',
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create user');
      }

      setSuccessMessage('New user created successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
      setShowCreateUserModal(false);
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      setErrorMessage('Email and temporary password are required.');
      return;
    }

    setCreatingAdmin(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          password: newAdminPassword.trim(),
          display_name: newAdminName.trim() || undefined,
          role: newAdminRole,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create admin');
      }

      setSuccessMessage(`New ${newAdminRole.toUpperCase()} created successfully.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      setShowCreateAdminModal(false);
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminName('');
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error creating admin');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token || !assignCandidateId) return;

    setAssigningAdmin(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/admins`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: assignCandidateId,
          role: assignRole,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to assign admin role');
      }

      setSuccessMessage(`Assigned ${assignRole.toUpperCase()} authority to user.`);
      setTimeout(() => setSuccessMessage(null), 3500);
      setShowAssignAdminModal(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error assigning admin role');
    } finally {
      setAssigningAdmin(false);
    }
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/system/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ to: testEmailTo.trim() || undefined }),
      });

      const body = await res.json();
      setTestEmailResult(body.message || (body.success ? 'Email delivered successfully' : body.error?.message || 'Email delivery failed'));
    } catch (err: any) {
      setTestEmailResult(`Error dispatching test email: ${err.message}`);
    } finally {
      setSendingTestEmail(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.display_name && u.display_name.toLowerCase().includes(q)) ||
      u.app_role.toLowerCase().includes(q) ||
      u.account_type.toLowerCase().includes(q)
    );
  });

  const adminUsersList = users.filter((u) => u.app_role !== 'customer');
  const studentUsersList = users.filter((u) => u.account_type === 'student');
  const teacherUsersList = users.filter((u) => u.account_type === 'staff_t');

  if (authLoading || !adminUser || !isDeveloper) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center py-20 bg-white">
          <div className="flex flex-col items-center gap-3 text-[#666666]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
            <p className="text-xs font-semibold">Verifying developer privileges...</p>
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
                  Developer Kottaaa
                </h1>
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs self-start sm:self-auto"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
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

            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-[#EEEEEE] pb-2">
              <button
                onClick={() => setActiveTab('users')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${activeTab === 'users'
                  ? 'bg-[#F47721] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#FFF7F0] hover:text-[#F47721]'
                  }`}
              >
                <span>Users({users.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('admins')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${activeTab === 'admins'
                  ? 'bg-[#F47721] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#FFF7F0] hover:text-[#F47721]'
                  }`}
              >
                <span>Admins({adminUsersList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('api_status')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${activeTab === 'api_status'
                  ? 'bg-[#F47721] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#FFF7F0] hover:text-[#F47721]'
                  }`}
              >
                <span>API & System Health</span>
              </button>

              <button
                onClick={() => setActiveTab('payments')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap ${activeTab === 'payments'
                  ? 'bg-[#F47721] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#FFF7F0] hover:text-[#F47721]'
                  }`}
              >
                <span>Payments</span>
              </button>

              <button
                onClick={() => setActiveTab('smtp')}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${activeTab === 'smtp'
                  ? 'bg-[#F47721] text-white shadow-xs'
                  : 'bg-[#FAFAFA] text-[#666666] hover:bg-[#FFF7F0] hover:text-[#F47721]'
                  }`}
              >
                <span>SMTP</span>
              </button>
            </div>

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                    <span className="text-xs font-semibold text-[#666666]">Total Users</span>
                    <div className="mt-2 text-2xl font-black text-[#252525]">{users.length}</div>
                  </div>
                  <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                    <span className="text-xs font-semibold text-[#666666]">Registered Students</span>
                    <div className="mt-2 text-2xl font-black text-[#252525]">{studentUsersList.length}</div>
                  </div>
                  <div className="rounded-2xl bg-white border border-[#EEEEEE] p-5 shadow-xs">
                    <span className="text-xs font-semibold text-[#666666]">Faculty Teachers</span>
                    <div className="mt-2 text-2xl font-black text-[#F47721]">{teacherUsersList.length}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#EEEEEE] shadow-xs overflow-hidden">
                  <div className="p-5 border-b border-[#EEEEEE] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FAFAFA]">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-[#252525]">Users</h2>
                      <span className="text-xs text-[#888888]">({filteredUsers.length} shown)</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
                      <div className="relative w-full sm:w-64">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search users..."
                          className="w-full rounded-xl bg-white border border-[#EEEEEE] hover:border-gray-300 pl-9 pr-4 py-1.5 text-xs font-medium text-[#252525] placeholder:text-[#888888] focus:outline-none focus:border-[#F47721] focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        />
                        <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-[#888888]" />
                      </div>

                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add User</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3.5 font-bold">User</th>
                          <th className="px-6 py-3.5 font-bold">Email</th>
                          <th className="px-6 py-3.5 font-bold">Classification</th>
                          <th className="px-6 py-3.5 font-bold">Role</th>
                          <th className="px-6 py-3.5 font-bold text-right">Actions</th>
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
                              No users match your search query.
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
                                  {u.id.slice(0, 8)}...
                                </div>
                              </td>
                              <td className="px-6 py-4 text-[#666666]">
                                {u.email}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  type="button"
                                  onClick={() => handleToggleClassification(u)}
                                  disabled={updatingUserId === u.id}
                                  title="Click to toggle between Student and Teacher"
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition ${u.account_type === 'staff_t'
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                                    }`}
                                >
                                  {updatingUserId === u.id ? (
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                  ) : (
                                    <UserCheck className="h-2.5 w-2.5" />
                                  )}
                                  <span>{u.account_type === 'staff_t' ? 'Teacher' : 'Student'}</span>
                                </button>
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${u.app_role === 'developer'
                                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                                    : u.app_role === 'admin'
                                      ? 'bg-[#FFF7F0] border-[#F47721]/30 text-[#F47721]'
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
                                  <button
                                    onClick={() => handleOpenEditUser(u)}
                                    title="Edit user details and password"
                                    className="p-1.5 rounded-lg border border-[#EEEEEE] hover:bg-[#FFF7F0] text-[#252525] hover:text-[#F47721] transition shadow-2xs"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={updatingUserId === u.id}
                                    title="Delete user account"
                                    className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-[#D94A43] transition shadow-2xs disabled:opacity-40"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
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
            )}

            {activeTab === 'admins' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EEEEEE] pb-4">

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAssignAdminModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3.5 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-[#F47721]" />
                      <span>Promote User</span>
                    </button>
                    <button
                      onClick={() => setShowCreateAdminModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-bold text-white shadow-xs transition"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add New Admin</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#EEEEEE] shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3.5 font-bold">Admin Member</th>
                          <th className="px-6 py-3.5 font-bold">Email</th>
                          <th className="px-6 py-3.5 font-bold">Current Privilege</th>
                          <th className="px-6 py-3.5 font-bold text-right">Adjust Authority</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] font-medium">
                        {adminUsersList.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-12 text-center text-[#666666]">
                              No active administrators configured.
                            </td>
                          </tr>
                        ) : (
                          adminUsersList.map((u) => (
                            <tr key={u.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                              <td className="px-6 py-4">
                                <div className="font-bold text-[#252525]">
                                  {u.display_name || 'Admin User'}
                                </div>
                                <div className="text-[10px] font-mono text-[#888888]">
                                  {u.id.slice(0, 10)}...
                                </div>
                              </td>
                              <td className="px-6 py-4 text-[#666666]">
                                {u.email}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${u.app_role === 'developer'
                                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                                    : u.app_role === 'admin'
                                      ? 'bg-[#FFF7F0] border-[#F47721]/30 text-[#F47721]'
                                      : u.app_role === 'staff'
                                        ? 'bg-green-50 border-green-200 text-[#269B62]'
                                        : 'bg-[#FAFAFA] border-[#EEEEEE] text-[#666666]'
                                    }`}
                                >
                                  {u.app_role.toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {updatingUserId === u.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-[#F47721] ml-auto" />
                                ) : (
                                  <select
                                    value={u.app_role}
                                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                    className="rounded-lg bg-white border border-[#EEEEEE] px-2.5 py-1 text-xs font-semibold text-[#252525] focus:outline-none focus:border-[#F47721]"
                                  >
                                    <option value="developer">Developer (Full Control)</option>
                                    <option value="admin">Admin (Operations & Menu)</option>
                                    <option value="staff">Staff (Scan & Inventory)</option>
                                    <option value="retail">Retail (Inventory Only)</option>
                                    <option value="printer">Printer (Hardware Kiosk)</option>
                                    <option value="customer">Revoke (Demote to Customer)</option>
                                  </select>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api_status' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-[#252525]">System & API Telemetry</h2>
                    <p className="text-xs text-[#666666] mt-0.5">
                      Live status, response latency, and database connectivity measurements
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#888888]">Latency</span>
                    <p className="text-sm font-black text-[#269B62]">
                      {healthData?.total_response_time_ms ?? '—'} ms
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-[#F47721]" />
                        <span className="text-xs font-bold text-[#252525]">Core API Engine</span>
                      </div>
                      <span className="rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[10px] font-bold text-[#269B62]">
                        {healthData?.services?.api_root?.status ?? 'Active'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#666666] space-y-1">
                      <p>Hono Cloudflare Worker runtime</p>
                      <p>Response Latency: <strong>{healthData?.services?.api_root?.latency_ms ?? 1}ms</strong></p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-[#F47721]" />
                        <span className="text-xs font-bold text-[#252525]">PostgreSQL Database</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${healthData?.services?.database?.status === 'healthy'
                        ? 'bg-green-50 border-green-200 text-[#269B62]'
                        : 'bg-red-50 border-red-200 text-[#D94A43]'
                        }`}>
                        {healthData?.services?.database?.status ?? 'Connecting'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#666666] space-y-1">
                      <p>Supabase REST & RLS Schema</p>
                      <p>Ping Latency: <strong>{healthData?.services?.database?.latency_ms ?? '—'}ms</strong></p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#F47721]" />
                        <span className="text-xs font-bold text-[#252525]">Razorpay Gateway</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${healthData?.services?.razorpay_gateway?.status === 'healthy'
                        ? 'bg-green-50 border-green-200 text-[#269B62]'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                        {healthData?.services?.razorpay_gateway?.status ?? 'Unconfigured'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#666666] space-y-1">
                      <p>API Status: <strong>{healthData?.services?.razorpay_gateway?.message ?? 'Testing'}</strong></p>
                      <p>Gateway Latency: <strong>{healthData?.services?.razorpay_gateway?.latency_ms ?? '—'}ms</strong></p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4 text-[#F47721]" />
                        <span className="text-xs font-bold text-[#252525]">Storage Provider</span>
                      </div>
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                        {healthData?.services?.storage_provider?.provider ?? 'Supabase'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#666666] space-y-1">
                      <p>Asset bucket uploads verified</p>
                      <p>Presigned URL dispatch active</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-[#F47721]" />
                        <span className="text-xs font-bold text-[#252525]">SMTP Mail Delivery</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${healthData?.services?.smtp_mailer?.configured
                        ? 'bg-green-50 border-green-200 text-[#269B62]'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                        {healthData?.services?.smtp_mailer?.configured ? 'Ready' : 'Unconfigured'}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#666666] space-y-1">
                      <p>Host: <strong>{healthData?.services?.smtp_mailer?.host || 'Not set'}</strong></p>
                      <p>Port: <strong>{healthData?.services?.smtp_mailer?.port || '587'}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-6">
                {paymentTelemetry?.razorpay_error && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Gateway Notice</p>
                      <p className="mt-0.5 text-[11px]">{paymentTelemetry.razorpay_error}</p>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl bg-white border border-[#EEEEEE] shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                      Recent Razorpay Gateway Charges ({paymentTelemetry?.razorpay_gateway_payments?.length || 0})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3 font-bold">Payment ID</th>
                          <th className="px-6 py-3 font-bold">Amount</th>
                          <th className="px-6 py-3 font-bold">Method</th>
                          <th className="px-6 py-3 font-bold">Status</th>
                          <th className="px-6 py-3 font-bold">Timestamp</th>
                          <th className="px-6 py-3 font-bold text-right">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] font-medium">
                        {!paymentTelemetry?.razorpay_gateway_payments || paymentTelemetry.razorpay_gateway_payments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-[#666666]">
                              No gateway transactions retrieved or API keys unconfigured.
                            </td>
                          </tr>
                        ) : (
                          paymentTelemetry.razorpay_gateway_payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                              <td className="px-6 py-3.5 font-mono text-[11px] font-bold text-[#252525]">
                                {p.id}
                              </td>
                              <td className="px-6 py-3.5 font-bold text-[#F47721]">
                                ₹{(p.amount / 100).toFixed(2)}
                              </td>
                              <td className="px-6 py-3.5 text-[#666666] uppercase text-[10px]">
                                {p.method || 'UPI'} {p.vpa ? `(${p.vpa})` : ''}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === 'captured'
                                  ? 'bg-green-50 border-green-200 text-[#269B62]'
                                  : p.status === 'refunded'
                                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-[#888888] text-[11px]">
                                {new Date(p.created_at * 1000).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                              <td className="px-6 py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setInspectingPayment(p)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#F47721] hover:underline"
                                >
                                  <Eye className="h-3 w-3" />
                                  <span>JSON</span>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl bg-white border border-[#EEEEEE] shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-[#EEEEEE] bg-[#FAFAFA] flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">
                      Internal Database Payments Ledger ({paymentTelemetry?.database_payments?.length || 0})
                    </h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3 font-bold">Internal ID</th>
                          <th className="px-6 py-3 font-bold">Order #</th>
                          <th className="px-6 py-3 font-bold">Amount</th>
                          <th className="px-6 py-3 font-bold">Method</th>
                          <th className="px-6 py-3 font-bold">Status</th>
                          <th className="px-6 py-3 font-bold text-right">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] font-medium">
                        {!paymentTelemetry?.database_payments || paymentTelemetry.database_payments.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-10 text-center text-[#666666]">
                              No database payments recorded.
                            </td>
                          </tr>
                        ) : (
                          paymentTelemetry.database_payments.map((p: any) => (
                            <tr key={p.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                              <td className="px-6 py-3.5 font-mono text-[11px] text-[#666666]">
                                {p.id.slice(0, 8)}...
                              </td>
                              <td className="px-6 py-3.5 font-bold text-[#252525]">
                                {p.orders?.order_number || '—'}
                              </td>
                              <td className="px-6 py-3.5 font-bold text-[#252525]">
                                ₹{(p.amount / 100).toFixed(2)}
                              </td>
                              <td className="px-6 py-3.5 uppercase text-[10px] text-[#888888]">
                                {p.payment_method}
                              </td>
                              <td className="px-6 py-3.5">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${p.status === 'paid' || p.status === 'completed'
                                  ? 'bg-green-50 border-green-200 text-[#269B62]'
                                  : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-6 py-3.5 text-right text-[11px] text-[#888888]">
                                {new Date(p.created_at).toLocaleTimeString('en-IN')}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'smtp' && (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">Current Configuration</h3>
                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between py-2 border-b border-[#EEEEEE]">
                        <span className="text-[#888888]">SMTP Status:</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${healthData?.services?.smtp_mailer?.configured
                          ? 'bg-green-50 border-green-200 text-[#269B62]'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                          {healthData?.services?.smtp_mailer?.configured ? 'Active' : 'Missing Credentials'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-[#EEEEEE]">
                        <span className="text-[#888888]">SMTP Host:</span>
                        <code className="font-mono text-[#252525] font-bold">
                          {healthData?.services?.smtp_mailer?.host || 'Not configured'}
                        </code>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-[#EEEEEE]">
                        <span className="text-[#888888]">SMTP Port:</span>
                        <code className="font-mono text-[#252525] font-bold">
                          {healthData?.services?.smtp_mailer?.port || '587'}
                        </code>
                      </div>

                      <div className="flex items-center justify-between py-2 border-b border-[#EEEEEE]">
                        <span className="text-[#888888]">Sender (From):</span>
                        <code className="font-mono text-[#252525]">
                          {healthData?.services?.smtp_mailer?.from}
                        </code>
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <span className="text-[#888888]">Developer Alert Target:</span>
                        <code className="font-mono text-[#F47721] font-bold">
                          {healthData?.services?.smtp_mailer?.developer_email}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#EEEEEE] bg-white p-5 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#666666]">Send Diagnostic Verification Email</h3>
                    <p className="text-xs text-[#666666]">
                      Test your backend SMTP connection by dispatching an end-to-end verification message to any inbox.
                    </p>

                    <form onSubmit={handleSendTestEmail} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1">
                          Recipient Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={testEmailTo}
                          onChange={(e) => setTestEmailTo(e.target.value)}
                          placeholder="your-email@cev.ac.in"
                          className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={sendingTestEmail}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition"
                      >
                        {sendingTestEmail ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Dispatching...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-3.5 w-3.5" />
                            <span>Send Verification Email</span>
                          </>
                        )}
                      </button>

                      {testEmailResult && (
                        <div className="mt-3 p-3 rounded-xl bg-[#FAFAFA] border border-[#EEEEEE] text-xs font-mono text-[#252525]">
                          {testEmailResult}
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            )}

            {showCreateUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#F47721]" />
                      <span>Create New User Account</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Full Name</label>
                      <input
                        type="text"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        placeholder="student@cev.ac.in"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Temporary Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Campus Classification</label>
                      <select
                        value={createAccountType}
                        onChange={(e) => setCreateAccountType(e.target.value as any)}
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none"
                      >
                        <option value="student">Student (Standard Meal Ordering)</option>
                        <option value="staff_t">Teacher (Post-Pay Active)</option>
                      </select>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setShowCreateUserModal(false)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingUser}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition"
                      >
                        {creatingUser ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Create Account</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-[#F47721]" />
                      <span>Edit User Details & Password</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditUser} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Reset Password</label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Leave blank to retain current password"
                        minLength={6}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1">Classification</label>
                        <select
                          value={editAccountType}
                          onChange={(e) => setEditAccountType(e.target.value as any)}
                          className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                        >
                          <option value="student">Student</option>
                          <option value="staff_t">Teacher</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#252525] mb-1">Role Authority</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Staff</option>
                          <option value="retail">Retail</option>
                          <option value="printer">Printer</option>
                          <option value="admin">Admin</option>
                          <option value="developer">Developer</option>
                        </select>
                      </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-bold text-white shadow-xs disabled:opacity-50 transition"
                      >
                        {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showCreateAdminModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#F47721]" />
                      <span>Provision New Administrator</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateAdminModal(false)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newAdminName}
                        onChange={(e) => setNewAdminName(e.target.value)}
                        placeholder="Admin Name"
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Admin Email</label>
                      <input
                        type="email"
                        required
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        placeholder="admin@cev.ac.in"
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Temporary Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Role Authority Tier</label>
                      <select
                        value={newAdminRole}
                        onChange={(e) => setNewAdminRole(e.target.value as any)}
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      >
                        <option value="admin">Admin (Operations & Menu)</option>
                        <option value="staff">Staff (Kitchen Dispatch & Inventory)</option>
                        <option value="retail">Retail (Inventory Control Only)</option>
                        <option value="printer">Printer (Hardware Bill & QR Kiosk)</option>
                        <option value="developer">Developer (Full Control & Debug)</option>
                      </select>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setShowCreateAdminModal(false)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingAdmin}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition"
                      >
                        {creatingAdmin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Create Admin</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showAssignAdminModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-[#F47721]" />
                      <span>Promote Existing User to Admin</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAssignAdminModal(false)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAssignAdmin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Select Candidate User</label>
                      <select
                        required
                        value={assignCandidateId}
                        onChange={(e) => setAssignCandidateId(e.target.value)}
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      >
                        <option value="">Select a user...</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.display_name || 'Unnamed'} ({u.email}) - {u.app_role.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1">Target Authority Tier</label>
                      <select
                        value={assignRole}
                        onChange={(e) => setAssignRole(e.target.value as any)}
                        className="w-full rounded-xl border border-[#EEEEEE] bg-white px-3.5 py-2 text-xs text-[#252525] focus:border-[#F47721]"
                      >
                        <option value="admin">Admin (Operations & Menu)</option>
                        <option value="staff">Staff (Kitchen Dispatch & Inventory)</option>
                        <option value="retail">Retail (Inventory Control Only)</option>
                        <option value="printer">Printer (Hardware Bill & QR Kiosk)</option>
                        <option value="developer">Developer (Full Control & Debug)</option>
                      </select>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setShowAssignAdminModal(false)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={assigningAdmin || !assignCandidateId}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-bold text-white disabled:opacity-50 transition"
                      >
                        {assigningAdmin ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        <span>Assign Authority</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {inspectingPayment && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#F47721]" />
                      <span>Razorpay Payload Inspection ({inspectingPayment.id})</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setInspectingPayment(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <pre className="p-4 rounded-2xl bg-[#161822] text-[#269B62] font-mono text-[11px] overflow-x-auto max-h-96">
                    {JSON.stringify(inspectingPayment, null, 2)}
                  </pre>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setInspectingPayment(null)}
                      className="rounded-full bg-[#252525] px-4 py-2 text-xs font-bold text-white hover:bg-black transition"
                    >
                      Close Inspector
                    </button>
                  </div>
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
