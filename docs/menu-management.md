# Menu & Category Management Architecture

> **Status:** Implemented in Phase 3  
> **Date:** 2026-10-20  

---

## 1. Overview

Cafteria provides a robust menu and catalog engine designed for high-throughput campus kitchens:
- **Integer Paise Pricing:** All item prices are represented as positive integers in paise (e.g. ₹45.00 = `4500` paise) to prevent floating-point inaccuracies.
- **Availability Toggles (86ing):** Staff can instantaneously mark an item as "Sold Out" or "Available" with a single click, which updates customer view immediately.
- **Logical Archiving:** Items are soft-deleted via `is_archived = true` to preserve historical order records and audit trails.
- **Decoupled Image Storage:** Images are uploaded through the backend's provider-independent storage interface (`/api/v1/uploads/presign`) and stored in Supabase Storage (`food-images` bucket) or Cloudflare R2.

---

## 2. Database Schema

### `public.categories`
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `name text NOT NULL UNIQUE`
- `description text`
- `sort_order integer NOT NULL DEFAULT 0`
- `is_active boolean NOT NULL DEFAULT true`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

### `public.menu_items`
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `category_id uuid NOT NULL REFERENCES public.categories(id)`
- `name text NOT NULL`
- `description text`
- `price integer NOT NULL CHECK (price >= 0)`
- `image_key text`
- `is_available boolean NOT NULL DEFAULT true`
- `is_archived boolean NOT NULL DEFAULT false`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

---

## 3. API Endpoints

### Public Endpoints (Customers)
- `GET /api/v1/categories`: Lists all active categories ordered by `sort_order`.
- `GET /api/v1/menu`: Lists non-archived menu items. Supports `?category_id=<uuid>` and `?search=<term>`. Resolves public `image_url` dynamically.

### Administrative Endpoints (Admin Operations)
- `GET /api/v1/admin/categories`: Lists all categories (active & inactive).
- `POST /api/v1/admin/categories`: Creates a new category.
- `PATCH /api/v1/admin/categories/:id`: Updates category fields or active toggle.
- `GET /api/v1/admin/menu`: Lists all menu items including archived ones.
- `POST /api/v1/admin/menu`: Creates a new menu item.
- `PATCH /api/v1/admin/menu/:id`: Updates menu item details or availability (`is_available`).
- `DELETE /api/v1/admin/menu/:id`: Soft-archives menu item (`is_archived = true`, `is_available = false`).
