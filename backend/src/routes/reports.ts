import { Hono } from 'hono';
import * as XLSX from 'xlsx';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';
import { fetchRazorpayPayments, fetchRazorpaySettlements } from '../lib/razorpay';

export const adminReportsRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminReportsRouter.use('*', requireAuth);
adminReportsRouter.use('*', requireRole(['developer', 'admin']));

function formatKolkataDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '—';
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateInput);
  }
}

function getDateRangeBounds(range: string, from?: string, to?: string): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = to ? new Date(to) : new Date(now);

  let startDate: Date;
  if (range === 'daily') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  } else if (range === 'weekly') {
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === 'monthly') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  } else if (range === 'yearly') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
  } else if (range === 'custom' && from) {
    startDate = new Date(from);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  }

  return { startDate, endDate };
}

adminReportsRouter.get('/stats', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const range = c.req.query('range') || 'monthly';
  const from = c.req.query('from');
  const to = c.req.query('to');
  const { startDate, endDate } = getDateRangeBounds(range, from, to);

  const now = new Date();

  const [ordersRes, teachersRes] = await Promise.all([
    adminClient
      .from('orders')
      .select('id, order_number, total, payment_status, payment_method, order_stage, order_status, created_at, paid_at, customer_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString()),
    adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('account_type', 'staff_t'),
  ]);

  if (ordersRes.error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: ordersRes.error.message } },
      500
    );
  }

  const orderList = ordersRes.data || [];
  const paidOrders = orderList.filter((o: any) => o.payment_status === 'paid');
  const totalRevenuePaise = paidOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
  const totalOrders = orderList.length;
  const collectedOrders = orderList.filter((o: any) => o.order_stage === 'COLLECTED' || o.order_status === 'completed').length;
  const placedOrders = orderList.filter((o: any) => o.order_stage !== 'COLLECTED' && o.order_status !== 'completed').length;

  const uniqueCustomers = new Set(orderList.map((o: any) => o.customer_id).filter(Boolean)).size;
  const avgOrderValuePaise = paidOrders.length > 0 ? Math.round(totalRevenuePaise / paidOrders.length) : 0;

  const razorpayPaise = paidOrders
    .filter((o: any) => o.payment_method === 'razorpay')
    .reduce((sum, o: any) => sum + (o.total || 0), 0);
  const payLaterPaise = orderList
    .filter((o: any) => o.payment_method === 'pay_later')
    .reduce((sum, o: any) => sum + (o.total || 0), 0);

  const paymentBreakdown = {
    razorpay: orderList.filter((o: any) => o.payment_method === 'razorpay').length,
    wallet: 0,
    pay_later: orderList.filter((o: any) => o.payment_method === 'pay_later').length,
    counter_cash: orderList.filter((o: any) => o.payment_method === 'counter_cash').length,
    razorpayPaise,
    walletPaise: 0,
    payLaterPaise,
  };

  const chartData: Array<{ label: string; date: string; totalRevenue: number; razorpayRevenue: number; orderCount: number }> = [];

  if (range === 'daily') {
    const hours: number[] = [8, 10, 12, 14, 16, 18, 20, 22];
    for (let i = 0; i < hours.length; i++) {
      const h = hours[i]!;
      const nextH = (i < hours.length - 1 ? hours[i + 1] : 24)!;
      const bOrders = paidOrders.filter((o: any) => {
        const d = new Date(o.created_at);
        const kolkataHour = (d.getUTCHours() + 5 + Math.floor((d.getUTCMinutes() + 30) / 60)) % 24;
        return kolkataHour >= h && kolkataHour < nextH;
      });
      const bTotal = bOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
      const bRazor = bOrders.filter((o: any) => o.payment_method === 'razorpay').reduce((sum, o: any) => sum + (o.total || 0), 0);
      chartData.push({
        label: `${h > 12 ? h - 12 : h}${h >= 12 ? 'pm' : 'am'}`,
        date: `${h}:00`,
        totalRevenue: Math.round(bTotal / 100),
        razorpayRevenue: Math.round(bRazor / 100),
        orderCount: bOrders.length,
      });
    }
  } else if (range === 'weekly') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toDateString();
      const bOrders = paidOrders.filter((o: any) => new Date(o.created_at).toDateString() === dStr);
      const bTotal = bOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
      const bRazor = bOrders.filter((o: any) => o.payment_method === 'razorpay').reduce((sum, o: any) => sum + (o.total || 0), 0);
      chartData.push({
        label: dayNames[d.getDay()] || 'Day',
        date: d.toISOString().slice(5, 10),
        totalRevenue: Math.round(bTotal / 100),
        razorpayRevenue: Math.round(bRazor / 100),
        orderCount: bOrders.length,
      });
    }
  } else {
    for (let w = 4; w >= 1; w--) {
      const wEnd = new Date(now.getTime() - (w - 1) * 7 * 24 * 60 * 60 * 1000);
      const wStart = new Date(wEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
      const bOrders = paidOrders.filter((o: any) => {
        const t = new Date(o.created_at).getTime();
        return t >= wStart.getTime() && t <= wEnd.getTime();
      });
      const bTotal = bOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
      const bRazor = bOrders.filter((o: any) => o.payment_method === 'razorpay').reduce((sum, o: any) => sum + (o.total || 0), 0);
      chartData.push({
        label: `Wk ${5 - w}`,
        date: wStart.toISOString().slice(5, 10),
        totalRevenue: Math.round(bTotal / 100),
        razorpayRevenue: Math.round(bRazor / 100),
        orderCount: bOrders.length,
      });
    }
  }

  const isRazorpayConfigured = Boolean(c.env?.RAZORPAY_KEY_ID && c.env?.RAZORPAY_KEY_SECRET);
  let todayRazorpayItems: any[] = [];
  let todayRazorpayTotalPaise = 0;

  if (isRazorpayConfigured) {
    try {
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istNow = new Date(now.getTime() + istOffsetMs);
      const istTodayStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0));
      const todayStartUtcSeconds = Math.floor((istTodayStart.getTime() - istOffsetMs) / 1000);

      const rzpData = await fetchRazorpayPayments(c.env, { from: todayStartUtcSeconds, count: 50 });
      todayRazorpayItems = (rzpData.items || []).map((p) => ({
        id: p.id,
        order_number: p.notes?.order_number || (p.order_id ? p.order_id.replace(/^order_/, '') : p.id),
        customer_name: p.notes?.customer_name || (p.email ? p.email.split('@')[0] : null) || p.contact || 'Razorpay Payer',
        customer_email: p.email || null,
        customer_contact: p.contact || null,
        amount: p.amount,
        payment_method: 'razorpay',
        method_detail: p.vpa ? `UPI (${p.vpa})` : (p.method || 'Razorpay').toUpperCase(),
        payment_status: p.status,
        created_at: new Date(p.created_at * 1000).toISOString(),
        paid_at: p.status === 'captured' ? new Date(p.created_at * 1000).toISOString() : undefined,
        source: 'razorpay_gateway',
      }));

      todayRazorpayTotalPaise = todayRazorpayItems
        .filter((p) => p.payment_status === 'captured')
        .reduce((sum, p) => sum + p.amount, 0);
    } catch {}
  }

  return c.json({
    success: true,
    data: {
      range,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      total_revenue_inr: (totalRevenuePaise / 100).toFixed(2),
      total_revenue_paise: totalRevenuePaise,
      total_orders: totalOrders,
      paid_orders: paidOrders.length,
      collected_orders: collectedOrders,
      placed_orders: placedOrders,
      unique_customers: uniqueCustomers,
      average_order_value_inr: (avgOrderValuePaise / 100).toFixed(2),
      payment_breakdown: paymentBreakdown,
      chart_data: chartData,
      today_payments: todayRazorpayItems,
      today_razorpay_total_paise: todayRazorpayTotalPaise,
      today_razorpay_total_inr: (todayRazorpayTotalPaise / 100).toFixed(2),
      razorpay_configured: isRazorpayConfigured,
      teachers_count: teachersRes.count || 0,
    },
  });
});

