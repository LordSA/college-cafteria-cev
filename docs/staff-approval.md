# Teacher (`staff_t`) Approval Architecture & Security Workflow

> **Status:** Reconfigured in Phase 5  
> **Date:** 2026-11-21  

---

## 1. Overview & Naming Separation

In college campus dining, faculty and teachers receive designated dining privileges, priority pick-up times, and Faculty Pay Later credit options. However, allowing self-declared teacher registrations creates privilege escalation risks. Furthermore, to avoid naming ambiguity with canteen store workers (`staff` in `app_role`), faculty teachers are designated as `staff_t` in the database.

Cafteria enforces a strict **Zero-Trust Teacher (`staff_t`) Approval Workflow**:
1. At signup, users can select Teacher / Faculty (`staff_t`) and provide their unique Teacher ID.
2. The database trigger sets `approved_account_type = 'student'`, `account_type = 'student'`, `requested_account_type = 'staff_t'`, and `staff_approval_status = 'pending'`.
3. The user remains a standard student diner until a verified canteen administrator reviews and approves their status.
4. If rejected, `approved_account_type = 'student'` and `staff_approval_status = 'rejected'`.
5. If approved, `approved_account_type = 'staff_t'`, `account_type = 'staff_t'`, and `staff_approval_status = 'approved'`. Pay Later is now enabled for this account.

---

## 2. Database Schema Fields (`public.profiles`)

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `requested_account_type` | `text` | `'student'` | `CHECK in ('student', 'staff_t', 'guest')` | The classification requested by the user during signup |
| `approved_account_type` | `text` | `'student'` | `CHECK in ('student', 'staff_t', 'guest')` | The authoritative classification verified by administration |
| `account_type` | `text` | `'student'` | Synchronized to `approved_account_type` | Effective classification used in application logic |
| `teacher_id` | `text` | `NULL` | Unique per teacher | Official faculty institutional identifier |
| `staff_approval_status` | `text` | `'not_requested'` | `CHECK in ('not_requested', 'pending', 'approved', 'rejected')` | Current review state |
| `reviewed_by` | `uuid` | `NULL` | Foreign key to `auth.users(id)` | Administrator ID who approved or rejected the request |
| `reviewed_at` | `timestamptz` | `NULL` | | Timestamp of administrative review decision |

---

## 3. Database Triggers & Functions

- **`public.handle_new_user()`:**
  Executes on `auth.users` insertion. Initializes `approved_account_type = 'student'` (or `'guest'` if guest). If `account_type = 'staff_t'` (or legacy `'staff'`) was requested, marks `requested_account_type = 'staff_t'`, `staff_approval_status = 'pending'`.
- **`public.review_staff_request(p_target_user_id, p_decision, p_admin_user_id)`:**
  `SECURITY DEFINER` function callable only by verified administrators. On approval, sets `approved_account_type = 'staff_t'`, `account_type = 'staff_t'`, and `staff_approval_status = 'approved'`.

---

## 4. Administrative REST Endpoints

### `GET /api/v1/admin/staff-requests`
Returns all profiles with `staff_approval_status = 'pending'`.
Protected by `requireAuth` and `requireRole(['developer', 'admin'])`.

### `POST /api/v1/admin/staff-requests/:id/approve`
Approves the teacher registration request.
Updates `approved_account_type = 'staff_t'`, `account_type = 'staff_t'`, `staff_approval_status = 'approved'`, and records reviewer ID.

### `POST /api/v1/admin/staff-requests/:id/reject`
Rejects the teacher registration request.
Sets `staff_approval_status = 'rejected'` and preserves `approved_account_type = 'student'`.
