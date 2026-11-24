'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Footer } from '../../components/Footer';
import { AdminSidebar } from '../../components/AdminSidebar';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  Users,
  Plus,
  UserPlus,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Mail,
  ShieldCheck,
  Trash2,
  Check,
  Pencil,
} from 'lucide-react';

interface Teacher {
  id: string;
  display_name: string | null;
  email: string | null;
  account_type: string;
  approved_account_type?: string;
  staff_approval_status?: string;
  created_at: string;
}

interface Candidate {
  id: string;
  display_name: string | null;
  email: string | null;
  account_type: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export default function TeacherManagementPage() {
  const router = useRouter();
  const { adminUser, isUnauthorized, loading: authLoading, session, canReviewStaff } = useAdminAuth();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!adminUser) {
        router.push('/login');
      } else if (isUnauthorized || !canReviewStaff) {
        router.push('/unauthorized');
      }
    }
  }, [adminUser, isUnauthorized, canReviewStaff, authLoading, router]);

  const loadData = async () => {
    if (!session?.access_token) return;

    setLoading(true);
    setError(null);
    try {
      const [teachersRes, candidatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/list?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }),
        fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/candidates?t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        }),
      ]);

      const teachersBody = await teachersRes.json();
      const candidatesBody = await candidatesRes.json();

      if (!teachersRes.ok || !teachersBody.success) {
        throw new Error(teachersBody.error?.message || 'Failed to fetch teachers');
      }

      setTeachers(teachersBody.data || []);
      setCandidates(candidatesBody.data || []);
      if (candidatesBody.data?.length > 0 && !selectedCandidateId) {
        setSelectedCandidateId(candidatesBody.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading teachers data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminUser && !isUnauthorized) {
      loadData();
    }
  }, [adminUser, isUnauthorized, session?.access_token]);

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!newEmail.trim() || !newPassword.trim()) {
      setError('Email and temporary password are required.');
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newEmail.trim(),
          password: newPassword,
          display_name: newName.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to create teacher account');
      }

      setSuccessMessage(`Teacher account created for ${newEmail}`);
      setShowCreateModal(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error creating teacher account');
    } finally {
      setCreating(false);
    }
  };

  const handleAssignCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) return;

    if (!selectedCandidateId) {
      setError('Please select an account to promote.');
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: selectedCandidateId,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to assign teacher status');
      }

      setSuccessMessage('Account promoted to Faculty Teacher successfully.');
      setShowAssignModal(false);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error assigning teacher status');
    } finally {
      setAssigning(false);
    }
  };

  const handleRevokeTeacher = async (teacher: Teacher) => {
    if (!session?.access_token) return;

    if (!confirm(`Are you sure you want to revoke teacher status for "${teacher.display_name || teacher.email}"? Their account will revert to student status.`)) {
      return;
    }

    setActionInProgress(teacher.id);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          user_id: teacher.id,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to revoke teacher status');
      }

      setSuccessMessage('Teacher status revoked successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error revoking teacher status');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setEditName(teacher.display_name || '');
    setEditEmail(teacher.email || '');
    setEditPassword('');
    setError(null);
  };

  const handleSaveEditTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !session?.access_token) return;

    if (!editEmail.trim()) {
      setError('Email address is required.');
      return;
    }

    if (editPassword.trim() && editPassword.trim().length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setSavingEdit(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/staff-requests/teachers/${editingTeacher.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          display_name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword.trim() || undefined,
        }),
      });

      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body.error?.message || 'Failed to update teacher details');
      }

      setTeachers((prev) =>
        prev.map((t) =>
          t.id === editingTeacher.id
            ? { ...t, display_name: editName.trim() || null, email: editEmail.trim() }
            : t
        )
      );

      setSuccessMessage('Teacher details updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3500);
      setEditingTeacher(null);
    } catch (err: any) {
      setError(err.message || 'Error updating teacher details');
    } finally {
      setSavingEdit(false);
    }
  };

  if (authLoading || !adminUser || isUnauthorized) {
    return (
      <>
        <main className="flex-1 flex items-center justify-center py-20 bg-white">
          <div className="flex flex-col items-center gap-3 text-[#666666]">
            <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
            <p className="text-xs font-semibold">Verifying permissions...</p>
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
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[#252525] sm:text-3xl">
                  Teachers Management
                </h1>
                <p className="mt-1 text-xs text-[#666666]">
                  Directly register faculty teachers or assign existing accounts to teacher post-pay status
                </p>
              </div>

              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={loadData}
                  disabled={loading}
                  className="col-span-2 sm:col-auto inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] disabled:opacity-50 transition shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-[#F47721] ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => setShowAssignModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-4 py-2 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-xs"
                >
                  <UserPlus className="h-3.5 w-3.5 text-[#F47721]" />
                  <span>Assign User</span>
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl sm:rounded-full bg-[#F47721] hover:bg-[#E06310] px-4 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Teacher</span>
                </button>
              </div>
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
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#666666]">
                <Loader2 className="h-8 w-8 animate-spin text-[#F47721]" />
                <p className="text-xs font-semibold">Loading teachers directory...</p>
              </div>
            ) : teachers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[#EEEEEE] bg-[#FAFAFA] p-12 text-center">
                <Users className="mx-auto h-8 w-8 text-[#888888]" />
                <h3 className="mt-3 text-sm font-bold text-[#252525]">No Teachers Registered</h3>
                <p className="mt-1 text-xs text-[#666666]">
                  Click &quot;Add Teacher&quot; to register a faculty member with email and password or promote an existing account.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className="flex flex-col justify-between rounded-2xl border border-[#EEEEEE] bg-white p-3.5 shadow-xs hover:border-[#F47721]/30 transition"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="h-8 w-8 rounded-full bg-[#FFF7F0] border border-[#F47721]/20 flex items-center justify-center text-[#F47721] font-black text-xs flex-shrink-0">
                            {((teacher.display_name || teacher.email || 'T')[0] || 'T').toUpperCase()}
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            <span>Post-Pay</span>
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs text-[#252525] line-clamp-1">
                            {teacher.display_name || 'Faculty Member'}
                          </h4>
                          <div className="flex items-center gap-1 text-[10px] text-[#666666] line-clamp-1 mt-0.5">
                            <Mail className="h-2.5 w-2.5 text-[#888888] flex-shrink-0" />
                            <span className="truncate">{teacher.email || 'No email'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 pt-3 mt-2 border-t border-[#EEEEEE]">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(teacher)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] py-1.5 px-2 text-[11px] font-bold text-[#252525] hover:text-[#F47721] transition shadow-2xs"
                        >
                          <Pencil className="h-3 w-3 text-[#F47721]" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevokeTeacher(teacher)}
                          disabled={actionInProgress === teacher.id}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-red-200 bg-red-50 py-1.5 px-2 text-[11px] font-bold text-[#D94A43] hover:bg-red-100 disabled:opacity-40 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Revoke</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-hidden rounded-2xl border border-[#EEEEEE] bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-[#252525]">
                      <thead className="bg-[#FAFAFA] uppercase text-[10px] tracking-wider text-[#666666] border-b border-[#EEEEEE]">
                        <tr>
                          <th className="px-6 py-3.5 font-bold">Faculty Name</th>
                          <th className="px-6 py-3.5 font-bold">Email</th>
                          <th className="px-6 py-3.5 font-bold">Post-Pay Status</th>
                          <th className="px-6 py-3.5 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEEEEE] font-medium">
                        {teachers.map((teacher) => (
                          <tr key={teacher.id} className="hover:bg-[#FFF7F0]/30 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-[#FFF7F0] border border-[#F47721]/20 flex items-center justify-center text-[#F47721] font-bold text-xs">
                                  {((teacher.display_name || teacher.email || 'T')[0] || 'T').toUpperCase()}
                                </div>
                                <span className="font-bold text-[#252525]">
                                  {teacher.display_name || 'Faculty Member'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-[#666666]">
                              <div className="flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-[#888888]" />
                                <span>{teacher.email || 'No email on record'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700">
                                <ShieldCheck className="h-3 w-3" />
                                <span>Faculty Post-Pay</span>
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(teacher)}
                                  title="Edit faculty teacher details"
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#EEEEEE] bg-white hover:bg-[#FFF7F0] px-3 py-1.5 text-xs font-bold text-[#252525] hover:text-[#F47721] transition shadow-2xs"
                                >
                                  <Pencil className="h-3.5 w-3.5 text-[#F47721]" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleRevokeTeacher(teacher)}
                                  disabled={actionInProgress === teacher.id}
                                  title="Revoke faculty teacher privileges"
                                  className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-[#D94A43] hover:bg-red-100 disabled:opacity-40 transition"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Revoke</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {showCreateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Plus className="h-4 w-4 text-[#F47721]" />
                      <span>Register New Teacher</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateTeacher} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="newName">
                        Faculty Full Name
                      </label>
                      <input
                        id="newName"
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Dr. Rajesh Kumar"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="newEmail">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="newEmail"
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="teacher@cev.ac.in"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="newPassword">
                        Initial Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="newPassword"
                        type="password"
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setShowCreateModal(false)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                      >
                        {creating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Creating...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Create Teacher</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showAssignModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-[#F47721]" />
                      <span>Assign Existing Account to Teacher</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAssignModal(false)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAssignCandidate} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="candidateSelect">
                        Select Existing User
                      </label>
                      {candidates.length === 0 ? (
                        <p className="text-xs text-[#666666] py-2">No student accounts available to promote.</p>
                      ) : (
                        <select
                          id="candidateSelect"
                          required
                          value={selectedCandidateId}
                          onChange={(e) => setSelectedCandidateId(e.target.value)}
                          className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                        >
                          {candidates.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.display_name || 'Unnamed'} ({c.email || c.id.slice(0, 8)})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setShowAssignModal(false)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={assigning || candidates.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                      >
                        {assigning ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Assigning...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Promote to Teacher</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingTeacher && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EEEEEE] space-y-4">
                  <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
                    <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
                      <Pencil className="h-4 w-4 text-[#F47721]" />
                      <span>Edit Teacher Details</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setEditingTeacher(null)}
                      className="rounded-full p-1 text-[#666666] hover:bg-gray-100 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditTeacher} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editTeacherName">
                        Faculty Full Name
                      </label>
                      <input
                        id="editTeacherName"
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Dr. Rajesh Kumar"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editTeacherEmail">
                        Email Address
                      </label>
                      <input
                        id="editTeacherEmail"
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="teacher@cev.ac.in"
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#252525] mb-1" htmlFor="editTeacherPassword">
                        New Password (Optional)
                      </label>
                      <input
                        id="editTeacherPassword"
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="Leave blank to keep current password"
                        minLength={6}
                        className="w-full rounded-xl border border-[#EEEEEE] hover:border-gray-300 bg-white px-3.5 py-2.5 text-xs text-[#252525] focus:border-[#F47721] focus:outline-none focus:ring-2 focus:ring-[#F47721]/20 transition-all"
                      />
                      <p className="mt-1 text-[11px] text-[#888888]">Minimum 6 characters if updating</p>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#EEEEEE]">
                      <button
                        type="button"
                        onClick={() => setEditingTeacher(null)}
                        className="rounded-xl border border-[#EEEEEE] bg-white px-4 py-2 text-xs font-bold text-[#666666] hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#F47721] hover:bg-[#E06310] px-5 py-2 text-xs font-black text-white shadow-md shadow-[#F47721]/20 disabled:opacity-50 transition"
                      >
                        {savingEdit ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            <span>Save Changes</span>
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
