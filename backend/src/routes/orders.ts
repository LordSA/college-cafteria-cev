import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const OrderItemInputSchema = z.object({
  menu_item_id: z.string().uuid('Invalid menu item ID format'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 per item'),
});

const OrderCreateSchema = z.object({
  items: z.array(OrderItemInputSchema).min(1, 'At least one item is required'),
  idempotency_key: z.string().max(100).optional().nullable(),
  payment_method: z.enum(['testing_wallet', 'counter_cash']).optional().default('testing_wallet'),
});

const OrderCancelSchema = z.object({
  reason: z.string().max(300).optional().nullable(),
});

export const customerOrdersRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

customerOrdersRouter.use('*', requireAuth);

customerOrdersRouter.post(
  '/',
  zValidator('json', OrderCreateSchema),
  async (c) => {
    const user = c.get('user');
    const payload = c.req.valid('json');
    const adminClient = getSupabaseAdminClient(c.env);

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    const idempotencyKey = payload.idempotency_key?.trim() || null;

    if (idempotencyKey) {
      const { data: existingOrder } = await adminClient
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        return c.json(
          {
            success: true,
            data: {
              ...existingOrder,
              items: existingOrder.order_items || [],
              is_idempotent_replay: true,
            },
          },
          200
        );
      }
    }

    const paymentMethod = payload.payment_method || 'testing_wallet';

    if (paymentMethod === 'testing_wallet') {
      try {
        const { data: rpcResult, error: rpcError } = await adminClient.rpc('pay_order_with_wallet', {
          p_customer_id: user.id,
          p_items: payload.items,
          p_idempotency_key: idempotencyKey,
        });

        if (!rpcError && rpcResult) {
          const orderId = rpcResult.id;
          const { data: items } = await adminClient
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

          return c.json(
            {
              success: true,
              data: {
                ...rpcResult,
                items: items || [],
              },
            },
            rpcResult.is_idempotent_replay ? 200 : 201
          );
        }

        if (rpcError) {
          const errMsg = rpcError.message || '';
          if (errMsg.includes('ERR_INSUFFICIENT_FUNDS')) {
            return c.json(
              { success: false, error: { code: 'INSUFFICIENT_FUNDS', message: errMsg } },
              400
            );
          }
          if (errMsg.includes('ERR_INSUFFICIENT_STOCK')) {
            return c.json(
              { success: false, error: { code: 'INSUFFICIENT_STOCK', message: errMsg } },
              400
            );
          }
          if (errMsg.includes('ERR_ITEM_UNAVAILABLE')) {
            return c.json(
              { success: false, error: { code: 'ITEM_UNAVAILABLE', message: errMsg } },
              400
            );
          }
          if (errMsg.includes('ERR_ITEM_NOT_FOUND')) {
            return c.json(
              { success: false, error: { code: 'ITEM_NOT_FOUND', message: errMsg } },
              404
            );
          }
          if (errMsg.includes('ERR_EMPTY_CART') || errMsg.includes('ERR_INVALID_QUANTITY')) {
            return c.json(
              { success: false, error: { code: 'INVALID_ORDER', message: errMsg } },
              400
            );
          }
        }
      } catch {}
    } else {
      try {
        const { data: rpcResult, error: rpcError } = await adminClient.rpc('place_order', {
          p_customer_id: user.id,
          p_items: payload.items,
          p_idempotency_key: idempotencyKey,
        });

        if (!rpcError && rpcResult) {
          const orderId = rpcResult.id;
          const { data: items } = await adminClient
            .from('order_items')
            .select('*')
            .eq('order_id', orderId);

          return c.json(
            {
              success: true,
              data: {
                ...rpcResult,
                items: items || [],
              },
            },
            rpcResult.is_idempotent_replay ? 200 : 201
          );
        }

        if (rpcError) {
          const errMsg = rpcError.message || '';
          if (errMsg.includes('ERR_INSUFFICIENT_STOCK')) {
            return c.json(
              { success: false, error: { code: 'INSUFFICIENT_STOCK', message: errMsg } },
              400
            );
          }
          if (errMsg.includes('ERR_ITEM_UNAVAILABLE')) {
            return c.json(
              { success: false, error: { code: 'ITEM_UNAVAILABLE', message: errMsg } },
              400
            );
          }
          if (errMsg.includes('ERR_ITEM_NOT_FOUND')) {
            return c.json(
              { success: false, error: { code: 'ITEM_NOT_FOUND', message: errMsg } },
              404
            );
          }
          if (errMsg.includes('ERR_EMPTY_CART') || errMsg.includes('ERR_INVALID_QUANTITY')) {
            return c.json(
              { success: false, error: { code: 'INVALID_ORDER', message: errMsg } },
              400
            );
          }
        }
      } catch {}
    }

    const itemIds = payload.items.map((i) => i.menu_item_id);
    const { data: menuItems, error: menuErr } = await adminClient
      .from('menu_items')
      .select('*')
      .in('id', itemIds);

    if (menuErr || !menuItems) {
      return c.json(
        { success: false, error: { code: 'QUERY_FAILED', message: 'Failed to verify menu items' } },
        500
      );
    }

    const menuMap = new Map(menuItems.map((m: any) => [m.id, m]));

    for (const reqItem of payload.items) {
      const item = menuMap.get(reqItem.menu_item_id);
      if (!item || item.is_archived) {
        return c.json(
          { success: false, error: { code: 'ITEM_NOT_FOUND', message: `Item ${reqItem.menu_item_id} not found` } },
          404
        );
      }
      if (!item.is_available) {
        return c.json(
          { success: false, error: { code: 'ITEM_UNAVAILABLE', message: `Item "${item.name}" is sold out or unavailable` } },
          400
        );
      }
      if (item.track_inventory && item.stock_quantity < reqItem.quantity) {
        return c.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_STOCK',
              message: `Item "${item.name}" has insufficient stock (available: ${item.stock_quantity})`,
            },
          },
          400
        );
      }
    }

    let calculatedTotal = 0;
    const orderItemsToInsert: any[] = [];

    for (const reqItem of payload.items) {
      const item = menuMap.get(reqItem.menu_item_id)!;
      const lineTotal = item.price * reqItem.quantity;
      calculatedTotal += lineTotal;

      orderItemsToInsert.push({
        menu_item_id: item.id,
        item_name: item.name,
        unit_price: item.price,
        quantity: reqItem.quantity,
        line_total: lineTotal,
      });
    }

    const datePrefix = `CAF-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `${datePrefix}${randomSuffix}`;

    const { data: createdOrder, error: orderErr } = await adminClient
      .from('orders')
      .insert({
        customer_id: user.id,
        order_number: orderNumber,
        order_status: 'pending',
        payment_status: 'unpaid',
        subtotal: calculatedTotal,
        total: calculatedTotal,
        idempotency_key: idempotencyKey,
      })
      .select('*')
      .single();

    if (orderErr || !createdOrder) {
      return c.json(
        { success: false, error: { code: 'ORDER_CREATION_FAILED', message: orderErr?.message || 'Failed to place order' } },
        500
      );
    }

    const itemsWithOrderId = orderItemsToInsert.map((i) => ({
      ...i,
      order_id: createdOrder.id,
    }));

    const { data: insertedItems, error: itemsErr } = await adminClient
      .from('order_items')
      .insert(itemsWithOrderId)
      .select('*');

    if (itemsErr) {
      await adminClient.from('orders').delete().eq('id', createdOrder.id);
      return c.json(
        { success: false, error: { code: 'ORDER_ITEMS_FAILED', message: 'Failed to record order items' } },
        500
      );
    }

    for (const reqItem of payload.items) {
      const item = menuMap.get(reqItem.menu_item_id)!;
      if (item.track_inventory) {
        const nextStock = Math.max(0, item.stock_quantity - reqItem.quantity);
        await adminClient
          .from('menu_items')
          .update({
            stock_quantity: nextStock,
            is_available: nextStock > 0 ? item.is_available : false,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        await adminClient.from('inventory_logs').insert({
          menu_item_id: item.id,
          quantity_change: -reqItem.quantity,
          reason: 'order_placed',
          order_id: createdOrder.id,
          actor_id: user.id,
        });
      }
    }

    return c.json(
      {
        success: true,
        data: {
          ...createdOrder,
          items: insertedItems || [],
          is_idempotent_replay: false,
        },
      },
      201
    );
  }
);

customerOrdersRouter.get('/me', async (c) => {
  const user = c.get('user');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: orders, error } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const formatted = (orders || []).map((o: any) => ({
    ...o,
    items: o.order_items || [],
  }));

  return c.json({ success: true, data: formatted });
});

customerOrdersRouter.get('/:id', async (c) => {
  const user = c.get('user');
  const orderId = c.req.param('id');
  const adminClient = getSupabaseAdminClient(c.env);

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

  if (order.customer_id !== user.id) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this order' } },
      403
    );
  }

  return c.json({
    success: true,
    data: {
      ...order,
      items: order.order_items || [],
    },
  });
});

customerOrdersRouter.post(
  '/:id/cancel',
  zValidator('json', OrderCancelSchema.optional()),
  async (c) => {
    const user = c.get('user');
    const orderId = c.req.param('id');
    const body = (c.req.valid('json' as never) || {}) as { reason?: string };
    const cancellationReason = body?.reason?.trim() || 'Customer requested cancellation';
    const adminClient = getSupabaseAdminClient(c.env);

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    try {
      const { data: rpcResult, error: rpcError } = await adminClient.rpc('cancel_order', {
        p_order_id: orderId,
        p_user_id: user.id,
        p_reason: cancellationReason,
      });

      if (!rpcError && rpcResult) {
        return c.json({ success: true, data: rpcResult });
      }

      if (rpcError) {
        const errMsg = rpcError.message || '';
        if (errMsg.includes('ERR_ALREADY_CANCELLED')) {
          return c.json(
            { success: false, error: { code: 'ALREADY_CANCELLED', message: 'Order is already cancelled' } },
            400
          );
        }
        if (errMsg.includes('ERR_ALREADY_COMPLETED')) {
          return c.json(
            { success: false, error: { code: 'ALREADY_COMPLETED', message: 'Completed orders cannot be cancelled' } },
            400
          );
        }
        if (errMsg.includes('ERR_CANNOT_CANCEL')) {
          return c.json(
            { success: false, error: { code: 'CANNOT_CANCEL', message: errMsg } },
            400
          );
        }
        if (errMsg.includes('ERR_UNAUTHORIZED')) {
          return c.json(
            { success: false, error: { code: 'FORBIDDEN', message: 'Unauthorized to cancel this order' } },
            403
          );
        }
      }
    } catch {}

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

    if (order.customer_id !== user.id) {
      return c.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this order' } },
        403
      );
    }

    if (order.order_status === 'cancelled') {
      return c.json(
        { success: false, error: { code: 'ALREADY_CANCELLED', message: 'Order is already cancelled' } },
        400
      );
    }

    if (order.order_status === 'completed') {
      return c.json(
        { success: false, error: { code: 'ALREADY_COMPLETED', message: 'Completed orders cannot be cancelled' } },
        400
      );
    }

    if (!['pending', 'confirmed'].includes(order.order_status)) {
      return c.json(
        {
          success: false,
          error: {
            code: 'CANNOT_CANCEL',
            message: `Orders in "${order.order_status}" status cannot be cancelled by customer`,
          },
        },
        400
      );
    }

    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update({
        order_status: 'cancelled',
        cancellation_reason: cancellationReason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('*')
      .single();

    if (updateErr) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
        500
      );
    }

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
              updated_at: new Date().toISOString(),
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

    return c.json({
      success: true,
      data: updatedOrder,
    });
  }
);
