DROP FUNCTION IF EXISTS public.cancel_order(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.cancel_order(uuid, text);
DROP FUNCTION IF EXISTS public.cancel_order;

UPDATE public.orders SET order_status = 'completed' WHERE order_status = 'cancelled';

ALTER TABLE public.orders
  DROP COLUMN IF EXISTS cancellation_reason,
  DROP COLUMN IF EXISTS cancelled_at,
  DROP COLUMN IF EXISTS cancelled_by;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_order_status_check;
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS chk_orders_order_status;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN ('ORDER_PLACED', 'READY_TO_PICK', 'COLLECTED', 'pending', 'confirmed', 'preparing', 'ready_for_pickup', 'completed'));

UPDATE public.inventory_logs SET reason = 'manual_adjustment' WHERE reason = 'order_cancelled';

ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_reason_check;
ALTER TABLE public.inventory_logs DROP CONSTRAINT IF EXISTS chk_inventory_logs_reason;
ALTER TABLE public.inventory_logs
  ADD CONSTRAINT inventory_logs_reason_check
  CHECK (reason IN ('order_placed', 'manual_adjustment', 'restock'));

NOTIFY pgrst, 'reload schema';
