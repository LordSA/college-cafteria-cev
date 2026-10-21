-- Migration 20261022000000: Add explicit foreign key relationships between orders, wallets, and profiles
-- Enables PostgREST schema cache to resolve relationships between public.orders / public.wallets and public.profiles

-- 1. Ensure any orphaned customer IDs in orders/wallets exist in profiles (self-healing)
INSERT INTO public.profiles (id, display_name, account_type, app_role)
SELECT DISTINCT o.customer_id, 'Customer', 'student', 'customer'
FROM public.orders o
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = o.customer_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, display_name, account_type, app_role)
SELECT DISTINCT w.customer_id, 'Customer', 'student', 'customer'
FROM public.wallets w
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = w.customer_id)
ON CONFLICT (id) DO NOTHING;

-- 2. Add foreign key from public.orders(customer_id) to public.profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_customer_profile'
  ) THEN
    ALTER TABLE public.orders
      ADD CONSTRAINT fk_orders_customer_profile
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3. Add foreign key from public.wallets(customer_id) to public.profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallets_customer_profile'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT fk_wallets_customer_profile
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Add foreign key from public.wallet_transactions(customer_id) to public.profiles(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_wallet_tx_customer_profile'
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT fk_wallet_tx_customer_profile
      FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Signal PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
