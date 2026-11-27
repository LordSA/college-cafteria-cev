# Teachers Administration & Faculty (`staff_t`) Architecture

> **Status:** Reconfigured in Phase 5 & 5.1  
> **Date:** 2026-11-27  

---

## 1. Overview & Faculty Role Architecture

In college campus dining, teachers and faculty members receive designated dining privileges and Faculty Pay Later credit options. To distinguish faculty customers from canteen store workers (`staff` in `app_role`), faculty members are designated as `staff_t` in `public.profiles.account_type`.

### Evolution from Self-Signup to Direct Administration
- In earlier phases, users self-declared teacher status by entering a Teacher ID during signup, which entered a pending verification queue.
- To eliminate signup friction, remove unused profile columns, and guarantee zero privilege escalation, migrations `0010_database_cleanup.sql` and `20261124000000_remove_teacher_id_and_fix_stock_locks.sql` completely dropped `teacher_id`, `requested_account_type`, `approved_account_type`, and `staff_approval_status`.
- Faculty accounts are now managed directly by verified campus administrators via the Teachers Management portal (`/staff-requests`).

---

## 2. Database Schema (`public.profiles`)

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | `PRIMARY KEY REFERENCES auth.users(id)` | User unique identifier |
| `email` | `text` | `NULL` | | User email address synchronized from `auth.users` |
| `display_name` | `text` | `'Diner'` | | User full name |
| `avatar_key` | `text` | `'avatars/avatar-1.svg'` | | Preset or custom avatar path |
| `account_type` | `text` | `'student'` | `CHECK in ('student', 'staff_t', 'guest')` | Active customer classification (`staff_t` enables Pay Later) |
| `app_role` | `text` | `'customer'` | `CHECK in ('developer', 'admin', 'retail', 'staff', 'printer', 'customer')` | Back-office operational permissions |
| `created_at` | `timestamptz` | `now()` | | Profile creation timestamp |
| `updated_at` | `timestamptz` | `now()` | | Last profile update timestamp |

---

## 3. Administrative REST Endpoints (`/api/v1/admin/staff-requests`)

All teacher administration routes require authentication and are restricted to `developer` and `admin` roles (`requireRole(['developer', 'admin'])`):

### 3.1 List Registered Teachers
`GET /api/v1/admin/staff-requests/teachers/list`
- Returns all profiles where `account_type = 'staff_t'`.
- Includes unsettled Pay Later dues count and total money owed.

### 3.2 List Eligible Candidates
`GET /api/v1/admin/staff-requests/teachers/candidates`
- Returns registered non-teacher users (`account_type != 'staff_t'`) matching an optional search query, facilitating 1-click promotion.

### 3.3 Directly Provision New Teacher
`POST /api/v1/admin/staff-requests/teachers/create`
- Body: `{ email: string, password?: string, display_name: string }`
- Provisions Supabase Auth user and initializes profile with `account_type = 'staff_t'`.

### 3.4 Promote Existing User to Teacher
`POST /api/v1/admin/staff-requests/teachers/assign`
- Body: `{ user_id: string }`
- Atomically updates profile `account_type = 'staff_t'`.

### 3.5 Revoke Teacher Status
`POST /api/v1/admin/staff-requests/teachers/revoke`
- Body: `{ user_id: string }`
- Reverts profile `account_type = 'student'`.

### 3.6 Update Teacher Name
`PATCH /api/v1/admin/staff-requests/teachers/:id`
- Body: `{ display_name: string }`
- Updates teacher display name in profile.

---

## 4. Frontend Operations (`admin/src/app/staff-requests/page.tsx`)

- **Registered Faculty Directory:** High-density desktop table and responsive 2-column mobile cards (`grid grid-cols-2 gap-3 md:hidden`).
- **Outstanding Dues Indicator:** Highlights faculty members with unsettled Pay Later balances.
- **Quick Action Modals:** Fast modals for creating new faculty accounts or promoting candidates from the campus directory.
