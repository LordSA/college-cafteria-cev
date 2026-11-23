-- Migration 20261124000000: Remove Teacher ID and Fix Cart Stock Locks Non-Mutating

-- 1. Remove Teacher ID from public.profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS uq_profiles_teacher_id;
DROP INDEX IF EXISTS public.idx_profiles_teacher_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS teacher_id;

-- 2. Update handle_new_user() trigger function without teacher_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    'student',
    'student',
    'student',
    'not_requested',
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

-- 3. Update cleanup_expired_cart_locks() so it NEVER mutates menu_items.stock_quantity
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

-- 4. Update lock_cart_item() so it validates available stock against other active locks without pre-deducting menu_items.stock_quantity
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
    'success', true,
    'menu_item_id', p_menu_item_id,
    'locked_quantity', p_quantity,
    'remaining_stock', GREATEST(0, v_item.stock_quantity - p_quantity - v_other_locks),
    'expires_at', v_expires_at
  );
END;
$$;

-- 5. Update release_cart_locks() so it releases rows without modifying menu_items.stock_quantity
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
  v_count integer := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.cart_item_locks
    WHERE (
      (p_user_id IS NOT NULL AND user_id = p_user_id) OR
      (p_session_id IS NOT NULL AND session_id = p_session_id)
    )
    AND (p_menu_item_id IS NULL OR menu_item_id = p_menu_item_id)
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM deleted;

  RETURN jsonb_build_object(
    'success', true,
    'released_count', v_count
  );
END;
$$;

-- 6. Update place_order() so it cleans up the user cart locks on successful placement
CREATE OR REPLACE FUNCTION public.place_order(
  p_customer_id uuid,
  p_items jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_order record;
  v_order_id uuid;
  v_order_number text;
  v_total integer := 0;
  v_item jsonb;
  v_menu_item record;
  v_req_item_id uuid;
  v_req_qty integer;
  v_line_total integer;
BEGIN
  IF current_user != 'service_role' AND auth.uid() != p_customer_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Caller cannot place order for this customer';
  END IF;

  IF p_idempotency_key IS NOT NULL AND length(p_idempotency_key) > 0 THEN
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE customer_id = p_customer_id AND idempotency_key = p_idempotency_key;

    IF v_existing_order.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'order_status', v_existing_order.order_status,
        'payment_status', v_existing_order.payment_status,
        'subtotal', v_existing_order.subtotal,
        'total', v_existing_order.total,
        'created_at', v_existing_order.created_at,
        'is_idempotent_replay', true
      );
    END IF;
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ERR_EMPTY_CART: Order must contain at least one item';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_req_item_id := (v_item->>'menu_item_id')::uuid;
    v_req_qty := (v_item->>'quantity')::integer;

    IF v_req_qty <= 0 THEN
      RAISE EXCEPTION 'ERR_INVALID_QUANTITY: Item quantity must be positive';
    END IF;

    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = v_req_item_id
    FOR UPDATE;

    IF v_menu_item.id IS NULL OR v_menu_item.is_archived = true THEN
      RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND: Menu item % not found or archived', v_req_item_id;
    END IF;

    IF v_menu_item.is_available = false THEN
      RAISE EXCEPTION 'ERR_ITEM_UNAVAILABLE: Menu item "%" is currently unavailable', v_menu_item.name;
    END IF;

    IF v_menu_item.track_inventory = true THEN
      IF v_menu_item.stock_quantity < v_req_qty THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Item "%" only has % available', v_menu_item.name, v_menu_item.stock_quantity;
      END IF;
    END IF;

    v_total := v_total + (v_menu_item.price * v_req_qty);
  END LOOP;

  v_order_number := public.generate_order_number();

  INSERT INTO public.orders (
    customer_id,
    order_number,
    order_status,
    payment_status,
    subtotal,
    total,
    idempotency_key,
    created_at,
    updated_at
  )
  VALUES (
    p_customer_id,
    v_order_number,
    'pending',
    'unpaid',
    v_total,
    v_total,
    NULLIF(p_idempotency_key, ''),
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_req_item_id := (v_item->>'menu_item_id')::uuid;
    v_req_qty := (v_item->>'quantity')::integer;

    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = v_req_item_id;

    v_line_total := v_menu_item.price * v_req_qty;

    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      item_name,
      unit_price,
      quantity,
      line_total,
      created_at
    )
    VALUES (
      v_order_id,
      v_req_item_id,
      v_menu_item.name,
      v_menu_item.price,
      v_req_qty,
      v_line_total,
      now()
    );

    IF v_menu_item.track_inventory = true THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity - v_req_qty,
          is_available = CASE WHEN (stock_quantity - v_req_qty) <= 0 THEN false ELSE is_available END,
          updated_at = now()
      WHERE id = v_req_item_id;

      INSERT INTO public.inventory_logs (
        menu_item_id,
        quantity_change,
        reason,
        order_id,
        actor_id,
        created_at
      )
      VALUES (
        v_req_item_id,
        -v_req_qty,
        'order_placed',
        v_order_id,
        p_customer_id,
        now()
      );
    END IF;
  END LOOP;

  DELETE FROM public.cart_item_locks
  WHERE user_id = p_customer_id;

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'order_status', 'pending',
    'payment_status', 'unpaid',
    'subtotal', v_total,
    'total', v_total,
    'created_at', now(),
    'is_idempotent_replay', false
  );
END;
$$;
