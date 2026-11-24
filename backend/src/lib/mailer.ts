import net from 'node:net';
import tls from 'node:tls';
import type { Env, SupportTicket } from '../types/env';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
}

export interface MailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

function sendRawSmtp(
  host: string,
  port: number,
  user: string,
  pass: string,
  from: string,
  to: string,
  rawMessage: string
): Promise<MailResult> {
  return new Promise((resolve) => {
    const isDirectTls = port === 465;
    let socket: net.Socket | tls.TLSSocket;
    let buffer = '';
    let step = 0;
    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        try {
          socket.destroy();
        } catch { }
        resolve({ success: false, error: 'SMTP connection timed out' });
      }
    }, 12000);

    function cleanup(res: MailResult) {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        try {
          socket.end();
        } catch { }
        resolve(res);
      }
    }

    function sendCmd(cmd: string) {
      if (socket.writable) {
        socket.write(cmd + '\r\n');
      }
    }

    function onData(chunk: any) {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.substring(0, 3), 10);
        const isLastLine = line.charAt(3) === ' ';

        if (!isLastLine) continue;

        if (step === 0 && code === 220) {
          step = 1;
          sendCmd(`EHLO ${host}`);
        } else if (step === 1 && code === 250) {
          if (!isDirectTls && port === 587) {
            step = 2;
            sendCmd('STARTTLS');
          } else {
            step = 3;
            sendCmd('AUTH LOGIN');
          }
        } else if (step === 2 && code === 220) {
          socket.removeAllListeners('data');
          const tlsSocket = tls.connect(
            {
              socket,
              host,
              servername: host,
              rejectUnauthorized: false,
            },
            () => {
              step = 1;
              sendCmd(`EHLO ${host}`);
            }
          );
          tlsSocket.on('data', onData);
          tlsSocket.on('error', (err: any) => cleanup({ success: false, error: err.message }));
          socket = tlsSocket;
        } else if (step === 3 && code === 334) {
          step = 4;
          sendCmd(btoa(user));
        } else if (step === 4 && code === 334) {
          step = 5;
          sendCmd(btoa(pass));
        } else if (step === 5 && code === 235) {
          step = 6;
          sendCmd(`MAIL FROM:<${from}>`);
        } else if (step === 6 && code === 250) {
          step = 7;
          sendCmd(`RCPT TO:<${to}>`);
        } else if (step === 7 && code === 250) {
          step = 8;
          sendCmd('DATA');
        } else if (step === 8 && code === 354) {
          step = 9;
          socket.write(rawMessage + '\r\n.\r\n');
        } else if (step === 9 && code === 250) {
          step = 10;
          sendCmd('QUIT');
          cleanup({ success: true, messageId: line });
        } else if (code >= 400) {
          cleanup({ success: false, error: `SMTP server error: ${line}` });
        }
      }
    }

    if (isDirectTls) {
      socket = tls.connect(
        {
          host,
          port,
          servername: host,
          rejectUnauthorized: false,
        },
        () => { }
      );
    } else {
      socket = net.connect({ host, port }, () => { });
    }

    socket.on('data', onData);
    socket.on('error', (err: any) => cleanup({ success: false, error: err.message }));
  });
}

