# Backend REST API Specification — Cafteria Platform

> **Host (Dev):** `http://localhost:8787`  
> **Framework:** Hono on Cloudflare Workers  
> **Validation:** Zod (`@hono/zod-validator`)  
> **Authentication:** Supabase Auth (JWT in Authorization Bearer header)  
> **Status:** Phase 5.1 Production Hardened

---

## 1. Global Conventions

### 1.1 Base URL & Pathing
- All traffic terminates at the Cloudflare Worker edge.
- Unauthenticated diagnostic probe: `GET /health`
- Versioned API namespace: `/api/v1/*`

### 1.2 Response Envelope
All API endpoints return JSON conforming to standard response envelopes:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-11-27T00:00:00.000Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Specific error description"
  },
  "timestamp": "2026-11-27T00:00:00.000Z"
}
```

### 1.3 HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure (Zod error details included).
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Authenticated user lacks required role (`developer`, `admin`, `staff`, `retail`, `printer`).
- `404 Not Found`: Endpoint or record does not exist.
- `500 Internal Server Error`: Unhandled exception.

---

## 2. Security, CORS & Logging

### 2.1 Dynamic CORS (`backend/src/middleware/cors.ts`)
- Matches incoming `Origin` against `ALLOWED_ORIGINS` environment variable (e.g., `http://localhost:3000,http://localhost:3001`).
- Permissive local network regex (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`) for mobile device testing.
- Allows `Authorization`, `Content-Type`, `Idempotency-Key`, and `X-Session-Id` headers.

### 2.2 Sanitized Request Logging (`backend/src/middleware/logger.ts`)
- Logs every inbound request with method, path, status, and duration.
- **Redaction Rule:** All sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`, `X-Webhook-Signature`) and sensitive parameters are replaced with `[REDACTED]`.

---

## 3. Endpoints

### 3.1 System & Health
- `GET /health`: Public uptime and version check.
- `GET /api/v1`: API overview and active endpoint directory.

### 3.2 Authentication (`/api/v1/auth`)
- `GET /api/v1/auth/me`: Retrieves authenticated user profile (`id`, `email`, `display_name`, `avatar_key`, `account_type`, `app_role`).
- `PATCH /api/v1/auth/me/profile`: Updates user display name and avatar key.

### 3.3 Admin & User Management (`/api/v1/admin`)
- `GET /api/v1/admin/me`: Verifies administrative credentials and returns effective role authority.
- `GET /api/v1/admin/users`: Lists campus users with search and pagination (Developer only).
- `PATCH /api/v1/admin/users/:id/role`: Assigns user role (`developer`, `admin`, `staff`, `retail`, `printer`, `customer`).
- `GET /api/v1/admin/diagnostics`: System health, payment gateway status, and webhook logs.
- `POST /api/v1/admin/system/test-email`: Dispatches an end-to-end verification email via the raw socket SMTP mailer.

### 3.4 Menu & Categories (`/api/v1/categories`, `/api/v1/menu`)
- `GET /api/v1/categories`: Public list of active categories (`Cache-Control: no-store`).
- `GET /api/v1/admin/categories`: Admin category management list.
- `POST /api/v1/admin/categories`: Create category.
- `PATCH /api/v1/admin/categories/:id`: Update category name, sort order, or active status.
- `GET /api/v1/menu`: Public list of available dishes with integer paise prices.
- `GET /api/v1/admin/menu`: Admin dish catalog list.
- `POST /api/v1/admin/menu`: Create menu dish.
- `PATCH /api/v1/admin/menu/:id`: Update dish details or toggle availability ("86").
- `DELETE /api/v1/admin/menu/:id`: Soft-archive or permanently delete (`?permanent=true`) dish.

### 3.5 Cart Stock Locks (`/api/v1/cart`)
- `POST /api/v1/cart/lock`: Atomically reserves portions of a dish for 5 minutes (`cart_item_locks`).
- `POST /api/v1/cart/unlock`: Releases reserved portions.
- `POST /api/v1/cart/release-all`: Releases all active reservation locks for session/user.
- `GET /api/v1/cart/status`: Returns active lock status.

### 3.6 Customer Orders (`/api/v1/orders`)
- `POST /api/v1/orders`: Places a new order. Supports `payment_method`: `'razorpay'`, `'counter_cash'`, or `'pay_later'` (faculty only). Returns `order_id` and Razorpay gateway order if applicable.
- `POST /api/v1/orders/verify-payment`: Verifies Razorpay checkout signature (`razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`) and updates order to `ORDER_PLACED` / `paid`.
- `GET /api/v1/orders/me`: Returns customer's past orders with `order_stage`.
- `GET /api/v1/orders/pay-later/pending`: Returns faculty member's unsettled Pay Later orders.
- `POST /api/v1/orders/pay-later/settle`: Clears outstanding Pay Later orders.
- `GET /api/v1/orders/:id`: Returns order status and scannable QR verification token.
- `GET /api/v1/orders/:id/receipt`: Generates customer print receipt snapshot.