adminReportsRouter.get('/razorpay-payments', async (c) => {
  const isConfigured = Boolean(c.env?.RAZORPAY_KEY_ID && c.env?.RAZORPAY_KEY_SECRET);
  if (!isConfigured) {
    return c.json({
      success: true,
      data: {
        configured: false,
        message: 'Razorpay credentials not configured in backend environment',
        count: 0,
        total_captured_paise: 0,
        total_captured_inr: '0.00',
        items: [],
      },
    });
  }

  const range = c.req.query('range') || 'today';
  const count = Math.min(100, Math.max(1, parseInt(c.req.query('count') || '50', 10)));
  const skip = Math.max(0, parseInt(c.req.query('skip') || '0', 10));

  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffsetMs);
  const istTodayStart = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), 0, 0, 0));
  const todayStartUtcSeconds = Math.floor((istTodayStart.getTime() - istOffsetMs) / 1000);

  try {
    const options: { from?: number; to?: number; count?: number; skip?: number } = {
      count,
      skip,
    };
    if (range === 'today') {
      options.from = todayStartUtcSeconds;
    }

    const rzpRes = await fetchRazorpayPayments(c.env, options);

    const items = rzpRes.items.map((p) => ({
      id: p.id,
      order_id: p.order_id || null,
      order_number: p.notes?.order_number || null,
      amount: p.amount,
      amount_inr: (p.amount / 100).toFixed(2),
      currency: p.currency,
      status: p.status,
      method: p.method,
      vpa: p.vpa || null,
      bank: p.bank || null,
      wallet: p.wallet || null,
      email: p.email || null,
      contact: p.contact || null,
      customer_name: p.notes?.customer_name || (p.email ? p.email.split('@')[0] : null) || p.contact || 'Razorpay Payer',
      description: p.description || null,
      fee: p.fee || 0,
      fee_inr: ((p.fee || 0) / 100).toFixed(2),
      tax: p.tax || 0,
      created_at: new Date(p.created_at * 1000).toISOString(),
      captured: p.captured ?? (p.status === 'captured'),
    }));

    const totalCapturedPaise = items
      .filter((p) => p.status === 'captured')
      .reduce((sum, p) => sum + p.amount, 0);

    return c.json({
      success: true,
      data: {
        configured: true,
        range,
        count: items.length,
        total_captured_paise: totalCapturedPaise,
        total_captured_inr: (totalCapturedPaise / 100).toFixed(2),
        items,
      },
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RAZORPAY_API_ERROR',
          message: err.message || 'Failed to fetch payments from Razorpay',
        },
      },
      502
    );
  }
});

