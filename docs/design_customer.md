# Customer App Design System — Cafteria

> **Audience:** Students, Faculty, and Campus Visitors  
> **Target Devices:** Mobile-First (Smartphones 360px–430px) with responsive tablet and desktop expansion  
> **Personality:** Fast, Appetizing, Warm, Intuitive, Accessible  
> **Framework:** Next.js (Static Export), Tailwind CSS, Lucide React

---

## 1. Visual Identity & Color Tokens

The Customer interface is designed to evoke warmth, appetite, freshness, and speed. It uses warm amber as the primary brand anchor, complemented by organic stone neutrals and clean functional indicators.

### 1.1 Brand Palette (Warm Amber)
Defined in `customer/tailwind.config.ts` under `brand`:

| Token | Hex Value | Usage |
|---|---|---|
| `brand-50` | `#fffbeb` | Soft background highlights, alert banners |
| `brand-100` | `#fef3c7` | Pill badges, selected category chips |
| `brand-200` | `#fde68a` | Border accents, highlighted cards |
| `brand-300` | `#fcd34d` | Interactive focus rings, warning accents |
| `brand-400` | `#fbbf24` | Stars, ratings, secondary highlights |
| `brand-500` | `#f59e0b` | Primary buttons, active tab indicators, icons |
| `brand-600` | `#d97706` | Hover states for primary buttons, prominent text |
| `brand-700` | `#b45309` | High-contrast body links, active pressed states |
| `brand-800` | `#92400e` | Dark banner text, headings on light amber |
| `brand-900` | `#78350f` | Deep text, prominent category labels |

### 1.2 Neutral & Surface Scale (Warm Stone)
| Token | Class | Role |
|---|---|---|
| Pure White | `bg-white` | Menu card background, sheet modals |
| Surface Light | `bg-stone-50` | Page background, input fields |
| Card Border | `border-stone-200` | Clean, subtle boundaries for food items |
| Muted Text | `text-stone-500` | Subtitles, ingredients, calorie indicators |
| Body Text | `text-stone-700` | Item descriptions, pickup notes |
| Headings | `text-stone-900` | Food titles, prices, sheet titles |

### 1.3 Semantic & Dietary Status Colors
- **Veg (Vegetarian):** Emerald green (`#10b981`), `border-emerald-600`, with a green dot inside a square frame.
- **Non-Veg:** Crimson red (`#ef4444`), `border-red-600`, with a red triangle/dot inside a square frame.
- **Egg / Eggetarian:** Amber (`#f59e0b`), `border-amber-600`.
- **Special / Chef Pick:** Violet / Indigo badge (`bg-indigo-50 text-indigo-700`).
- **Low Stock (< 5 left):** Flame orange pill (`bg-orange-100 text-orange-800`).
- **Sold Out:** Stone / Gray muted badge (`bg-stone-200 text-stone-600`).

---

## 2. Typography Hierarchy

Using modern sans-serif typography (`Inter` / system-ui default):

| Level | Size / Weight | Line Height | Application |
|---|---|---|---|
| **Display / Hero** | `text-3xl` to `text-5xl` font-extrabold | Tight | Welcome banner, hero headline |
| **Section Title** | `text-xl` to `text-2xl` font-bold | Snug | Category headlines ("Breakfast Specials") |
| **Item Title** | `text-base` font-semibold | Snug | Food item names ("Masala Dosa") |
| **Price Tag** | `text-base` font-bold | None | Item pricing (`₹60.00`) |
| **Body / Description** | `text-sm` font-normal | Relaxed | Item ingredients, canteen policy notes |
| **Metadata / Badges** | `text-xs` font-semibold | Normal | Preparation time ("10 mins"), Diet tags |
| **Micro Caption** | `text-[10px]` font-medium | Tight | Disclaimer, token disclaimer, footer |

---

## 3. Layout, Spacing & Mobile Touch Targets

### 3.1 Mobile-First Philosophy
Because over 85% of campus orders originate from student smartphones while walking between classrooms:
- **Minimum Touch Target:** All interactive controls (buttons, add/remove steppers, category pills) must measure at least **44x44px** (preferably 48x48px).
- **One-Thumb Reachability:** Essential actions (Floating Cart bar, Checkout CTA, Category switcher) are pinned to the bottom or easily reachable in the thumb zone.
- **Container Constrain:** Max width on desktop is capped at `max-w-6xl` (`1152px`) or centered single column `max-w-md` (`448px`) for checkout steps.

### 3.2 Spacing Grid
- Standard spacing unit is 4px (Tailwind scale: `p-2` = 8px, `p-4` = 16px, `p-6` = 24px).
- Card gutter: `gap-4` on mobile, `gap-6` on tablet/desktop.

---

## 4. Key Component Specifications

### 4.1 Sticky Header & Navigation
- Transparent blur background: `backdrop-blur-md bg-stone-50/80`.
- Top-level branding with icon and live backend connectivity status badge (`ApiHealthBadge`).
- Search input with clear button and real-time query debounce.

### 4.2 Category Chips Carousel
- Horizontally scrollable row with hidden scrollbars: `flex gap-2 overflow-x-auto no-scrollbar`.
- Chips reflect active meal slot (All, Breakfast, Meals, Snacks, Beverages, Desserts).
- Active state: `bg-amber-500 text-white shadow-sm`.
- Inactive state: `bg-stone-100 text-stone-700 hover:bg-stone-200`.

### 4.3 Menu Item Card
- **Layout:** Flex row on mobile (food photo on right, details on left); vertical card on desktop grid.
- **Image:** 96x96px rounded-xl with `object-cover` and fallback skeleton placeholder.
- **Content:**
  - Dietary indicator (Veg/Non-Veg icon).
  - Item name + preparation time badge (`10 min`).
  - Short description (1–2 lines max with `line-clamp-2`).
  - Price in bold INR currency.
- **Action:**
  - If 0 in cart: "ADD" button (`border border-amber-300 bg-amber-50 text-amber-700 font-bold px-4 py-1.5 rounded-lg`).
  - If > 0 in cart: Stepper `[-] Qty [+]` (`bg-amber-500 text-white rounded-lg flex items-center`).

### 4.4 Floating Cart Bar
- Appears whenever cart items > 0.
- Pinned to bottom: `fixed bottom-4 inset-x-4 max-w-md mx-auto z-40`.
- Displays item count, total price, and "View Cart & Pay" arrow button.
- Subtle entrance animation: `animate-in slide-in-from-bottom-4 duration-200`.

### 4.5 Order Status Tracker
- Visual step pipeline:
  1. `Order Placed` (Checkmark)
  2. `Kitchen Preparing` (Flame / Chef icon)
  3. `Ready for Pickup` (Notification chime / Counter number highlighted)
  4. `Completed` (Archived)
- Big Token Number display (`#B-42`) in high-contrast amber box for presenting at the counter.

---

## 5. Accessibility & Motion Rules

- **Contrast:** All text meets WCAG AA standards (minimum 4.5:1 against background).
- **Reduced Motion:** Respects `prefers-reduced-motion` for transitions.
- **Haptic/Visual Feedback:** Active button press transitions (`active:scale-95 transition-transform duration-100`).
