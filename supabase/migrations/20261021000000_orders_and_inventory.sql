-- Phase 4: Cart, Order Management & Inventory Control Migration
-- Schema for Cafteria Platform

ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0);

CREATE INDEX IF NOT EXISTS idx_menu_items_inventory ON public.menu_items(track_inventory, stock_quantity);

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE,
  order_status text NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'cancelled')),
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  subtotal integer NOT NULL CHECK (subtotal >= 0),
  total integer NOT NULL CHECK (total >= 0),
  idempotency_key text,
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_orders_customer_idempotency UNIQUE (customer_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(order_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  quantity integer NOT NULL CHECK (quantity > 0),
  line_total integer NOT NULL CHECK (line_total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  quantity_change integer NOT NULL,
  reason text NOT NULL CHECK (reason IN ('order_placed', 'order_cancelled', 'manual_adjustment', 'restock')),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_item ON public.inventory_logs(menu_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_order ON public.inventory_logs(order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
CREATE POLICY "Customers can view own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
CREATE POLICY "Customers can insert own orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view relevant order items" ON public.order_items;
CREATE POLICY "Users can view relevant order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.customer_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Users can insert order items for own order" ON public.order_items;
CREATE POLICY "Users can insert order items for own order"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;
CREATE POLICY "Admins can manage order items"
  ON public.order_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can view inventory logs"
  ON public.inventory_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert inventory logs" ON public.inventory_logs;
CREATE POLICY "Admins can insert inventory logs"
  ON public.inventory_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date_prefix text;
  v_random_suffix text;
  v_candidate text;
  v_exists boolean;
BEGIN
  v_date_prefix := 'CAF-' || to_char(now(), 'YYMMDD') || '-';
  LOOP
    v_random_suffix := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    v_candidate := v_date_prefix || v_random_suffix;
    SELECT EXISTS (SELECT 1 FROM public.orders WHERE order_number = v_candidate) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
END;
$$;

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
      v_menu_item.id,
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
      WHERE id = v_menu_item.id;

      INSERT INTO public.inventory_logs (
        menu_item_id,
        quantity_change,
        reason,
        order_id,
        actor_id,
        created_at
      )
      VALUES (
        v_menu_item.id,
        -v_req_qty,
        'order_placed',
        v_order_id,
        p_customer_id,
        now()
      );
    END IF;
  END LOOP;

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

CREATE OR REPLACE FUNCTION public.cancel_order(
  p_order_id uuid,
  p_user_id uuid,
  p_reason text DEFAULT 'Customer requested cancellation'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_item record;
  v_is_admin boolean;
BEGIN
  v_is_admin := public.is_admin();

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND: Order % does not exist', p_order_id;
  END IF;

  IF NOT v_is_admin AND v_order.customer_id != p_user_id THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: You do not have permission to cancel this order';
  END IF;

  IF v_order.order_status = 'cancelled' THEN
    RAISE EXCEPTION 'ERR_ALREADY_CANCELLED: Order is already cancelled';
  END IF;

  IF v_order.order_status = 'completed' THEN
    RAISE EXCEPTION 'ERR_ALREADY_COMPLETED: Completed orders cannot be cancelled';
  END IF;

  IF NOT v_is_admin AND v_order.order_status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'ERR_CANNOT_CANCEL: Orders in "%" status can only be cancelled by canteen staff', v_order.order_status;
  END IF;

  UPDATE public.orders
  SET order_status = 'cancelled',
      cancellation_reason = p_reason,
      cancelled_at = now(),
      cancelled_by = p_user_id,
      updated_at = now()
  WHERE id = p_order_id;

  FOR v_item IN
    SELECT oi.menu_item_id, oi.quantity, mi.track_inventory, mi.name
    FROM public.order_items oi
    LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
    WHERE oi.order_id = p_order_id
  LOOP
    IF v_item.menu_item_id IS NOT NULL AND v_item.track_inventory = true THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity + v_item.quantity,
          is_available = true,
          updated_at = now()
      WHERE id = v_item.menu_item_id;

      INSERT INTO public.inventory_logs (
        menu_item_id,
        quantity_change,
        reason,
        order_id,
        actor_id,
        created_at
      )
      VALUES (
        v_item.menu_item_id,
        v_item.quantity,
        'order_cancelled',
        p_order_id,
        p_user_id,
        now()
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'order_status', 'cancelled',
    'cancellation_reason', p_reason,
    'cancelled_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_stock(
  p_menu_item_id uuid,
  p_stock_quantity integer,
  p_low_stock_threshold integer,
  p_track_inventory boolean,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_stock integer;
  v_qty_change integer;
  v_item record;
BEGIN
  IF NOT public.is_admin() AND current_user != 'service_role' THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Admin privileges required to adjust inventory';
  END IF;

  IF p_stock_quantity < 0 THEN
    RAISE EXCEPTION 'ERR_INVALID_STOCK: Stock quantity cannot be negative';
  END IF;

  SELECT * INTO v_item
  FROM public.menu_items
  WHERE id = p_menu_item_id
  FOR UPDATE;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND: Menu item % not found', p_menu_item_id;
  END IF;

  v_old_stock := v_item.stock_quantity;
  v_qty_change := p_stock_quantity - v_old_stock;

  UPDATE public.menu_items
  SET stock_quantity = p_stock_quantity,
      low_stock_threshold = p_low_stock_threshold,
      track_inventory = p_track_inventory,
      is_available = CASE WHEN p_track_inventory = true AND p_stock_quantity = 0 THEN false ELSE is_available END,
      updated_at = now()
  WHERE id = p_menu_item_id;

  IF v_qty_change != 0 THEN
    INSERT INTO public.inventory_logs (
      menu_item_id,
      quantity_change,
      reason,
      actor_id,
      created_at
    )
    VALUES (
      p_menu_item_id,
      v_qty_change,
      'manual_adjustment',
      p_actor_id,
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'id', p_menu_item_id,
    'stock_quantity', p_stock_quantity,
    'low_stock_threshold', p_low_stock_threshold,
    'track_inventory', p_track_inventory,
    'quantity_change', v_qty_change
  );
END;
$$;
