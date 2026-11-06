-- Migration 0009: Cart Item Locks and 5-Minute Reservation System

CREATE TABLE IF NOT EXISTS public.cart_item_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity integer NOT NULL CHECK (quantity > 0),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cart_locks_user_item UNIQUE (user_id, menu_item_id),
  CONSTRAINT uq_cart_locks_session_item UNIQUE (session_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_item_locks_expiry ON public.cart_item_locks(expires_at);
CREATE INDEX IF NOT EXISTS idx_cart_item_locks_item ON public.cart_item_locks(menu_item_id);

ALTER TABLE public.cart_item_locks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow cart item locks access" ON public.cart_item_locks;
CREATE POLICY "Allow cart item locks access"
  ON public.cart_item_locks
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.cleanup_expired_cart_locks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lock record;
BEGIN
  FOR v_lock IN
    SELECT l.id, l.menu_item_id, l.quantity, m.track_inventory
    FROM public.cart_item_locks l
    JOIN public.menu_items m ON m.id = l.menu_item_id
    WHERE l.expires_at < now()
    FOR UPDATE OF l
  LOOP
    IF v_lock.track_inventory THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity + v_lock.quantity,
          updated_at = now()
      WHERE id = v_lock.menu_item_id;
    END IF;

    DELETE FROM public.cart_item_locks WHERE id = v_lock.id;
  END LOOP;
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
  v_existing_qty integer := 0;
  v_delta integer := 0;
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

  IF p_user_id IS NOT NULL THEN
    SELECT quantity INTO v_existing_qty
    FROM public.cart_item_locks
    WHERE user_id = p_user_id AND menu_item_id = p_menu_item_id;
  ELSE
    SELECT quantity INTO v_existing_qty
    FROM public.cart_item_locks
    WHERE session_id = p_session_id AND menu_item_id = p_menu_item_id;
  END IF;

  v_existing_qty := COALESCE(v_existing_qty, 0);
  v_delta := p_quantity - v_existing_qty;

  IF v_delta > 0 AND v_item.track_inventory THEN
    IF v_item.stock_quantity < v_delta THEN
      RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Only % items remaining in stock', v_item.stock_quantity;
    END IF;

    UPDATE public.menu_items
    SET stock_quantity = stock_quantity - v_delta,
        updated_at = now()
    WHERE id = p_menu_item_id;
  ELSIF v_delta < 0 AND v_item.track_inventory THEN
    UPDATE public.menu_items
    SET stock_quantity = stock_quantity + ABS(v_delta),
        updated_at = now()
    WHERE id = p_menu_item_id;
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

  SELECT stock_quantity INTO v_item.stock_quantity FROM public.menu_items WHERE id = p_menu_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'menu_item_id', p_menu_item_id,
    'locked_quantity', p_quantity,
    'remaining_stock', v_item.stock_quantity,
    'expires_at', v_expires_at
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
DECLARE
  v_lock record;
  v_count integer := 0;
BEGIN
  FOR v_lock IN
    SELECT l.id, l.menu_item_id, l.quantity, m.track_inventory
    FROM public.cart_item_locks l
    JOIN public.menu_items m ON m.id = l.menu_item_id
    WHERE (
      (p_user_id IS NOT NULL AND l.user_id = p_user_id) OR
      (p_session_id IS NOT NULL AND l.session_id = p_session_id)
    )
    AND (p_menu_item_id IS NULL OR l.menu_item_id = p_menu_item_id)
    FOR UPDATE OF l
  LOOP
    IF v_lock.track_inventory THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity + v_lock.quantity,
          updated_at = now()
      WHERE id = v_lock.menu_item_id;
    END IF;

    DELETE FROM public.cart_item_locks WHERE id = v_lock.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'released_count', v_count
  );
END;
$$;
