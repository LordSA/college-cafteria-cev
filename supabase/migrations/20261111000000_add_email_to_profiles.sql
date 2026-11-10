ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

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
    email,
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
    NEW.email,
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
  SET email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      updated_at = now();

  RETURN NEW;
END;
$$;

