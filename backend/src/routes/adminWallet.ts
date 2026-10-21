import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const WalletAdjustSchema = z.object({
  amount: z.number().int().min(1, 'Amount must be at least 1 paisa'),
  transaction_type: z.enum(['credit', 'debit']),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(300, 'Reason too long'),
});

export const adminWalletRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminWalletRouter.use('*', requireAuth);
adminWalletRouter.use('*', requireAdmin);

adminWalletRouter.get('/', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const search = c.req.query('search')?.trim();
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '50', 10), 1), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

  let query = adminClient
    .from('wallets')
    .select('*, profiles:customer_id(display_name, account_type)')
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data: wallets, error } = await query;

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  let formatted = (wallets || []).map((w: any) => ({
    id: w.id,
    customer_id: w.customer_id,
    balance: w.balance,
    formatted_balance: `₹${(w.balance / 100).toFixed(2)}`,
    customer_name: w.profiles?.display_name || 'Customer',
    customer_account_type: w.profiles?.account_type || 'student',
    created_at: w.created_at,
    updated_at: w.updated_at,
  }));

  if (search) {
    const s = search.toLowerCase();
    formatted = formatted.filter(
      (w: any) =>
        w.customer_name.toLowerCase().includes(s) ||
        w.customer_id.toLowerCase().includes(s)
    );
  }

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

adminWalletRouter.get('/:customerId', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const customerId = c.req.param('customerId');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  let { data: wallet } = await adminClient
    .from('wallets')
    .select('*, profiles:customer_id(display_name, account_type)')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (!wallet) {
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name, account_type')
      .eq('id', customerId)
      .maybeSingle();

    if (!profile) {
      return c.json(
        { success: false, error: { code: 'CUSTOMER_NOT_FOUND', message: 'Customer not found' } },
        404
      );
    }

    const { data: created } = await adminClient
      .from('wallets')
      .insert({ customer_id: customerId, balance: 0 })
      .select('*')
      .single();

    wallet = {
      ...created,
      profiles: profile,
    };
  }

  const { data: transactions } = await adminClient
    .from('wallet_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(20);

  return c.json({
    success: true,
    data: {
      id: wallet.id,
      customer_id: wallet.customer_id,
      balance: wallet.balance,
      formatted_balance: `₹${(wallet.balance / 100).toFixed(2)}`,
      customer_name: wallet.profiles?.display_name || 'Customer',
      customer_account_type: wallet.profiles?.account_type || 'student',
      created_at: wallet.created_at,
      updated_at: wallet.updated_at,
      transactions: transactions || [],
    },
  });
});

adminWalletRouter.post(
  '/:customerId/adjust',
  zValidator('json', WalletAdjustSchema),
  async (c) => {
    const adminClient = getSupabaseAdminClient(c.env);
    const customerId = c.req.param('customerId');
    const adminUser = c.get('user');
    const payload = c.req.valid('json');

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    try {
      const { data: rpcResult, error: rpcErr } = await adminClient.rpc('adjust_wallet_balance', {
        p_customer_id: customerId,
        p_amount: payload.amount,
        p_type: payload.transaction_type,
        p_reason: payload.reason,
        p_actor_id: adminUser.id,
      });

      if (!rpcErr && rpcResult) {
        return c.json({
          success: true,
          data: {
            ...rpcResult,
            formatted_balance: `₹${(rpcResult.new_balance / 100).toFixed(2)}`,
          },
        });
      }

      if (rpcErr) {
        const errMsg = rpcErr.message || '';
        if (errMsg.includes('ERR_INSUFFICIENT_FUNDS')) {
          return c.json(
            { success: false, error: { code: 'INSUFFICIENT_FUNDS', message: errMsg } },
            400
          );
        }
        if (errMsg.includes('ERR_INVALID_AMOUNT') || errMsg.includes('ERR_REASON_REQUIRED')) {
          return c.json(
            { success: false, error: { code: 'INVALID_INPUT', message: errMsg } },
            400
          );
        }
      }
    } catch {}

    let { data: wallet } = await adminClient
      .from('wallets')
      .select('*')
      .eq('customer_id', customerId)
      .maybeSingle();

    if (!wallet) {
      const { data: created } = await adminClient
        .from('wallets')
        .insert({ customer_id: customerId, balance: 0 })
        .select('*')
        .single();
      wallet = created;
    }

    const currentBalance = wallet ? wallet.balance : 0;
    let newBalance = currentBalance;

    if (payload.transaction_type === 'credit') {
      newBalance = currentBalance + payload.amount;
    } else {
      if (currentBalance < payload.amount) {
        return c.json(
          {
            success: false,
            error: {
              code: 'INSUFFICIENT_FUNDS',
              message: `Wallet balance (₹${(currentBalance / 100).toFixed(2)}) is insufficient for debit of ₹${(payload.amount / 100).toFixed(2)}`,
            },
          },
          400
        );
      }
      newBalance = currentBalance - payload.amount;
    }

    const { error: updateErr } = await adminClient
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('customer_id', customerId);

    if (updateErr) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
        500
      );
    }

    const { data: tx, error: txErr } = await adminClient
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        customer_id: customerId,
        amount: payload.amount,
        transaction_type: payload.transaction_type,
        balance_after: newBalance,
        reason: payload.reason,
        actor_id: adminUser.id,
      })
      .select('*')
      .single();

    if (txErr) {
      return c.json(
        { success: false, error: { code: 'TRANSACTION_FAILED', message: txErr.message } },
        500
      );
    }

    return c.json({
      success: true,
      data: {
        wallet_id: wallet.id,
        customer_id: customerId,
        previous_balance: currentBalance,
        new_balance: newBalance,
        formatted_balance: `₹${(newBalance / 100).toFixed(2)}`,
        amount: payload.amount,
        transaction_type: payload.transaction_type,
        transaction_id: tx?.id,
        reason: payload.reason,
        adjusted_at: new Date().toISOString(),
      },
    });
  }
);
