import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const OrderStatusUpdateSchema = z.object({
  status: z.enum([
    'ORDER_PLACED',
    'READY_TO_PICK',
    'COLLECTED',
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'completed',
    'cancelled',
  ]),
  cancellation_reason: z.string().max(300).optional().nullable(),
});

export const adminOrdersRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminOrdersRouter.use('*', requireAuth);
adminOrdersRouter.use('*', requireAdmin);

adminOrdersRouter.get('/', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const stageFilter = c.req.query('stage') || c.req.query('status') || 'all';
  const search = c.req.query('search')?.trim();
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

  let query = adminClient
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (stageFilter !== 'all') {
    if (stageFilter === 'ORDER_PLACED') {
      query = query.in('order_status', ['ORDER_PLACED', 'pending', 'confirmed', 'preparing']);
    } else if (stageFilter === 'READY_TO_PICK') {
      query = query.in('order_status', ['READY_TO_PICK', 'ready_for_pickup']);
    } else if (stageFilter === 'COLLECTED') {
      query = query.in('order_status', ['COLLECTED', 'completed']);
    } else {
      query = query.eq('order_status', stageFilter);
    }
  }

  if (search) {
    query = query.ilike('order_number', `%${search}%`);
  }

  const { data: orders, error } = await query;

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const customerIds = Array.from(
    new Set((orders || []).map((o: any) => o.customer_id).filter(Boolean))
  );

  const profilesMap = new Map<string, { display_name?: string; account_type?: string }>();
  if (customerIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, display_name, account_type')
      .in('id', customerIds);

    (profiles || []).forEach((p: any) => {
      profilesMap.set(p.id, p);
    });
  }

  const formatted = (orders || []).map((o: any) => {
    const profile = profilesMap.get(o.customer_id);
    const stage = o.order_stage || (o.order_status === 'ready_for_pickup' || o.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : o.order_status === 'completed' || o.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');
    return {
      ...o,
      order_stage: stage,
      order_status: stage,
      items: o.order_items || [],
      customer_name: profile?.display_name || 'Customer',
      customer_account_type: profile?.account_type || 'student',
    };
  });

  return c.json({
    success: true,
    data: formatted,
    pagination: {
      limit,
      offset,
      count: formatted.length,
    },
  });
});

adminOrdersRouter.get('/:id', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const orderId = c.req.param('id');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: order, error } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return c.json(
      { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
      404
    );
  }

  let customerProfile: { display_name?: string; account_type?: string } | null = null;
  if (order.customer_id) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name, account_type')
      .eq('id', order.customer_id)
      .maybeSingle();
    customerProfile = profile;
  }

  return c.json({
    success: true,
    data: {
      ...order,
      order_stage: order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED'),
      items: order.order_items || [],
      customer_name: customerProfile?.display_name || 'Customer',
      customer_account_type: customerProfile?.account_type || 'student',
    },
  });
});

