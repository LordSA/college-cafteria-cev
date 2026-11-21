ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_requested_account_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approved_account_type_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_app_role_check;

UPDATE public.profiles
SET account_type = 'staff_t'
WHERE account_type = 'staff';

UPDATE public.profiles
SET requested_account_type = 'staff_t'
WHERE requested_account_type = 'staff';

UPDATE public.profiles
SET approved_account_type = 'staff_t'
WHERE approved_account_type = 'staff';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('student', 'staff_t', 'guest'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_requested_account_type_check
  CHECK (requested_account_type IN ('student', 'staff_t', 'guest'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approved_account_type_check
  CHECK (approved_account_type IN ('student', 'staff_t', 'guest'));

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_app_role_check
  CHECK (app_role IN ('customer', 'developer', 'admin', 'retail', 'staff', 'printer'));

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

  IF v_requested_type = 'staff' OR v_requested_type = 'staff_t' THEN
    v_requested_type := 'staff_t';
    v_approved_type := 'student';
    v_status := 'pending';
  ELSIF v_requested_type = 'guest' THEN
    v_requested_type := 'guest';
    v_approved_type := 'guest';
    v_status := 'not_requested';
  ELSE
    v_requested_type := 'student';
    v_approved_type := 'student';
    v_status := 'not_requested';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    display_name,
    avatar_key,
    account_type,
    requested_account_type,
    approved_account_type,
    staff_approval_status,
    app_role,
    teacher_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    NULL,
    v_approved_type,
    v_requested_type,
    v_approved_type,
    v_status,
    'customer',
    NEW.raw_user_meta_data->>'teacher_id',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      teacher_id = COALESCE(EXCLUDED.teacher_id, public.profiles.teacher_id),
      updated_at = now();

  RETURN NEW;
END;
$$;

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
    SET approved_account_type = 'staff_t',
        account_type = 'staff_t',
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

  RETURN v_updated_profile;
END;
$$;

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

  IF p_new_role NOT IN ('customer', 'developer', 'admin', 'retail', 'staff', 'printer') THEN
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