adminReportsRouter.get('/razorpay-settlements', async (c) => {
  const isConfigured = Boolean(c.env?.RAZORPAY_KEY_ID && c.env?.RAZORPAY_KEY_SECRET);
  if (!isConfigured) {
    return c.json({
      success: true,
      data: {
        configured: false,
        message: 'Razorpay credentials not configured in backend environment',
        count: 0,
        total_settled_paise: 0,
        total_settled_inr: '0.00',
        items: [],
      },
    });
  }

  const count = Math.min(100, Math.max(1, parseInt(c.req.query('count') || '50', 10)));
  const skip = Math.max(0, parseInt(c.req.query('skip') || '0', 10));

  try {
    const rzpRes = await fetchRazorpaySettlements(c.env, { count, skip });
    const items = rzpRes.items.map((s) => ({
      id: s.id,
      amount: s.amount,
      amount_inr: (s.amount / 100).toFixed(2),
      status: s.status,
      fees: s.fees || 0,
      fees_inr: ((s.fees || 0) / 100).toFixed(2),
      tax: s.tax || 0,
      tax_inr: ((s.tax || 0) / 100).toFixed(2),
      utr: s.utr || null,
      created_at: new Date(s.created_at * 1000).toISOString(),
    }));

    const totalSettledPaise = items
      .filter((s) => s.status === 'processed')
      .reduce((sum, s) => sum + s.amount, 0);

    return c.json({
      success: true,
      data: {
        configured: true,
        count: items.length,
        total_settled_paise: totalSettledPaise,
        total_settled_inr: (totalSettledPaise / 100).toFixed(2),
        items,
      },
    });
  } catch (err: any) {
    return c.json(
      {
        success: false,
        error: {
          code: 'RAZORPAY_SETTLEMENTS_ERROR',
          message: err.message || 'Failed to fetch settlements from Razorpay',
        },
      },
      502
    );
  }
});

adminReportsRouter.get('/pay-later-logs', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || '50', 10)));
  const statusFilter = c.req.query('status') || 'all';

  let query = adminClient
    .from('orders')
    .select('id, order_number, total, payment_status, payment_method, order_stage, order_status, created_at, paid_at, pay_later_settled_at, pay_later_settled_via, customer_id')
    .eq('payment_method', 'pay_later')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (statusFilter === 'unpaid') {
    query = query.in('payment_status', ['unpaid', 'pending']);
  } else if (statusFilter === 'paid') {
    query = query.eq('payment_status', 'paid');
  }

  const { data: orders, error } = await query;
  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const customerIds = Array.from(new Set((orders || []).map((o: any) => o.customer_id).filter(Boolean)));
  let profileMap = new Map<string, any>();
  if (customerIds.length > 0) {
    try {
      const { data: profs } = await adminClient
        .from('profiles')
        .select('id, display_name, email, phone, account_type')
        .in('id', customerIds);
      if (profs) {
        profileMap = new Map(profs.map((p: any) => [p.id, p]));
      }
    } catch {}
  }

  const items = (orders || []).map((o: any) => {
    const prof = profileMap.get(o.customer_id) || {};
    return {
      id: o.id,
      order_number: o.order_number,
      customer_id: o.customer_id,
      teacher_name: prof.display_name || (prof.email ? prof.email.split('@')[0] : 'Faculty Member'),
      teacher_email: prof.email || '',
      teacher_phone: prof.phone || '',
      account_type: prof.account_type || 'staff_t',
      amount_paise: o.total,
      amount_inr: (o.total / 100).toFixed(2),
      payment_status: o.payment_status,
      is_settled: o.payment_status === 'paid',
      order_stage: o.order_stage || o.order_status,
      created_at: o.created_at,
      settled_at: o.pay_later_settled_at || o.paid_at || null,
      settled_via: o.pay_later_settled_via || (o.payment_status === 'paid' ? 'settled' : null),
    };
  });

  const totalUnpaidPaise = items
    .filter((o) => !o.is_settled)
    .reduce((sum, o) => sum + o.amount_paise, 0);

  const totalSettledPaise = items
    .filter((o) => o.is_settled)
    .reduce((sum, o) => sum + o.amount_paise, 0);

  return c.json({
    success: true,
    data: {
      count: items.length,
      total_unpaid_paise: totalUnpaidPaise,
      total_unpaid_inr: (totalUnpaidPaise / 100).toFixed(2),
      total_settled_paise: totalSettledPaise,
      total_settled_inr: (totalSettledPaise / 100).toFixed(2),
      items,
    },
  });
});

