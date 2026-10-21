-- Phase 4.1: Testing Wallet, QR Order Verification and Order Collection
-- Schema for Cafteria Platform

CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallets_customer ON public.wallets(customer_id);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0),
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  reason text NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_customer ON public.wallet_transactions(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_order ON public.wallet_transactions(order_id);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'testing_wallet' CHECK (payment_method IN ('testing_wallet', 'counter_cash', 'razorpay')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_verification_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS collected_at timestamptz,
  ADD COLUMN IF NOT EXISTS collected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_qr_token ON public.orders(qr_verification_token);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can view own wallet" ON public.wallets;
CREATE POLICY "Customers can view own wallet"
  ON public.wallets
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.wallets;
CREATE POLICY "Admins can manage all wallets"
  ON public.wallets
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Customers can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Customers can view own transactions"
  ON public.wallet_transactions
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can insert transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can insert transactions"
  ON public.wallet_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.get_or_create_wallet(
  p_customer_id uuid
)
RETURNS public.wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
BEGIN
  IF current_user != 'service_role' AND auth.uid() != p_customer_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Caller cannot access wallet for this customer';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE customer_id = p_customer_id;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets (customer_id, balance, created_at, updated_at)
    VALUES (p_customer_id, 0, now(), now())
    ON CONFLICT (customer_id) DO UPDATE SET updated_at = now()
    RETURNING * INTO v_wallet;
  END IF;

  RETURN v_wallet;
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
  p_customer_id uuid,
  p_amount integer,
  p_type text,
  p_reason text,
  p_actor_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets;
  v_new_balance integer;
  v_tx_id uuid;
BEGIN
  IF current_user != 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Admin privileges required to adjust wallet balance';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'ERR_INVALID_AMOUNT: Adjustment amount must be greater than zero';
  END IF;

  IF p_type NOT IN ('credit', 'debit') THEN
    RAISE EXCEPTION 'ERR_INVALID_TYPE: Transaction type must be credit or debit';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'ERR_REASON_REQUIRED: A valid reason is required for wallet adjustments';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets (customer_id, balance, created_at, updated_at)
    VALUES (p_customer_id, 0, now(), now())
    RETURNING * INTO v_wallet;
  END IF;

  IF p_type = 'credit' THEN
    v_new_balance := v_wallet.balance + p_amount;
  ELSE
    IF v_wallet.balance < p_amount THEN
      RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS: Wallet balance (% paise) is insufficient for debit of % paise', v_wallet.balance, p_amount;
    END IF;
    v_new_balance := v_wallet.balance - p_amount;
  END IF;

  UPDATE public.wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    wallet_id,
    customer_id,
    amount,
    transaction_type,
    balance_after,
    reason,
    actor_id,
    created_at
  )
  VALUES (
    v_wallet.id,
    p_customer_id,
    p_amount,
    p_type,
    v_new_balance,
    trim(p_reason),
    p_actor_id,
    now()
  )
  RETURNING id INTO v_tx_id;

  RETURN jsonb_build_object(
    'wallet_id', v_wallet.id,
    'customer_id', p_customer_id,
    'previous_balance', v_wallet.balance,
    'new_balance', v_new_balance,
    'amount', p_amount,
    'transaction_type', p_type,
    'transaction_id', v_tx_id,
    'reason', trim(p_reason),
    'adjusted_at', now()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate text;
  v_exists boolean;
BEGIN
  LOOP
    v_candidate := 'CAF-QR-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
    SELECT EXISTS (SELECT 1 FROM public.orders WHERE qr_verification_token = v_candidate) INTO v_exists;
    IF NOT v_exists THEN
      RETURN v_candidate;
    END IF;
  END LOOP;
END;
$$;

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
  v_order_id uuid;
  v_order_number text;
  v_qr_token text;
  v_total integer := 0;
  v_item jsonb;
  v_menu_item record;
  v_req_item_id uuid;
  v_req_qty integer;
  v_line_total integer;
  v_wallet public.wallets;
  v_new_balance integer;
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
        'payment_method', v_existing_order.payment_method,
        'qr_verification_token', v_existing_order.qr_verification_token,
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

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE customer_id = p_customer_id
  FOR UPDATE;

  IF v_wallet.id IS NULL THEN
    INSERT INTO public.wallets (customer_id, balance, created_at, updated_at)
    VALUES (p_customer_id, 0, now(), now())
    RETURNING * INTO v_wallet;
  END IF;

  IF v_wallet.balance < v_total THEN
    RAISE EXCEPTION 'ERR_INSUFFICIENT_FUNDS: Wallet balance of ₹% is insufficient for total ₹%',
      (v_wallet.balance::numeric / 100)::text,
      (v_total::numeric / 100)::text;
  END IF;

  v_new_balance := v_wallet.balance - v_total;
  v_order_number := public.generate_order_number();
  v_qr_token := public.generate_qr_token();

  INSERT INTO public.orders (
    customer_id,
    order_number,
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
    'confirmed',
    'paid',
    'testing_wallet',
    now(),
    v_qr_token,
    v_total,
    v_total,
    NULLIF(p_idempotency_key, ''),
    now(),
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

  UPDATE public.wallets
  SET balance = v_new_balance,
      updated_at = now()
  WHERE id = v_wallet.id;

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
    v_total,
    'debit',
    v_new_balance,
    'Order payment: ' || v_order_number,
    v_order_id,
    p_customer_id,
    now()
  );

  RETURN jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'order_status', 'confirmed',
    'payment_status', 'paid',
    'payment_method', 'testing_wallet',
    'qr_verification_token', v_qr_token,
    'subtotal', v_total,
    'total', v_total,
    'wallet_balance_after', v_new_balance,
    'created_at', now(),
    'is_idempotent_replay', false
  );
END;
$$;

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
BEGIN
  IF current_user != 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Admin privileges required to verify QR tokens';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE qr_verification_token = trim(p_qr_token);

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ERR_INVALID_QR_TOKEN: Order with provided QR verification token was not found';
  END IF;

  SELECT display_name, account_type INTO v_customer
  FROM public.profiles
  WHERE id = v_order.customer_id;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', oi.id,
      'menu_item_id', oi.menu_item_id,
      'item_name', oi.item_name,
      'unit_price', oi.unit_price,
      'quantity', oi.quantity,
      'line_total', oi.line_total
    )
  ) INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'order_status', v_order.order_status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'total', v_order.total,
    'subtotal', v_order.subtotal,
    'paid_at', v_order.paid_at,
    'collected_at', v_order.collected_at,
    'collected_by', v_order.collected_by,
    'qr_verification_token', v_order.qr_verification_token,
    'created_at', v_order.created_at,
    'customer', jsonb_build_object(
      'id', v_order.customer_id,
      'display_name', COALESCE(v_customer.display_name, 'Customer'),
      'account_type', COALESCE(v_customer.account_type, 'student')
    ),
    'items', COALESCE(v_items, '[]'::jsonb),
    'is_eligible_for_collection', (v_order.payment_status = 'paid' AND v_order.order_status != 'completed' AND v_order.order_status != 'cancelled')
  );
END;
$$;

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
  IF current_user != 'service_role' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'ERR_UNAUTHORIZED: Admin privileges required to collect orders';
  END IF;

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ERR_ORDER_NOT_FOUND: Order % not found', p_order_id;
  END IF;

  IF v_order.order_status = 'completed' THEN
    RAISE EXCEPTION 'ERR_ALREADY_COLLECTED: Order % has already been collected at %', v_order.order_number, v_order.collected_at;
  END IF;

  IF v_order.order_status = 'cancelled' THEN
    RAISE EXCEPTION 'ERR_ORDER_CANCELLED: Cannot collect cancelled order %', v_order.order_number;
  END IF;

  IF v_order.payment_status != 'paid' THEN
    RAISE EXCEPTION 'ERR_ORDER_UNPAID: Cannot collect order % because payment status is "%"', v_order.order_number, v_order.payment_status;
  END IF;

  UPDATE public.orders
  SET order_status = 'completed',
      collected_at = now(),
      collected_by = p_operator_id,
      completed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'order_status', 'completed',
    'payment_status', v_order.payment_status,
    'collected_at', now(),
    'collected_by', p_operator_id
  );
END;
$$;
