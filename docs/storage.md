# Storage Provider Architecture: Supabase Storage & Cloudflare R2

> **Active Temporary Provider:** Supabase Storage (`STORAGE_PROVIDER=supabase`)  
> **Preserved Future Provider:** Cloudflare R2 (`STORAGE_PROVIDER=r2`)  
> **Status:** Phase 3 Migration Completed  
> **Date:** 2026-10-20  

---

## 1. Context & Architecture Overview

The original architecture for Cafteria designated Cloudflare R2 as the primary object storage for food catalog images and customer profile avatars. Due to a temporary Cloudflare account configuration issue, the active storage provider has been temporarily shifted to **Supabase Storage**.

This change is an operational abstraction rather than a permanent architectural departure:
- **Supabase Storage is the ACTIVE TEMPORARY provider.**
- **Cloudflare R2 remains the PRESERVED FUTURE production provider**, pending resolution of the Cloudflare account issue and validation in subsequent phases.
- Both frontends (`customer/` and `admin/`) communicate exclusively with the backend REST endpoints (`/api/v1/uploads/*`) and never bind directly to provider-specific storage SDKs.

```
                      ┌──────────────────────────────────────────────┐
                      │ Frontend Apps (Customer & Admin)             │
                      └──────────────────────┬───────────────────────┘
                                             │ POST /api/v1/uploads/presign
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │ Backend Hono API (Cloudflare Worker)         │
                      │ getStorageProvider(env)                      │
                      └──────────────┬───────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           │                                                   │
  (STORAGE_PROVIDER=supabase)                        (STORAGE_PROVIDER=r2)
           │ [ACTIVE TEMPORARY]                                │ [PRESERVED FUTURE]
           ▼                                                   ▼
┌──────────────────────────────┐                    ┌──────────────────────────────┐
│ SupabaseStorageProvider      │                    │ R2StorageProvider            │
│ - food-images (public)       │                    │ - S3-compatible client       │
│ - profile-images (private)   │                    │ - R2 bucket bindings / URLs  │
│ - createSignedUploadUrl()    │                    │ - PutObject presigned URLs   │
│ - createSignedUrl() (read)   │                    │ - CDN public delivery        │
└──────────────────────────────┘                    └──────────────────────────────┘
```

---

## 2. Storage Buckets & Policies

### 2.1 Buckets
The platform operates two distinct storage buckets:

| Bucket Name | Access Level | Permitted Uploaders | Size Limit | Allowed MIME Types |
|---|---|---|---|---|
| `food-images` | Public Read | Verified Administrators only | 5 MB | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |
| `profile-images` | Private (Signed Read) | Authenticated User (Own directory only) | 2 MB | `image/jpeg`, `image/png`, `image/webp`, `image/avif` |

### 2.2 Collision-Resistant Key Conventions
To prevent key collisions and unauthorized path overwriting:
- **Food Images:** `food/<uuid>.<ext>`
- **Profile Images:** `profiles/<userId>/<uuid>.<ext>`

---

## 3. Storage RLS Policies (SQL Migration)

The SQL migration files [`backend/migrations/0003_storage_buckets.sql`](../backend/migrations/0003_storage_buckets.sql) and [`supabase/migrations/20261020000002_storage_buckets.sql`](../supabase/migrations/20261020000002_storage_buckets.sql) configure these buckets and Row Level Security policies:

```sql
-- 1. Create Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('food-images', 'food-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('profile-images', 'profile-images', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Food Images: Public SELECT, Admin ALL
CREATE POLICY "Public can view food catalog images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'food-images');

CREATE POLICY "Admins can manage food catalog images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'food-images' AND public.is_admin())
  WITH CHECK (bucket_id = 'food-images' AND public.is_admin());

-- 3. Profile Images: Private SELECT & INSERT for self only
CREATE POLICY "Users can view their own profile image"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-images' AND (
      (storage.foldername(name))[1] = 'profiles' AND
      (storage.foldername(name))[2] = auth.uid()::text
    ) OR public.is_admin()
  );

CREATE POLICY "Users can upload their own profile image"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-images' AND
    (storage.foldername(name))[1] = 'profiles' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );
```

---

## 4. REST API Contract

### `POST /api/v1/uploads/presign`
Requests upload authorization.

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`

**Payload:**
```json
{
  "file_type": "food_image",
  "content_type": "image/webp",
  "file_size": 204800
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "upload_url": "https://.../storage/v1/object/upload/sign/...",
    "object_key": "food/d4e5f6...webp",
    "public_url": "https://.../storage/v1/object/public/food-images/food/d4e5f6...webp",
    "bucket": "food-images",
    "provider": "supabase",
    "method": "PUT",
    "expires_in": 300
  }
}
```

### `POST /api/v1/uploads/verify`
Allows caller to verify that an object has landed in storage and obtain its metadata.

**Payload:**
```json
{
  "object_key": "profiles/<userId>/abc.jpg",
  "file_type": "profile_image"
}
```

### `GET /api/v1/uploads/avatar`
Returns a short-lived (1 hour) signed read URL for the authenticated user's private profile avatar.

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "avatar_key": "profiles/<userId>/abc.jpg",
    "display_url": "https://.../storage/v1/object/sign/profile-images/profiles/...?token=..."
  }
}
```

---

## 5. Environment Variables & Configuration

### Backend (`.dev.vars` / Wrangler environment variables)
```ini
# Active Storage Provider: "supabase" (default) or "r2"
STORAGE_PROVIDER=supabase

# Supabase Credentials (Active)
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare R2 Credentials (Preserved for future activation)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=cafteria-media
R2_PUBLIC_URL=https://images.cafteria.app
```

---

## 6. Procedure for Switching to Cloudflare R2

When Cloudflare account issues are resolved, the platform can be seamlessly switched to R2 without any frontend modifications:

1. **Provision R2 Bucket & Custom Domain:**
   - Create bucket `cafteria-media` in Cloudflare Dashboard.
   - Configure public custom domain or CDN URL (e.g., `https://images.cafteria.app`).
   - Create R2 API Token with Object Read & Write permissions.
2. **Update Backend Environment Variables:**
   ```ini
   STORAGE_PROVIDER=r2
   R2_ACCOUNT_ID=<account-id>
   R2_ACCESS_KEY_ID=<access-key>
   R2_SECRET_ACCESS_KEY=<secret-key>
   R2_BUCKET_NAME=cafteria-media
   R2_PUBLIC_URL=https://images.cafteria.app
   ```
3. **Migrate Existing Objects (Optional):**
   - Use an S3 migration tool or script to copy objects from Supabase Storage buckets `food-images` and `profile-images` into the R2 bucket.
4. **Deploy Backend:**
   - Deploy worker with `npx wrangler deploy`.
   - The backend `getStorageProvider(env)` will automatically instantiate `R2StorageProvider`.
   - Frontends will continue using `POST /api/v1/uploads/presign` without any code changes.
