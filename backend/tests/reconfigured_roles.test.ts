import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';
import type { AuthenticatedUser, UserProfile } from '../src/types/env';

const createMockUser = (id: string, email: string): AuthenticatedUser => ({
  id,
  email,
  email_confirmed_at: '2026-10-20T00:00:00Z',
});

const createMockProfile = (
  id: string,
  role: UserProfile['app_role'],
  accountType: UserProfile['account_type'] = 'student',
  approvalStatus: UserProfile['staff_approval_status'] = 'not_requested'
): UserProfile => ({
  id,
  display_name: `Test ${role}`,
  avatar_key: null,
  account_type: accountType,
  requested_account_type: accountType,
  approved_account_type: accountType,
  staff_approval_status: approvalStatus,
  reviewed_by: null,
  reviewed_at: null,
  app_role: role,
  created_at: '2026-10-20T00:00:00Z',
  updated_at: '2026-10-20T00:00:00Z',
});

describe('Reconfigured Roles & Authorization Architecture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Allows developer to access user management, but forbids admin', async () => {
    const devUser = createMockUser('dev-1', 'dev@campus.edu');
    const devProfile = createMockProfile('dev-1', 'developer');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: devUser,
      profile: devProfile,
    });

    const mockAdminClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'user-1', display_name: 'User One', app_role: 'customer', account_type: 'student' }],
            error: null,
          }),
        }),
      }),
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }) } },
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockAdminClient as any);

    const devRes = await app.request('/api/v1/admin/users', {
      headers: { Authorization: 'Bearer dev-token' },
    });
    expect(devRes.status).toBe(200);

    const adminUser = createMockUser('adm-1', 'admin@campus.edu');
    const adminProfile = createMockProfile('adm-1', 'admin');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: adminUser,
      profile: adminProfile,
    });

    const adminRes = await app.request('/api/v1/admin/users', {
      headers: { Authorization: 'Bearer admin-token' },
    });
    expect(adminRes.status).toBe(403);
  });

  it('Allows staff (store worker) to view orders and collect QR, but forbids retail from orders', async () => {
    const staffUser = createMockUser('staff-worker-1', 'staff@campus.edu');
    const staffProfile = createMockProfile('staff-worker-1', 'staff');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: staffUser,
      profile: staffProfile,
    });

    const mockAdminClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            range: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockAdminClient as any);

    const staffOrdersRes = await app.request('/api/v1/admin/orders', {
      headers: { Authorization: 'Bearer staff-token' },
    });
    expect(staffOrdersRes.status).toBe(200);

    const retailUser = createMockUser('retail-1', 'retail@campus.edu');
    const retailProfile = createMockProfile('retail-1', 'retail');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: retailUser,
      profile: retailProfile,
    });

    const retailOrdersRes = await app.request('/api/v1/admin/orders', {
      headers: { Authorization: 'Bearer retail-token' },
    });
    expect(retailOrdersRes.status).toBe(403);
  });

  it('Allows staff and printer to scan and collect QR orders', async () => {
    const printerUser = createMockUser('kiosk-printer-1', 'printer@campus.edu');
    const printerProfile = createMockProfile('kiosk-printer-1', 'printer');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: printerUser,
      profile: printerProfile,
    });

    const mockAdminClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'ord-123',
                order_number: 'CEV-001',
                order_status: 'ORDER_PLACED',
                order_stage: 'ORDER_PLACED',
                payment_status: 'paid',
                customer_id: 'cust-1',
                order_items: [],
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'ord-123',
                  order_number: 'CEV-001',
                  order_status: 'COLLECTED',
                  order_stage: 'COLLECTED',
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockAdminClient as any);

    const printerRes = await app.request('/api/v1/admin/orders/collect-qr', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer printer-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qr_token: 'valid-token-12345' }),
    });
    expect(printerRes.status).toBe(200);
  });

  it('Allows retail to update inventory portions, but forbids adding new items', async () => {
    const retailUser = createMockUser('retail-1', 'retail@campus.edu');
    const retailProfile = createMockProfile('retail-1', 'retail');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: retailUser,
      profile: retailProfile,
    });

    const postNewDishRes = await app.request('/api/v1/admin/menu', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer retail-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Veg Puff',
        price: 25,
        category_id: 'a0000000-0000-0000-0000-000000000001',
      }),
    });
    expect(postNewDishRes.status).toBe(403);

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: retailUser,
      profile: retailProfile,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'item-1', stock_quantity: 10, track_inventory: true, low_stock_threshold: 5, is_available: true },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'item-1', name: 'Veg Puff', price: 25, stock_quantity: 15, low_stock_threshold: 5, track_inventory: true, is_available: true },
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const patchStockRes = await app.request('/api/v1/admin/inventory/item-1', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer retail-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stock_quantity: 15 }),
    });
    expect(patchStockRes.status).toBe(200);
  });

  it('Allows approved staff_t (teacher) to use pay_later, but rejects students and guests', async () => {
    const studentUser = createMockUser('student-1', 'student@campus.edu');
    const studentProfile = createMockProfile('student-1', 'customer', 'student', 'not_requested');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: studentUser,
      profile: studentProfile,
    });

    const mockStudentDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { account_type: 'student', approved_account_type: 'student' },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockStudentDb as any);

    const studentOrderRes = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer student-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        payment_method: 'pay_later',
      }),
    });
    expect(studentOrderRes.status).toBe(403);
    const studentBody = await studentOrderRes.json();
    expect(studentBody.error.code).toBe('FORBIDDEN_PAY_LATER');

    const guestUser = createMockUser('guest-1', 'guest@outside.com');
    const guestProfile = createMockProfile('guest-1', 'customer', 'guest', 'not_requested');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: guestUser,
      profile: guestProfile,
    });

    const mockGuestDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { account_type: 'guest', approved_account_type: 'guest' },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockGuestDb as any);

    const guestOrderRes = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer guest-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0000000-0000-0000-0000-000000000001', quantity: 1 }],
        payment_method: 'pay_later',
      }),
    });
    expect(guestOrderRes.status).toBe(403);
    const guestBody = await guestOrderRes.json();
    expect(guestBody.error.code).toBe('FORBIDDEN_PAY_LATER');
  });

  it('Rejects order collection when QR is expired after 10:00 PM IST', async () => {
    const staffUser = createMockUser('staff-worker-1', 'staff@campus.edu');
    const staffProfile = createMockProfile('staff-worker-1', 'staff', 'student');

    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: staffUser,
      profile: staffProfile,
    });

    const mockOrder = {
      id: 'ord-expired-1',
      order_number: 'CAF-261120-E100',
      order_stage: 'ORDER_PLACED',
      order_status: 'ORDER_PLACED',
      payment_status: 'paid',
      qr_verification_token: 'CAF-QR-EXPIRED-9999',
      qr_consumed_at: null,
      collected_at: null,
      created_at: '2026-11-20T08:00:00.000Z',
      order_items: [],
    };

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              })),
            })),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/collect-qr', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer staff-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        qr_token: 'CAF-QR-EXPIRED-9999',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('QR_EXPIRED');
  });
});