adminOrdersRouter.post('/:id/ready', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const orderId = c.req.param('id');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  try {
    const { data: rpcResult, error: rpcErr } = await adminClient.rpc('mark_order_ready', {
      p_order_id: orderId,
    });

    if (!rpcErr && rpcResult) {
      return c.json({
        success: true,
        data: rpcResult,
      });
    }

    if (rpcErr) {
      const errMsg = rpcErr.message || '';
      if (errMsg.includes('ERR_ALREADY_COLLECTED')) {
        return c.json(
          { success: false, error: { code: 'ALREADY_COLLECTED', message: 'Order has already been collected' } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_UNPAID')) {
        return c.json(
          { success: false, error: { code: 'ORDER_UNPAID', message: 'Cannot mark unpaid order as ready' } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_NOT_FOUND')) {
        return c.json(
          { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
          404
        );
      }
    }
  } catch {}

  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return c.json(
      { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
      404
    );
  }

  const currentStage = order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');

  if (currentStage === 'COLLECTED') {
    return c.json(
      { success: false, error: { code: 'ALREADY_COLLECTED', message: 'Order has already been collected' } },
      400
    );
  }

  if (order.payment_status !== 'paid') {
    return c.json(
      { success: false, error: { code: 'ORDER_UNPAID', message: 'Cannot mark unpaid order as ready' } },
      400
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateErr } = await adminClient
    .from('orders')
    .update({
      order_stage: 'READY_TO_PICK',
      order_status: 'READY_TO_PICK',
      ready_at: now,
      updated_at: now,
    })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();

  if (updateErr) {
    return c.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
      500
    );
  }

  return c.json({
    success: true,
    data: {
      ...updated,
      order_stage: 'READY_TO_PICK',
      order_status: 'READY_TO_PICK',
      items: updated.order_items || [],
    },
  });
});

adminOrdersRouter.patch(
  '/:id/status',
  zValidator('json', OrderStatusUpdateSchema),
  async (c) => {
    const adminClient = getSupabaseAdminClient(c.env);
    const user = c.get('user');
    const orderId = c.req.param('id');
    const { status: targetStatus, cancellation_reason } = c.req.valid('json');

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return c.json(
        { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
        404
      );
    }

    const currentStatus = order.order_status;
    const currentStage = order.order_stage || (currentStatus === 'ready_for_pickup' || currentStatus === 'READY_TO_PICK' ? 'READY_TO_PICK' : currentStatus === 'completed' || currentStatus === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');

    if (currentStatus === targetStatus || currentStage === targetStatus) {
      return c.json({ success: true, data: order });
    }

    if (currentStage === 'COLLECTED' || currentStatus === 'completed' || currentStatus === 'cancelled') {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Terminal status "${currentStatus}" cannot be modified`,
          },
        },
        400
      );
    }

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled', 'ORDER_PLACED'],
      confirmed: ['preparing', 'cancelled', 'READY_TO_PICK', 'ready_for_pickup'],
      preparing: ['ready_for_pickup', 'cancelled', 'READY_TO_PICK'],
      ORDER_PLACED: ['READY_TO_PICK', 'ready_for_pickup', 'confirmed', 'preparing', 'cancelled'],
      ready_for_pickup: ['completed', 'COLLECTED', 'cancelled'],
      READY_TO_PICK: ['COLLECTED', 'completed', 'cancelled'],
      completed: [],
      COLLECTED: [],
      cancelled: [],
    };

    if (!validTransitions[currentStatus]?.includes(targetStatus)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TRANSITION',
            message: `Transition from "${currentStatus}" to "${targetStatus}" is not permitted`,
          },
        },
        400
      );
    }

    const now = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      order_status: targetStatus,
      updated_at: now,
    };

    if (targetStatus === 'READY_TO_PICK' || targetStatus === 'ready_for_pickup') {
      updatePayload.order_stage = 'READY_TO_PICK';
      updatePayload.order_status = 'READY_TO_PICK';
      updatePayload.ready_at = now;
    } else if (targetStatus === 'COLLECTED' || targetStatus === 'completed') {
      updatePayload.order_stage = 'COLLECTED';
      updatePayload.order_status = 'COLLECTED';
      updatePayload.completed_at = now;
      updatePayload.collected_at = now;
      updatePayload.qr_consumed_at = now;
      updatePayload.collected_by = user.id;
    } else if (targetStatus === 'ORDER_PLACED') {
      updatePayload.order_stage = 'ORDER_PLACED';
      updatePayload.order_status = 'ORDER_PLACED';
    } else if (targetStatus === 'confirmed') {
      updatePayload.confirmed_at = now;
    } else if (targetStatus === 'preparing') {
      updatePayload.preparing_at = now;
    } else if (targetStatus === 'cancelled') {
      updatePayload.cancellation_reason = cancellation_reason?.trim() || 'Cancelled by canteen manager';
      updatePayload.cancelled_at = now;
      updatePayload.cancelled_by = user.id;

      const items = order.order_items || [];
      for (const item of items) {
        if (item.menu_item_id) {
          const { data: menuItem } = await adminClient
            .from('menu_items')
            .select('id, track_inventory, stock_quantity')
            .eq('id', item.menu_item_id)
            .maybeSingle();

          if (menuItem && menuItem.track_inventory) {
            await adminClient
              .from('menu_items')
              .update({
                stock_quantity: menuItem.stock_quantity + item.quantity,
                is_available: true,
                updated_at: now,
              })
              .eq('id', menuItem.id);

            await adminClient.from('inventory_logs').insert({
              menu_item_id: menuItem.id,
              quantity_change: item.quantity,
              reason: 'order_cancelled',
              order_id: orderId,
              actor_id: user.id,
            });
          }
        }
      }
    }

    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId)
      .select('*, order_items(*)')
      .single();

    if (updateErr) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
        500
      );
    }

    const resStage = updatedOrder.order_stage || (updatedOrder.order_status === 'ready_for_pickup' || updatedOrder.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : updatedOrder.order_status === 'completed' || updatedOrder.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');

    return c.json({
      success: true,
      data: {
        ...updatedOrder,
        order_stage: resStage,
        order_status: updatedOrder.order_status,
        items: updatedOrder.order_items || [],
      },
    });
  }
);

const VerifyQrSchema = z.object({
  qr_token: z.string().trim().min(5, 'QR verification token is required'),
});

adminOrdersRouter.post(
  '/verify-qr',
  zValidator('json', VerifyQrSchema),
  async (c) => {
    const adminClient = getSupabaseAdminClient(c.env);
    const { qr_token } = c.req.valid('json');

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    try {
      const { data: rpcResult, error: rpcErr } = await adminClient.rpc('verify_qr_token', {
        p_qr_token: qr_token,
      });

      if (!rpcErr && rpcResult) {
        return c.json({
          success: true,
          data: rpcResult,
        });
      }

      if (rpcErr && rpcErr.message?.includes('ERR_INVALID_QR_TOKEN')) {
        return c.json(
          { success: false, error: { code: 'INVALID_QR_TOKEN', message: rpcErr.message } },
          404
        );
      }
    } catch {}

    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('qr_verification_token', qr_token)
      .maybeSingle();

    if (orderErr || !order) {
      return c.json(
        { success: false, error: { code: 'INVALID_QR_TOKEN', message: 'Order with this QR token was not found' } },
        404
      );
    }

    let customerProfile: { display_name?: string; account_type?: string } | null = null;
    if (order.customer_id) {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('display_name, account_type')
        .eq('id', order.customer_id)
        .maybeSingle();
      customerProfile = profile;
    }

    const stage = order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');
    let isEligible = false;
    let ineligibilityReason: string | null = null;

    if (order.payment_status !== 'paid') {
      isEligible = false;
      ineligibilityReason = 'Order has not been paid yet';
    } else if (stage === 'COLLECTED' || order.qr_consumed_at) {
      isEligible = false;
      ineligibilityReason = 'Order already collected';
    } else if (stage === 'ORDER_PLACED') {
      isEligible = false;
      ineligibilityReason = 'Order is not ready for pickup yet';
    } else if (stage === 'READY_TO_PICK') {
      isEligible = true;
      ineligibilityReason = null;
    }

    return c.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        order_stage: stage,
        order_status: stage,
        payment_status: order.payment_status,
        payment_method: order.payment_method || 'testing_wallet',
        total: order.total,
        subtotal: order.subtotal,
        paid_at: order.paid_at,
        ready_at: order.ready_at,
        collected_at: order.collected_at,
        collected_by: order.collected_by,
        qr_verification_token: order.qr_verification_token,
        qr_consumed_at: order.qr_consumed_at,
        created_at: order.created_at,
        customer: {
          id: order.customer_id,
          display_name: customerProfile?.display_name || 'Customer',
          account_type: customerProfile?.account_type || 'student',
        },
        items: order.order_items || [],
        is_eligible_for_collection: isEligible,
        ineligibility_reason: ineligibilityReason,
      },
    });
  }
);

adminOrdersRouter.post('/:id/collect', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const adminUser = c.get('user');
  const orderId = c.req.param('id');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  try {
    const { data: rpcResult, error: rpcErr } = await adminClient.rpc('collect_order', {
      p_order_id: orderId,
      p_operator_id: adminUser.id,
    });

    if (!rpcErr && rpcResult) {
      return c.json({
        success: true,
        data: rpcResult,
      });
    }

    if (rpcErr) {
      const errMsg = rpcErr.message || '';
      if (errMsg.includes('ERR_ALREADY_COLLECTED')) {
        return c.json(
          { success: false, error: { code: 'ALREADY_COLLECTED', message: 'Order already collected' } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_NOT_READY')) {
        return c.json(
          { success: false, error: { code: 'ORDER_NOT_READY', message: 'Order is not ready for pickup yet' } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_CANCELLED')) {
        return c.json(
          { success: false, error: { code: 'ORDER_CANCELLED', message: errMsg } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_UNPAID')) {
        return c.json(
          { success: false, error: { code: 'ORDER_UNPAID', message: 'Cannot collect unpaid order' } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_NOT_FOUND')) {
        return c.json(
          { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
          404
        );
      }
    }
  } catch {}

  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return c.json(
      { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
      404
    );
  }

  const stage = order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');

  if (stage === 'COLLECTED' || order.order_status === 'completed' || order.qr_consumed_at) {
    return c.json(
      {
        success: false,
        error: {
          code: 'ALREADY_COLLECTED',
          message: 'Order already collected',
        },
      },
      400
    );
  }

  if (order.payment_status !== 'paid') {
    return c.json(
      {
        success: false,
        error: {
          code: 'ORDER_UNPAID',
          message: 'Cannot collect unpaid order',
        },
      },
      400
    );
  }

  if (stage === 'ORDER_PLACED') {
    return c.json(
      {
        success: false,
        error: {
          code: 'ORDER_NOT_READY',
          message: 'Order is not ready for pickup yet',
        },
      },
      400
    );
  }

  const now = new Date().toISOString();
  const { data: updatedOrder, error: updateErr } = await adminClient
    .from('orders')
    .update({
      order_stage: 'COLLECTED',
      order_status: 'COLLECTED',
      qr_consumed_at: now,
      collected_at: now,
      collected_by: adminUser.id,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', orderId)
    .select('*, order_items(*)')
    .single();

  if (updateErr) {
    return c.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
      500
    );
  }

  return c.json({
    success: true,
    data: {
      order_id: updatedOrder.id,
      order_number: updatedOrder.order_number,
      order_stage: 'COLLECTED',
      order_status: 'COLLECTED',
      payment_status: updatedOrder.payment_status,
      qr_consumed_at: now,
      collected_at: now,
      collected_by: adminUser.id,
      items: updatedOrder.order_items || [],
    },
  });
});

adminOrdersRouter.get('/:id/receipt', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const orderId = c.req.param('id');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: order, error: orderErr } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return c.json(
      { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
      404
    );
  }

  let customerProfile: { display_name?: string; account_type?: string } | null = null;
  if (order.customer_id) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name, account_type')
      .eq('id', order.customer_id)
      .maybeSingle();
    customerProfile = profile;
  }

  const receiptStage = order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED');

  return c.json({
    success: true,
    data: {
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      paid_at: order.paid_at,
      payment_method: order.payment_method || 'testing_wallet',
      payment_status: order.payment_status,
      order_stage: receiptStage,
      order_status: receiptStage,
      subtotal: order.subtotal,
      total: order.total,
      qr_verification_token: order.qr_verification_token,
      collected_at: order.collected_at,
      collected_by: order.collected_by,
      customer: {
        id: order.customer_id,
        display_name: customerProfile?.display_name || 'Customer',
        account_type: customerProfile?.account_type || 'student',
      },
      items: order.order_items || [],
      canteen: {
        name: 'Cafteria College Canteen',
        campus: 'Campus Main Facility',
        address: 'Student Centre, Food Court Level 1',
        notice: 'Testing Wallet Receipt — Demo Credits Only. No Real Money.',
      },
    },
  });
});
