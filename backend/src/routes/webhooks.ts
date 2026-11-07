import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { getSupabaseAdminClient } from '../lib/supabase';
import { verifyRazorpayWebhookSignature } from '../lib/razorpay';

export const webhooksRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

webhooksRouter.post('/razorpay', async (c) => {
  const signature = c.req.header('x-razorpay-signature');
  const secret = c.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    return c.json(
      { success: false, error: { code: 'CONFIGURATION_ERROR', message: 'Webhook secret not configured' } },
      500
    );
  }

  if (!signature) {
    return c.json(
      { success: false, error: { code: 'MISSING_SIGNATURE', message: 'Missing x-razorpay-signature header' } },
      400
    );
  }

  const rawBody = await c.req.text();

  const isValid = await verifyRazorpayWebhookSignature(secret, rawBody, signature);
  if (!isValid) {
    return c.json(
      { success: false, error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' } },
      400
    );
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return c.json(
      { success: false, error: { code: 'INVALID_JSON', message: 'Invalid JSON payload' } },
      400
    );
  }

  const eventId = (event.event_id || event.id || `${event.event}_${Date.now()}`) as string;
  const eventType = event.event as string;
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database client unconfigured' } },
      500
    );
  }

  const { data: existingEvent } = await adminClient
    .from('payment_webhook_events')
    .select('id, processing_status')
    .eq('event_id', eventId)
    .maybeSingle();

  if (existingEvent && existingEvent.processing_status === 'processed') {
    return c.json({ success: true, message: 'Event already processed' }, 200);
  }

  if (!existingEvent) {
    await adminClient.from('payment_webhook_events').insert({
      event_id: eventId,
      provider: 'razorpay',
      event_type: eventType,
      payload: event,
      processing_status: 'processing',
    });
  }

  try {
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        const { data: order } = await adminClient
          .from('orders')
          .select('id, payment_status, qr_verification_token')
          .eq('razorpay_order_id', razorpayOrderId)
          .maybeSingle();

        if (order) {
          const qrToken =
            order.qr_verification_token ||
            `CAF-QR-${Math.random().toString(36).substring(2, 8).toUpperCase()}${Date.now().toString(36).slice(-4).toUpperCase()}`;

          const now = new Date().toISOString();

          await adminClient
            .from('orders')
            .update({
              payment_status: 'paid',
              order_stage: 'ORDER_PLACED',
              order_status: 'ORDER_PLACED',
              paid_at: now,
              confirmed_at: now,
              razorpay_payment_id: razorpayPaymentId,
              qr_verification_token: qrToken,
              updated_at: now,
            })
            .eq('id', order.id);

          await adminClient
            .from('payments')
            .update({
              status: 'captured',
              razorpay_payment_id: razorpayPaymentId,
              payload: paymentEntity || event.payload,
              updated_at: now,
            })
            .eq('razorpay_order_id', razorpayOrderId);
        }
      }
    } else if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const razorpayOrderId = paymentEntity?.order_id;
      const razorpayPaymentId = paymentEntity?.id;

      if (razorpayOrderId) {
        await adminClient
          .from('payments')
          .update({
            status: 'failed',
            razorpay_payment_id: razorpayPaymentId,
            payload: paymentEntity,
            updated_at: new Date().toISOString(),
          })
          .eq('razorpay_order_id', razorpayOrderId);
      }
    }

    await adminClient
      .from('payment_webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('event_id', eventId);

    return c.json({ success: true, processed: true }, 200);
  } catch (err: any) {
    await adminClient
      .from('payment_webhook_events')
      .update({
        processing_status: 'failed',
        error_message: err?.message || 'Processing failed',
      })
      .eq('event_id', eventId);

    return c.json(
      { success: false, error: { code: 'PROCESSING_ERROR', message: err?.message || 'Webhook failed' } },
      500
    );
  }
});
