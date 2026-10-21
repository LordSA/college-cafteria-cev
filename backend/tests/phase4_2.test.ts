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

describe('Phase 4.2: Strict Order Stages, QR Lifecycle and Collection Flow', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('POST /api/v1/admin/orders/:id/ready returns 401 when unauthenticated', async () => {
    const res = await app.request('/api/v1/admin/orders/ord-123/ready', {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/v1/admin/orders/:id/ready returns 403 when called by a customer', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const res = await app.request('/api/v1/admin/orders/ord-123/ready', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });
    expect(res.status).toBe(403);
  });

  it('POST /api/v1/admin/orders/:id/ready transitions ORDER_PLACED order to READY_TO_PICK', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-123',
          order_number: 'CAF-261022-A1B2',
          order_stage: 'READY_TO_PICK',
          order_status: 'READY_TO_PICK',
          payment_status: 'paid',
          ready_at: '2026-10-22T01:00:00Z',
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-123/ready', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_stage).toBe('READY_TO_PICK');
  });

  it('POST /api/v1/admin/orders/:id/ready returns 400 when order is unpaid', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_ORDER_UNPAID: Cannot mark unpaid order as ready'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-unpaid-1/ready', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ORDER_UNPAID');
  });

  it('POST /api/v1/admin/orders/:id/ready returns 400 when order is already collected', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_ALREADY_COLLECTED: Order CAF-261022-A1B2 has already been collected'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-collected-1/ready', {
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

  it('POST /api/v1/admin/orders/verify-qr returns not ready reason when order is in ORDER_PLACED', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-placed-1',
          order_number: 'CAF-261022-P100',
          order_stage: 'ORDER_PLACED',
          order_status: 'ORDER_PLACED',
          payment_status: 'paid',
          payment_method: 'testing_wallet',
          total: 15000,
          subtotal: 15000,
          paid_at: '2026-10-22T00:50:00Z',
          ready_at: null,
          collected_at: null,
          collected_by: null,
          qr_verification_token: 'CAF-QR-PLACED-1234',
          qr_consumed_at: null,
          created_at: '2026-10-22T00:50:00Z',
          customer_id: 'usr-customer-1',
          customer_name: 'Alex Student',
          customer_account_type: 'student',
          items: [],
          is_eligible_for_collection: false,
          ineligibility_reason: 'Order is not ready for pickup yet',
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
        qr_token: 'CAF-QR-PLACED-1234',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_stage).toBe('ORDER_PLACED');
    expect(body.data.is_eligible_for_collection).toBe(false);
    expect(body.data.ineligibility_reason).toBe('Order is not ready for pickup yet');
  });

  it('POST /api/v1/admin/orders/verify-qr returns eligible when order is READY_TO_PICK', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-ready-1',
          order_number: 'CAF-261022-R200',
          order_stage: 'READY_TO_PICK',
          order_status: 'READY_TO_PICK',
          payment_status: 'paid',
          payment_method: 'testing_wallet',
          total: 15000,
          subtotal: 15000,
          paid_at: '2026-10-22T00:50:00Z',
          ready_at: '2026-10-22T01:05:00Z',
          collected_at: null,
          collected_by: null,
          qr_verification_token: 'CAF-QR-READY-5678',
          qr_consumed_at: null,
          created_at: '2026-10-22T00:50:00Z',
          customer_id: 'usr-customer-1',
          customer_name: 'Alex Student',
          customer_account_type: 'student',
          items: [],
          is_eligible_for_collection: true,
          ineligibility_reason: null,
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
        qr_token: 'CAF-QR-READY-5678',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_stage).toBe('READY_TO_PICK');
    expect(body.data.is_eligible_for_collection).toBe(true);
    expect(body.data.ineligibility_reason).toBeNull();
  });

  it('POST /api/v1/admin/orders/verify-qr returns already collected reason when order is COLLECTED', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-collected-1',
          order_number: 'CAF-261022-C300',
          order_stage: 'COLLECTED',
          order_status: 'COLLECTED',
          payment_status: 'paid',
          payment_method: 'testing_wallet',
          total: 15000,
          subtotal: 15000,
          paid_at: '2026-10-22T00:50:00Z',
          ready_at: '2026-10-22T01:05:00Z',
          collected_at: '2026-10-22T01:10:00Z',
          collected_by: 'usr-admin-1',
          qr_verification_token: 'CAF-QR-DONE-9999',
          qr_consumed_at: '2026-10-22T01:10:00Z',
          created_at: '2026-10-22T00:50:00Z',
          customer_id: 'usr-customer-1',
          customer_name: 'Alex Student',
          customer_account_type: 'student',
          items: [],
          is_eligible_for_collection: false,
          ineligibility_reason: 'Order already collected',
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
        qr_token: 'CAF-QR-DONE-9999',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_stage).toBe('COLLECTED');
    expect(body.data.is_eligible_for_collection).toBe(false);
    expect(body.data.ineligibility_reason).toBe('Order already collected');
  });

  it('POST /api/v1/admin/orders/:id/collect rejects ORDER_PLACED order with 400 ORDER_NOT_READY', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_ORDER_NOT_READY: Order must be in READY_TO_PICK stage before it can be collected'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-placed-1/collect', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ORDER_NOT_READY');
  });

  it('POST /api/v1/admin/orders/:id/collect transitions READY_TO_PICK order to COLLECTED and consumes QR', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: {
          order_id: 'ord-ready-1',
          order_number: 'CAF-261022-R200',
          order_stage: 'COLLECTED',
          order_status: 'COLLECTED',
          payment_status: 'paid',
          collected_at: '2026-10-22T01:15:00Z',
          collected_by: 'usr-admin-1',
          qr_consumed_at: '2026-10-22T01:15:00Z',
        },
        error: null,
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-ready-1/collect', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.order_stage).toBe('COLLECTED');
    expect(body.data.collected_by).toBe('usr-admin-1');
    expect(body.data.qr_consumed_at).toBe('2026-10-22T01:15:00Z');
  });

  it('POST /api/v1/admin/orders/:id/collect rejects already-collected order with 400 ALREADY_COLLECTED', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const mockDb = {
      rpc: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('ERR_ALREADY_COLLECTED: Order CAF-261022-C300 has already been collected'),
      }),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders/ord-collected-1/collect', {
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

  it('GET /api/v1/admin/orders supports filtering by stage parameter', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockAdminUser,
      profile: mockAdminProfile,
    });

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'ord-ready-1',
            order_number: 'CAF-261022-R200',
            order_stage: 'READY_TO_PICK',
            order_status: 'READY_TO_PICK',
            payment_status: 'paid',
            total: 12000,
            subtotal: 12000,
            created_at: '2026-10-22T01:00:00Z',
            customer_id: 'usr-customer-1',
            order_items: [],
          },
        ],
        error: null,
        count: 1,
      }),
    };

    const mockDb = {
      from: vi.fn().mockReturnValue(queryBuilder),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/admin/orders?stage=READY_TO_PICK', {
      headers: {
        Authorization: 'Bearer valid-admin-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].order_stage).toBe('READY_TO_PICK');
  });

  it('GET /api/v1/orders/me returns order_stage for customer orders', async () => {
    vi.spyOn(supabaseLib, 'verifySupabaseToken').mockResolvedValueOnce({
      success: true,
      user: mockCustomerUser,
      profile: mockCustomerProfile,
    });

    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'ord-me-1',
            order_number: 'CAF-261022-M001',
            order_stage: 'ORDER_PLACED',
            order_status: 'pending',
            payment_status: 'paid',
            subtotal: 5000,
            total: 5000,
            created_at: '2026-10-22T01:00:00Z',
            order_items: [],
          },
        ],
        error: null,
      }),
    };

    const mockDb = {
      from: vi.fn().mockReturnValue(queryBuilder),
    };

    vi.spyOn(supabaseLib, 'getSupabaseAdminClient').mockReturnValue(mockDb as any);

    const res = await app.request('/api/v1/orders/me', {
      headers: {
        Authorization: 'Bearer valid-customer-token',
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data[0].order_stage).toBe('ORDER_PLACED');
  });
});
