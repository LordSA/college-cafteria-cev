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
    .select('id, display_name, avatar_key, account_type, app_role, created_at, updated_at')
    .eq('id', user.id)
    .maybeSingle();

  let activeProfile = profileData;

  if (profileError || !activeProfile) {
    try {
      const fallbackName = userData.user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer';
      const rawType = userData.user.user_metadata?.account_type as string | undefined;
      const fallbackAccount = rawType === 'staff' || rawType === 'staff_t' ? 'staff_t' : 'student';
      const { data: upsertedProf } = await adminClient
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email,
            display_name: fallbackName,
            account_type: fallbackAccount,
            app_role: 'customer',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('id, display_name, avatar_key, account_type, app_role, created_at, updated_at')
        .maybeSingle();

      if (upsertedProf) {
        activeProfile = upsertedProf;
      }
    } catch {}
  }

  const mapAccountType = (type?: string | null): AccountType => {
    if (type === 'staff' || type === 'staff_t') return 'staff_t';
    return 'student';
  };

  const mapAppRole = (role?: string | null): AppRole => {
    const validRoles: AppRole[] = ['customer', 'developer', 'admin', 'retail', 'staff', 'printer'];
    if (role && validRoles.includes(role as AppRole)) {
      return role as AppRole;
    }
    return 'customer';
  };

  const profile: UserProfile = activeProfile
    ? {
        id: activeProfile.id,
        display_name: activeProfile.display_name,
        avatar_key: activeProfile.avatar_key,
        account_type: mapAccountType(activeProfile.account_type),
        requested_account_type: mapAccountType(activeProfile.account_type),
        approved_account_type: mapAccountType(activeProfile.account_type),
        staff_approval_status: (activeProfile.account_type === 'staff_t' ? 'approved' : 'not_requested') as StaffApprovalStatus,
        reviewed_by: null,
        reviewed_at: null,
        app_role: mapAppRole(activeProfile.app_role),
        created_at: activeProfile.created_at,
        updated_at: activeProfile.updated_at,
      }
    : {
        id: user.id,
        display_name: (userData.user.user_metadata?.display_name as string) || (user.email ? user.email.split('@')[0] : 'User'),
        avatar_key: null,
        account_type: mapAccountType(userData.user.user_metadata?.account_type as string),
        requested_account_type: mapAccountType(userData.user.user_metadata?.account_type as string),
        approved_account_type: mapAccountType(userData.user.user_metadata?.account_type as string),
        staff_approval_status: (userData.user.user_metadata?.account_type === 'staff' || userData.user.user_metadata?.account_type === 'staff_t') ? 'approved' : 'not_requested',
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