### 3.7 Admin Orders & QR Verification (`/api/v1/admin/orders`)
- `GET /api/v1/admin/orders`: Live order queue filtered by stage (`all`, `ORDER_PLACED`, `COLLECTED`).
- `GET /api/v1/admin/orders/:id`: Full order inspection drawer with line items.
- `POST /api/v1/admin/orders/:id/ready`: Transitions order to `READY_TO_PICK`.
- `PATCH /api/v1/admin/orders/:id/status`: Updates fulfillment status.
- `POST /api/v1/admin/orders/verify-qr`: Non-mutating QR scan pre-flight check validating 10:00 PM IST service day cutoff.
- `POST /api/v1/admin/orders/collect-qr`: Instant counter collection by QR token code.
- `POST /api/v1/admin/orders/:id/collect`: Confirms order collection and expires QR pass.
- `GET /api/v1/admin/orders/:id/receipt`: Operational POS thermal receipt layout.

### 3.8 Pantry Inventory (`/api/v1/admin/inventory`)
- `GET /api/v1/admin/inventory`: Current stock levels, low-stock alerts, and tracking status.
- `PATCH /api/v1/admin/inventory/:menuItemId`: Quick stock adjustment or 86 toggle.
- `PUT /api/v1/admin/inventory/:menuItemId`: Full inventory parameters update.

### 3.9 Teachers Administration (`/api/v1/admin/staff-requests`)
- `GET /api/v1/admin/staff-requests/teachers/list`: Lists all verified faculty accounts.
- `GET /api/v1/admin/staff-requests/teachers/candidates`: Lists student/guest accounts eligible for teacher promotion.
- `POST /api/v1/admin/staff-requests/teachers/create`: Directly provisions new faculty credentials.
- `POST /api/v1/admin/staff-requests/teachers/assign`: Promotes an existing account to `staff_t`.
- `POST /api/v1/admin/staff-requests/teachers/revoke`: Demotes faculty account back to standard student diner.
- `PATCH /api/v1/admin/staff-requests/teachers/:id`: Updates faculty display name.

### 3.10 Financial Reports & Settlements (`/api/v1/admin/reports`)
- `GET /api/v1/admin/reports/stats`: Financial velocity metrics, today's sales, and active teachers.
- `GET /api/v1/admin/reports/razorpay-payments`: Live payment transactions streamed from Razorpay API.
- `GET /api/v1/admin/reports/payments`: Internal database payments ledger.
- `GET /api/v1/admin/reports/funds`: Fund distribution and flow summary.
- `GET /api/v1/admin/reports/razorpay-settlements`: Bank payout batches from Razorpay settlements API.
- `GET /api/v1/admin/reports/pay-later-logs`: Live faculty Pay Later ledger with settlement status.
- `GET /api/v1/admin/reports/export`: Downloads 3-column simplified Excel workbook (`.xlsx`).

### 3.11 Storage Presigning (`/api/v1/uploads`)
- `POST /api/v1/uploads/presign`: Generates direct presigned upload URL for food images or avatars.
- `POST /api/v1/uploads/verify`: Confirms successful upload and commits storage asset.
- `GET /api/v1/uploads/avatar`: Fetches signed public avatar access URL.

### 3.12 Webhooks (`/api/v1/webhooks`)
- `POST /api/v1/webhooks/razorpay`: Verifies HMAC SHA-256 webhook signatures and deduplicates events via `payment_webhook_events`.

### 3.13 Support Ticket Desk (`/api/v1/support`, `/api/v1/admin/support`)
- `POST /api/v1/support`: Customer submits inquiry ticket (`category`, `subject`, `description`, `priority`).
- `GET /api/v1/support/me`: Customer views their submitted tickets and status.
- `GET /api/v1/admin/support`: Admin lists campus tickets with search and status filters.
- `PATCH /api/v1/admin/support/:id/status`: Updates ticket status (`open`, `in_progress`, `resolved`, `closed`).
- `POST /api/v1/admin/support/:id/reply`: Admin records response and dispatches transactional notification email to user via SMTP.

### 3.14 Store Status & Daily Reset (`/api/v1/store-status`, `/api/v1/admin/store-status`)
- `GET /api/v1/store-status`: Public endpoint returning store status (`is_open`, `message`, `last_daily_reset_date`), performing automatic midnight IST daily stock reset catch-up.
- `PATCH /api/v1/admin/store-status`: Admin endpoint to toggle open/closed status (`is_open: boolean`, `message?: string`). Restricted to `developer` and `admin`.
- `POST /api/v1/admin/inventory/daily-reset`: Admin endpoint to invoke `public.reset_daily_category_stock()` on-demand.
