'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AccountType = 'student' | 'staff';
export type StaffApprovalStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';
export type AppRole = 'customer' | 'admin';

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_key: string | null;
  account_type: AccountType;
  requested_account_type: AccountType;
  approved_account_type: AccountType;
  staff_approval_status: StaffApprovalStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  app_role: AppRole;
  created_at: string;
  updated_at: string;
}

interface SignUpParams {
  email: string;
  password: string;
  displayName: string;
  accountType: AccountType;
}

interface SignInParams {
  email: string;
  password: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  signIn: (params: SignInParams) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<{ success: boolean; error?: string }>;
  updateAvatarKey: (avatarKey: string) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string, userMeta?: Record<string, any>, userEmail?: string) => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileErr) {
        throw profileErr;
      }

      if (data) {
        setProfile({
          id: data.id,
          display_name: data.display_name,
          avatar_key: data.avatar_key,
          account_type: data.account_type || 'student',
          requested_account_type: data.requested_account_type || 'student',
          approved_account_type: data.approved_account_type || 'student',
          staff_approval_status: data.staff_approval_status || 'not_requested',
          reviewed_by: data.reviewed_by,
          reviewed_at: data.reviewed_at,
          app_role: data.app_role || 'customer',
          created_at: data.created_at,
          updated_at: data.updated_at,
        });
      } else {
        const reqType = userMeta?.account_type === 'staff' ? 'staff' : 'student';
        setProfile({
          id: userId,
          display_name: userMeta?.display_name || (userEmail ? userEmail.split('@')[0] : 'User'),
          avatar_key: null,
          account_type: 'student',
          requested_account_type: reqType,
          approved_account_type: 'student',
          staff_approval_status: reqType === 'staff' ? 'pending' : 'not_requested',
          app_role: 'customer',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch {
      const reqType = userMeta?.account_type === 'staff' ? 'staff' : 'student';
      setProfile({
        id: userId,
        display_name: userMeta?.display_name || (userEmail ? userEmail.split('@')[0] : 'User'),
        avatar_key: null,
        account_type: 'student',
        requested_account_type: reqType,
        approved_account_type: 'student',
        staff_approval_status: reqType === 'staff' ? 'pending' : 'not_requested',
        app_role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id, user.user_metadata, user.email);
    }
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;

        const currentSession = sessionData.session;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchProfile(
            currentSession.user.id,
            currentSession.user.user_metadata,
            currentSession.user.email
          );
        } else {
          setProfile(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Session initialization error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await fetchProfile(
          newSession.user.id,
          newSession.user.user_metadata,
          newSession.user.email
        );
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signUp = async ({ email, password, displayName, accountType }: SignUpParams) => {
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            account_type: accountType,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return { success: false, error: signUpError.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, { display_name: displayName, account_type: accountType }, email);
      }

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Signup failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signIn = async ({ email, password }: SignInParams) => {
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return { success: false, error: signInError.message };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, data.user.user_metadata, data.user.email);
      }

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const updateDisplayName = async (newDisplayName: string) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ display_name: newDisplayName })
        .eq('id', user.id);

      if (dbError) {
        throw dbError;
      }

      await supabase.auth.updateUser({
        data: { display_name: newDisplayName },
      });

      await refreshProfile();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile' };
    }
  };

  const updateAvatarKey = async (avatarKey: string) => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_key: avatarKey })
        .eq('id', user.id);

      if (dbError) {
        throw dbError;
      }

      await refreshProfile();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update profile avatar' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        updateDisplayName,
        updateAvatarKey,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
