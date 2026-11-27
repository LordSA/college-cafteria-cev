import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';

describe('Store Status and Daily Stock Reset Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/store-status returns open status by default', async () => {
    const mockClient: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                key: 'canteen_status',
                value: { is_open: true, message: 'Canteen is open for orders' },
                updated_at: '2026-11-28T00:00:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockClient);

    const res = await app.request('/api/v1/store-status');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.is_open).toBe(true);
    expect(body.data.message).toBe('Canteen is open for orders');
  });

  it('PATCH /api/v1/admin/store-status rejects unauthenticated requests', async () => {
    const res = await app.request('/api/v1/admin/store-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_open: false }),
    });

    expect(res.status).toBe(401);
  });

  it('PATCH /api/v1/admin/store-status rejects standard customer role with 403', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValue({
      success: true,
      user: { id: 'cust-1', email: 'diner@cev.ac.in', email_confirmed_at: '2026-10-20T00:00:00Z' },
      profile: {
        id: 'cust-1',
        email: 'diner@cev.ac.in',
        display_name: 'Diner',
        avatar_key: null,
        account_type: 'student',
        app_role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    const res = await app.request('/api/v1/admin/store-status', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer cust-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_open: false }),
    });

    expect(res.status).toBe(403);
  });

  it('PATCH /api/v1/admin/store-status allows verified admin to update status', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValue({
      success: true,
      user: { id: 'admin-1', email: 'admin@cev.ac.in', email_confirmed_at: '2026-10-20T00:00:00Z' },
      profile: {
        id: 'admin-1',
        email: 'admin@cev.ac.in',
        display_name: 'Admin',
        avatar_key: null,
        account_type: 'staff_t',
        app_role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    const mockClient: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                key: 'canteen_status',
                value: { is_open: true, message: 'Canteen is open for orders' },
              },
            }),
          }),
        }),
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                key: 'canteen_status',
                value: { is_open: false, message: 'We are currently closed.' },
                updated_at: '2026-11-28T00:30:00.000Z',
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockClient);

    const res = await app.request('/api/v1/admin/store-status', {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_open: false, message: 'We are currently closed.' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.is_open).toBe(false);
  });

  it('POST /api/v1/orders rejects order placement when canteen is closed', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValue({
      success: true,
      user: { id: 'cust-1', email: 'diner@cev.ac.in', email_confirmed_at: '2026-10-20T00:00:00Z' },
      profile: {
        id: 'cust-1',
        email: 'diner@cev.ac.in',
        display_name: 'Diner',
        avatar_key: null,
        account_type: 'student',
        app_role: 'customer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    const mockClient: any = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'store_settings') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    key: 'canteen_status',
                    value: { is_open: false, message: 'Canteen is closed for the night.' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockClient);

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer cust-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 }],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('CANTEEN_CLOSED');
  });

  it('POST /api/v1/admin/inventory/daily-reset calls stored procedure', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValue({
      success: true,
      user: { id: 'staff-1', email: 'staff@cev.ac.in', email_confirmed_at: '2026-10-20T00:00:00Z' },
      profile: {
        id: 'staff-1',
        email: 'staff@cev.ac.in',
        display_name: 'Staff',
        avatar_key: null,
        account_type: 'student',
        app_role: 'staff',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    const mockClient: any = {
      rpc: vi.fn().mockResolvedValue({
        data: { success: true, reset_count: 5, date_ist: '2026-11-28' },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockClient);

    const res = await app.request('/api/v1/admin/inventory/daily-reset', {
      method: 'POST',
      headers: { Authorization: 'Bearer staff-token' },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.reset_count).toBe(5);
  });
});
