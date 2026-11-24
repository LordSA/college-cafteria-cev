import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import type { Env, AuthContextVariables, SupportTicket } from '../types/env';
import { requireAuth, requireRole } from '../middleware/auth';
import { getSupabaseAdminClient } from '../lib/supabase';
import { sendTicketCreatedEmails, sendTicketReplyEmail } from '../lib/mailer';

const CreateTicketSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  type: z.enum(['bug', 'complaint', 'feedback', 'inquiry', 'other']),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(3000),
});

const UpdateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  developer_notes: z.string().max(2000).optional(),
  reply_to_user: z.string().max(3000).optional(),
});

export const supportRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

supportRouter.post('/', zValidator('json', CreateTicketSchema), async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const payload = c.req.valid('json');
  const user = c.get('user');

  const ticketNumber = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data: ticket, error } = await adminClient
    .from('support_tickets')
    .insert({
      ticket_number: ticketNumber,
      user_id: user?.id || null,
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      type: payload.type,
      subject: payload.subject.trim(),
      message: payload.message.trim(),
      status: 'open',
      priority: payload.type === 'bug' || payload.type === 'complaint' ? 'high' : 'normal',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error || !ticket) {
    return c.json(
      {
        success: false,
        error: { code: 'INSERT_FAILED', message: error?.message || 'Could not record support ticket' },
      },
      500
    );
  }

  try {
    sendTicketCreatedEmails(c.env, ticket as SupportTicket).catch(() => {});
  } catch {}

  return c.json(
    {
      success: true,
      data: ticket,
      message: 'Support ticket submitted successfully. A confirmation email has been dispatched.',
    },
    201
  );
});

supportRouter.get('/me', requireAuth, async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const user = c.get('user');

  if (!adminClient || !user) {
    return c.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      401
    );
  }

  const { data, error } = await adminClient
    .from('support_tickets')
    .select('id, ticket_number, type, subject, message, status, priority, developer_notes, created_at, updated_at')
    .or(`user_id.eq.${user.id},email.eq.${user.email || ''}`)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  return c.json({
    success: true,
    data: data || [],
  });
});

export const adminSupportRouter = new Hono<{
  Bindings: Env;
  Variables: AuthContextVariables;
}>();

adminSupportRouter.use('*', requireAuth);
adminSupportRouter.use('*', requireRole(['developer', 'admin']));

adminSupportRouter.get('/', async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const status = c.req.query('status');
  const type = c.req.query('type');
  const search = c.req.query('q');

  let query = adminClient
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }
  if (search) {
    query = query.or(`ticket_number.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%,subject.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return c.json(
      { success: false, error: { code: 'QUERY_FAILED', message: error.message } },
      500
    );
  }

  return c.json({
    success: true,
    data: data || [],
  });
});

adminSupportRouter.patch('/:id', zValidator('json', UpdateTicketSchema), async (c) => {
  const adminClient = getSupabaseAdminClient(c.env);
  const ticketId = c.req.param('id');
  const payload = c.req.valid('json');
  const user = c.get('user');

  if (!adminClient) {
    return c.json(
      { success: false, error: { code: 'DATABASE_ERROR', message: 'Database unconfigured' } },
      500
    );
  }

  const { data: existing, error: fetchErr } = await adminClient
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (fetchErr || !existing) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Support ticket not found' } },
      404
    );
  }

  const updateFields: any = {
    updated_at: new Date().toISOString(),
  };

  if (payload.status) {
    updateFields.status = payload.status;
    if (payload.status === 'resolved' || payload.status === 'closed') {
      updateFields.resolved_at = new Date().toISOString();
      updateFields.resolved_by = user.id;
    }
  }

  if (payload.priority) {
    updateFields.priority = payload.priority;
  }

  if (payload.developer_notes !== undefined) {
    updateFields.developer_notes = payload.developer_notes;
  }

  const { data: updated, error: updateErr } = await adminClient
    .from('support_tickets')
    .update(updateFields)
    .eq('id', ticketId)
    .select('*')
    .single();

  if (updateErr || !updated) {
    return c.json(
      { success: false, error: { code: 'UPDATE_FAILED', message: updateErr?.message || 'Could not update ticket' } },
      500
    );
  }

  let emailSent = false;
  let emailError: string | undefined;

  if (payload.reply_to_user && payload.reply_to_user.trim().length > 0) {
    try {
      const mailRes = await sendTicketReplyEmail(c.env, {
        ticket: updated as SupportTicket,
        replyMessage: payload.reply_to_user.trim(),
        developerName: user.email?.split('@')[0] || 'Developer',
      });
      emailSent = mailRes.success;
      if (!mailRes.success) {
        emailError = mailRes.error;
      }
    } catch (err: any) {
      emailError = err.message;
    }
  }

  return c.json({
    success: true,
    data: updated,
    emailSent,
    emailError,
    message: emailSent
      ? 'Ticket updated and response email sent to user'
      : 'Ticket updated successfully',
  });
});
