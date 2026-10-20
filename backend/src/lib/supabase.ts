import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env, AuthenticatedUser, UserProfile, AccountType, StaffApprovalStatus, AppRole } from '../types/env';

export function getSupabaseAdminClient(env?: Env): SupabaseClient | null {
  if (!env) {
    return null;
  }
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function getSupabaseUserClient(env?: Env, token?: string): SupabaseClient | null {
  if (!env || !token) {
    return null;
  }
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return null;
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

export interface VerificationSuccess {
  success: true;
  user: AuthenticatedUser;
  profile: UserProfile;
}

export interface VerificationFailure {
  success: false;
  statusCode: 401 | 500;
  code: string;
  message: string;
}

export type VerificationResult = VerificationSuccess | VerificationFailure;

export async function verifySupabaseToken(
  token: string,
  env?: Env
): Promise<VerificationResult> {
  const adminClient = getSupabaseAdminClient(env);
  const userClient = getSupabaseUserClient(env, token);

  if (!adminClient || !userClient) {
    return {
      success: false,
      statusCode: 500,
      code: 'AUTH_CONFIG_MISSING',
      message: 'Supabase authentication service is unconfigured on the server',
    };
  }

  const { data: userData, error: userError } = await userClient.auth.getUser(token);

  if (userError || !userData?.user) {
    return {
      success: false,
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: userError?.message || 'Invalid, expired, or malformed authentication token',
    };
  }

  const user: AuthenticatedUser = {
    id: userData.user.id,
    email: userData.user.email ?? null,
    email_confirmed_at: userData.user.email_confirmed_at ?? null,
  };

  const { data: profileData, error: profileError } = await adminClient
    .from('profiles')
    .select('id, display_name, avatar_key, account_type, requested_account_type, approved_account_type, staff_approval_status, reviewed_by, reviewed_at, app_role, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    return {
      success: false,
      statusCode: 500,
      code: 'DATABASE_ERROR',
      message: 'Failed to retrieve profile record',
    };
  }

  const profile: UserProfile = profileData
    ? {
        id: profileData.id,
        display_name: profileData.display_name,
        avatar_key: profileData.avatar_key,
        account_type: (profileData.approved_account_type === 'staff' ? 'staff' : 'student') as AccountType,
        requested_account_type: (profileData.requested_account_type === 'staff' ? 'staff' : 'student') as AccountType,
        approved_account_type: (profileData.approved_account_type === 'staff' ? 'staff' : 'student') as AccountType,
        staff_approval_status: (['not_requested', 'pending', 'approved', 'rejected'].includes(profileData.staff_approval_status)
          ? profileData.staff_approval_status
          : 'not_requested') as StaffApprovalStatus,
        reviewed_by: profileData.reviewed_by ?? null,
        reviewed_at: profileData.reviewed_at ?? null,
        app_role: (profileData.app_role === 'admin' ? 'admin' : 'customer') as AppRole,
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      }
    : {
        id: user.id,
        display_name: (userData.user.user_metadata?.display_name as string) || (user.email ? user.email.split('@')[0] : 'User'),
        avatar_key: null,
        account_type: 'student',
        requested_account_type: (userData.user.user_metadata?.account_type === 'staff' ? 'staff' : 'student') as AccountType,
        approved_account_type: 'student',
        staff_approval_status: userData.user.user_metadata?.account_type === 'staff' ? 'pending' : 'not_requested',
        reviewed_by: null,
        reviewed_at: null,
        app_role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

  return {
    success: true,
    user,
    profile,
  };
}
