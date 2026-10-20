-- Phase 3: Staff Approvals, Category & Menu Management Migration
-- Schema for Cafteria Platform

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_account_type text DEFAULT 'student' CHECK (requested_account_type IN ('student', 'staff')),
  ADD COLUMN IF NOT EXISTS approved_account_type text DEFAULT 'student' CHECK (approved_account_type IN ('student', 'staff')),
  ADD COLUMN IF NOT EXISTS staff_approval_status text DEFAULT 'not_requested' CHECK (staff_approval_status IN ('not_requested', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE public.profiles
SET requested_account_type = COALESCE(account_type, 'student'),
    approved_account_type = COALESCE(account_type, 'student'),
    staff_approval_status = CASE WHEN account_type = 'staff' THEN 'approved' ELSE 'not_requested' END
WHERE requested_account_type IS NULL OR staff_approval_status IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN requested_account_type SET NOT NULL,
  ALTER COLUMN approved_account_type SET NOT NULL,
  ALTER COLUMN staff_approval_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_staff_status ON public.profiles(staff_approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_type ON public.profiles(approved_account_type);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requested_type text;
  v_approved_type text;
  v_status text;
BEGIN
  v_requested_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'student');
  IF v_requested_type NOT IN ('student', 'staff') THEN
    v_requested_type := 'student';
  END IF;

  IF v_requested_type = 'staff' THEN
    v_approved_type := 'student';
    v_status := 'pending';
  ELSE
    v_approved_type := 'student';
    v_status := 'not_requested';
  END IF;

  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_key,
    account_type,
    requested_account_type,
    approved_account_type,
    staff_approval_status,
    app_role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULL,
    v_approved_type,
    v_requested_type,
    v_approved_type,
    v_status,
    'customer',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET display_name = EXCLUDED.display_name,
      updated_at = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user != 'service_role' THEN
    IF OLD.app_role IS DISTINCT FROM NEW.app_role THEN
      RAISE EXCEPTION 'Unauthorized: Modifying app_role is forbidden';
    END IF;

    IF OLD.approved_account_type IS DISTINCT FROM NEW.approved_account_type THEN
      RAISE EXCEPTION 'Unauthorized: Modifying approved_account_type is forbidden';
    END IF;

    IF OLD.staff_approval_status IS DISTINCT FROM NEW.staff_approval_status THEN
      RAISE EXCEPTION 'Unauthorized: Modifying staff_approval_status is forbidden';
    END IF;

    IF OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by THEN
      RAISE EXCEPTION 'Unauthorized: Modifying reviewed_by is forbidden';
    END IF;

    IF OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at THEN
      RAISE EXCEPTION 'Unauthorized: Modifying reviewed_at is forbidden';
    END IF;

    IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
      RAISE EXCEPTION 'Unauthorized: Modifying account_type is forbidden';
    END IF;
  END IF;

  NEW.account_type = NEW.approved_account_type;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  image_key text,
  is_available boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON public.menu_items(is_available, is_archived);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
  ON public.categories
  FOR SELECT
  TO public
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view non-archived menu items" ON public.menu_items;
CREATE POLICY "Public can view non-archived menu items"
  ON public.menu_items
  FOR SELECT
  TO public
  USING (is_archived = false OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage menu items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.review_staff_request(
  p_target_user_id uuid,
  p_decision text,
  p_admin_user_id uuid
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated_profile public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Administrator privileges required';
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision: Must be approve or reject';
  END IF;

  IF p_decision = 'approve' THEN
    UPDATE public.profiles
    SET approved_account_type = 'staff',
        account_type = 'staff',
        staff_approval_status = 'approved',
        reviewed_by = p_admin_user_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_target_user_id
    RETURNING * INTO v_updated_profile;
  ELSE
    UPDATE public.profiles
    SET approved_account_type = 'student',
        account_type = 'student',
        staff_approval_status = 'rejected',
        reviewed_by = p_admin_user_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_target_user_id
    RETURNING * INTO v_updated_profile;
  END IF;

  IF v_updated_profile.id IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found';
  END IF;

  RETURN v_updated_profile;
END;
$$;
