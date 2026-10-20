'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  display_name: string | null;
  avatar_key: string | null;
  account_type: 'student' | 'staff';
  app_role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}

interface AdminAuthContextType {
  adminUser: User | null;
  adminProfile: AdminProfile | null;
  session: Session | null;
  loading: boolean;
  isUnauthorized: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; isUnauthorized?: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshVerification: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isUnauthorized, setIsUnauthorized] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const verifyRole = useCallback(async (userId: string, accessToken: string): Promise<{ isAllowed: boolean; profile: AdminProfile | null }> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

    try {
      const res = await fetch(`${apiUrl}/api/v1/admin/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (res.status === 200) {
        const json = await res.json();
        return { isAllowed: true, profile: json.data?.profile as AdminProfile };
      }

      if (res.status === 403) {
        return { isAllowed: false, profile: null };
      }
    } catch {
      // Backend may be offline in dev, fall back to Supabase client check
    }

    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!profileErr && data && data.app_role === 'admin') {
        return { isAllowed: true, profile: data as AdminProfile };
      }
    } catch {
      // Fallback failed
    }

    return { isAllowed: false, profile: null };
  }, []);

  const evaluateSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession || !currentSession.user) {
      setAdminUser(null);
      setAdminProfile(null);
      setIsUnauthorized(false);
      return;
    }

    const verification = await verifyRole(currentSession.user.id, currentSession.access_token);

    if (verification.isAllowed) {
      setAdminUser(currentSession.user);
      setAdminProfile(verification.profile);
      setIsUnauthorized(false);
    } else {
      setAdminUser(currentSession.user);
      setAdminProfile(null);
      setIsUnauthorized(true);
    }
  }, [verifyRole]);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        setSession(data.session);
        await evaluateSession(data.session);
      } catch (err: any) {
        if (mounted) setError(err.message || 'Session verification error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      await evaluateSession(newSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [evaluateSession]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInErr) {
        setError(signInErr.message);
        return { success: false, error: signInErr.message };
      }

      if (!data.session || !data.user) {
        return { success: false, error: 'Failed to retrieve session token' };
      }

      const verification = await verifyRole(data.user.id, data.session.access_token);

      if (!verification.isAllowed) {
        setIsUnauthorized(true);
        setAdminUser(data.user);
        setAdminProfile(null);
        return { success: false, isUnauthorized: true, error: 'Access Denied: Account lacks administrator privileges' };
      }

      setAdminUser(data.user);
      setAdminProfile(verification.profile);
      setIsUnauthorized(false);
      setSession(data.session);

      return { success: true };
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignored
    } finally {
      setAdminUser(null);
      setAdminProfile(null);
      setSession(null);
      setIsUnauthorized(false);
    }
  };

  const refreshVerification = async () => {
    if (session) {
      await evaluateSession(session);
    }
  };

  return (
    <AdminAuthContext.Provider
      value={{
        adminUser,
        adminProfile,
        session,
        loading,
        isUnauthorized,
        error,
        signIn,
        signOut,
        refreshVerification,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextType {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
