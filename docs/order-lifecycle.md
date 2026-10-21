# Cafteria — Order Lifecycle & QR Collection Specification (Phase 4.2)

## 1. Overview & Core Philosophy

Cafteria enforces a strict **3-stage order lifecycle** to ensure kitchen clarity, prevent premature fulfillment, and guarantee that food orders cannot be collected more than once:

```
[ Customer Pays via Testing Wallet / Cash ]
                     │
                     ▼
             ┌──────────────┐
             │ ORDER_PLACED │  (Stage 1: QR generated; valid only for view, not collection)
             └──────┬───────┘
                    │
                    │ Canteen Kitchen prepares food & marks ready
                    ▼
            ┌───────────────┐
            │ READY_TO_PICK │  (Stage 2: Customer notified; QR eligible for pickup)
            └───────┬───────┘
                    │
                    │ Canteen Staff scans QR & explicitly confirms collection
                    ▼
              ┌───────────┐
              │ COLLECTED │    (Stage 3: Atomically completed; QR permanently expired)
              └───────────┘
```

### Stage Guarantees

1. **Strict 3 Stages**:
   - `ORDER_PLACED`
   - `READY_TO_PICK`
   - `COLLECTED`
   - No intermediate stages like `PROCESSING`, `CONFIRMED`, or `PENDING_PAYMENT` exist in the main stage enum. Legacy database statuses map directly into these 3 strict stages for backward compatibility.

2. **Scanner Pre-flight Safety**:
   - Scanning a customer's QR code **NEVER** automatically collects an order.
   - The scanner performs a non-mutating pre-flight verification (`POST /api/v1/admin/orders/verify-qr`) that inspects current status, items, and eligibility.
   - The admin operator must explicitly review the ordered dishes and click **"Confirm Order Collection"** (`POST /api/v1/admin/orders/:id/collect`).

3. **Atomic Single-Use Invalidation**:
   - Once an order reaches `COLLECTED`, `qr_consumed_at` is set to the current timestamp and `order_stage` transitions atomically.
   - Any duplicate scan attempts return an immediate `400 ALREADY_COLLECTED` or `{ is_eligible_for_collection: false, ineligibility_reason: "Order already collected" }`.
   - Any attempt to collect an order while in `ORDER_PLACED` is rejected with `400 ORDER_NOT_READY` ("Order is not ready for pickup yet").

---

## 2. API Endpoints

### Customer Endpoints
- `POST /api/v1/orders/wallet-checkout`: Debits testing wallet, creates order in `ORDER_PLACED` stage with unique `CAF-QR-XXXXXX` token.
- `GET /api/v1/orders/me`: Returns customer's order history with `order_stage`.
- `GET /api/v1/orders/:id`: Returns order details including `order_stage` and `qr_verification_token` (active or expired).
- `GET /api/v1/orders/:id/receipt`: Generates official canteen bill with `order_stage` and collection timestamp.

### Admin Operations
- `GET /api/v1/admin/orders?stage={all|ORDER_PLACED|READY_TO_PICK|COLLECTED}`: Filter queue by strict stage.
- `POST /api/v1/admin/orders/:id/ready`: Transitions order from `ORDER_PLACED` to `READY_TO_PICK`.
- `POST /api/v1/admin/orders/verify-qr`: Pre-flight verification of QR token without state mutation.
  - Returns `is_eligible_for_collection: true` if and only if stage is `READY_TO_PICK` and order is paid.
  - Returns `ineligibility_reason: "Order is not ready for pickup yet"` when in `ORDER_PLACED`.
  - Returns `ineligibility_reason: "Order already collected"` when in `COLLECTED`.
- `POST /api/v1/admin/orders/:id/collect`: Atomically transitions order from `READY_TO_PICK` to `COLLECTED`.
- `GET /api/v1/admin/orders/:id/receipt`: Admin view of bill / receipt.

---

## 3. Database Stored Procedures (Atomic Concurrency Control)

All critical stage transitions are governed by PostgreSQL stored procedures running with row-level locks (`FOR UPDATE`):

1. **`mark_order_ready(p_order_id UUID)`**:
   - Enforces `payment_status = 'paid'`.
   - Prevents transition if `order_stage = 'COLLECTED'`.
   - Sets `order_stage = 'READY_TO_PICK'`, `ready_at = now()`.

