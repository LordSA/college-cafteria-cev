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
  const credentials = `${keyId.trim()}:${keySecret.trim()}`;
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
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();

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
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();

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

export interface RazorpayPaymentItem {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id?: string | null;
  invoice_id?: string | null;
  international?: boolean;
  method: string;
  amount_refunded?: number;
  refund_status?: string | null;
  captured?: boolean;
  description?: string | null;
  card_id?: string | null;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  fee?: number;
  tax?: number;
  error_code?: string | null;
  error_description?: string | null;
  created_at: number;
}

export interface RazorpayPaymentListResponse {
  entity: string;
  count: number;
  items: RazorpayPaymentItem[];
}

export async function fetchRazorpayPayments(
  env: Env,
  options?: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }
): Promise<RazorpayPaymentListResponse> {
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  const queryParams = new URLSearchParams();
  if (options?.from !== undefined) queryParams.set('from', options.from.toString());
  if (options?.to !== undefined) queryParams.set('to', options.to.toString());
  if (options?.count !== undefined) queryParams.set('count', Math.min(100, options.count).toString());
  if (options?.skip !== undefined) queryParams.set('skip', options.skip.toString());

  const qs = queryParams.toString();
  const url = `https://api.razorpay.com/v1/payments${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getBasicAuthHeader(keyId, keySecret),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay payments list failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as RazorpayPaymentListResponse;
}

export interface RazorpaySettlementItem {
  id: string;
  entity: string;
  amount: number;
  status: string;
  fees: number;
  tax: number;
  utr?: string | null;
  created_at: number;
}

export interface RazorpaySettlementListResponse {
  entity: string;
  count: number;
  items: RazorpaySettlementItem[];
}

export async function fetchRazorpaySettlements(
  env: Env,
  options?: {
    from?: number;
    to?: number;
    count?: number;
    skip?: number;
  }
): Promise<RazorpaySettlementListResponse> {
  const keyId = env.RAZORPAY_KEY_ID?.trim();
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim();

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  const queryParams = new URLSearchParams();
  if (options?.from !== undefined) queryParams.set('from', options.from.toString());
  if (options?.to !== undefined) queryParams.set('to', options.to.toString());
  if (options?.count !== undefined) queryParams.set('count', Math.min(100, options.count).toString());
  if (options?.skip !== undefined) queryParams.set('skip', options.skip.toString());

  const qs = queryParams.toString();
  const url = `https://api.razorpay.com/v1/settlements${qs ? `?${qs}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: getBasicAuthHeader(keyId, keySecret),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Razorpay settlements list failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as RazorpaySettlementListResponse;
}

export async function verifyRazorpayWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  providedSignature: string
): Promise<boolean> {
  const expectedHex = await createHmacSha256Hex(webhookSecret, rawBody);
  return constantTimeCompare(expectedHex.toLowerCase(), providedSignature.trim().toLowerCase());
}

