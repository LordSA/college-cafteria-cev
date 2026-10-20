import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';
import * as storageLib from '../src/lib/storage';

describe('Phase 3: Staff Approvals, Menu Management & R2 Uploads Test Suite', () => {
  const mockAdminUser = {
    id: 'adm-001',
    email: 'admin@college.edu',
  };

  const mockAdminProfile = {
    id: 'adm-001',
    display_name: 'Campus Admin',
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
    id: 'usr-001',
    email: 'student@college.edu',
  };

  const mockCustomerProfile = {
    id: 'usr-001',
    display_name: 'Pooja Student',
    avatar_key: null,
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

  it('GET /api/v1/categories returns empty list or active categories', async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                { id: 'cat-1', name: 'Hot Breakfast', sort_order: 1, is_active: true },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/categories');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe('Hot Breakfast');
  });

  it('POST /api/v1/admin/categories rejects unauthenticated request', async () => {
    const res = await app.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Snacks' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/admin/categories rejects customer request with 403 Forbidden', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer customer-token',
      },
      body: JSON.stringify({ name: 'Snacks' }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/admin/categories allows verified admin to create category', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'cat-new-1', name: 'Beverages', sort_order: 2, is_active: true },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({ name: 'Beverages', sort_order: 2 }),
    });

    const body = await res.json();
    console.log('DEBUG CATEGORY POST RESPONSE:', res.status, body);
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.name).toBe('Beverages');
  });

  it('POST /api/v1/admin/menu validates positive price in paise and category UUID', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const res = await app.request('/api/v1/admin/menu', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        category_id: 'not-a-uuid',
        name: 'Masala Dosa',
        price: -500,
      }),
    });

    expect(res.status).toBe(400);
  });

  it('GET /api/v1/menu returns menu items with resolved image URLs', async () => {
    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [
                {
                  id: 'item-1',
                  name: 'Masala Dosa',
                  price: 4500,
                  image_key: 'food/dosa.jpg',
                  is_available: true,
                  is_archived: false,
                  categories: { name: 'Hot Breakfast' },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/menu');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].category_name).toBe('Hot Breakfast');
    expect(body.data[0].image_url).toContain('food/dosa.jpg');
  });

  it('POST /api/v1/uploads/presign rejects food_image upload by standard customer', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/uploads/presign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer customer-token',
      },
      body: JSON.stringify({
        file_type: 'food_image',
        content_type: 'image/jpeg',
        file_size: 1024 * 500,
      }),
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/uploads/presign accepts food_image upload by verified admin', async () => {
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
        content_type: 'image/png',
        file_size: 1024 * 500,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.object_key).toMatch(/^food\/.*\.png$/);
    expect(body.data.upload_url).toBeTruthy();
  });

  it('POST /api/v1/uploads/presign rejects unsupported MIME type', async () => {
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
        content_type: 'application/pdf',
        file_size: 1024,
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_MIME_TYPE');
  });

  it('GET /api/v1/admin/staff-requests rejects unauthorized customer', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/admin/staff-requests', {
      headers: {
        Authorization: 'Bearer customer-token',
      },
    });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/admin/staff-requests/:id/approve allows admin to approve staff request', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'usr-staff-pending', staff_approval_status: 'pending' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'usr-staff-pending',
                  approved_account_type: 'staff',
                  staff_approval_status: 'approved',
                  reviewed_by: mockAdminUser.id,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/staff-requests/usr-staff-pending/approve', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.staff_approval_status).toBe('approved');
    expect(body.data.approved_account_type).toBe('staff');
  });

  it('POST /api/v1/admin/staff-requests/:id/reject sets status to rejected and keeps student type', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'usr-staff-pending', staff_approval_status: 'pending' },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'usr-staff-pending',
                  approved_account_type: 'student',
                  staff_approval_status: 'rejected',
                  reviewed_by: mockAdminUser.id,
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/staff-requests/usr-staff-pending/reject', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.staff_approval_status).toBe('rejected');
    expect(body.data.approved_account_type).toBe('student');
  });
});
