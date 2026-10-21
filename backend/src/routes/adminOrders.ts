import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables, OrderStatus } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const OrderStatusUpdateSchema = z.object({
  status: z.enum([
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

  const statusFilter = c.req.query('status') || 'all';
  const search = c.req.query('search')?.trim();
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

  let query = adminClient
    .from('orders')
    .select('*, order_items(*), profiles:customer_id(display_name, account_type)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter !== 'all') {
    query = query.eq('order_status', statusFilter);
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

  const formatted = (orders || []).map((o: any) => ({
    ...o,
    items: o.order_items || [],
    customer_name: o.profiles?.display_name || 'Customer',
    customer_account_type: o.profiles?.account_type || 'student',
  }));

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
    .select('*, order_items(*), profiles:customer_id(display_name, account_type)')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return c.json(
      { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
      404
    );
  }

  return c.json({
    success: true,
    data: {
      ...order,
      items: order.order_items || [],
      customer_name: order.profiles?.display_name || 'Customer',
      customer_account_type: order.profiles?.account_type || 'student',
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

    const currentStatus: OrderStatus = order.order_status;

    if (currentStatus === targetStatus) {
      return c.json({ success: true, data: order });
    }

    if (currentStatus === 'completed' || currentStatus === 'cancelled') {
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

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready_for_pickup', 'cancelled'],
      ready_for_pickup: ['completed', 'cancelled'],
      completed: [],
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

    if (targetStatus === 'confirmed') updatePayload.confirmed_at = now;
    if (targetStatus === 'preparing') updatePayload.preparing_at = now;
    if (targetStatus === 'ready_for_pickup') updatePayload.ready_at = now;
    if (targetStatus === 'completed') updatePayload.completed_at = now;

    if (targetStatus === 'cancelled') {
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

    return c.json({
      success: true,
      data: {
        ...updatedOrder,
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
      .select('*, order_items(*), profiles:customer_id(display_name, account_type)')
      .eq('qr_verification_token', qr_token)
      .maybeSingle();

    if (orderErr || !order) {
      return c.json(
        { success: false, error: { code: 'INVALID_QR_TOKEN', message: 'Order with this QR token was not found' } },
        404
      );
    }

    const isEligible = order.payment_status === 'paid' && order.order_status !== 'completed' && order.order_status !== 'cancelled';

    return c.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method || 'testing_wallet',
        total: order.total,
        subtotal: order.subtotal,
        paid_at: order.paid_at,
        collected_at: order.collected_at,
        collected_by: order.collected_by,
        qr_verification_token: order.qr_verification_token,
        created_at: order.created_at,
        customer: {
          id: order.customer_id,
          display_name: order.profiles?.display_name || 'Customer',
          account_type: order.profiles?.account_type || 'student',
        },
        items: order.order_items || [],
        is_eligible_for_collection: isEligible,
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
          { success: false, error: { code: 'ALREADY_COLLECTED', message: errMsg } },
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
          { success: false, error: { code: 'ORDER_UNPAID', message: errMsg } },
          400
        );
      }
      if (errMsg.includes('ERR_ORDER_NOT_FOUND')) {
        return c.json(
          { success: false, error: { code: 'ORDER_NOT_FOUND', message: errMsg } },
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

  if (order.order_status === 'completed') {
    return c.json(
      {
        success: false,
        error: {
          code: 'ALREADY_COLLECTED',
          message: `Order ${order.order_number} has already been collected at ${order.collected_at}`,
        },
      },
      400
    );
  }

  if (order.order_status === 'cancelled') {
    return c.json(
      {
        success: false,
        error: {
          code: 'ORDER_CANCELLED',
          message: `Cannot collect cancelled order ${order.order_number}`,
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
          message: `Cannot collect order ${order.order_number} with payment status "${order.payment_status}"`,
        },
      },
      400
    );
  }

  const now = new Date().toISOString();
  const { data: updatedOrder, error: updateErr } = await adminClient
    .from('orders')
    .update({
      order_status: 'completed',
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
      order_status: 'completed',
      payment_status: updatedOrder.payment_status,
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
    .select('*, order_items(*), profiles:customer_id(display_name, account_type)')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return c.json(
      { success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } },
      404
    );
  }

  return c.json({
    success: true,
    data: {
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      paid_at: order.paid_at,
      payment_method: order.payment_method || 'testing_wallet',
      payment_status: order.payment_status,
      order_status: order.order_status,
      subtotal: order.subtotal,
      total: order.total,
      qr_verification_token: order.qr_verification_token,
      collected_at: order.collected_at,
      collected_by: order.collected_by,
      customer: {
        id: order.customer_id,
        display_name: order.profiles?.display_name || 'Customer',
        account_type: order.profiles?.account_type || 'student',
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
