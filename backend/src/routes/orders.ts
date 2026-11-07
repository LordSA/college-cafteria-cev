import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpayCheckoutSignature,
} from '../lib/razorpay';

const OrderItemInputSchema = z.object({
  menu_item_id: z.string().uuid('Invalid menu item ID format'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 per item'),
});

const OrderCreateSchema = z.object({
  items: z.array(OrderItemInputSchema).min(1, 'At least one item is required'),
  idempotency_key: z.string().max(100).optional().nullable(),
  payment_method: z.enum(['razorpay', 'testing_wallet', 'counter_cash', 'pay_later']).optional().default('razorpay'),
});

const VerifyPaymentSchema = z.object({
  order_id: z.string().uuid('Invalid order ID'),
  razorpay_order_id: z.string().min(1, 'Razorpay order ID required'),
  razorpay_payment_id: z.string().min(1, 'Razorpay payment ID required'),
  razorpay_signature: z.string().min(1, 'Razorpay signature required'),
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
              razorpay_order_id: existingOrder.razorpay_order_id,
              razorpay_key_id: c.env?.RAZORPAY_KEY_ID || null,
              amount: existingOrder.total,
              currency: 'INR',
            },
          },
          200
        );
      }
    }

    const paymentMethod = payload.payment_method || (c.env?.RAZORPAY_KEY_ID ? 'razorpay' : 'testing_wallet');

    if (paymentMethod === 'pay_later') {
      const { data: prof } = await adminClient
        .from('profiles')
        .select('account_type, approved_account_type')
        .eq('id', user.id)
        .maybeSingle();

      const isFacultyStaff = ['faculty', 'staff'].includes(
        prof?.approved_account_type || prof?.account_type || ''
      );

      if (!isFacultyStaff) {
        return c.json(
          {
            success: false,
            error: {
              code: 'FORBIDDEN_PAY_LATER',
              message: 'Pay Later is exclusively available for verified faculty and staff.',
            },
          },
          403
        );
      }
    }

    if (paymentMethod === 'testing_wallet' && typeof adminClient.rpc === 'function') {
      try {
        const { data: rpcResult, error: rpcErr } = await adminClient.rpc('pay_order_with_wallet', {
          p_customer_id: user.id,
          p_items: payload.items,
          p_idempotency_key: idempotencyKey,
        });

        if (!rpcErr && rpcResult) {
          let items: any[] = [];
          if (typeof adminClient.from === 'function') {
            try {
              const { data: fetchedItems } = await adminClient
                .from('order_items')
                .select('*')
                .eq('order_id', rpcResult.id);
              items = fetchedItems || [];
            } catch {}
          }

          return c.json(
            {
              success: true,
              data: {
                ...rpcResult,
                items,
              },
            },
            rpcResult.is_idempotent_replay ? 200 : 201
          );
        }

        if (rpcErr) {
          const errMsg = rpcErr.message || '';
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
    } else if (paymentMethod === 'counter_cash' && typeof adminClient.rpc === 'function') {
      try {
        const { data: rpcResult, error: rpcErr } = await adminClient.rpc('place_order', {
          p_customer_id: user.id,
          p_items: payload.items,
          p_idempotency_key: idempotencyKey,
        });

        if (!rpcErr && rpcResult) {
          let items: any[] = [];
          if (typeof adminClient.from === 'function') {
            try {
              const { data: fetchedItems } = await adminClient
                .from('order_items')
                .select('*')
                .eq('order_id', rpcResult.id);
              items = fetchedItems || [];
            } catch {}
          }

          return c.json(
            {
              success: true,
              data: {
                ...rpcResult,
                items,
              },
            },
            rpcResult.is_idempotent_replay ? 200 : 201
          );
        }

        if (rpcErr) {
          const errMsg = rpcErr.message || '';
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

    let walletRecord: any = null;
    if (paymentMethod === 'testing_wallet') {
      const { data: wallet } = await adminClient
        .from('wallets')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle();

      const currentBalance = wallet ? wallet.balance : 0;
      if (currentBalance < calculatedTotal) {
        return c.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_FUNDS',
              message: `Wallet balance (₹${(currentBalance / 100).toFixed(2)}) is insufficient for total ₹${(calculatedTotal / 100).toFixed(2)}`,
            },
          },
          400
        );
      }
      walletRecord = wallet;
    }

    const datePrefix = `CAF-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-`;
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `${datePrefix}${randomSuffix}`;

    let razorpayOrderId: string | null = null;
    if (paymentMethod === 'razorpay') {
      try {
        const rzpOrder = await createRazorpayOrder(c.env, {
          amountPaise: calculatedTotal,
          receipt: orderNumber,
          notes: {
            customer_id: user.id,
            order_number: orderNumber,
          },
        });
        razorpayOrderId = rzpOrder.id;
      } catch (err: any) {
        return c.json(
          {
            success: false,
            error: {
              code: 'PAYMENT_GATEWAY_ERROR',
              message: err?.message || 'Failed to initialize payment gateway order',
            },
          },
          502
        );
      }
    }

    const isWalletPaid = paymentMethod === 'testing_wallet';
    const isPayLater = paymentMethod === 'pay_later';
    const generatesQr = isWalletPaid || isPayLater;
    const qrVerificationToken = generatesQr
      ? `CAF-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`
      : null;

    const { data: createdOrder, error: orderErr } = await adminClient
      .from('orders')
      .insert({
        customer_id: user.id,
        order_number: orderNumber,
        order_stage: 'ORDER_PLACED',
        order_status: (isWalletPaid || isPayLater) ? 'ORDER_PLACED' : 'pending',
        payment_status: isWalletPaid ? 'paid' : 'unpaid',
        payment_method: paymentMethod,
        paid_at: isWalletPaid ? new Date().toISOString() : null,
        qr_verification_token: qrVerificationToken,
        subtotal: calculatedTotal,
        total: calculatedTotal,
        idempotency_key: idempotencyKey,
        confirmed_at: (isWalletPaid || isPayLater) ? new Date().toISOString() : null,
        razorpay_order_id: razorpayOrderId,
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

    if (isWalletPaid && walletRecord) {
      const newBalance = walletRecord.balance - calculatedTotal;
      await adminClient
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', walletRecord.id);

      await adminClient.from('wallet_transactions').insert({
        wallet_id: walletRecord.id,
        customer_id: user.id,
        amount: calculatedTotal,
        transaction_type: 'debit',
        balance_after: newBalance,
        reason: `Order payment: ${orderNumber}`,
        order_id: createdOrder.id,
        actor_id: user.id,
      });
    }

    if (paymentMethod === 'razorpay' && razorpayOrderId) {
      await adminClient.from('payments').insert({
        order_id: createdOrder.id,
        provider: 'razorpay',
        amount: calculatedTotal,
        currency: 'INR',
        status: 'created',
        razorpay_order_id: razorpayOrderId,
      });
    }

    return c.json(
      {
        success: true,
        data: {
          ...createdOrder,
          items: insertedItems || [],
          is_idempotent_replay: false,
          razorpay_order_id: razorpayOrderId,
          razorpay_key_id: c.env?.RAZORPAY_KEY_ID || null,
          amount: calculatedTotal,
          currency: 'INR',
        },
      },
      201
    );
  }
);

customerOrdersRouter.post(
  '/verify-payment',
  zValidator('json', VerifyPaymentSchema),
  async (c) => {
    const user = c.get('user');
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = c.req.valid('json');
    const adminClient = getSupabaseAdminClient(c.env);

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    const { data: order, error: orderErr } = await adminClient
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', order_id)
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

    if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
      return c.json(
        { success: false, error: { code: 'INVALID_ORDER_LINKAGE', message: 'Payment does not correspond to this order' } },
        400
      );
    }

    if (order.payment_status === 'paid') {
      return c.json({
        success: true,
        data: {
          ...order,
          items: order.order_items || [],
          is_already_paid: true,
        },
      });
    }

    const keySecret = c.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return c.json(
        { success: false, error: { code: 'CONFIGURATION_ERROR', message: 'Payment secret unconfigured' } },
        500
      );
    }

    const isSignatureValid = await verifyRazorpayCheckoutSignature(
      keySecret,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isSignatureValid) {
      return c.json(
        { success: false, error: { code: 'INVALID_SIGNATURE', message: 'Payment signature verification failed' } },
        400
      );
    }

    let paymentDetails: any;
    try {
      paymentDetails = await fetchRazorpayPayment(c.env, razorpay_payment_id);
    } catch (err: any) {
      return c.json(
        { success: false, error: { code: 'PAYMENT_FETCH_FAILED', message: err?.message || 'Failed to verify payment status' } },
        502
      );
    }

    if (paymentDetails.order_id !== razorpay_order_id) {
      return c.json(
        { success: false, error: { code: 'ORDER_MISMATCH', message: 'Payment details mismatch with order' } },
        400
      );
    }

    if (!['captured', 'authorized'].includes(paymentDetails.status)) {
      return c.json(
        { success: false, error: { code: 'PAYMENT_NOT_CAPTURED', message: `Payment state is ${paymentDetails.status}` } },
        400
      );
    }

    const qrToken =
      order.qr_verification_token ||
      `CAF-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateErr } = await adminClient
      .from('orders')
      .update({
        payment_status: 'paid',
        order_stage: 'ORDER_PLACED',
        order_status: 'ORDER_PLACED',
        paid_at: now,
        confirmed_at: now,
        razorpay_order_id,
        razorpay_payment_id,
        qr_verification_token: qrToken,
        updated_at: now,
      })
      .eq('id', order.id)
      .select('*, order_items(*)')
      .single();

    if (updateErr) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
        500
      );
    }

    await adminClient
      .from('payments')
      .update({
        status: 'captured',
        razorpay_payment_id,
        payload: paymentDetails,
        updated_at: now,
      })
      .eq('razorpay_order_id', razorpay_order_id);

    return c.json({
      success: true,
      data: {
        ...updatedOrder,
        items: updatedOrder.order_items || [],
      },
    });
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
    order_stage: o.order_stage || (o.order_status === 'ready_for_pickup' || o.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : o.order_status === 'completed' || o.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED'),
    items: o.order_items || [],
  }));

  return c.json({ success: true, data: formatted });
});

customerOrdersRouter.get('/pay-later/pending', async (c) => {
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
    .select('id, order_number, total, created_at, payment_status, payment_method, order_stage, order_items(item_name, quantity, line_total)')
    .eq('customer_id', user.id)
    .eq('payment_method', 'pay_later')
    .in('payment_status', ['unpaid', 'pending'])
    .neq('order_status', 'cancelled')
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const pendingOrders = orders || [];
  const totalPending = pendingOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);

  return c.json({
    success: true,
    data: {
      total_pending: totalPending,
      order_count: pendingOrders.length,
      orders: pendingOrders,
    },
  });
});

customerOrdersRouter.post(
  '/pay-later/settle',
  zValidator(
    'json',
    z.object({
      settlement_method: z.enum(['wallet', 'upi']),
      upi_reference: z.string().max(100).optional().nullable(),
    })
  ),
  async (c) => {
    const user = c.get('user');
    const { settlement_method, upi_reference } = c.req.valid('json');
    const adminClient = getSupabaseAdminClient(c.env);

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    const { data: pendingOrders, error: fetchErr } = await adminClient
      .from('orders')
      .select('id, total')
      .eq('customer_id', user.id)
      .eq('payment_method', 'pay_later')
      .in('payment_status', ['unpaid', 'pending'])
      .neq('order_status', 'cancelled');

    if (fetchErr) {
      return c.json(
        { success: false, error: { code: 'QUERY_FAILED', message: fetchErr.message } },
        500
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return c.json(
        { success: false, error: { code: 'NO_PENDING_DUES', message: 'No outstanding Pay Later dues found' } },
        400
      );
    }

    const totalToSettle = pendingOrders.reduce((acc, o: any) => acc + (o.total || 0), 0);
    const orderIds = pendingOrders.map((o: any) => o.id);

    if (settlement_method === 'wallet') {
      const { data: wallet, error: walletErr } = await adminClient
        .from('wallets')
        .select('*')
        .eq('customer_id', user.id)
        .maybeSingle();

      if (walletErr || !wallet || wallet.balance < totalToSettle) {
        return c.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_FUNDS',
              message: `Insufficient wallet balance to clear dues (Balance: ₹${((wallet?.balance || 0) / 100).toFixed(0)}, Required: ₹${(totalToSettle / 100).toFixed(0)})`,
            },
          },
          400
        );
      }

      const nextBalance = wallet.balance - totalToSettle;
      await adminClient
        .from('wallets')
        .update({ balance: nextBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      await adminClient.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        customer_id: user.id,
        amount: totalToSettle,
        transaction_type: 'debit',
        balance_after: nextBalance,
        reason: `Settlement of ${pendingOrders.length} Pay Later orders`,
      });
    }

    const now = new Date().toISOString();
    const { error: updateErr } = await adminClient
      .from('orders')
      .update({
        payment_status: 'paid',
        paid_at: now,
        pay_later_settled_at: now,
        pay_later_settled_via: settlement_method === 'upi' ? `upi:${upi_reference || 'simulated'}` : 'wallet',
        updated_at: now,
      })
      .in('id', orderIds);

    if (updateErr) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        settled_orders_count: pendingOrders.length,
        total_settled: totalToSettle,
        settlement_method,
        settled_at: now,
      },
    });
  }
);

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
      order_stage: order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED'),
      items: order.order_items || [],
    },
  });
});

customerOrdersRouter.get('/:id/receipt', async (c) => {
  const user = c.get('user');
  const profile = c.get('profile');
  const orderId = c.req.param('id');
  const adminClient = getSupabaseAdminClient(c.env);

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

  if (order.customer_id !== user.id && !['developer', 'admin', 'retail'].includes(profile.app_role)) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Access denied: You do not own this order' } },
      403
    );
  }

  return c.json({
    success: true,
    data: {
      id: order.id,
      order_number: order.order_number,
      created_at: order.created_at,
      paid_at: order.paid_at,
      payment_method: order.payment_method || 'razorpay',
      payment_status: order.payment_status,
      order_stage: order.order_stage || (order.order_status === 'ready_for_pickup' || order.order_status === 'READY_TO_PICK' ? 'READY_TO_PICK' : order.order_status === 'completed' || order.order_status === 'COLLECTED' ? 'COLLECTED' : 'ORDER_PLACED'),
      order_status: order.order_status,
      subtotal: order.subtotal,
      total: order.total,
      qr_verification_token: order.qr_verification_token,
      collected_at: order.collected_at,
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: order.razorpay_payment_id,
      customer: {
        id: user.id,
        display_name: profile.display_name || 'Customer',
        email: user.email,
        account_type: profile.account_type || 'student',
      },
      items: order.order_items || [],
      canteen: {
        name: 'Cafteria College Canteen',
        campus: 'Campus Main Facility',
        address: 'Student Centre, Food Court Level 1',
        notice: 'Official Cafteria Receipt.',
      },
    },
  });
});
