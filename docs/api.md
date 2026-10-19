# Backend REST API Specification — Cafteria

> **Host (Dev):** `http://localhost:8787`  
> **Framework:** Hono on Cloudflare Workers  
> **Validation:** Zod (`@hono/zod-validator`)  
> **Authentication:** Supabase Auth (JWT in Authorization Bearer header, Phase 2)

---

## 1. Global Conventions

### 1.1 Base URL & Pathing
- All production and staging traffic terminates at the Cloudflare Worker edge.
- Unauthenticated diagnostic route: `GET /health`
- Versioned API namespace: `/api/v1/*`

### 1.2 Response Envelope
All API endpoints return JSON conforming to standard response envelopes:

#### Success Response
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-10-20T00:00:00.000Z"
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid meal slot requested"
  },
  "timestamp": "2026-10-20T00:00:00.000Z"
}
```

### 1.3 HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure (Zod error details included).
- `401 Unauthorized`: Missing or invalid Bearer token.
- `403 Forbidden`: Authenticated user lacks required role (`customer`, `canteen_staff`, `admin`).
- `404 Not Found`: Endpoint or record does not exist.
- `500 Internal Server Error`: Unhandled exception.

---

## 2. Security, CORS & Logging

### 2.1 Dynamic CORS (`backend/src/middleware/cors.ts`)
- Configured via `ALLOWED_ORIGINS` environment variable.
- Example: `http://localhost:3000,http://localhost:3001`
- Matches incoming `Origin` against the whitelist. Rejects unlisted browser origins.

### 2.2 Sanitized Request Logging (`backend/src/middleware/logger.ts`)
- Logs every inbound request with method, path, status, and duration.
- **Redaction Rule:** All sensitive headers (`Authorization`, `Cookie`, `X-Api-Key`, `X-Webhook-Signature`) and sensitive query parameters (`token`, `secret`, `password`, `code`) are replaced with `[REDACTED]`.

---

## 3. Endpoints

### 3.1 Health Probe
`GET /health`
- **Auth:** None (Public)
- **Response `200 OK`:**
```json
{
  "status": "ok",
  "environment": "development",
  "version": "1.0.0",
  "timestamp": "2026-10-20T00:00:00.000Z"
}
```

### 3.2 API v1 Root
`GET /api/v1`
- **Auth:** None (Public)
- **Response `200 OK`:**
```json
{
  "version": "v1",
  "status": "operational",
  "services": {
    "auth": "Phase 2 (Planned)",
    "menu": "Phase 3 (Planned)",
    "orders": "Phase 4 (Planned)",
    "storage": "Phase 5 (Planned)",
    "payments": "Phase 6 (Planned)"
  }
}
```

---

## 4. Planned Endpoint Map (Phases 2-6)

### Auth & User (`/api/v1/auth`)
- `POST /api/v1/auth/session`: Sync Supabase user session and fetch role.
- `GET /api/v1/auth/me`: Retrieve active profile & wallet balance.

### Menu & Catalog (`/api/v1/menu`)
- `GET /api/v1/menu`: Retrieve active items grouped by category and meal slot.
- `POST /api/v1/menu` *(Admin)*: Create new menu item.
- `PATCH /api/v1/menu/:id/availability` *(Staff)*: Instantly toggle item availability (86-ing an item).

### Orders & Kitchen Queue (`/api/v1/orders`)
- `POST /api/v1/orders`: Create pre-order, lock meal slot, reserve inventory.
- `GET /api/v1/orders/active`: Customer active orders with live token status.
- `GET /api/v1/orders/kds` *(Staff/Admin)*: Live Kitchen Display System queue.
- `PATCH /api/v1/orders/:id/status` *(Staff)*: Transition status (`COOKING` -> `READY` -> `COLLECTED`).

### Payments (`/api/v1/payments`)
- `POST /api/v1/payments/create-order`: Generate Razorpay order ID.
- `POST /api/v1/payments/verify`: Verify Razorpay HMAC SHA256 signature.
