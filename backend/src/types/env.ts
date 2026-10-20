export interface Env {
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_JWT_SECRET?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}

export type AccountType = 'student' | 'staff';
export type AppRole = 'customer' | 'admin';

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_key: string | null;
  account_type: AccountType;
  app_role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
}

export interface AuthContextVariables {
  user: AuthenticatedUser;
  profile: UserProfile;
}
