ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS daily_reset boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_categories_daily_reset ON public.categories(daily_reset, is_active);

ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_reason_check;
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS chk_inventory_logs_reason;
ALTER TABLE public.inventory_logs
  ADD CONSTRAINT inventory_logs_reason_check
  CHECK (reason IN ('order_placed', 'manual_adjustment', 'restock', 'daily_reset'));

CREATE TABLE IF NOT EXISTS public.store_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.store_settings (key, value)
VALUES ('canteen_status', '{"is_open": true, "message": "Canteen is open for orders", "last_daily_reset_date": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view store settings" ON public.store_settings;
CREATE POLICY "Public can view store settings"
  ON public.store_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
  ON public.store_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.app_role IN ('developer', 'admin', 'staff')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.app_role IN ('developer', 'admin', 'staff')
    )
  );

CREATE OR REPLACE FUNCTION public.reset_daily_category_stock()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_reset_count integer := 0;
  v_today_ist text;
BEGIN
  v_today_ist := to_char(timezone('Asia/Kolkata', now()), 'YYYY-MM-DD');

  FOR v_item IN
    SELECT m.id, m.name, m.stock_quantity, m.track_inventory
    FROM public.menu_items m
    JOIN public.categories c ON m.category_id = c.id
    WHERE c.daily_reset = true
      AND c.is_active = true
      AND m.is_archived = false
  LOOP
    IF v_item.track_inventory = true THEN
      IF v_item.stock_quantity > 0 THEN
        INSERT INTO public.inventory_logs (menu_item_id, quantity_change, reason, created_at)
        VALUES (v_item.id, -v_item.stock_quantity, 'daily_reset', now());
      END IF;

      UPDATE public.menu_items
      SET stock_quantity = 0,
          is_available = false,
          updated_at = now()
      WHERE id = v_item.id;
    ELSE
      UPDATE public.menu_items
      SET is_available = true,
          updated_at = now()
      WHERE id = v_item.id;
    END IF;

    v_reset_count := v_reset_count + 1;
  END LOOP;

  UPDATE public.store_settings
  SET value = jsonb_set(
        jsonb_set(value, '{last_daily_reset_date}', to_jsonb(v_today_ist)),
        '{last_daily_reset_at}',
        to_jsonb(now()::text)
      ),
      updated_at = now()
  WHERE key = 'canteen_status';

  RETURN jsonb_build_object(
    'success', true,
    'reset_count', v_reset_count,
    'date_ist', v_today_ist,
    'timestamp', now()
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
