-- Phase 2: Authentication, Authorization & User Profiles Migration
-- Schema for Cafteria Platform

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_key text,
  account_type text NOT NULL DEFAULT 'student' CHECK (account_type IN ('student', 'staff')),
  app_role text NOT NULL DEFAULT 'customer' CHECK (app_role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_app_role ON public.profiles(app_role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
BEGIN
  v_account_type := COALESCE(NEW.raw_user_meta_data->>'account_type', 'student');
  IF v_account_type NOT IN ('student', 'staff') THEN
    v_account_type := 'student';
  END IF;

  INSERT INTO public.profiles (
    id,
    display_name,
    avatar_key,
    account_type,
    app_role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULL,
    v_account_type,
    'customer',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

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

    IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
      RAISE EXCEPTION 'Unauthorized: Modifying account_type is forbidden';
    END IF;
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_roles();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own permitted profile" ON public.profiles;
CREATE POLICY "Users can update own permitted profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND app_role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
