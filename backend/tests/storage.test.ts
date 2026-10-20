import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';
import {
  getStorageProvider,
  SupabaseStorageProvider,
  R2StorageProvider,
  getPublicImageUrl,
} from '../src/lib/storage';
import type { Env } from '../src/types/env';

describe('Storage Provider & Security Test Suite', () => {
  const mockAdminUser = {
    id: 'adm-100',
    email: 'admin@college.edu',
  };

  const mockAdminProfile = {
    id: 'adm-100',
    display_name: 'Super Admin',
    avatar_key: null,
    account_type: 'staff' as const,
    requested_account_type: 'staff' as const,
    approved_account_type: 'staff' as const,
    staff_approval_status: 'approved' as const,
    reviewed_by: null,
    reviewed_at: null,
    app_role: 'admin' as const,
    created_at: '2026-10-20T10:00:00.000Z',
    updated_at: '2026-10-20T10:00:00.000Z',
  };

  const mockCustomerUser = {
    id: 'usr-200',
    email: 'student@college.edu',
  };

  const mockCustomerProfile = {
    id: 'usr-200',
    display_name: 'Pooja Student',
    avatar_key: 'profiles/usr-200/avatar.jpg',
    account_type: 'student' as const,
    requested_account_type: 'student' as const,
    approved_account_type: 'student' as const,
    staff_approval_status: 'not_requested' as const,
    reviewed_by: null,
    reviewed_at: null,
    app_role: 'customer' as const,
    created_at: '2026-10-20T10:00:00.000Z',
    updated_at: '2026-10-20T10:00:00.000Z',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to SupabaseStorageProvider when STORAGE_PROVIDER is unset or "supabase"', () => {
    const providerDefault = getStorageProvider({});
    expect(providerDefault.providerName).toBe('supabase');
    expect(providerDefault).toBeInstanceOf(SupabaseStorageProvider);

    const providerExplicit = getStorageProvider({ STORAGE_PROVIDER: 'supabase' });
    expect(providerExplicit.providerName).toBe('supabase');
    expect(providerExplicit).toBeInstanceOf(SupabaseStorageProvider);
  });

  it('selects R2StorageProvider when STORAGE_PROVIDER="r2" and credentials are provided', () => {
    const r2Env: Env = {
      STORAGE_PROVIDER: 'r2',
      R2_ACCOUNT_ID: 'acc-123',
      R2_ACCESS_KEY_ID: 'key-123',
      R2_SECRET_ACCESS_KEY: 'sec-123',
      R2_BUCKET_NAME: 'test-bucket',
    };
    const provider = getStorageProvider(r2Env);
    expect(provider.providerName).toBe('r2');
    expect(provider).toBeInstanceOf(R2StorageProvider);
  });

  it('throws clear configuration error when STORAGE_PROVIDER="r2" but credentials are missing', () => {
    const incompleteEnv: Env = {
      STORAGE_PROVIDER: 'r2',
    };
    expect(() => getStorageProvider(incompleteEnv)).toThrowError(
      /Cloudflare R2 storage provider is missing required credentials/
    );
  });

  it('throws clear error when an unsupported storage provider is configured', () => {
    const invalidEnv: any = {
      STORAGE_PROVIDER: 'unsupported_s3_mock',
    };
    expect(() => getStorageProvider(invalidEnv)).toThrowError(
      /Unsupported storage provider: "unsupported_s3_mock"/
    );
  });

  it('rejects food image upload when user is not an administrator', async () => {
    const provider = new SupabaseStorageProvider({});
    const result = await provider.createUploadAuthorization({
      fileType: 'food_image',
      contentType: 'image/jpeg',
      fileSize: 1024 * 100,
      userId: 'usr-200',
      isAdmin: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FORBIDDEN');
      expect(result.statusCode).toBe(403);
    }
  });

  it('rejects profile image upload when user is unauthenticated', async () => {
    const provider = new SupabaseStorageProvider({});
    const result = await provider.createUploadAuthorization({
      fileType: 'profile_image',
      contentType: 'image/png',
      fileSize: 1024 * 50,
      userId: '',
      isAdmin: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('UNAUTHORIZED');
      expect(result.statusCode).toBe(401);
    }
  });

  it('scopes customer profile images strictly to their user ID directory', async () => {
    const provider = new SupabaseStorageProvider({});
    const result = await provider.createUploadAuthorization({
      fileType: 'profile_image',
      contentType: 'image/png',
      fileSize: 1024 * 50,
      userId: 'usr-200',
      isAdmin: false,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.object_key).toMatch(/^profiles\/usr-200\/.*\.png$/);
      expect(result.data.bucket).toBe('profile-images');
      expect(result.data.public_url).toBeNull();
    }
  });

  it('rejects forbidden MIME types', async () => {
    const provider = new SupabaseStorageProvider({});
    const result = await provider.createUploadAuthorization({
      fileType: 'food_image',
      contentType: 'application/pdf',
      fileSize: 1024,
      userId: 'adm-100',
      isAdmin: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('INVALID_MIME_TYPE');
      expect(result.statusCode).toBe(400);
    }
  });

  it('rejects oversized food image files exceeding 5MB', async () => {
    const provider = new SupabaseStorageProvider({});
    const result = await provider.createUploadAuthorization({
      fileType: 'food_image',
      contentType: 'image/jpeg',
      fileSize: 6 * 1024 * 1024,
      userId: 'adm-100',
      isAdmin: true,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FILE_TOO_LARGE');
      expect(result.statusCode).toBe(400);
    }
  });

  it('rejects oversized profile image files exceeding 2MB', async () => {
    const provider = new SupabaseStorageProvider({});
    const result = await provider.createUploadAuthorization({
      fileType: 'profile_image',
      contentType: 'image/webp',
      fileSize: 3 * 1024 * 1024,
      userId: 'usr-200',
      isAdmin: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe('FILE_TOO_LARGE');
      expect(result.statusCode).toBe(400);
    }
  });

  it('resolves public image URL appropriately for both Supabase and R2', () => {
    const supabaseUrl = getPublicImageUrl('food/dosa.jpg', {
      STORAGE_PROVIDER: 'supabase',
      SUPABASE_URL: 'https://test.supabase.co',
    });
    expect(supabaseUrl).toBe('https://test.supabase.co/storage/v1/object/public/food-images/food/dosa.jpg');

    const r2Url = getPublicImageUrl('food/dosa.jpg', {
      STORAGE_PROVIDER: 'r2',
      R2_PUBLIC_URL: 'https://cdn.cafteria.app',
    });
    expect(r2Url).toBe('https://cdn.cafteria.app/food/dosa.jpg');
  });

  it('POST /api/v1/uploads/presign maintains unified API contract across providers', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const res = await app.request('/api/v1/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        file_type: 'food_image',
        content_type: 'image/webp',
        file_size: 1024 * 200,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('upload_url');
    expect(body.data).toHaveProperty('object_key');
    expect(body.data).toHaveProperty('bucket', 'food-images');
    expect(body.data).toHaveProperty('provider', 'supabase');
    expect(body.data).toHaveProperty('method', 'PUT');
    expect(body.data).toHaveProperty('expires_in', 300);
  });

  it('POST /api/v1/uploads/verify rejects customer attempting to verify another user profile image', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/uploads/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer customer-token',
      },
      body: JSON.stringify({
        object_key: 'profiles/usr-attacker-victim/malicious.jpg',
        file_type: 'profile_image',
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('GET /api/v1/uploads/avatar resolves private display URL for authenticated user', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/uploads/avatar', {
      headers: {
        Authorization: 'Bearer customer-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.avatar_key).toBe('profiles/usr-200/avatar.jpg');
    expect(body.data.display_url).toBeTruthy();
  });
});
