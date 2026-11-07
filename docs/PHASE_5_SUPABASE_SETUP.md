# Phase 5 — Supabase Setup & Database Security Hardening Guide

> **Scope:** Authoritative database migration instructions, RLS policies, role management, and Supabase Auth configuration for Phase 5.

---

## 1. Migration Execution Summary

The migration file is saved in the repository at:
`supabase/migrations/20261107000001_phase_5_security_and_roles.sql`

If you are using the Supabase CLI:
```bash
npx supabase db push
```

If you are applying changes directly via the **Supabase Dashboard**:
Open **Supabase Dashboard &rarr; SQL Editor &rarr; New Query**, paste the SQL script from Section 2, and click **Run**.

---

## 2. Complete SQL Migration Script (Execute in Supabase SQL Editor)

```sql
-- 1. Extend public.profiles app_role check constraint to include all 4 admin roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_app_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_role_check
  CHECK (app_role IN ('customer', 'developer', 'admin', 'retail', 'staff'));

-- 2. Add teacher_id to public.profiles with unique constraint
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS teacher_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_profiles_teacher_id'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT uq_profiles_teacher_id UNIQUE (teacher_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_teacher_id ON public.profiles(teacher_id) WHERE teacher_id IS NOT NULL;

-- 3. Add Razorpay reference columns to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id text;

CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON public.orders(razorpay_payment_id);

-- 4. Create public.payments table for authoritative gateway records
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id text NOT NULL,
  razorpay_payment_id text,
  razorpay_signature text,
  amount integer NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'authorized', 'captured', 'failed', 'refunded')),
  payment_method text NOT NULL DEFAULT 'razorpay',
  error_code text,
  error_description text,
  captured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_payments_razorpay_order UNIQUE (razorpay_order_id)
);

CREATE INDEX IF NOT EXISTS idx_payments_order ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_razorpay_payment ON public.payments(razorpay_payment_id);

-- 5. Create public.payment_webhook_events table for deduplicated webhook handling
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'ignored', 'failed')),
  processed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.payment_webhook_events(status);

-- 6. Enable RLS on newly created tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for Payments
DROP POLICY IF EXISTS "Customers can view own payments" ON public.payments;
CREATE POLICY "Customers can view own payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
CREATE POLICY "Admins can manage payments"
  ON public.payments
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Service role access for webhook events" ON public.payment_webhook_events;
CREATE POLICY "Service role access for webhook events"
  ON public.payment_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 8. Updated public.is_admin() helper to include developer and admin roles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND app_role IN ('developer', 'admin')
  );
$$;

-- 9. Profile field protection trigger
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT app_role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF auth.uid() = NEW.id AND (v_caller_role IS NULL OR v_caller_role NOT IN ('developer')) THEN
    IF NEW.app_role IS DISTINCT FROM OLD.app_role THEN
      RAISE EXCEPTION 'ERR_FORBIDDEN: You are not authorized to alter your app role';
    END IF;

    IF NEW.account_type IS DISTINCT FROM OLD.account_type THEN
      RAISE EXCEPTION 'ERR_FORBIDDEN: You are not authorized to alter your account type directly';
    END IF;

    IF NEW.approved_account_type IS DISTINCT FROM OLD.approved_account_type THEN
      RAISE EXCEPTION 'ERR_FORBIDDEN: You are not authorized to alter approved account type';
    END IF;

    IF NEW.staff_approval_status IS DISTINCT FROM OLD.staff_approval_status THEN
      IF NOT (OLD.staff_approval_status IN ('not_requested', 'rejected') AND NEW.staff_approval_status = 'pending') THEN
        RAISE EXCEPTION 'ERR_FORBIDDEN: You cannot alter staff approval status';
      END IF;
    END IF;

    IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
      RAISE EXCEPTION 'ERR_FORBIDDEN: You cannot alter staff review audit fields';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

-- 10. Dedicated security-definer function for authorized role management
CREATE OR REPLACE FUNCTION public.set_user_role(
  p_target_user_id uuid,
  p_new_role text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT app_role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'developer' AND auth.jwt()->>'role' != 'service_role' THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Only developers can modify user roles';
  END IF;

  IF p_new_role NOT IN ('customer', 'developer', 'admin', 'retail', 'staff') THEN
    RAISE EXCEPTION 'ERR_INVALID_ROLE: Role % is not recognized', p_new_role;
  END IF;

  UPDATE public.profiles
  SET app_role = p_new_role,
      updated_at = now()
  WHERE id = p_target_user_id;

  RETURN jsonb_build_object(
    'user_id', p_target_user_id,
    'app_role', p_new_role,
    'updated_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, text) TO authenticated, service_role;
```

---

## 3. Provisioning the Initial Developer Account

To bootstrap the very first developer account on your Supabase project:
1. Locate your user UUID in **Supabase Dashboard &rarr; Authentication &rarr; Users**.
2. Run this query in the SQL Editor:
```sql
UPDATE public.profiles
SET app_role = 'developer'
WHERE id = '<YOUR_USER_UUID>';
```
3. Once assigned, this user can manage all other roles directly via the Developer Console at `/developer`.

---

## 4. Required Supabase Auth & Redirect Configurations

In **Supabase Dashboard &rarr; Authentication &rarr; URL Configuration**:
- **Site URL:** `http://localhost:3000` (production: your deployed domain)
- **Additional Redirect URLs:**
  - `http://localhost:3000/**`
  - `http://localhost:3000/reset-password`
  - `http://localhost:3000/settings`
  - `http://localhost:3001/**`
  - `http://localhost:3001/reset-password`

In **Supabase Dashboard &rarr; Authentication &rarr; Providers &rarr; Google**:
- Enable Google provider.
- Client ID & Client Secret from Google Cloud Console.
- Authorized redirect URI: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`

---

## 5. Storage Policies Check

Verify `avatars` and `food-images` buckets exist in **Storage**:
- Bucket `avatars`: Public = false or true with read policy `auth.role() = 'authenticated'` or public reads for public display.
- Bucket `food-images`: Public = true.

---

## 6. Verification Queries

Run these queries after applying the migration to verify all components:

```sql
-- 1. Check profiles app_role constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'profiles_app_role_check';

-- 2. Verify payments table exists
SELECT count(*) FROM public.payments;

-- 3. Verify webhook events table exists
SELECT count(*) FROM public.payment_webhook_events;

-- 4. Verify trigger is active
SELECT tgname, relname FROM pg_trigger t 
JOIN pg_class c ON c.oid = t.tgrelid 
WHERE tgname = 'trg_protect_profile_fields';
```