export async function sendEmail(env: Env, options: EmailOptions): Promise<MailResult> {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.trim();
  const port = parseInt(env.SMTP_PORT?.trim() || '587', 10);
  const from = options.from?.trim() || env.SMTP_FROM_EMAIL?.trim();

  if (!host || !user || !pass || !from) {
    return {
      success: false,
      error: 'SMTP credentials unconfigured in backend environment',
    };
  }

  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2)}@${host}>`;
  const boundary = `====_Boundary_${Date.now()}_====`;

  let body = '';
  if (options.html) {
    body = [
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.text,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.html,
      '',
      `--${boundary}--`,
    ].join('\r\n');
  } else {
    body = [
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      options.text,
    ].join('\r\n');
  }

  const rawMessage = [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    body,
  ].join('\r\n');

  try {
    return await sendRawSmtp(host, port, user, pass, from, options.to, rawMessage);
  } catch (err: any) {
    return { success: false, error: err.message || 'SMTP dispatch failed' };
  }
}

export async function sendTicketCreatedEmails(
  env: Env,
  ticket: SupportTicket
): Promise<{ userMail: MailResult; devMail: MailResult }> {
  const devEmail = env.DEVELOPER_EMAIL?.trim() || env.SMTP_USER?.trim() || 'developer@cev.ac.in';

  const userHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eeeeee; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #F47721; margin: 0; font-size: 24px; font-weight: 800;">Cafteria CEV Support</h2>
        <p style="color: #666666; font-size: 13px; margin-top: 4px;">Ticket #${ticket.ticket_number}</p>
      </div>
      <p style="color: #252525; font-size: 14px; line-height: 1.6;">Hello <strong>${ticket.name}</strong>,</p>
      <p style="color: #252525; font-size: 14px; line-height: 1.6;">Thank you for contacting Cafteria CEV. We have received your ${ticket.type} report and our engineering team is reviewing it.</p>
      <div style="background-color: #FFF7F0; border-left: 4px solid #F47721; padding: 14px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; font-weight: 700;">Subject</p>
        <p style="margin: 4px 0 10px 0; font-size: 14px; font-weight: 700; color: #252525;">${ticket.subject}</p>
        <p style="margin: 0; font-size: 12px; color: #888888; text-transform: uppercase; font-weight: 700;">Description</p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #555555; white-space: pre-wrap;">${ticket.message}</p>
      </div>
      <p style="color: #252525; font-size: 13px; line-height: 1.6;">You will receive an email update as soon as our developers have investigated or resolved this ticket.</p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eeeeee; text-align: center; color: #888888; font-size: 11px;">
        Cafeteria CEV • College of Engineering Vadakara
      </div>
    </div>
  `;

  const userText = `Hello ${ticket.name},\n\nWe received your ticket #${ticket.ticket_number} (${ticket.type.toUpperCase()}): "${ticket.subject}".\n\nOur engineering team is actively investigating it.\n\nDescription:\n${ticket.message}\n\nCafeteria CEV`;

  const devHtml = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eeeeee; border-radius: 16px; background-color: #ffffff;">
      <h3 style="color: #D94A43; margin-top: 0;">New Support Ticket: #${ticket.ticket_number}</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #888888; width: 120px;">Type:</td><td style="font-weight: 700; text-transform: uppercase; color: #F47721;">${ticket.type}</td></tr>
        <tr><td style="padding: 6px 0; color: #888888;">Reporter:</td><td><strong>${ticket.name}</strong> (${ticket.email})</td></tr>
        <tr><td style="padding: 6px 0; color: #888888;">User ID:</td><td><code>${ticket.user_id || 'Guest'}</code></td></tr>
        <tr><td style="padding: 6px 0; color: #888888;">Subject:</td><td><strong>${ticket.subject}</strong></td></tr>
      </table>
      <div style="background-color: #FAFAFA; border: 1px solid #eeeeee; padding: 12px; border-radius: 8px; font-size: 13px; color: #333333; white-space: pre-wrap;">${ticket.message}</div>
      <p style="margin-top: 20px; font-size: 12px; color: #666666;">Open the Developer Portal in Admin to review and reply.</p>
    </div>
  `;

  const devText = `[NEW SUPPORT TICKET] #${ticket.ticket_number}\nType: ${ticket.type}\nFrom: ${ticket.name} (${ticket.email})\nSubject: ${ticket.subject}\n\n${ticket.message}`;

  const [userMail, devMail] = await Promise.all([
    sendEmail(env, {
      to: ticket.email,
      subject: `[Cafteria CEV] Ticket Received: ${ticket.subject} (#${ticket.ticket_number})`,
      html: userHtml,
      text: userText,
    }),
    sendEmail(env, {
      to: devEmail,
      subject: `[Cafteria Alert] New ${ticket.type.toUpperCase()}: #${ticket.ticket_number} - ${ticket.subject}`,
      html: devHtml,
      text: devText,
    }),
  ]);

  return { userMail, devMail };
}

export async function sendTicketReplyEmail(
  env: Env,
  params: {
    ticket: SupportTicket;
    replyMessage: string;
    developerName?: string;
  }
): Promise<MailResult> {
  const { ticket, replyMessage, developerName } = params;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eeeeee; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #F47721; margin: 0; font-size: 24px; font-weight: 800;">Cafteria CEV Support</h2>
        <p style="color: #666666; font-size: 13px; margin-top: 4px;">Update on Ticket #${ticket.ticket_number}</p>
      </div>
      <p style="color: #252525; font-size: 14px; line-height: 1.6;">Hello <strong>${ticket.name}</strong>,</p>
      <p style="color: #252525; font-size: 14px; line-height: 1.6;">Our development team has provided an update regarding your ticket: <strong>"${ticket.subject}"</strong>.</p>
      <div style="background-color: #F4FBF7; border-left: 4px solid #269B62; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 12px; color: #269B62; text-transform: uppercase; font-weight: 700;">Developer Response${developerName ? ` (${developerName})` : ''}</p>
        <p style="margin: 0; font-size: 13px; color: #252525; line-height: 1.6; white-space: pre-wrap;">${replyMessage}</p>
      </div>
      <p style="color: #666666; font-size: 12px;">Ticket Status: <strong style="text-transform: uppercase; color: #252525;">${ticket.status}</strong></p>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #eeeeee; text-align: center; color: #888888; font-size: 11px;">
        Cafeteria CEV • College of Engineering Vadakara
      </div>
    </div>
  `;

  const text = `Hello ${ticket.name},\n\nUpdate on ticket #${ticket.ticket_number} (${ticket.subject}):\n\n${replyMessage}\n\nStatus: ${ticket.status.toUpperCase()}\n\nCafeteria CEV`;

  return sendEmail(env, {
    to: ticket.email,
    subject: `[Cafteria CEV] Update on Ticket #${ticket.ticket_number}: ${ticket.subject}`,
    html,
    text,
  });
}
