# Cafteria — Order Lifecycle & QR Collection Specification (Phase 5.1)

## 1. Overview & Core Philosophy

Cafteria enforces a strict order lifecycle and pickup verification workflow to ensure kitchen clarity, prevent premature fulfillment, and guarantee that meals cannot be collected more than once:

```
[ Customer Pays via Razorpay / Faculty Pay Later / Counter Cash ]
                     │
                     ▼
             ┌──────────────┐
             │ ORDER_PLACED │  (Stage 1: QR generated; visible on customer pass)
             └──────┬───────┘
                    │
                    │ Canteen Kitchen prepares food & marks ready (optional)
                    ▼
            ┌───────────────┐
            │ READY_TO_PICK │  (Stage 2: Customer notified; QR eligible for pickup)
            └───────┬───────┘
                    │
                    │ Staff scans QR code / Thermal Kiosk submits token
                    ▼
              ┌───────────┐
              │ COLLECTED │    (Stage 3: Atomically completed; QR permanently expired)
              └───────────┘
```

### Key Guarantees

1. **Canonical Stages**:
   - `ORDER_PLACED`: Initial state after payment verification or Pay Later submission.
   - `READY_TO_PICK`: Kitchen preparation completed.
   - `COLLECTED`: Counter fulfillment completed.
2. **Scanner Verification & Direct Collection**:
   - **Pre-flight Inspection (`POST /api/v1/admin/orders/verify-qr`)**: Inspects order validity, line items, payment status, and 10:00 PM IST cutoff without mutating state.
   - **Explicit Confirmation (`POST /api/v1/admin/orders/:id/collect`)**: Staff confirms physical tray handoff.
   - **Direct Barcode/Kiosk Collection (`POST /api/v1/admin/orders/collect-qr`)**: Hardware barcode scanners and thermal printer kiosks can submit the token directly to atomize fulfillment.
3. **Daily Service Cutoff (10:00 PM IST)**:
   - Verification utility calculates the 10:00 PM IST (UTC+05:30) service boundary of the day the order was placed.
   - Any order scanned after 10:00 PM IST is rejected with `QR_EXPIRED` (`"Service day ended (10:00 PM IST cutoff)"`).
4. **Atomic Single-Use Invalidation**:
   - Transition to `COLLECTED` sets `qr_consumed_at = now()`. Duplicate scans return `400 ALREADY_COLLECTED`.
5. **Zero Cancellation Policy**:
   - In accordance with campus dining policy, orders cannot be cancelled after placement.

---

## 2. API Endpoints

### Customer Endpoints
- `POST /api/v1/orders`: Creates order with `payment_method: 'razorpay' | 'pay_later' | 'counter_cash'`.
- `POST /api/v1/orders/verify-payment`: Verifies Razorpay checkout signature.
- `GET /api/v1/orders/me`: Returns customer's order history with `order_stage`.
- `GET /api/v1/orders/:id`: Returns order details, stage, and `qr_verification_token`.
- `GET /api/v1/orders/:id/receipt`: Generates customer print receipt snapshot.

### Admin Operations
- `GET /api/v1/admin/orders?stage={all|ORDER_PLACED|COLLECTED}`: Filter queue by stage.
- `POST /api/v1/admin/orders/:id/ready`: Transitions order to `READY_TO_PICK`.
- `POST /api/v1/admin/orders/verify-qr`: Non-mutating pre-flight verification of QR token.
- `POST /api/v1/admin/orders/collect-qr`: Direct one-step collection by QR token code.
- `POST /api/v1/admin/orders/:id/collect`: Explicit stage transition to `COLLECTED`.
- `GET /api/v1/admin/orders/:id/receipt`: Cashier printable register bill layout.

---

## 3. Error Code Reference

| HTTP Status | Error Code | Description | User Message |
|-------------|------------|-------------|--------------|
| `400` | `ORDER_NOT_READY` | Order is in `ORDER_PLACED` | Order is not ready for pickup yet |
| `400` | `ALREADY_COLLECTED` | Order is already in `COLLECTED` | Order already collected |
| `400` | `ORDER_UNPAID` | Payment status is not `paid` | Cannot mark unpaid order as ready / collect |
| `400` | `QR_EXPIRED` | Scanned after 10:00 PM IST cutoff | Service day ended (10:00 PM IST cutoff) |
| `404` | `INVALID_TOKEN` | Token does not match any order | Invalid QR verification code |
| `403` | `FORBIDDEN` | Request lacks required staff/admin role | Admin privileges required |

---

## 4. Verification & Testing Guide

### 4-Step Verification Walkthrough

#### Step 1: Place and Verify an Order
Submit checkout via Razorpay or Faculty Pay Later:
```bash
curl -X POST http://localhost:8787/api/v1/orders \
  -H "Authorization: Bearer <CUSTOMER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"menu_item_id":"<ITEM_ID>","quantity":1}],"payment_method":"pay_later"}'
```
- **Outcome**: `200 OK`, `order_stage: "ORDER_PLACED"`, `qr_verification_token: "CAF-QR-..."`.

#### Step 2: Pre-flight QR Scan
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/verify-qr \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"<QR_TOKEN>"}'
```
- **Outcome**: `200 OK`, order items checklist returned with current fulfillment state.

#### Step 3: Fulfill Order (Direct or Staged)
Direct collection via QR token:
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/collect-qr \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"<QR_TOKEN>"}'
```
- **Outcome**: `200 OK`, `order_stage: "COLLECTED"`, `qr_consumed_at: "<TIMESTAMP>"`.

#### Step 4: Duplicate Scan Attempt (Rejected)
```bash
curl -X POST http://localhost:8787/api/v1/admin/orders/collect-qr \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qr_token":"<QR_TOKEN>"}'
```
- **Outcome**: `400 Bad Request`, `error.code: "ALREADY_COLLECTED"`.
