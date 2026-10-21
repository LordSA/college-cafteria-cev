export interface Env {
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  STORAGE_PROVIDER?: 'supabase' | 'r2';
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

export type StorageProviderType = 'supabase' | 'r2';
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
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready_for_pickup' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'testing_wallet' | 'counter_cash' | 'razorpay';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_id: string;
  order_number: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  paid_at?: string | null;
  qr_verification_token?: string | null;
  collected_at?: string | null;
  collected_by?: string | null;
  subtotal: number;
  total: number;
  idempotency_key?: string | null;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  confirmed_at?: string | null;
  preparing_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface InventoryLog {
  id: string;
  menu_item_id: string;
  quantity_change: number;
  reason: 'order_placed' | 'order_cancelled' | 'manual_adjustment' | 'restock';
  order_id?: string | null;
  actor_id?: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  customer_id: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

export type WalletTransactionType = 'credit' | 'debit';

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  customer_id: string;
  amount: number;
  transaction_type: WalletTransactionType;
  balance_after: number;
  reason: string;
  order_id?: string | null;
  actor_id?: string | null;
  created_at: string;
}
