-- Migration 20261124000006: Fix Stock Locks, Cart Limits, and Profile Schema Recovery

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_key text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'student',
  ADD COLUMN IF NOT EXISTS app_role text NOT NULL DEFAULT 'customer',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS teacher_id,
  DROP COLUMN IF EXISTS requested_account_type,
  DROP COLUMN IF EXISTS approved_account_type,
  DROP COLUMN IF EXISTS staff_approval_status,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at;

UPDATE public.menu_items
SET stock_quantity = GREATEST(0, stock_quantity)
WHERE stock_quantity < 0;

UPDATE public.menu_items
SET is_available = true
WHERE is_archived = false
  AND (track_inventory = false OR stock_quantity > 0);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_menu_items_stock_non_negative'
  ) THEN
    ALTER TABLE public.menu_items
      ADD CONSTRAINT chk_menu_items_stock_non_negative CHECK (stock_quantity >= 0);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL;
END;
$$;

DELETE FROM public.cart_item_locks WHERE expires_at < now();

CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.cart_item_locks
  WHERE expires_at < now();
END;
$$;

CREATE OR REPLACE FUNCTION public.lock_cart_item(
  p_menu_item_id uuid,
  p_quantity integer,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_other_locks integer := 0;
  v_available integer;
  v_expires_at timestamptz;
BEGIN
  PERFORM public.cleanup_expired_cart_locks();

  IF p_user_id IS NULL AND (p_session_id IS NULL OR trim(p_session_id) = '') THEN
    RAISE EXCEPTION 'ERR_NO_IDENTIFIER: Either user_id or session_id must be provided';
  END IF;

  SELECT * INTO v_item
  FROM public.menu_items
  WHERE id = p_menu_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND: Menu item does not exist';
  END IF;

  IF NOT v_item.is_available THEN
    RAISE EXCEPTION 'ERR_ITEM_UNAVAILABLE: Item is not available';
  END IF;

  IF p_user_id IS NOT NULL AND p_session_id IS NOT NULL THEN
    DELETE FROM public.cart_item_locks
    WHERE session_id = p_session_id AND menu_item_id = p_menu_item_id AND (user_id IS NULL OR user_id = p_user_id);
  END IF;

  IF v_item.track_inventory THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_other_locks
    FROM public.cart_item_locks
    WHERE menu_item_id = p_menu_item_id
      AND expires_at > now()
      AND (p_user_id IS NULL OR user_id IS DISTINCT FROM p_user_id)
      AND (p_session_id IS NULL OR session_id IS DISTINCT FROM p_session_id);

    v_available := GREATEST(0, v_item.stock_quantity - v_other_locks);

    IF p_quantity > v_available THEN
      RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Only % items remaining in stock (available: %)', v_item.stock_quantity, v_available;
    END IF;
  ELSE
    v_available := 999;
  END IF;

  v_expires_at := now() + interval '5 minutes';

  IF p_quantity > 0 THEN
    IF p_user_id IS NOT NULL THEN
      INSERT INTO public.cart_item_locks (user_id, session_id, menu_item_id, quantity, expires_at, updated_at)
      VALUES (p_user_id, p_session_id, p_menu_item_id, p_quantity, v_expires_at, now())
      ON CONFLICT (user_id, menu_item_id)
      DO UPDATE SET quantity = p_quantity, session_id = COALESCE(EXCLUDED.session_id, public.cart_item_locks.session_id), expires_at = v_expires_at, updated_at = now();
    ELSE
      INSERT INTO public.cart_item_locks (session_id, menu_item_id, quantity, expires_at, updated_at)
      VALUES (p_session_id, p_menu_item_id, p_quantity, v_expires_at, now())
      ON CONFLICT (session_id, menu_item_id)
      DO UPDATE SET quantity = p_quantity, expires_at = v_expires_at, updated_at = now();
    END IF;
  ELSE
    IF p_user_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE user_id = p_user_id AND menu_item_id = p_menu_item_id;
    END IF;
    IF p_session_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE session_id = p_session_id AND menu_item_id = p_menu_item_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'menu_item_id', p_menu_item_id,
    'quantity', p_quantity,
    'expires_at', v_expires_at,
    'available_stock', v_available
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.release_cart_locks(
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_menu_item_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NOT NULL THEN
    IF p_menu_item_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE user_id = p_user_id AND menu_item_id = p_menu_item_id;
    ELSE
      DELETE FROM public.cart_item_locks WHERE user_id = p_user_id;
    END IF;
  END IF;

  IF p_session_id IS NOT NULL THEN
    IF p_menu_item_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE session_id = p_session_id AND menu_item_id = p_menu_item_id;
    ELSE
      DELETE FROM public.cart_item_locks WHERE session_id = p_session_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.lock_cart_item(uuid, integer, uuid, text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.release_cart_locks(uuid, text, uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_cart_locks() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