2. **`verify_qr_token(p_qr_token TEXT)`**:
   - Selects order matching `qr_verification_token`.
   - Checks `payment_status`, `order_stage`, and `qr_consumed_at`.
   - Returns structured metadata with `is_eligible_for_collection` and `ineligibility_reason`.

3. **`collect_order(p_order_id UUID, p_operator_id UUID)`**:
   - Locks row via `FOR UPDATE`.
   - Validates `order_stage = 'READY_TO_PICK'`.
   - Updates `order_stage = 'COLLECTED'`, `order_status = 'COLLECTED'`, `collected_at = now()`, `collected_by = p_operator_id`, `qr_consumed_at = now()`.
   - Returns full collection audit record.

---

## 4. Error Code Reference

| HTTP Status | Error Code | Description | User Message |
|-------------|------------|-------------|--------------|
| `400` | `ORDER_NOT_READY` | Order is in `ORDER_PLACED` | Order is not ready for pickup yet |
| `400` | `ALREADY_COLLECTED` | Order is already in `COLLECTED` | Order already collected |
| `400` | `ORDER_UNPAID` | Payment status is not `paid` | Cannot mark unpaid order as ready / collect |
| `400` | `ORDER_CANCELLED` | Order has been cancelled | Cannot process cancelled order |
| `404` | `INVALID_TOKEN` | Token does not match any order | Invalid QR verification code |
| `403` | `FORBIDDEN` | Request by non-admin customer | Admin privileges required |

---

## 5. Verification & Testing Guide

### 5-Step Verification Walkthrough (UI or curl)

#### Step 1: Place an order using Testing Wallet
```bash
curl -X POST http://localhost:8787/api/v1/orders/wallet-checkout \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"menu_item_id":"<ITEM_ID>","quantity":1}]}'
```
- **Expected Outcome**: `200 OK`, `order_stage: "ORDER_PLACED"`, `qr_verification_token: "CAF-QR-..."`.

#### Step 2: Attempt collection while in ORDER_PLACED (Must Fail)
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/<ORDER_ID>/collect \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
- **Expected Outcome**: `400 Bad Request`, `error.code: "ORDER_NOT_READY"`.
- Verify QR scan endpoint:
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/verify-qr \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"<QR_TOKEN>"}'
```
- **Expected Outcome**: `200 OK`, `is_eligible_for_collection: false`, `ineligibility_reason: "Order is not ready for pickup yet"`.

#### Step 3: Admin marks order READY_TO_PICK
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/<ORDER_ID>/ready \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
- **Expected Outcome**: `200 OK`, `order_stage: "READY_TO_PICK"`.
- Customer tracking page shows green "Ready to Pick Up!" alert and active pickup pass.
- QR scan endpoint returns `is_eligible_for_collection: true`, `ineligibility_reason: null`.

#### Step 4: Admin collects order (Succeeds)
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/<ORDER_ID>/collect \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
- **Expected Outcome**: `200 OK`, `order_stage: "COLLECTED"`, `qr_consumed_at: "<TIMESTAMP>"`, `collected_by: "<ADMIN_ID>"`.

#### Step 5: Scan or collect again (Must Fail)
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/verify-qr \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"<QR_TOKEN>"}'
```
- **Expected Outcome**: `200 OK`, `is_eligible_for_collection: false`, `ineligibility_reason: "Order already collected"`.
- Duplicate collection attempt:
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/<ORDER_ID>/collect \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```
- **Expected Outcome**: `400 Bad Request`, `error.code: "ALREADY_COLLECTED"`.

---

## 6. Files Modified & Created

### Migrations
- `backend/migrations/0007_phase4_2_order_stages_and_qr_lifecycle.sql`
- `supabase/migrations/20261022000001_phase4_2_order_stages_and_qr_lifecycle.sql`
- `supabase/complete_setup.sql`

### Backend Services & Routes
- `backend/src/types/env.ts`
- `backend/src/routes/orders.ts`
- `backend/src/routes/adminOrders.ts`
- `backend/tests/phase4_2.test.ts`

### Admin Application
- `admin/src/app/orders/page.tsx`
- `admin/src/app/scan/page.tsx`
- `admin/src/app/page.tsx`

### Customer Application
- `customer/src/app/orders/page.tsx`
- `customer/src/app/orders/track/page.tsx`
- `customer/src/app/checkout/success/page.tsx`
- `customer/src/app/orders/receipt/page.tsx`
