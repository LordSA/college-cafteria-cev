# Staff Approval Architecture & Security Workflow

> **Status:** Implemented in Phase 3  
> **Date:** 2026-10-20  

---

## 1. Overview

In college campus dining, faculty and staff members often receive designated dining privileges, priority pick-up times, or specific meal allowances. However, allowing self-declared staff registrations without verification creates privilege escalation risks.

Cafteria enforces a strict **Zero-Trust Staff Approval Workflow**:
1. At signup, users can select `requested_account_type: 'staff'`.
2. The database trigger sets `approved_account_type = 'student'`, `account_type = 'student'`, and `staff_approval_status = 'pending'`.
3. The user remains a standard student diner until a verified canteen administrator reviews and approves their status.
4. If rejected, `approved_account_type = 'student'` and `staff_approval_status = 'rejected'`.
5. If approved, `approved_account_type = 'staff'`, `account_type = 'staff'`, and `staff_approval_status = 'approved'`.

---

## 2. Database Schema Fields (`public.profiles`)

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `requested_account_type` | `text` | `'student'` | `CHECK in ('student', 'staff')` | The classification requested by the user during signup |
| `approved_account_type` | `text` | `'student'` | `CHECK in ('student', 'staff')` | The authoritative classification verified by administration |
| `account_type` | `text` | `'student'` | Synchronized to `approved_account_type` | Effective classification used in application logic |
| `staff_approval_status` | `text` | `'not_requested'` | `CHECK in ('not_requested', 'pending', 'approved', 'rejected')` | Current review state |
| `reviewed_by` | `uuid` | `NULL` | Foreign key to `auth.users(id)` | Administrator ID who approved or rejected the request |
| `reviewed_at` | `timestamptz` | `NULL` | | Timestamp of administrative review decision |

---

## 3. Database Triggers & Functions

- **`public.handle_new_user()`:**
  Executes on `auth.users` insertion. Initializes `approved_account_type = 'student'`. If `account_type = 'staff'` was requested, marks `staff_approval_status = 'pending'`.
- **`public.handle_profile_updated_at()`:**
  Trigger executing on `public.profiles` updates to maintain `updated_at = now()`. Position/role updates are permitted for database administrators and authorized backend handlers.
- **`public.review_staff_request(p_target_user_id, p_decision, p_admin_user_id)`:**
  `SECURITY DEFINER` function callable only by verified administrators (`public.is_admin()`). Sets approved or rejected status and updates audit columns.

---

## 4. Administrative REST Endpoints

### `GET /api/v1/admin/staff-requests`
Returns all profiles with `staff_approval_status = 'pending'`.
Protected by `requireAuth` and `requireAdmin`.

### `POST /api/v1/admin/staff-requests/:id/approve`
Approves the staff registration request.
Updates `approved_account_type = 'staff'`, `staff_approval_status = 'approved'`, and records reviewer ID.

### `POST /api/v1/admin/staff-requests/:id/reject`
Rejects the staff registration request.
Sets `staff_approval_status = 'rejected'` and preserves `approved_account_type = 'student'`.