adminReportsRouter.get('/payments', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
  const search = c.req.query('search')?.trim();

  let query = adminClient
    .from('orders')
    .select('id, order_number, total, payment_status, payment_method, order_stage, order_status, created_at, paid_at, razorpay_payment_id, razorpay_order_id, profiles(display_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(`order_number.ilike.%${search}%,razorpay_payment_id.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  const payments = (data || []).map((o: any) => {
    const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return {
      id: o.id,
      order_number: o.order_number,
      customer_name: prof?.display_name || 'Customer',
      customer_email: prof?.email || '—',
      amount_paise: o.total,
      amount_inr: (o.total / 100).toFixed(2),
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      order_stage: o.order_stage || o.order_status,
      razorpay_payment_id: o.razorpay_payment_id || null,
      created_at: o.created_at,
      paid_at: o.paid_at,
    };
  });

  return c.json({
    success: true,
    data: payments,
  });
});

adminReportsRouter.get('/funds', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: onlinePayments } = await adminClient
    .from('payments')
    .select('amount, status, provider')
    .eq('status', 'captured');

  const totalOnlineCollectedPaise = (onlinePayments || []).reduce((acc, p: any) => acc + (p.amount || 0), 0);
  const totalWalletPaidPaise = 0;

  const { data: payLaterPending } = await adminClient
    .from('orders')
    .select('total')
    .eq('payment_method', 'pay_later')
    .in('payment_status', ['unpaid', 'pending']);

  const totalPendingPayLaterPaise = (payLaterPending || []).reduce((acc, o: any) => acc + (o.total || 0), 0);

  const { data: payLaterSettled } = await adminClient
    .from('orders')
    .select('total')
    .eq('payment_method', 'pay_later')
    .eq('payment_status', 'paid');

  const totalSettledPayLaterPaise = (payLaterSettled || []).reduce((acc, o: any) => acc + (o.total || 0), 0);

  return c.json({
    success: true,
    data: {
      online_collected_inr: (totalOnlineCollectedPaise / 100).toFixed(2),
      wallet_credits_used_inr: (totalWalletPaidPaise / 100).toFixed(2),
      pay_later_pending_inr: (totalPendingPayLaterPaise / 100).toFixed(2),
      pay_later_settled_inr: (totalSettledPayLaterPaise / 100).toFixed(2),
      currency: 'INR',
    },
  });
});

adminReportsRouter.get('/export', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const range = c.req.query('range') || 'monthly';
  const from = c.req.query('from');
  const to = c.req.query('to');
  const { startDate, endDate } = getDateRangeBounds(range, from, to);

  const { data: orders } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  const orderList = orders || [];
  const customerIds = Array.from(new Set(orderList.map((o: any) => o.customer_id).filter(Boolean)));
  const customerMap = new Map<string, any>();

  if (customerIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, display_name, account_type')
      .in('id', customerIds);

    const emailMap = new Map<string, string>();
    if (adminClient.auth?.admin?.listUsers) {
      try {
        const { data: userList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        if (userList?.users) {
          for (const u of userList.users) {
            if (u.id && u.email) {
              emailMap.set(u.id, u.email);
            }
          }
        }
      } catch {}
    }

    (profiles || []).forEach((p: any) => {
      customerMap.set(p.id, {
        ...p,
        email: emailMap.get(p.id) || p.email || null,
      });
    });
  }

  const exportData = (orderList || []).map((o: any) => ({
    'Order No': o.order_number || o.id,
    'Payment Date': formatKolkataDate(o.paid_at || o.created_at),
    'Total Payment Money': `₹${((o.total || 0) / 100).toFixed(2)}`,
  }));

  const workbook = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(
    exportData.length > 0
      ? exportData
      : [{ 'Order No': 'No orders in range', 'Payment Date': '—', 'Total Payment Money': '₹0.00' }]
  );
  XLSX.utils.book_append_sheet(workbook, ws, 'Orders');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const filename = `cafteria-orders-export-${range}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(excelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

