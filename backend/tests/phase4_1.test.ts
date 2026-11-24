import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../src/index';
import * as supabaseLib from '../src/lib/supabase';
import type { AuthenticatedUser, UserProfile } from '../src/types/env';

const mockCustomerUser: AuthenticatedUser = {
  id: 'usr-customer-1',
  email: 'student@campus.edu',
  email_confirmed_at: '2026-10-20T00:00:00Z',
};

const mockCustomerProfile: UserProfile = {
  id: 'usr-customer-1',
  display_name: 'Alex Student',
  avatar_key: null,
  account_type: 'student',
  requested_account_type: 'student',
  approved_account_type: 'student',
  staff_approval_status: 'not_requested',
  reviewed_by: null,
  reviewed_at: null,
  app_role: 'customer',
  created_at: '2026-10-20T00:00:00Z',
  updated_at: '2026-10-20T00:00:00Z',
};

const mockAdminUser: AuthenticatedUser = {
  id: 'usr-admin-1',
  email: 'admin@campus.edu',
  email_confirmed_at: '2026-10-20T00:00:00Z',
};

const mockAdminProfile: UserProfile = {
  id: 'usr-admin-1',
  display_name: 'Canteen Manager',
  avatar_key: null,
  account_type: 'staff_t',
  requested_account_type: 'staff_t',
  approved_account_type: 'staff_t',
  staff_approval_status: 'approved',
  reviewed_by: 'usr-root',
  reviewed_at: '2026-10-20T00:00:00Z',
  app_role: 'admin',
  created_at: '2026-10-20T00:00:00Z',
  updated_at: '2026-10-20T00:00:00Z',
};

describe('Phase 4.1: Testing Wallet, QR Order Verification and Bill Printing Test Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('GET /api/v1/wallet/me returns 404 (wallet architecture removed)', async () => {
    const res = await app.request('/api/v1/wallet/me');
    expect(res.status).toBe(404);
  });

  it('GET /api/v1/admin/wallets returns 404 when authenticated (wallet architecture removed)', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });
    const res = await app.request('/api/v1/admin/wallets', {
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });
    expect(res.status).toBe(404);
  });

  it('POST /api/v1/orders rejects unsupported testing_wallet payment method', async () => {
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
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 2 }],
        payment_method: 'testing_wallet',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it('POST /api/v1/orders with pay_later creates order with QR verification token', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: { ...mockCustomerProfile, account_type: 'staff_t' },
    });

    const mockDb = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { account_type: 'staff_t' },
                  error: null,
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
                    is_available: true,
                    track_inventory: false,
                    stock_quantity: 10,
                  },
                ],
                error: null,
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        if (table === 'orders') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'ord-paid-101',
                    order_number: 'CAF-261021-WXYZ',
                    order_status: 'ORDER_PLACED',
                    payment_status: 'unpaid',
                    payment_method: 'pay_later',
                    qr_verification_token: 'CAF-QR-AABBCCDDEEFF',
                    subtotal: 9000,
                    total: 9000,
                    created_at: '2026-10-21T12:00:00Z',
                  },
                  error: null,
                }),
              }),
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
                    order_id: 'ord-paid-101',
                    item_name: 'Masala Dosa',
                    unit_price: 4500,
                    quantity: 2,
                    line_total: 9000,
                  },
                ],
                error: null,
              }),
            }),
          };
        }
        if (table === 'cart_item_locks') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
        };
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-customer-token',
      },
      body: JSON.stringify({
        items: [{ menu_item_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', quantity: 2 }],
        payment_method: 'pay_later',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.payment_method).toBe('pay_later');
    expect(body.data.qr_verification_token).toBe('CAF-QR-AABBCCDDEEFF');
  });

  it('POST /api/v1/admin/orders/verify-qr rejects invalid QR token with 404', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_INVALID_QR_TOKEN: Order with provided QR verification token was not found'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/verify-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-admin-token',
      },
      body: JSON.stringify({
        qr_token: 'CAF-QR-INVALID999',
      }),
    });

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INVALID_QR_TOKEN');
  });

  it('POST /api/v1/admin/orders/verify-qr returns order verification details for valid QR token', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-paid-101',
          order_number: 'CAF-261021-WXYZ',
          order_status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'pay_later',
          total: 9000,
          qr_verification_token: 'CAF-QR-AABBCCDDEEFF',
          customer: {
            id: 'usr-customer-1',
            display_name: 'Alex Student',
            account_type: 'student',
          },
          items: [
            {
              id: 'oi-1',
              item_name: 'Masala Dosa',
              unit_price: 4500,
              quantity: 2,
              line_total: 9000,
            },
          ],
          is_eligible_for_collection: true,
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/verify-qr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-admin-token',
      },
      body: JSON.stringify({
        qr_token: 'CAF-QR-AABBCCDDEEFF',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_number).toBe('CAF-261021-WXYZ');
    expect(body.data.is_eligible_for_collection).toBe(true);
    expect(body.data.customer.display_name).toBe('Alex Student');
  });

  it('POST /api/v1/admin/orders/:id/collect transitions order to completed with collection metadata', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-paid-101',
          order_number: 'CAF-261021-WXYZ',
          order_status: 'completed',
          payment_status: 'paid',
          collected_at: '2026-10-21T12:30:00Z',
          collected_by: 'usr-admin-1',
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-paid-101/collect', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_status).toBe('completed');
    expect(body.data.collected_by).toBe('usr-admin-1');
  });

  it('POST /api/v1/admin/orders/:id/collect rejects already-collected order with 400', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_ALREADY_COLLECTED: Order CAF-261021-WXYZ has already been collected at 2026-10-21T12:30:00Z'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-paid-101/collect', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ALREADY_COLLECTED');
  });

  it('GET /api/v1/orders/:id/receipt returns formatted receipt for customer', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'ord-paid-101',
                customer_id: 'usr-customer-1',
                order_number: 'CAF-261021-WXYZ',
                order_status: 'confirmed',
                payment_status: 'paid',
                payment_method: 'pay_later',
                subtotal: 9000,
                total: 9000,
                qr_verification_token: 'CAF-QR-AABBCCDDEEFF',
                created_at: '2026-10-21T12:00:00Z',
                paid_at: '2026-10-21T12:00:00Z',
                order_items: [
                  {
                    id: 'oi-1',
                    item_name: 'Masala Dosa',
                    unit_price: 4500,
                    quantity: 2,
                    line_total: 9000,
                  },
                ],
              },
              error: null,
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders/ord-paid-101/receipt', {
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_number).toBe('CAF-261021-WXYZ');
    expect(body.data.payment_method).toBe('pay_later');
    expect(body.data.total).toBe(9000);
    expect(body.data.canteen.name).toBe('Cafteria College Canteen');
  });
});
