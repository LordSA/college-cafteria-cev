# Inventory Subsystem Specification — Cafteria Platform

> **Status:** Phase 5.1 Live  
> **Scope:** Ingredient Depletion, Stock Limits, Threshold Alerts, and Cart Item Stock Locking.

---

## 1. Inventory Model

Cafteria serves both made-on-demand items (e.g., hot filter coffee, fresh tea) and stock-limited pre-cooked items (e.g., veg cutlets, samosas, packaged juices).

To support this distinction cleanly without inventing artificial large numbers, the schema defines:

1. `track_inventory` (`boolean NOT NULL DEFAULT false`):
   - When `false`, the item is considered unlimited or prepared on demand. No stock decrement occurs.
   - When `true`, the item has finite daily availability bounded by `stock_quantity`.
2. `stock_quantity` (`integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0)`):
   - Current physical units available in the canteen kitchen.
3. `low_stock_threshold` (`integer NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0)`):
   - Alert threshold. When `stock_quantity <= low_stock_threshold`, the kitchen operations board triggers an amber visual warning.

---

## 2. Automatic Depletion & Availability 86

1. **Order Placement Depletion:**
   When an order is successfully placed and verified:
   - For each line item with `track_inventory = true`, `stock_quantity` is decremented by the requested quantity.
   - If `stock_quantity` drops to `0`, `is_available` is automatically flipped to `false` ("86'd") to immediately prevent future customer orders.
2. **Audit Logging:**
   Every stock decrement writes an immutable row into `public.inventory_logs`:
   ```sql
   INSERT INTO public.inventory_logs (menu_item_id, quantity_change, reason, order_id, actor_id)
   VALUES (item_id, -quantity, 'order_placed', order_id, customer_id);
   ```

---

## 3. Cart Stock Reservation & Locking (`cart_item_locks`)

To prevent multiple users from attempting to checkout the last portion simultaneously:

1. **Atomic 5-Minute Locks:**
   - Adding an item to the shopping cart acquires a lock in `public.cart_item_locks` via `public.lock_cart_item(p_menu_item_id, p_quantity, p_user_id, p_session_id)`.
   - The lock expires automatically after 5 minutes if checkout is not completed.
2. **Non-Deducting Concurrency Architecture:**
   - Locks do NOT mutate `menu_items.stock_quantity`.
   - Instead, available stock is computed as `stock_quantity - COALESCE(SUM(active_other_locks), 0)`.
   - When calculating available stock for the caller, the caller's own locks are excluded by matching `user_id` or `session_id`, preventing the caller from blocking themselves.
3. **Session Lock Claiming:**
   - Anonymous session reservations are automatically claimed by the authenticated user ID upon sign-in.
4. **Zero Cancellation Policy:**
   - Because all placed orders are final, there are no order cancellation stock restoration flows. Stock decrements are permanent unless manually restocked or adjusted by management.

---

## 4. `public.inventory_logs` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique log identifier |
| `menu_item_id` | `uuid` | `NOT NULL REFERENCES menu_items(id)` | Target dish |
| `quantity_change` | `integer` | `NOT NULL` | Delta (+ or -) |
| `reason` | `text` | `CHECK (reason IN ('order_placed', 'manual_adjustment', 'restock'))` | Cause of movement |
| `order_id` | `uuid` | `NULLABLE REFERENCES orders(id)` | Associated order if applicable |
| `actor_id` | `uuid` | `NULLABLE REFERENCES auth.users(id)` | User or admin triggering change |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Timestamp of adjustment |

---

## 5. Administrative Controls

Authorized administrators (`developer`, `admin`, `retail`) can:
- Adjust stock count through `PATCH /api/v1/admin/inventory/:menuItemId`.
- Toggle `is_available` at any time to instantly 86 an item if ingredients spoil or sell out.
- View responsive 2-column mobile box cards or desktop tables with portion meters.
- Filter inventory by low-stock status to proactively prepare batches during prep hours.
