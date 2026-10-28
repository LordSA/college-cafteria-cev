# Cafteria Authentication, Authorization & Security Architecture

> **Phase 2: Authentication, Authorization & Database Security**
>
> Complete technical specification for Supabase Auth, PostgreSQL Row Level Security (RLS), role-based access control (RBAC), and edge API verification.

---

## 1. System Overview & Security Principles

Cafteria enforces a **zero-trust security model**:
1. **Never Trust the Browser:** Frontend state, query parameters, cookies, or user-provided metadata are never trusted to establish authorization.
2. **Cryptographic Token Verification:** All incoming requests to the backend REST API require an `Authorization: Bearer <access_token>` header, verified against Supabase Auth.
3. **Database-Level Protection (RLS):** Privileges are enforced directly at the PostgreSQL storage layer using Row Level Security (RLS) policies and `BEFORE UPDATE` trigger constraints.
4. **Strict Role Isolation:** Public user registration can only ever create `customer` accounts. Admin accounts cannot be self-assigned.

---

## 2. Roles & Account Classifications

The system separates **Account Type** (who the user is on campus) from **Application Role** (what capabilities the user has in Cafteria):

### Account Types (`account_type`)
* `student`: Undergraduate, graduate, or research students placing food pre-orders.
* `staff`: University professors, lecturers, lab assistants, or administrative personnel.

### Application Roles (`app_role`)
* `customer`: Standard end-users permitted to browse menus, schedule pre-orders, and manage personal profile details. Customers have zero access to administrative controls.
* `admin`: Canteen managers, kitchen operators, cashier desks, and operations supervisors. Authorized to manage live orders (KDS), edit menus, adjust stock, and review turnover reports.

---

## 3. Database Schema & RLS Policies

Database migration files:
- `backend/migrations/0001_create_profiles.sql`
- `supabase/migrations/20261020000000_create_profiles_and_auth_schema.sql`

### 3.1 Table Definition: `public.profiles`

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_key text,
  account_type text NOT NULL DEFAULT 'student' CHECK (account_type IN ('student', 'staff')),
  app_role text NOT NULL DEFAULT 'customer' CHECK (app_role IN ('customer', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_app_role ON public.profiles(app_role);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles(account_type);
```

### 3.2 Secure Registration Trigger (`handle_new_user`)
When a user signs up via Supabase Auth, the `AFTER INSERT ON auth.users` trigger executes with `SECURITY DEFINER`:
* Safely extracts `display_name` and `account_type` (`student` or `staff`).
* Hardcodes `app_role = 'customer'` unconditionally. Even if malicious metadata attempts `app_role: 'admin'`, it is ignored.
* Employs `ON CONFLICT (id) DO NOTHING` for idempotency.

### 3.3 Profile Timestamp Maintenance (`handle_profile_updated_at`)
A lightweight `BEFORE UPDATE` trigger on `public.profiles` ensures that:
* Every update automatically refreshes `updated_at = now()`.
* Role protection and authorization boundaries are enforced through Supabase Row Level Security (RLS) policies and backend API middleware (`requireAdmin`), allowing authorized administrators and database operators (Supabase Table Editor / SQL Editor) to modify positions and roles without execution blocks.

### 3.4 Row Level Security (RLS) Rules

| Operation | Target Role | Policy Definition | Description |
|---|---|---|---|
| `SELECT` | `authenticated` | `auth.uid() = id` | Authenticated users can view their own profile. |
| `UPDATE` | `authenticated` | `auth.uid() = id` | Users can update permitted personal profile fields (`display_name`). |
| `SELECT` | `authenticated` | `public.is_admin()` | Verified administrators can view all user profiles. |
| `UPDATE` | `authenticated` | `public.is_admin()` | Administrators can update user profiles. |
| All | `anon` | None | Anonymous users are denied all access. |

---

## 4. Admin Provisioning Procedure

Administrative privileges **cannot** be granted through the web interface or registration API.

### Method 1: Via Supabase Dashboard (SQL Editor)
Execute the following query replacing `<TARGET_USER_EMAIL>` with the canteen manager's registered email:

```sql
UPDATE public.profiles
SET app_role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'manager@college.edu'
);
```

### Method 2: Via Supabase Service Role Key (Server-Side)
Using a secure script with `SUPABASE_SERVICE_ROLE_KEY`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function promoteToAdmin(userId: string) {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ app_role: 'admin' })
    .eq('id', userId);

  if (error) throw error;
  console.log(`User ${userId} successfully promoted to admin.`);
}
```

---

## 5. Backend REST API Endpoints & Middlewares

### 5.1 Verification Middlewares
* **`requireAuth`**:
  - Extracts `Authorization: Bearer <token>`.
  - Validates token against Supabase Auth (`supabase.auth.getUser(token)`).
  - Fetches the verified `public.profiles` database record.
  - Injects `user` and `profile` into the Hono context.
  - Returns `401 Unauthorized` for missing, malformed, or expired tokens.
* **`requireAdmin`**:
  - Inspects `c.get('profile')`.
  - Verifies `profile.app_role === 'admin'`.
  - Returns `403 Forbidden` if the user is a standard customer.

### 5.2 Endpoints

#### `GET /api/v1/auth/me`
* **Access:** Authenticated (`Bearer <token>`)
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-0000-0000-0000-000000000000",
      "email": "student@college.edu"
    },
    "profile": {
      "id": "a1b2c3d4-0000-0000-0000-000000000000",
      "display_name": "Rohan Sharma",
      "avatar_key": null,
      "account_type": "student",
      "app_role": "customer",
      "created_at": "2026-10-20T10:00:00.000Z",
      "updated_at": "2026-10-20T10:00:00.000Z"
    }
  }
}
```

#### `GET /api/v1/admin/me`
* **Access:** Administrator only (`app_role = 'admin'`)
* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "f5e4d3c2-1111-1111-1111-111111111111",
      "email": "canteen-manager@college.edu"
    },
    "profile": {
      "id": "f5e4d3c2-1111-1111-1111-111111111111",
      "display_name": "Canteen Manager",
      "avatar_key": null,
      "account_type": "staff",
      "app_role": "admin",
      "created_at": "2026-10-20T08:00:00.000Z",
      "updated_at": "2026-10-20T08:00:00.000Z"
    },
    "message": "Administrator privileges confirmed"
  }
}
```
* **Failure Responses:**
  - `401 Unauthorized`: Missing or invalid Bearer token.
  - `403 Forbidden`: Authenticated user is a customer without admin role.

