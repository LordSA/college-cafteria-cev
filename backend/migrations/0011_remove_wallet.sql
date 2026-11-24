-- ====================================================================
-- MIGRATION: 0011_remove_wallet.sql
-- CAFETERIA CEV: REMOVE WALLET ARCHITECTURE & UNUSED TABLES/FUNCTIONS
-- ====================================================================

-- 1. Drop wallet stored procedures
DROP FUNCTION IF EXISTS public.pay_order_with_wallet(uuid, jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS public.pay_order_with_wallet(uuid, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.adjust_wallet_balance(uuid, integer, text, text, uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_or_create_wallet(uuid) CASCADE;

-- 2. Drop wallet tables and their indexes/policies cascade
DROP TABLE IF EXISTS public.wallet_transactions CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
