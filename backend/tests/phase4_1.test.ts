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
  account_type: 'staff',
  requested_account_type: 'staff',
  approved_account_type: 'staff',
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

  it('GET /api/v1/wallet/me returns 401 when unauthenticated', async () => {
    const res = await app.request('/api/v1/wallet/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/wallet/me returns wallet details and balance in paise', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'wal-001',
          customer_id: 'usr-customer-1',
          balance: 25000,
          created_at: '2026-10-21T00:00:00Z',
          updated_at: '2026-10-21T00:00:00Z',
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/wallet/me', {
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.balance).toBe(25000);
    expect(body.data.formatted_balance).toBe('₹250.00');
  });

  it('GET /api/v1/wallet/transactions returns paginated transaction history', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockTxs = [
      {
        id: 'tx-001',
        wallet_id: 'wal-001',
        customer_id: 'usr-customer-1',
        amount: 50000,
        transaction_type: 'credit',
        balance_after: 50000,
        reason: 'Initial testing credits',
        created_at: '2026-10-21T10:00:00Z',
      },
    ];

    const mockDb = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({ data: mockTxs, error: null }),
            }),
          }),
        }),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/wallet/transactions', {
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].amount).toBe(50000);
  });

  it('GET /api/v1/admin/wallets rejects customer with 403 Forbidden', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/admin/wallets', {
      headers: {
        Authorization: 'Bearer customer-token',
      },
    });

    expect(res.status).toBe(403);
  });

  it('POST /api/v1/admin/wallets/:customerId/adjust successfully credits wallet', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          wallet_id: 'wal-001',
          customer_id: 'usr-customer-1',
          previous_balance: 10000,
          new_balance: 30000,
          amount: 20000,
          transaction_type: 'credit',
          transaction_id: 'tx-002',
          reason: 'Manual lab test credit',
          adjusted_at: '2026-10-21T11:00:00Z',
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/wallets/usr-customer-1/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-admin-token',
      },
      body: JSON.stringify({
        amount: 20000,
        transaction_type: 'credit',
        reason: 'Manual lab test credit',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.new_balance).toBe(30000);
    expect(body.data.formatted_balance).toBe('₹300.00');
  });

  it('POST /api/v1/admin/wallets/:customerId/adjust prevents negative balance on debit', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_INSUFFICIENT_FUNDS: Wallet balance (1000 paise) is insufficient for debit of 5000 paise'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/wallets/usr-customer-1/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-admin-token',
      },
      body: JSON.stringify({
        amount: 5000,
        transaction_type: 'debit',
        reason: 'Deduction test',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('POST /api/v1/orders with testing_wallet rejects order when balance is insufficient', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_INSUFFICIENT_FUNDS: Wallet balance of ₹10.00 is insufficient for total ₹90.00'),
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
        payment_method: 'testing_wallet',
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INSUFFICIENT_FUNDS');
  });

  it('POST /api/v1/orders with testing_wallet creates paid order with QR verification token', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          id: 'ord-paid-101',
          order_number: 'CAF-261021-WXYZ',
          order_status: 'confirmed',
          payment_status: 'paid',
          payment_method: 'testing_wallet',
          qr_verification_token: 'CAF-QR-AABBCCDDEEFF',
          subtotal: 9000,
          total: 9000,
          wallet_balance_after: 16000,
          created_at: '2026-10-21T12:00:00Z',
          is_idempotent_replay: false,
        },
        error: null,
      }),
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
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
        payment_method: 'testing_wallet',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.payment_status).toBe('paid');
    expect(body.data.order_status).toBe('confirmed');
    expect(body.data.qr_verification_token).toBe('CAF-QR-AABBCCDDEEFF');
    expect(body.data.wallet_balance_after).toBe(16000);
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
          payment_method: 'testing_wallet',
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
                payment_method: 'testing_wallet',
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
    expect(body.data.payment_method).toBe('testing_wallet');
    expect(body.data.total).toBe(9000);
    expect(body.data.canteen.name).toBe('Cafteria College Canteen');
  });
});
