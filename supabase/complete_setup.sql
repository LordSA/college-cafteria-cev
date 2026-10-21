-- =====================================================================
-- CAFTERIA — Complete Database Setup (Phases 1 through 4)
-- Paste this entire script into your Supabase SQL Editor and click "Run".
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILES & ROLES (Phase 2)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_key text,
  account_type text NOT NULL DEFAULT 'student' CHECK (account_type IN ('student', 'staff')),
  app_role text NOT NULL DEFAULT 'customer' CHECK (app_role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_app_role ON public.profiles(app_role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_account_type text DEFAULT 'student' CHECK (requested_account_type IN ('student', 'staff')),
  ADD COLUMN IF NOT EXISTS approved_account_type text DEFAULT 'student' CHECK (approved_account_type IN ('student', 'staff')),
  ADD COLUMN IF NOT EXISTS staff_approval_status text DEFAULT 'not_requested' CHECK (staff_approval_status IN ('not_requested', 'pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE public.profiles
SET requested_account_type = COALESCE(account_type, 'student'),
    approved_account_type = COALESCE(account_type, 'student'),
    staff_approval_status = CASE WHEN account_type = 'staff' THEN 'approved' ELSE 'not_requested' END
WHERE requested_account_type IS NULL OR staff_approval_status IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN requested_account_type SET NOT NULL,
  ALTER COLUMN approved_account_type SET NOT NULL,
  ALTER COLUMN staff_approval_status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_staff_status ON public.profiles(staff_approval_status);
CREATE INDEX IF NOT EXISTS idx_profiles_approved_type ON public.profiles(approved_account_type);

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
  SET display_name = EXCLUDED.display_name,
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.protect_profile_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user != 'service_role' THEN
    IF OLD.app_role IS DISTINCT FROM NEW.app_role THEN
      RAISE EXCEPTION 'Unauthorized: Modifying app_role is forbidden';
    END IF;

    IF OLD.approved_account_type IS DISTINCT FROM NEW.approved_account_type THEN
      RAISE EXCEPTION 'Unauthorized: Modifying approved_account_type is forbidden';
    END IF;

    IF OLD.staff_approval_status IS DISTINCT FROM NEW.staff_approval_status THEN
      RAISE EXCEPTION 'Unauthorized: Modifying staff_approval_status is forbidden';
    END IF;

    IF OLD.reviewed_by IS DISTINCT FROM NEW.reviewed_by THEN
      RAISE EXCEPTION 'Unauthorized: Modifying reviewed_by is forbidden';
    END IF;

    IF OLD.reviewed_at IS DISTINCT FROM NEW.reviewed_at THEN
      RAISE EXCEPTION 'Unauthorized: Modifying reviewed_at is forbidden';
    END IF;

    IF OLD.account_type IS DISTINCT FROM NEW.account_type THEN
      RAISE EXCEPTION 'Unauthorized: Modifying account_type is forbidden';
    END IF;
  END IF;

  NEW.account_type = NEW.approved_account_type;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_roles ON public.profiles;
CREATE TRIGGER trg_protect_profile_roles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_roles();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND app_role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own permitted profile" ON public.profiles;
CREATE POLICY "Users can update own permitted profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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
    SET approved_account_type = 'staff',
        account_type = 'staff',
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

  IF v_updated_profile.id IS NULL THEN
    RAISE EXCEPTION 'Target user profile not found';
  END IF;

  RETURN v_updated_profile;
END;
$$;

-- ---------------------------------------------------------------------
-- 2. CATEGORIES & MENU ITEMS (Phase 3)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories(is_active, sort_order);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  price integer NOT NULL CHECK (price >= 0),
  image_key text,
  is_available boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  track_inventory boolean NOT NULL DEFAULT false,
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_threshold integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_availability ON public.menu_items(is_available, is_archived);
CREATE INDEX IF NOT EXISTS idx_menu_items_inventory ON public.menu_items(track_inventory, stock_quantity);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
  ON public.categories
  FOR SELECT
  TO public
  USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
  ON public.categories
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view non-archived menu items" ON public.menu_items;
CREATE POLICY "Public can view non-archived menu items"
  ON public.menu_items
  FOR SELECT
  TO public
  USING (is_archived = false OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage menu items" ON public.menu_items;
CREATE POLICY "Admins can manage menu items"
  ON public.menu_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. STORAGE BUCKETS (Phase 3)
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'food-images',
  'food-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-images',
  'profile-images',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public can view food images" ON storage.objects;
CREATE POLICY "Public can view food images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'food-images');

DROP POLICY IF EXISTS "Admins can upload food images" ON storage.objects;
CREATE POLICY "Admins can upload food images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'food-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update food images" ON storage.objects;
CREATE POLICY "Admins can update food images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'food-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'food-images' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete food images" ON storage.objects;
CREATE POLICY "Admins can delete food images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'food-images' AND public.is_admin());

DROP POLICY IF EXISTS "Users can view own profile images" ON storage.objects;
CREATE POLICY "Users can view own profile images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "Users can upload own profile image" ON storage.objects;
CREATE POLICY "Users can upload own profile image"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update own profile image" ON storage.objects;
CREATE POLICY "Users can update own profile image"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete own profile image" ON storage.objects;
CREATE POLICY "Users can delete own profile image"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-images'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

-- ---------------------------------------------------------------------
-- 4. ORDERS, ORDER ITEMS & INVENTORY (Phase 4)
-- ---------------------------------------------------------------------

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
