export interface Env {
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_JWT_SECRET?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  R2_PUBLIC_URL?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}

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
  reviewed_by: string | null;
  reviewed_at: string | null;
  app_role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  email_confirmed_at?: string | null;
}

export interface AuthContextVariables {
  user: AuthenticatedUser;
  profile: UserProfile;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  category_id: string;
  category_name?: string;
  name: string;
  description: string | null;
  price: number;
  image_key: string | null;
  image_url?: string | null;
  is_available: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}
