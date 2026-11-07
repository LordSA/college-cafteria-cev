import type { Env } from '../types/env';

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayPaymentResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string;
  method: string;
  captured: boolean;
  email?: string;
  contact?: string;
  error_code?: string | null;
  error_description?: string | null;
}

export async function createHmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const bytes = new Uint8Array(signatureBuffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getBasicAuthHeader(keyId: string, keySecret: string): string {
  const credentials = `${keyId}:${keySecret}`;
  const encoded = btoa(credentials);
  return `Basic ${encoded}`;
}

export async function createRazorpayOrder(
  env: Env,
  params: {
    amountPaise: number;
    receipt: string;
    notes?: Record<string, string>;
  }
): Promise<RazorpayOrderResponse> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getBasicAuthHeader(keyId, keySecret),
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt.slice(0, 40),
      notes: params.notes || {},
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay order creation failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

export async function fetchRazorpayPayment(
  env: Env,
  paymentId: string
): Promise<RazorpayPaymentResponse> {
  const keyId = env.RAZORPAY_KEY_ID;
  const keySecret = env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: getBasicAuthHeader(keyId, keySecret),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay payment fetch failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as RazorpayPaymentResponse;
}

export async function verifyRazorpayCheckoutSignature(
  keySecret: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  providedSignature: string
): Promise<boolean> {
  const message = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedHex = await createHmacSha256Hex(keySecret, message);
  return constantTimeCompare(expectedHex.toLowerCase(), providedSignature.trim().toLowerCase());
}

export async function verifyRazorpayWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  providedSignature: string
): Promise<boolean> {
  const expectedHex = await createHmacSha256Hex(webhookSecret, rawBody);
  return constantTimeCompare(expectedHex.toLowerCase(), providedSignature.trim().toLowerCase());
}
