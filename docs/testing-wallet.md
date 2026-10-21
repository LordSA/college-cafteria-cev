# Cafteria Testing Wallet Architecture & Operational Guide

> **Notice:** "Testing Wallet — Demo Credits Only. No Real Money." This subsystem provides non-monetary credits exclusively for canteen load testing, UX evaluation, and order fulfillment simulation. Real payment gateway integrations (Razorpay) remain strictly scheduled for Phase 5.

---

## 1. Subsystem Architecture

The testing wallet enables instantaneous cashless checkout simulation while preserving full database atomicity, transactional isolation, and strict auditability.

### 1.1 Data Model

- **`public.wallets`**:
  - `id uuid PRIMARY KEY`: System wallet UUID.
  - `customer_id uuid UNIQUE REFERENCES auth.users(id)`: Owning customer.
  - `balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0)`: Autoritative current balance in integer paise (₹1.00 = 100 paise).
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

## 2. Integrity & Security Boundaries

1. **Client Isolation**: Customers cannot modify their wallet balance directly. RLS policies restrict customer queries to `SELECT` operations on their own wallet and ledger transactions.
2. **Negative Balance Prevention**: Both PostgreSQL check constraints (`CHECK (balance >= 0)`) and stored procedures (`adjust_wallet_balance`, `pay_order_with_wallet`) enforce non-negative boundaries with atomic row-level locks (`FOR UPDATE`).
3. **Compensating Transactions**: In accordance with financial ledger best practices, ledger records are immutable. Corrections must be applied via compensating credit or debit entries rather than mutating historical rows.

---

## 3. REST API Interface

### Customer Endpoints
- `GET /api/v1/wallet/me`:
  - Returns authenticated customer's wallet balance (in paise and formatted string `₹X.XX`).
  - Automatically initializes zero-balance wallet if non-existent.
- `GET /api/v1/wallet/transactions`:
  - Returns paginated history of credits and debits with timestamps and reasons.

### Admin Endpoints
- `GET /api/v1/admin/wallets`:
  - Lists customer wallets with search filtering and current balances.
- `GET /api/v1/admin/wallets/:customerId`:
  - Returns customer wallet balance, profile info, and recent ledger entries.
- `POST /api/v1/admin/wallets/:customerId/adjust`:
  - Payload: `{ amount: integer, transaction_type: 'credit' | 'debit', reason: string }`.
  - Atomically applies adjustment and logs acting admin ID.

---

## 4. UI Implementation

- **Customer App**:
  - `/wallet`: Current demo balance card, explanation of test credits, and ledger history.
  - Header: Live balance indicator chip linking to `/wallet`.
  - `/checkout`: Instant checkout with "Testing Wallet" payment method selector and real-time balance validation.
- **Admin App**:
  - `/wallets`: Customer search, balance inspection, credit/debit modal with mandatory reason validation, and full audit ledger dialog.
