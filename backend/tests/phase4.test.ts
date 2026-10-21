import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';

describe('Phase 4: Cart, Order Management & Inventory Control Test Suite', () => {
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
    display_name: 'Rahul Sharma',
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

  const mockOtherCustomerUser = {
    id: 'usr-002',
    email: 'other@college.edu',
  };

  const mockOtherCustomerProfile = {
    id: 'usr-002',
    display_name: 'Pooja Verma',
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

  it('POST /api/v1/orders rejects unauthenticated request', async () => {
    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 }],
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/orders validates input schema and rejects empty cart', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({
        items: [],
      }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/orders rejects order when item is unavailable or sold out', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    name: 'Masala Dosa',
                    price: 4500,
                    is_available: false,
                    is_archived: false,
                    track_inventory: false,
                    stock_quantity: 0,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC_FALLBACK') }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 }],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('ITEM_UNAVAILABLE');
  });

  it('POST /api/v1/orders rejects order when stock is insufficient', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    name: 'Samosa',
                    price: 1500,
                    is_available: true,
                    is_archived: false,
                    track_inventory: true,
                    stock_quantity: 2,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC_FALLBACK') }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 5 }],
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('POST /api/v1/orders creates order and calculates server total accurately', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const createdOrderRecord = {
      id: 'ord-101',
      customer_id: 'usr-001',
      order_number: 'CAF-261021-9988',
      order_status: 'pending',
      payment_status: 'unpaid',
      subtotal: 9000,
      total: 9000,
      idempotency_key: 'key-123',
    };

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: createdOrderRecord, error: null }),
              }),
            }),
          };
        }
        if (table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    name: 'Special Biryani',
                    price: 9000,
                    is_available: true,
                    is_archived: false,
                    track_inventory: true,
                    stock_quantity: 10,
                  },
                ],
                error: null,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        if (table === 'order_items') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'oi-1',
                    order_id: 'ord-101',
                    menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    item_name: 'Special Biryani',
                    unit_price: 9000,
                    quantity: 1,
                    line_total: 9000,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'inventory_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('RPC_FALLBACK') }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 }],
        idempotency_key: 'key-123',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe('ord-101');
    expect(body.data.total).toBe(9000);
    expect(body.data.payment_status).toBe('unpaid');
    expect(body.data.order_status).toBe('pending');
  });

  it('POST /api/v1/orders handles idempotency replay cleanly', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const existingOrder = {
      id: 'ord-101',
      customer_id: 'usr-001',
      order_number: 'CAF-261021-9988',
      order_status: 'pending',
      payment_status: 'unpaid',
      subtotal: 9000,
      total: 9000,
      idempotency_key: 'key-123',
      order_items: [{ id: 'oi-1', item_name: 'Special Biryani', quantity: 1 }],
    };

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: existingOrder, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
      rpc: vi.fn(),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 1 }],
        idempotency_key: 'key-123',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.is_idempotent_replay).toBe(true);
    expect(body.data.id).toBe('ord-101');
  });

  it('GET /api/v1/orders/:id blocks customer from reading another customer order', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockOtherCustomerUser,
      profile: mockOtherCustomerProfile,
    });

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'ord-101',
                customer_id: 'usr-001',
                order_number: 'CAF-261021-9988',
                total: 9000,
              },
              error: null,
            }),
          }),
        }),
      })),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders/ord-101', {
      headers: { Authorization: 'Bearer other-customer-token' },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('POST /api/v1/orders/:id/cancel allows customer to cancel pending order', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'ord-101',
          order_number: 'CAF-261021-9988',
          order_status: 'cancelled',
          cancellation_reason: 'Changed plans',
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders/ord-101/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({ reason: 'Changed plans' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_status).toBe('cancelled');
  });

  it('GET /api/v1/admin/orders rejects customer with 403 Forbidden', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/admin/orders', {
      headers: { Authorization: 'Bearer customer-token' },
    });

    expect(res.status).toBe(403);
  });

  it('PATCH /api/v1/admin/orders/:id/status allows admin to confirm order', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const existingOrder = {
      id: 'ord-101',
      order_status: 'pending',
      order_items: [],
    };

    const updatedOrder = {
      id: 'ord-101',
      order_status: 'confirmed',
      confirmed_at: '2026-10-21T12:00:00.000Z',
      order_items: [],
    };

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingOrder, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedOrder, error: null }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-101/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({ status: 'confirmed' }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_status).toBe('confirmed');
  });

  it('PATCH /api/v1/admin/orders/:id/status rejects invalid transition', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const existingOrder = {
      id: 'ord-101',
      order_status: 'pending',
      order_items: [],
    };

    const mockDb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: existingOrder, error: null }),
          }),
        }),
      })),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-101/status', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({ status: 'completed' }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('INVALID_TRANSITION');
  });

  it('PATCH /api/v1/admin/inventory/:menuItemId updates stock and threshold', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const existingItem = {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Paneer Puff',
      price: 2500,
      category_id: 'cat-1',
      is_available: true,
      track_inventory: true,
      stock_quantity: 4,
      low_stock_threshold: 5,
    };

    const updatedItem = {
      ...existingItem,
      stock_quantity: 20,
      low_stock_threshold: 8,
      categories: { name: 'Snacks' },
    };

    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'menu_items') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: existingItem, error: null }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: updatedItem, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'inventory_logs') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {};
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/inventory/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer admin-token',
      },
      body: JSON.stringify({
        stock_quantity: 20,
        low_stock_threshold: 8,
        track_inventory: true,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.stock_quantity).toBe(20);
    expect(body.data.low_stock_threshold).toBe(8);
  });
});
