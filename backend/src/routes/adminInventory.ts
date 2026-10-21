import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

const InventoryUpdateSchema = z.object({
  stock_quantity: z.number().int().min(0, 'Stock quantity cannot be negative').optional(),
  low_stock_threshold: z.number().int().min(0, 'Low-stock threshold cannot be negative').optional(),
  track_inventory: z.boolean().optional(),
  is_available: z.boolean().optional(),
});

export const adminInventoryRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminInventoryRouter.use('*', requireAuth);
adminInventoryRouter.use('*', requireAdmin);

adminInventoryRouter.get('/', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const lowStockOnly = c.req.query('low_stock_only') === 'true';
  const search = c.req.query('search')?.trim();

  let query = adminClient
    .from('menu_items')
    .select('*, categories(name)')
    .eq('is_archived', false)
    .order('name', { ascending: true });

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const { data: items, error } = await query;

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  let formatted = (items || []).map((item: any) => {
    const trackInventory = Boolean(item.track_inventory);
    const stockQuantity = Number(item.stock_quantity ?? 0);
    const lowStockThreshold = Number(item.low_stock_threshold ?? 5);
    const isLowStock = trackInventory && stockQuantity <= lowStockThreshold;

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category_id: item.category_id,
      category_name: item.categories?.name,
      is_available: item.is_available,
      track_inventory: trackInventory,
      stock_quantity: stockQuantity,
      low_stock_threshold: lowStockThreshold,
      is_low_stock: isLowStock,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });

  if (lowStockOnly) {
    formatted = formatted.filter((i: any) => i.is_low_stock);
  }

  return c.json({
    success: true,
    data: formatted,
  });
});

adminInventoryRouter.patch(
  '/:menuItemId',
  zValidator('json', InventoryUpdateSchema),
  async (c) => {
    const adminClient = getSupabaseAdminClient(c.env);
    const user = c.get('user');
    const menuItemId = c.req.param('menuItemId');
    const payload = c.req.valid('json');

    if (!adminClient) {
      return c.json(
        { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
        500
      );
    }

    const { data: item, error: fetchErr } = await adminClient
      .from('menu_items')
      .select('*')
      .eq('id', menuItemId)
      .maybeSingle();

    if (fetchErr || !item) {
      return c.json(
        { success: false, error: { code: 'ITEM_NOT_FOUND', message: 'Menu item not found' } },
        404
      );
    }

    const nextTrack = payload.track_inventory !== undefined ? payload.track_inventory : item.track_inventory;
    const nextStock = payload.stock_quantity !== undefined ? payload.stock_quantity : item.stock_quantity;
    const nextThreshold = payload.low_stock_threshold !== undefined ? payload.low_stock_threshold : item.low_stock_threshold;
    let nextAvailable = payload.is_available !== undefined ? payload.is_available : item.is_available;

    if (nextTrack && nextStock === 0 && payload.is_available === undefined) {
      nextAvailable = false;
    }

    const qtyChange = nextStock - item.stock_quantity;

    const { data: updatedItem, error: updateErr } = await adminClient
      .from('menu_items')
      .update({
        track_inventory: nextTrack,
        stock_quantity: nextStock,
        low_stock_threshold: nextThreshold,
        is_available: nextAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', menuItemId)
      .select('*, categories(name)')
      .single();

    if (updateErr) {
      return c.json(
        { success: false, error: { code: 'UPDATE_FAILED', message: updateErr.message } },
        500
      );
    }

    if (qtyChange !== 0) {
      await adminClient.from('inventory_logs').insert({
        menu_item_id: menuItemId,
        quantity_change: qtyChange,
        reason: 'manual_adjustment',
        actor_id: user.id,
      });
    }

    const isLowStock = nextTrack && nextStock <= nextThreshold;

    return c.json({
      success: true,
      data: {
        id: updatedItem.id,
        name: updatedItem.name,
        price: updatedItem.price,
        category_id: updatedItem.category_id,
        category_name: updatedItem.categories?.name,
        is_available: updatedItem.is_available,
        track_inventory: updatedItem.track_inventory,
        stock_quantity: updatedItem.stock_quantity,
        low_stock_threshold: updatedItem.low_stock_threshold,
        is_low_stock: isLowStock,
        updated_at: updatedItem.updated_at,
      },
    });
  }
);
