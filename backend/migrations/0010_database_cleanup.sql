-- ====================================================================
-- MIGRATION: 0010_database_cleanup.sql
-- CAFETERIA CEV: DATABASE CLEANUP, STOCK LOCK FIX & SECURITY HARDENING
-- ====================================================================

-- 1. Remove unused legacy table from initial scaffold
DROP TABLE IF EXISTS public.storage_assets CASCADE;

-- 2. Remove obsolete teacher request & identification columns from profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS teacher_id,
  DROP COLUMN IF EXISTS requested_account_type,
  DROP COLUMN IF EXISTS approved_account_type,
  DROP COLUMN IF EXISTS staff_approval_status,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at;

-- 3. Security Hardening: Ensure menu items stock quantity cannot be negative
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

-- 4. Stored Procedure: Cleanup expired cart locks with explicit search_path
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

-- 5. Stored Procedure: Lock cart item without pre-deducting physical stock
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
  v_available integer := 0;
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

  IF v_item.track_inventory THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_other_locks
    FROM public.cart_item_locks
    WHERE menu_item_id = p_menu_item_id
      AND expires_at > now()
      AND (
        (p_user_id IS NOT NULL AND (user_id IS NULL OR user_id != p_user_id))
        OR (p_user_id IS NULL AND p_session_id IS NOT NULL AND (session_id IS NULL OR session_id != p_session_id))
      );

    v_available := v_item.stock_quantity - v_other_locks;

    IF p_quantity > v_available THEN
      RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Only % items remaining in stock (available: %)', v_item.stock_quantity, GREATEST(0, v_available);
    END IF;
  END IF;

  v_expires_at := now() + interval '5 minutes';

  IF p_quantity > 0 THEN
    IF p_user_id IS NOT NULL THEN
      INSERT INTO public.cart_item_locks (user_id, menu_item_id, quantity, expires_at, updated_at)
      VALUES (p_user_id, p_menu_item_id, p_quantity, v_expires_at, now())
      ON CONFLICT (user_id, menu_item_id)
      DO UPDATE SET quantity = p_quantity, expires_at = v_expires_at, updated_at = now();
    ELSE
      INSERT INTO public.cart_item_locks (session_id, menu_item_id, quantity, expires_at, updated_at)
      VALUES (p_session_id, p_menu_item_id, p_quantity, v_expires_at, now())
      ON CONFLICT (session_id, menu_item_id)
      DO UPDATE SET quantity = p_quantity, expires_at = v_expires_at, updated_at = now();
    END IF;
  ELSE
    IF p_user_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE user_id = p_user_id AND menu_item_id = p_menu_item_id;
    ELSE
      DELETE FROM public.cart_item_locks WHERE session_id = p_session_id AND menu_item_id = p_menu_item_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'menu_item_id', p_menu_item_id,
    'quantity', p_quantity,
    'expires_at', v_expires_at,
    'available', v_available
  );
END;
$$;

-- 6. Stored Procedure: Release cart locks safely
CREATE OR REPLACE FUNCTION public.release_cart_locks(
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_menu_item_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL AND (p_session_id IS NULL OR trim(p_session_id) = '') THEN
    RETURN false;
  END IF;

  IF p_user_id IS NOT NULL THEN
    IF p_menu_item_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE user_id = p_user_id AND menu_item_id = p_menu_item_id;
    ELSE
      DELETE FROM public.cart_item_locks WHERE user_id = p_user_id;
    END IF;
  ELSE
    IF p_menu_item_id IS NOT NULL THEN
      DELETE FROM public.cart_item_locks WHERE session_id = p_session_id AND menu_item_id = p_menu_item_id;
    ELSE
      DELETE FROM public.cart_item_locks WHERE session_id = p_session_id;
    END IF;
  END IF;

  RETURN true;
END;
$$;

-- 7. Grant execution privileges to application roles
GRANT EXECUTE ON FUNCTION public.cleanup_expired_cart_locks() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.lock_cart_item(uuid, integer, uuid, text) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.release_cart_locks(uuid, text, uuid) TO authenticated, service_role, anon;
