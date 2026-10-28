-- Migration 0008: Remove profile role/position locking trigger
-- Unlocks direct editing of account_type, approved_account_type, staff_approval_status,
-- and app_role in Supabase Table Editor / Dashboard, and allows admin staff approval.

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
DROP FUNCTION IF EXISTS public.protect_profile_roles();

-- Replace with lightweight updated_at timestamp trigger that does not restrict edits
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_updated_at ON public.profiles;
CREATE TRIGGER trg_profile_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_updated_at();
