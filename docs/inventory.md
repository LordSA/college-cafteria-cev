# Inventory Subsystem Specification — Cafteria Platform

> **Status:** Phase 4 Live  
> **Scope:** Ingredient Depletion, Stock Limits, Threshold Alerts, and Cancellation Restoration.

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
   When an order is placed:
   - For each line item with `track_inventory = true`, `stock_quantity` is decremented by the requested quantity.
   - If `stock_quantity` drops to `0`, `is_available` is automatically flipped to `false` ("86'd") to immediately hide the dish from future customer orders.
2. **Audit Logging:**
   Every stock decrement writes an immutable row into `public.inventory_logs`:
   ```sql
   INSERT INTO public.inventory_logs (menu_item_id, quantity_change, reason, order_id, actor_id)
   VALUES (item_id, -quantity, 'order_placed', order_id, customer_id);
   ```

---

## 3. Cancellation Restoration Rules

1. When an eligible order (`pending` or `confirmed`) is cancelled:
   - The transaction looks up each item in `order_items`.
   - For items with `track_inventory = true`, `stock_quantity` is restored (`stock_quantity + quantity`).
   - If the item was previously disabled due to zero stock, `is_available` is automatically reset to `true`.
   - A corresponding audit log is written with `reason = 'order_cancelled'`.
2. Repeated cancellation requests cannot restore stock twice because terminal checks reject cancelled orders with `ERR_ALREADY_CANCELLED`.
3. Completed orders cannot be cancelled or restored.

---

## 4. `public.inventory_logs` Table

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | `PRIMARY KEY DEFAULT gen_random_uuid()` | Unique log identifier |
| `menu_item_id` | `uuid` | `NOT NULL REFERENCES menu_items(id)` | Target dish |
| `quantity_change` | `integer` | `NOT NULL` | Delta (+ or -) |
| `reason` | `text` | `CHECK (reason IN ('order_placed', 'order_cancelled', 'manual_adjustment', 'restock'))` | Cause of movement |
| `order_id` | `uuid` | `NULLABLE REFERENCES orders(id)` | Associated order if applicable |
| `actor_id` | `uuid` | `NULLABLE REFERENCES auth.users(id)` | User or admin triggering change |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Timestamp of adjustment |

---

## 5. Administrative Controls

Authorized administrators can:
- Adjust stock count through `PATCH /api/v1/admin/inventory/:menuItemId`.
- Toggle `is_available` at any time to instantly 86 an item if ingredients spoil or sell out.
- Filter inventory by `low_stock_only=true` to proactively prep additional batches during morning prep hours.
