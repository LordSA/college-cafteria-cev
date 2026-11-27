# Cafteria Testing Wallet Architecture & Operational Guide [DEPRECATED]

> [!WARNING]
> **Subsystem Purged & Deprecated in Phase 5**:
> The testing wallet subsystem (`public.wallets`, `public.wallet_transactions`, `pay_order_with_wallet`, `adjust_wallet_balance`, `get_or_create_wallet`) was **permanently purged** from the database and frontend codebases via migrations `0011_remove_wallet.sql` and `20261124000002_remove_wallet.sql`.
>
> In production, online digital payments are handled exclusively via **Razorpay Standard Checkout** (`payment_method = 'razorpay'`), with faculty deferred dining covered via **Faculty Pay Later** (`payment_method = 'pay_later'`).
>
> This document is preserved solely as a historical reference for Phase 4.1 architecture.

---

## 1. Subsystem Architecture (Historical Reference)

The testing wallet previously enabled cashless checkout simulation while preserving full database atomicity, transactional isolation, and strict auditability.

### 1.1 Data Model (Purged in Phase 5)

- **`public.wallets`**:
  - `id uuid PRIMARY KEY`: System wallet UUID.
  - `customer_id uuid UNIQUE REFERENCES auth.users(id)`: Owning customer.
  - `balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0)`: Authoritative balance in integer paise (₹1.00 = 100 paise).
  - `created_at timestamptz`: Creation timestamp.
  - `updated_at timestamptz`: Last balance adjustment timestamp.

- **`public.wallet_transactions`**:
  - `id uuid PRIMARY KEY`: Transaction UUID.
  - `wallet_id uuid REFERENCES public.wallets(id)`: Target wallet.
  - `customer_id uuid REFERENCES auth.users(id)`: Customer reference.
  - `amount integer NOT NULL CHECK (amount > 0)`: Magnitude in integer paise.
  - `transaction_type text CHECK ('credit', 'debit')`: Transaction direction.
  - `balance_after integer NOT NULL CHECK (balance_after >= 0)`: Snapshot of balance after change.
  - `reason text NOT NULL`: Human-readable audit explanation.
  - `order_id uuid REFERENCES public.orders(id)`: Associated order if debit.
  - `actor_id uuid REFERENCES auth.users(id)`: User or admin who initiated adjustment.
  - `created_at timestamptz`: Audit timestamp.

---

## 2. Replacement in Phase 5

The testing wallet was replaced with:
1. **Razorpay Standard Checkout**: Complete UPI, Net Banking, and card processing with Web Crypto HMAC SHA-256 verification and webhook deduplication.
2. **Faculty Pay Later**: Deferred billing for verified teachers (`account_type = 'staff_t'`) with real-time settlement tracking on the admin dashboard.
