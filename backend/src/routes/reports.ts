import { Hono } from 'hono';
import * as XLSX from 'xlsx';
import type { Env, AuthContextVariables } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';

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
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const [ordersRes, todayOrdersRes, teachersRes] = await Promise.all([
    adminClient
      .from('orders')
      .select('id, order_number, total, payment_status, payment_method, order_stage, order_status, created_at, paid_at, customer_id')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .neq('order_status', 'cancelled'),
    adminClient
      .from('orders')
      .select('id, order_number, total, payment_status, payment_method, order_stage, order_status, created_at, paid_at, customer_id, profiles(display_name, email)')
      .gte('created_at', todayStart.toISOString())
      .order('created_at', { ascending: false }),
    adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .or('account_type.eq.staff_t,approved_account_type.eq.staff_t'),
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
  const walletPaise = paidOrders
    .filter((o: any) => o.payment_method === 'testing_wallet')
    .reduce((sum, o: any) => sum + (o.total || 0), 0);
  const payLaterPaise = orderList
    .filter((o: any) => o.payment_method === 'pay_later')
    .reduce((sum, o: any) => sum + (o.total || 0), 0);

  const paymentBreakdown = {
    razorpay: orderList.filter((o: any) => o.payment_method === 'razorpay').length,
    wallet: orderList.filter((o: any) => o.payment_method === 'testing_wallet').length,
    pay_later: orderList.filter((o: any) => o.payment_method === 'pay_later').length,
    counter_cash: orderList.filter((o: any) => o.payment_method === 'counter_cash').length,
    razorpayPaise,
    walletPaise,
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

  const todayOrders = (todayOrdersRes.data || []).map((o: any) => {
    const prof = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return {
      id: o.id,
      order_number: o.order_number,
      customer_name: prof?.display_name || prof?.email || 'Customer',
      customer_email: prof?.email || null,
      amount: o.total,
      payment_method: o.payment_method,
      payment_status: o.payment_status,
      created_at: o.created_at,
      paid_at: o.paid_at,
    };
  });

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
      today_payments: todayOrders,
      teachers_count: teachersRes.count || 0,
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

  const { data: walletDebits } = await adminClient
    .from('wallet_transactions')
    .select('amount, transaction_type')
    .eq('transaction_type', 'debit');

  const totalWalletPaidPaise = (walletDebits || []).reduce((acc, w: any) => acc + (w.amount || 0), 0);

  const { data: payLaterPending } = await adminClient
    .from('orders')
    .select('total')
    .eq('payment_method', 'pay_later')
    .in('payment_status', ['unpaid', 'pending'])
    .neq('order_status', 'cancelled');

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

