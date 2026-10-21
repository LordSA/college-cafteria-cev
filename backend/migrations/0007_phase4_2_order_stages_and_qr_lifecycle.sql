-- Migration 0007: Phase 4.2 - Strict Order Stages (ORDER_PLACED, READY_TO_PICK, COLLECTED) & QR Lifecycle

-- 1. Add order_stage column and qr_consumed_at column to public.orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_stage text NOT NULL DEFAULT 'ORDER_PLACED'
  CHECK (order_stage IN ('ORDER_PLACED', 'READY_TO_PICK', 'COLLECTED'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS qr_consumed_at timestamptz;

-- 2. Backfill existing orders to the 3 strict stages
UPDATE public.orders
SET order_stage = CASE
  WHEN order_status = 'ready_for_pickup' THEN 'READY_TO_PICK'
  WHEN order_status = 'completed' THEN 'COLLECTED'
  ELSE 'ORDER_PLACED'
END,
qr_consumed_at = CASE
  WHEN order_status = 'completed' THEN COALESCE(collected_at, completed_at, now())
  ELSE NULL
END
WHERE order_stage IS NULL OR order_stage = 'ORDER_PLACED';

-- 3. Update order_status check constraint to support the strict 3 stages
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('ORDER_PLACED', 'READY_TO_PICK', 'COLLECTED', 'pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_orders_stage ON public.orders(order_stage, created_at DESC);

-- 4. Stored Procedure: Mark Order Ready (ORDER_PLACED -> READY_TO_PICK)
CREATE OR REPLACE FUNCTION public.mark_order_ready(
  p_order_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND: Order % not found', p_order_id;
  END IF;

  IF v_order.order_stage = 'COLLECTED' THEN
    RAISE EXCEPTION 'ERR_ALREADY_COLLECTED: Order % has already been collected', v_order.order_number;
  END IF;

  IF v_order.order_stage = 'READY_TO_PICK' THEN
    RETURN jsonb_build_object(
      'order_id', v_order.id,
      'order_number', v_order.order_number,
      'order_stage', 'READY_TO_PICK',
      'order_status', 'READY_TO_PICK',
      'ready_at', v_order.ready_at
    );
  END IF;

  IF v_order.payment_status != 'paid' THEN
    RAISE EXCEPTION 'ERR_ORDER_UNPAID: Cannot mark unpaid order % as ready to pick', v_order.order_number;
  END IF;

  UPDATE public.orders
  SET order_stage = 'READY_TO_PICK',
      order_status = 'READY_TO_PICK',
      ready_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'order_stage', 'READY_TO_PICK',
    'order_status', 'READY_TO_PICK',
    'ready_at', now()
  );
END;
$$;

-- 5. Stored Procedure: Verify QR Token with Strict Stage Checks
CREATE OR REPLACE FUNCTION public.verify_qr_token(
  p_qr_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
  v_customer record;
  v_items jsonb;
  v_is_eligible boolean;
  v_ineligibility_reason text;
BEGIN
  IF p_qr_token IS NULL OR trim(p_qr_token) = '' THEN
    RAISE EXCEPTION 'ERR_INVALID_QR_TOKEN: QR verification token is required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE qr_verification_token = trim(p_qr_token);

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ERR_INVALID_QR_TOKEN: Order with provided QR verification token was not found';
  END IF;

  SELECT id, display_name, account_type INTO v_customer
  FROM public.profiles
  WHERE id = v_order.customer_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'item_name', oi.item_name,
      'unit_price', oi.unit_price,
      'quantity', oi.quantity,
      'line_total', oi.line_total
    )
  ) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  IF v_order.payment_status != 'paid' THEN
    v_is_eligible := false;
    v_ineligibility_reason := 'Order has not been paid yet';
  ELSIF v_order.order_stage = 'COLLECTED' OR v_order.qr_consumed_at IS NOT NULL THEN
    v_is_eligible := false;
    v_ineligibility_reason := 'Order already collected';
  ELSIF v_order.order_stage = 'ORDER_PLACED' THEN
    v_is_eligible := false;
    v_ineligibility_reason := 'Order is not ready for pickup yet';
  ELSIF v_order.order_stage = 'READY_TO_PICK' THEN
    v_is_eligible := true;
    v_ineligibility_reason := NULL;
  ELSE
    v_is_eligible := false;
    v_ineligibility_reason := 'Order is not eligible for collection';
  END IF;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'order_stage', COALESCE(v_order.order_stage, 'ORDER_PLACED'),
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'total', v_order.total,
    'subtotal', v_order.subtotal,
    'paid_at', v_order.paid_at,
    'ready_at', v_order.ready_at,
    'collected_at', v_order.collected_at,
    'collected_by', v_order.collected_by,
    'qr_verification_token', v_order.qr_verification_token,
    'qr_consumed_at', v_order.qr_consumed_at,
    'created_at', v_order.created_at,
    'customer', jsonb_build_object(
      'id', v_order.customer_id,
      'display_name', COALESCE(v_customer.display_name, 'Customer'),
      'account_type', COALESCE(v_customer.account_type, 'student')
    ),
    'items', COALESCE(v_items, '[]'::jsonb),
    'is_eligible_for_collection', v_is_eligible,
    'ineligibility_reason', v_ineligibility_reason
  );
END;
$$;

-- 6. Stored Procedure: Atomic Collect Order (Strict Stage Enforcement: READY_TO_PICK -> COLLECTED)
CREATE OR REPLACE FUNCTION public.collect_order(
  p_order_id uuid,
  p_operator_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order record;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ERR_INVALID_INPUT: Order ID is required';
  END IF;

  IF p_operator_id IS NULL THEN
    RAISE EXCEPTION 'ERR_INVALID_INPUT: Operator ID is required';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND: Order % not found', p_order_id;
  END IF;

  IF v_order.order_stage = 'COLLECTED' OR v_order.qr_consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'ERR_ALREADY_COLLECTED: Order % has already been collected at %', v_order.order_number, v_order.collected_at;
  END IF;

  IF v_order.payment_status != 'paid' THEN
    RAISE EXCEPTION 'ERR_ORDER_UNPAID: Cannot collect order % because payment status is "%"', v_order.order_number, v_order.payment_status;
  END IF;

  IF v_order.order_stage = 'ORDER_PLACED' THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_READY: Order % is not ready for pickup yet', v_order.order_number;
  END IF;

  IF v_order.order_stage != 'READY_TO_PICK' THEN
    RAISE EXCEPTION 'ERR_INVALID_STAGE: Order % must be in READY_TO_PICK stage to collect (current: %)', v_order.order_number, v_order.order_stage;
  END IF;

  UPDATE public.orders
  SET order_stage = 'COLLECTED',
      order_status = 'COLLECTED',
      qr_consumed_at = now(),
      collected_at = now(),
      collected_by = p_operator_id,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'order_stage', 'COLLECTED',
    'order_status', 'COLLECTED',
    'payment_status', v_order.payment_status,
    'qr_consumed_at', now(),
    'collected_at', now(),
    'collected_by', p_operator_id
  );
END;
$$;

-- 7. Update pay_order_with_wallet to initialize stage as ORDER_PLACED
CREATE OR REPLACE FUNCTION public.pay_order_with_wallet(
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
  v_item jsonb;
  v_menu_item record;
  v_computed_total integer := 0;
  v_line_total integer;
  v_quantity integer;
  v_order_id uuid;
  v_order_number text;
  v_qr_token text;
  v_wallet record;
  v_new_balance integer;
  v_is_admin boolean;
  v_order_items jsonb := '[]'::jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ERR_INVALID_ITEMS: Cart cannot be empty';
  END IF;

  IF p_customer_id IS NULL THEN
    RAISE EXCEPTION 'ERR_INVALID_CUSTOMER: Customer ID is required';
  END IF;

  SELECT public.is_admin() INTO v_is_admin;
  IF current_user != 'service_role' AND auth.uid() != p_customer_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'ERR_FORBIDDEN: You can only place orders for your own account';
  END IF;

  IF p_idempotency_key IS NOT NULL AND trim(p_idempotency_key) != '' THEN
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE customer_id = p_customer_id AND idempotency_key = p_idempotency_key;

    IF v_existing_order.id IS NOT NULL THEN
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'menu_item_id', oi.menu_item_id,
          'item_name', oi.item_name,
          'unit_price', oi.unit_price,
          'quantity', oi.quantity,
          'line_total', oi.line_total
        )
      ) INTO v_order_items
      FROM public.order_items oi
      WHERE oi.order_id = v_existing_order.id;

      RETURN jsonb_build_object(
        'order_id', v_existing_order.id,
        'order_number', v_existing_order.order_number,
        'order_stage', COALESCE(v_existing_order.order_stage, 'ORDER_PLACED'),
        'order_status', v_existing_order.order_status,
        'payment_status', v_existing_order.payment_status,
        'payment_method', v_existing_order.payment_method,
        'paid_at', v_existing_order.paid_at,
        'subtotal', v_existing_order.subtotal,
        'total', v_existing_order.total,
        'qr_verification_token', v_existing_order.qr_verification_token,
        'items', COALESCE(v_order_items, '[]'::jsonb),
        'created_at', v_existing_order.created_at,
        'is_replay', true
      );
    END IF;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    IF v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'ERR_INVALID_QUANTITY: Item quantity must be at least 1';
    END IF;

    SELECT * INTO v_menu_item
    FROM public.menu_items
    WHERE id = (v_item->>'menu_item_id')::uuid
    FOR UPDATE;

    IF v_menu_item.id IS NULL THEN
      RAISE EXCEPTION 'ERR_ITEM_NOT_FOUND: Menu item % not found', (v_item->>'menu_item_id');
    END IF;

    IF NOT v_menu_item.is_available OR v_menu_item.is_archived THEN
      RAISE EXCEPTION 'ERR_ITEM_UNAVAILABLE: "%" is currently unavailable', v_menu_item.name;
    END IF;

    IF v_menu_item.track_inventory THEN
      IF v_menu_item.stock_quantity < v_quantity THEN
        RAISE EXCEPTION 'ERR_INSUFFICIENT_STOCK: Only % remaining for "%"', v_menu_item.stock_quantity, v_menu_item.name;
      END IF;
    END IF;

    v_line_total := v_menu_item.price * v_quantity;
    v_computed_total := v_computed_total + v_line_total;
  END LOOP;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets (customer_id, balance, created_at, updated_at)
    VALUES (p_customer_id, 0, now(), now())
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.balance < v_computed_total THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS: Wallet balance of % is insufficient for total of %',
      v_wallet.balance, v_computed_total;
  END IF;

  v_new_balance := v_wallet.balance - v_computed_total;
  UPDATE public.wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE id = v_wallet.id;

  v_order_number := public.generate_order_number();
  v_qr_token := public.generate_qr_token();

  INSERT INTO public.orders (
    customer_id,
    order_number,
    order_stage,
    order_status,
    payment_status,
    payment_method,
    paid_at,
    qr_verification_token,
    subtotal,
    total,
    idempotency_key,
    confirmed_at,
    created_at,
    updated_at
  )
  VALUES (
    p_customer_id,
    v_order_number,
    'ORDER_PLACED',
    'ORDER_PLACED',
    'paid',
    'testing_wallet',
    now(),
    v_qr_token,
    v_computed_total,
    v_computed_total,
    p_idempotency_key,
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.wallet_transactions (
    wallet_id,
    customer_id,
    amount,
    transaction_type,
    balance_after,
    reason,
    order_id,
    actor_id,
    created_at
  )
  VALUES (
    v_wallet.id,
    p_customer_id,
    v_computed_total,
    'debit',
    v_new_balance,
    'Payment for order ' || v_order_number,
    v_order_id,
    p_customer_id,
    now()
  );

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_quantity := (v_item->>'quantity')::integer;
    SELECT * INTO v_menu_item FROM public.menu_items WHERE id = (v_item->>'menu_item_id')::uuid;
    v_line_total := v_menu_item.price * v_quantity;

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
      v_quantity,
      v_line_total,
      now()
    );

    IF v_menu_item.track_inventory THEN
      UPDATE public.menu_items
      SET stock_quantity = stock_quantity - v_quantity,
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
        -v_quantity,
        'order_placed',
        v_order_id,
        p_customer_id,
        now()
      );
    END IF;
  END LOOP;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'menu_item_id', oi.menu_item_id,
      'item_name', oi.item_name,
      'unit_price', oi.unit_price,
      'quantity', oi.quantity,
      'line_total', oi.line_total
    )
  ) INTO v_order_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'order_stage', 'ORDER_PLACED',
    'order_status', 'ORDER_PLACED',
    'payment_status', 'paid',
    'payment_method', 'testing_wallet',
    'paid_at', now(),
    'subtotal', v_computed_total,
    'total', v_computed_total,
    'qr_verification_token', v_qr_token,
    'wallet_balance_after', v_new_balance,
    'items', COALESCE(v_order_items, '[]'::jsonb),
    'created_at', now(),
    'is_replay', false
  );
END;
$$;
