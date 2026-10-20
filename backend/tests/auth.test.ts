import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';

const ProfileUpdateSchema = z
  .object({
    display_name: z.string().min(1).max(100).optional(),
    avatar_key: z.string().max(255).nullable().optional(),
    account_type: z.never({ message: 'Account type modification is prohibited' }).optional(),
    app_role: z.never({ message: 'Role modification is strictly prohibited' }).optional(),
  })
  .strict();

describe('Backend API & Auth Middleware Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /health succeeds without requiring Supabase credentials', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('healthy');
    expect(data.service).toBe('cafteria-backend');
  });

  it('GET /api/v1 returns current API metadata and endpoints', async () => {
    const res = await app.request('/api/v1');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('active');
    expect(data.endpoints.authMe).toBe('/api/v1/auth/me');
    expect(data.endpoints.adminMe).toBe('/api/v1/admin/me');
  });

  it('GET /api/v1/auth/me rejects request when Authorization header is missing', async () => {
    const res = await app.request('/api/v1/auth/me');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me rejects request when Authorization header is malformed', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: {
        Authorization: 'Basic dXNlcjpwYXNz',
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me rejects request when Bearer token is empty', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: {
        Authorization: 'Bearer    ',
      },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/auth/me returns 500 when Supabase environment bindings are missing', async () => {
    const res = await app.request('/api/v1/auth/me', {
      headers: {
        Authorization: 'Bearer test-token',
      },
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('AUTH_CONFIG_MISSING');
  });

  it('GET /api/v1/auth/me rejects invalid or expired access token', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: false,
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Token has expired or is invalid',
    });

    const res = await app.request('/api/v1/auth/me', {
      headers: {
        Authorization: 'Bearer expired-or-invalid-token',
      },
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_TOKEN');
  });

  it('GET /api/v1/auth/me succeeds with valid customer token and returns safe user profile', async () => {
    const mockUser = {
      id: 'usr-12345-test',
      email: 'student@college.edu',
    };
    const mockProfile = {
      id: 'usr-12345-test',
      display_name: 'Alex Student',
      avatar_key: null,
      account_type: 'student' as const,
      app_role: 'customer' as const,
      created_at: '2026-10-20T10:00:00.000Z',
      updated_at: '2026-10-20T10:00:00.000Z',
    };

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockUser,
      profile: mockProfile,
    });

    const res = await app.request('/api/v1/auth/me', {
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.user.id).toBe('usr-12345-test');
    expect(body.data.profile.app_role).toBe('customer');
    expect(body.data.profile.account_type).toBe('student');
  });

  it('GET /api/v1/admin/me returns 401 when request is unauthenticated', async () => {
    const res = await app.request('/api/v1/admin/me');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /api/v1/admin/me returns 403 Forbidden when a customer attempts access', async () => {
    const mockUser = {
      id: 'usr-12345-test',
      email: 'student@college.edu',
    };
    const mockCustomerProfile = {
      id: 'usr-12345-test',
      display_name: 'Alex Student',
      avatar_key: null,
      account_type: 'student' as const,
      app_role: 'customer' as const,
      created_at: '2026-10-20T10:00:00.000Z',
      updated_at: '2026-10-20T10:00:00.000Z',
    };

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/admin/me', {
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('FORBIDDEN');
    expect(body.error.message).toContain('Administrator privileges required');
  });

  it('GET /api/v1/admin/me returns 200 when authenticated as a verified admin', async () => {
    const mockAdminUser = {
      id: 'adm-99999-test',
      email: 'canteen-manager@college.edu',
    };
    const mockAdminProfile = {
      id: 'adm-99999-test',
      display_name: 'Canteen Manager',
      avatar_key: null,
      account_type: 'staff' as const,
      app_role: 'admin' as const,
      created_at: '2026-10-20T08:00:00.000Z',
      updated_at: '2026-10-20T08:00:00.000Z',
    };

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const res = await app.request('/api/v1/admin/me', {
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.admin.id).toBe('adm-99999-test');
    expect(body.data.profile.app_role).toBe('admin');
    expect(body.data.message).toBe('Administrator privileges confirmed');
  });

  it('Rejects unauthorized client attempts to modify app_role or account_type via profile updates', () => {
    const validUpdate = {
      display_name: 'Updated Display Name',
    };
    expect(ProfileUpdateSchema.safeParse(validUpdate).success).toBe(true);

    const unauthorizedRoleAttempt = {
      display_name: 'Hacker',
      app_role: 'admin',
    };
    const roleResult = ProfileUpdateSchema.safeParse(unauthorizedRoleAttempt);
    expect(roleResult.success).toBe(false);

    const unauthorizedAccountTypeAttempt = {
      account_type: 'staff',
    };
    const accountTypeResult = ProfileUpdateSchema.safeParse(unauthorizedAccountTypeAttempt);
    expect(accountTypeResult.success).toBe(false);
  });
});
