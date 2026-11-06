import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { getSupabaseAdminClient, verifySupabaseToken } from '../lib/supabase';

const LockSchema = z.object({
  menu_item_id: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(50, 'Max 50 items'),
  session_id: z.string().optional().nullable(),
});

const UnlockSchema = z.object({
  menu_item_id: z.string().uuid('Invalid menu item ID'),
  session_id: z.string().optional().nullable(),
});

const ReleaseAllSchema = z.object({
  session_id: z.string().optional().nullable(),
});

export const cartRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

async function resolveUserOrSession(c: any): Promise<{ userId: string | null; sessionId: string | null }> {
  const authHeader = c.req.header('Authorization');
  let userId: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) {
      try {
        const verifyRes = await verifySupabaseToken(token, c.env);
        if (verifyRes.success && verifyRes.user) {
          userId = verifyRes.user.id;
        }
      } catch {}
    }
  }

  return { userId, sessionId: null };
}

cartRouter.post('/lock', zValidator('json', LockSchema), async (c) => {
  const payload = c.req.valid('json');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { userId } = await resolveUserOrSession(c);
  const effectiveSessionId = userId ? null : payload.session_id?.trim() || null;

  if (!userId && !effectiveSessionId) {
    return c.json(
      { success: false, error: { code: 'MISSING_IDENTIFIER', message: 'Session ID or authentication required' } },
      400
    );
  }

  try {
    const { data, error } = await adminClient.rpc('lock_cart_item', {
      p_menu_item_id: payload.menu_item_id,
      p_quantity: payload.quantity,
      p_user_id: userId,
      p_session_id: effectiveSessionId,
    });

    if (error) {
      const errMsg = error.message || '';
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
      return c.json(
        { success: false, error: { code: 'LOCK_FAILED', message: errMsg } },
        400
      );
    }

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'LOCK_ERROR', message: err.message || 'Failed to lock item' } },
      500
    );
  }
});

cartRouter.post('/unlock', zValidator('json', UnlockSchema), async (c) => {
  const payload = c.req.valid('json');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { userId } = await resolveUserOrSession(c);
  const effectiveSessionId = userId ? null : payload.session_id?.trim() || null;

  try {
    const { data, error } = await adminClient.rpc('release_cart_locks', {
      p_user_id: userId,
      p_session_id: effectiveSessionId,
      p_menu_item_id: payload.menu_item_id,
    });

    if (error) {
      return c.json(
        { success: false, error: { code: 'UNLOCK_FAILED', message: error.message } },
        400
      );
    }

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'UNLOCK_ERROR', message: err.message || 'Failed to unlock item' } },
      500
    );
  }
});

cartRouter.post('/release-all', zValidator('json', ReleaseAllSchema), async (c) => {
  const payload = c.req.valid('json');
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { userId } = await resolveUserOrSession(c);
  const effectiveSessionId = userId ? null : payload.session_id?.trim() || null;

  try {
    const { data, error } = await adminClient.rpc('release_cart_locks', {
      p_user_id: userId,
      p_session_id: effectiveSessionId,
      p_menu_item_id: null,
    });

    if (error) {
      return c.json(
        { success: false, error: { code: 'RELEASE_FAILED', message: error.message } },
        400
      );
    }

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json(
      { success: false, error: { code: 'RELEASE_ERROR', message: err.message || 'Failed to release locks' } },
      500
    );
  }
});

cartRouter.get('/status', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  try {
    await adminClient.rpc('cleanup_expired_cart_locks');
  } catch {}

  const { userId } = await resolveUserOrSession(c);
  const sessionId = c.req.query('session_id')?.trim() || null;

  if (!userId && !sessionId) {
    return c.json({ success: true, data: { locks: [], count: 0 } });
  }

  let query = adminClient.from('cart_item_locks').select('*').gt('expires_at', new Date().toISOString());

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data: locks } = await query;

  return c.json({
    success: true,
    data: {
      locks: locks || [],
      count: (locks || []).reduce((acc: number, l: any) => acc + (l.quantity || 0), 0),
    },
  });
});