---

## 6. How to Run Database Migrations

### Method 1: Using the Supabase Dashboard
1. Open the [Supabase Dashboard](https://supabase.com/dashboard) and select your project.
2. Navigate to **SQL Editor** in the left sidebar.
3. Open `backend/migrations/0001_create_profiles.sql` (or `supabase/migrations/20261020000000_create_profiles_and_auth_schema.sql`).
4. Paste the SQL contents and click **Run**.
5. Verify the `public.profiles` table and triggers are active under **Table Editor** and **Database -> Triggers**.

### Method 2: Using the Supabase CLI
```bash
# Link local project to Supabase remote
supabase link --project-ref <your-project-id>

# Apply pending migrations
supabase db push
```

---

## 7. How to Test Authentication Locally

### 1. Test Customer Signup & Profile
1. Start customer app: `npm --prefix customer run dev` (Port 3000).
2. Visit `http://localhost:3000/signup`.
3. Register with your college email, password, and select `student` or `staff`.
4. You will be redirected to `http://localhost:3000/profile` showing your verified profile.
5. Notice that your role is strictly locked to `customer`.

### 2. Test Customer Accessing Admin Portal (403 Test)
1. Start admin app: `npm --prefix admin run dev` (Port 3001).
2. Visit `http://localhost:3001/login`.
3. Attempt to sign in with your customer account credentials.
4. You will be redirected to `http://localhost:3001/unauthorized` with an explicit 403 Access Denied notice.

### 3. Test Authorized Admin Access
1. Promote your user in Supabase SQL Editor:
   ```sql
   UPDATE public.profiles SET app_role = 'admin' WHERE id = '<your-user-id>';
   ```
2. Log into `http://localhost:3001/login`.
3. You will gain access to the Operations Command Center (`http://localhost:3001/`).

### 4. Run Automated Backend Unit Tests
```bash
npm --prefix backend test
```
Verifies 12 critical authorization, header parsing, and role tampering test cases.
