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

  const { data: orders, error: ordersErr } = await adminClient
    .from('orders')
    .select('id, total, payment_status, payment_method, order_stage, order_status, created_at, customer_id')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .neq('order_status', 'cancelled');

  if (ordersErr) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: ordersErr.message } },
      500
    );
  }

  const orderList = orders || [];
  const paidOrders = orderList.filter((o: any) => o.payment_status === 'paid');
  const totalRevenuePaise = paidOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
  const totalOrders = orderList.length;
  const collectedOrders = orderList.filter((o: any) => o.order_stage === 'COLLECTED' || o.order_status === 'completed').length;
  const readyOrders = 0;
  const placedOrders = orderList.filter((o: any) => o.order_stage !== 'COLLECTED' && o.order_status !== 'completed').length;

  const uniqueCustomers = new Set(orderList.map((o: any) => o.customer_id).filter(Boolean)).size;
  const avgOrderValuePaise = paidOrders.length > 0 ? Math.round(totalRevenuePaise / paidOrders.length) : 0;

  const paymentBreakdown = {
    razorpay: orderList.filter((o: any) => o.payment_method === 'razorpay').length,
    wallet: orderList.filter((o: any) => o.payment_method === 'testing_wallet').length,
    pay_later: orderList.filter((o: any) => o.payment_method === 'pay_later').length,
    counter_cash: orderList.filter((o: any) => o.payment_method === 'counter_cash').length,
  };

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
      ready_orders: readyOrders,
      placed_orders: placedOrders,
      unique_customers: uniqueCustomers,
      average_order_value_inr: (avgOrderValuePaise / 100).toFixed(2),
      payment_breakdown: paymentBreakdown,
    },
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
      .select('id, display_name, email, account_type, teacher_id')
      .in('id', customerIds);

    (profiles || []).forEach((p: any) => {
      customerMap.set(p.id, p);
    });
  }

  const summarySheetData = orderList.map((o: any) => {
    const customer = customerMap.get(o.customer_id);
    return {
      'Order ID': o.id,
      'Order Number': o.order_number,
      'Customer Name': customer?.display_name || 'Customer',
      'Customer Email': customer?.email || '—',
      'Account Type': customer?.account_type || 'student',
      'Teacher ID': customer?.teacher_id || '—',
      'Order Stage': o.order_stage || o.order_status,
      'Payment Status': o.payment_status,
      'Payment Method': o.payment_method,
      'Total (INR)': (o.total / 100).toFixed(2),
      'Created At (IST)': formatKolkataDate(o.created_at),
      'Paid At (IST)': formatKolkataDate(o.paid_at),
      'Collected At (IST)': formatKolkataDate(o.collected_at),
      'Razorpay Order ID': o.razorpay_order_id || '—',
      'Razorpay Payment ID': o.razorpay_payment_id || '—',
    };
  });

  const itemsSheetData: any[] = [];
  orderList.forEach((o: any) => {
    const items = o.order_items || [];
    items.forEach((item: any) => {
      itemsSheetData.push({
        'Order Number': o.order_number,
        'Item Name': item.item_name,
        'Quantity': item.quantity,
        'Unit Price (INR)': (item.unit_price / 100).toFixed(2),
        'Line Total (INR)': (item.line_total / 100).toFixed(2),
        'Order Stage': o.order_stage || o.order_status,
        'Order Date (IST)': formatKolkataDate(o.created_at),
      });
    });
  });

  const { data: payments } = await adminClient
    .from('payments')
    .select('*')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: false });

  const paymentsSheetData = (payments || []).map((p: any) => ({
    'Payment ID': p.id,
    'Order ID': p.order_id,
    'Provider': p.provider,
    'Amount (INR)': (p.amount / 100).toFixed(2),
    'Currency': p.currency,
    'Status': p.status,
    'Razorpay Order ID': p.razorpay_order_id || '—',
    'Razorpay Payment ID': p.razorpay_payment_id || '—',
    'Created At (IST)': formatKolkataDate(p.created_at),
    'Updated At (IST)': formatKolkataDate(p.updated_at),
  }));

  const { data: menuItems } = await adminClient
    .from('menu_items')
    .select('*, categories(name)')
    .eq('is_archived', false)
    .order('name', { ascending: true });

  const inventorySheetData = (menuItems || []).map((m: any) => ({
    'Item ID': m.id,
    'Item Name': m.name,
    'Category': m.categories?.name || 'Uncategorized',
    'Price (INR)': (m.price / 100).toFixed(2),
    'Available': m.is_available ? 'Yes' : 'No',
    'Track Inventory': m.track_inventory ? 'Yes' : 'No',
    'Current Stock': m.stock_quantity,
    'Low Stock Alert': m.stock_quantity <= m.low_stock_threshold ? 'LOW' : 'OK',
    'Threshold': m.low_stock_threshold,
  }));

  const paidOrders = orderList.filter((o: any) => o.payment_status === 'paid');
  const totalRevenuePaise = paidOrders.reduce((sum, o: any) => sum + (o.total || 0), 0);
  const financialSummaryData = [
    { 'Metric': 'Report Range', 'Value': range.toUpperCase() },
    { 'Metric': 'Period Start (IST)', 'Value': formatKolkataDate(startDate) },
    { 'Metric': 'Period End (IST)', 'Value': formatKolkataDate(endDate) },
    { 'Metric': 'Total Orders Placed', 'Value': orderList.length },
    { 'Metric': 'Total Paid Orders', 'Value': paidOrders.length },
    { 'Metric': 'Total Collected Orders', 'Value': orderList.filter((o: any) => o.order_stage === 'COLLECTED').length },
    { 'Metric': 'Total Revenue (INR)', 'Value': `₹${(totalRevenuePaise / 100).toFixed(2)}` },
    { 'Metric': 'Razorpay Online Orders', 'Value': orderList.filter((o: any) => o.payment_method === 'razorpay').length },
    { 'Metric': 'Testing Wallet Orders', 'Value': orderList.filter((o: any) => o.payment_method === 'testing_wallet').length },
    { 'Metric': 'Pay Later Orders', 'Value': orderList.filter((o: any) => o.payment_method === 'pay_later').length },
    { 'Metric': 'Counter Cash Orders', 'Value': orderList.filter((o: any) => o.payment_method === 'counter_cash').length },
  ];

  const workbook = XLSX.utils.book_new();

  const wsSummary = XLSX.utils.json_to_sheet(summarySheetData.length > 0 ? summarySheetData : [{ 'Notice': 'No orders in range' }]);
  XLSX.utils.book_append_sheet(workbook, wsSummary, 'Order Summary');

  const wsItems = XLSX.utils.json_to_sheet(itemsSheetData.length > 0 ? itemsSheetData : [{ 'Notice': 'No items in range' }]);
  XLSX.utils.book_append_sheet(workbook, wsItems, 'Order Items');

  const wsPayments = XLSX.utils.json_to_sheet(paymentsSheetData.length > 0 ? paymentsSheetData : [{ 'Notice': 'No payments in range' }]);
  XLSX.utils.book_append_sheet(workbook, wsPayments, 'Payments');

  const wsInventory = XLSX.utils.json_to_sheet(inventorySheetData.length > 0 ? inventorySheetData : [{ 'Notice': 'No menu items found' }]);
  XLSX.utils.book_append_sheet(workbook, wsInventory, 'Inventory');

  const wsFinancial = XLSX.utils.json_to_sheet(financialSummaryData);
  XLSX.utils.book_append_sheet(workbook, wsFinancial, 'Financial Summary');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  const filename = `cafteria-financial-report-${range}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(excelBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

