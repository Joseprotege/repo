/**
 * send-email — internal edge function called by the DB trigger
 * trg_email_on_notification whenever a row is inserted into public.notifications.
 *
 * Auth: caller must supply  Authorization: Bearer {INTERNAL_EMAIL_SECRET}
 * The same secret is stored as a Postgres database setting so the trigger
 * can include it without needing the service_role_key in pg settings.
 *
 * Required Supabase secrets:
 *   RESEND_API_KEY          — from resend.com
 *   INTERNAL_EMAIL_SECRET   — any random string you generate once
 *   APP_URL                 — your production domain, e.g. https://foster.vercel.app
 *   EMAIL_FROM              — verified sender, e.g. Foster <hello@yourdomain.com>
 *                             (use "onboarding@resend.dev" for early testing)
 */

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts';

const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY')!;
const INTERNAL_EMAIL_SECRET = Deno.env.get('INTERNAL_EMAIL_SECRET')!;
const APP_URL              = Deno.env.get('APP_URL') ?? 'https://foster.vercel.app';
const EMAIL_FROM           = Deno.env.get('EMAIL_FROM') ?? 'Foster <onboarding@resend.dev>';

// ── Types ────────────────────────────────────────────────────────────────────

interface EmailPayload {
  to: string;
  subject: string;
  notification_body: string;
  link_to: string;
  type: string;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405);

  // Verify internal caller
  const auth = req.headers.get('Authorization') ?? '';
  if (!INTERNAL_EMAIL_SECRET || auth !== `Bearer ${INTERNAL_EMAIL_SECRET}`) {
    return errorResponse('Unauthorized', 401);
  }

  let payload: EmailPayload;
  try {
    payload = await req.json();
  } catch {
    return errorResponse('Invalid JSON');
  }

  const { to, subject, notification_body, link_to, type } = payload;
  if (!to || !subject) return errorResponse('Missing required fields');

  const fullLink = link_to.startsWith('http') ? link_to : `${APP_URL}${link_to}`;
  const html = buildHtml({ subject, notification_body, fullLink, type });

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[send-email] Resend error:', err);
    return errorResponse('Failed to send email', 500);
  }

  return jsonResponse({ sent: true });
});

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHtml({
  subject,
  notification_body,
  fullLink,
  type,
}: {
  subject: string;
  notification_body: string;
  fullLink: string;
  type: string;
}): string {
  const ctaLabel = ctaForType(type);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#0d9488;padding:28px 32px;">
            <span style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">Foster</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.3;">
              ${esc(subject)}
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
              ${esc(notification_body)}
            </p>
            <a href="${fullLink}"
               style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;
                      font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;">
              ${esc(ctaLabel)}
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 28px;border-top:1px solid #f1f5f9;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
              You're receiving this because you have a Foster account.<br />
              This is an automated notification — please don't reply to this email.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaForType(type: string): string {
  switch (type) {
    case 'offer':          return 'View offer →';
    case 'offer_accepted': return 'Open chat →';
    case 'message':        return 'Reply →';
    case 'payment':        return 'View task →';
    default:               return 'Open Foster →';
  }
}

function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
