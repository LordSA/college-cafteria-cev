ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('testing_wallet', 'counter_cash', 'razorpay', 'pay_later'));

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pay_later_settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS pay_later_settled_via text;

CREATE INDEX IF NOT EXISTS idx_orders_pay_later ON public.orders(customer_id, payment_method, payment_status);

