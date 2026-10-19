export interface Env {
  ENVIRONMENT?: string;
  ALLOWED_ORIGINS?: string;
  // Future infrastructure integration bindings
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
}
