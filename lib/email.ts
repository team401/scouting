import { env } from 'cloudflare:workers';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      })[character] ?? character,
  );
}

export async function sendAccountEmail({
  to,
  subject,
  heading,
  message,
  action,
  url,
}: {
  to: string;
  subject: string;
  heading: string;
  message: string;
  action: string;
  url: string;
}) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM)
    throw new Error('Transactional email is not configured.');
  const safeUrl = escapeHtml(url);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `team401-auth/${await crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(`${to}:${url}`))
        .then((hash) =>
          Array.from(new Uint8Array(hash))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join(''),
        )}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject,
      html: `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:auto;color:#172033"><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(message)}</p><p><a href="${safeUrl}" style="display:inline-block;background:#1677c8;color:white;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(action)}</a></p><p style="font-size:13px;color:#5d687a">If you did not request this, you can ignore this email.</p></div>`,
      text: `${heading}\n\n${message}\n\n${action}: ${url}\n\nIf you did not request this, you can ignore this email.`,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error('Resend email delivery failed', response.status, detail);
    throw new Error('Email delivery failed.');
  }
}
