import { Hono } from 'hono';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

export const customerWalletRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

customerWalletRouter.use('*', requireAuth);

customerWalletRouter.get('/me', async (c) => {
  const user = c.get('user');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  try {
    const { data: rpcWallet, error: rpcErr } = await adminClient.rpc('get_or_create_wallet', {
      p_customer_id: user.id,
    });

    if (!rpcErr && rpcWallet) {
      return c.json({
        success: true,
        data: {
          ...rpcWallet,
          formatted_balance: `₹${(rpcWallet.balance / 100).toFixed(2)}`,
        },
      });
    }
  } catch {}

  const { data: existing, error: selectErr } = await adminClient
    .from('wallets')
    .select('*')
    .eq('customer_id', user.id)
    .maybeSingle();

  if (selectErr) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: selectErr.message } },
      500
    );
  }

  if (existing) {
    return c.json({
      success: true,
      data: {
        ...existing,
        formatted_balance: `₹${(existing.balance / 100).toFixed(2)}`,
      },
    });
  }

  const { data: created, error: insertErr } = await adminClient
    .from('wallets')
    .insert({
      customer_id: user.id,
      balance: 0,
    })
    .select('*')
    .single();

  if (insertErr || !created) {
    return c.json(
      { success: false, error: { code: 'INSERT_FAILED', message: insertErr?.message || 'Failed to create wallet' } },
      500
    );
  }

  return c.json({
    success: true,
    data: {
      ...created,
      formatted_balance: `₹${(created.balance / 100).toFixed(2)}`,
    },
  });
});

customerWalletRouter.get('/transactions', async (c) => {
  const user = c.get('user');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

  const { data: txs, error } = await adminClient
    .from('wallet_transactions')
    .select('*')
    .eq('customer_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  return c.json({
    success: true,
    data: txs || [],
    pagination: {
      limit,
      offset,
      count: (txs || []).length,
    },
  });
});
