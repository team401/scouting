import { env } from 'cloudflare:workers';
import { syncTbaEvent } from '@/lib/tba-event-sync';
import {
  findWebhookEventKey,
  parseTbaWebhook,
  verifyTbaWebhook,
} from '@/lib/tba-webhook';

export async function POST(request: Request) {
  if (!env.TBA_WEBHOOK_SECRET)
    return Response.json(
      { error: 'TBA webhook delivery is not configured.' },
      { status: 503 },
    );
  const rawBody = await request.text();
  const recordDelivery = (status: string, messageType: string | null = null) =>
    env.DB.prepare(
      `INSERT INTO webhook_delivery_status (provider, last_received_at, status, message_type)
       VALUES ('tba', ?, ?, ?) ON CONFLICT(provider) DO UPDATE SET
       last_received_at = excluded.last_received_at, status = excluded.status,
       message_type = excluded.message_type`,
    )
      .bind(Date.now(), status, messageType)
      .run();
  const valid = await verifyTbaWebhook(
    rawBody,
    request.headers.get('x-tba-hmac'),
    env.TBA_WEBHOOK_SECRET,
  );
  if (!valid) {
    await recordDelivery('rejected_signature');
    return Response.json(
      { error: 'Invalid webhook signature.' },
      { status: 401 },
    );
  }
  const payload = parseTbaWebhook(rawBody);
  if (!payload) {
    await recordDelivery('rejected_payload');
    return Response.json(
      { error: 'Invalid webhook payload.' },
      { status: 400 },
    );
  }

  await recordDelivery('accepted', payload.message_type);

  if (payload.message_type === 'verification') {
    const verificationKey =
      payload.message_data &&
      typeof payload.message_data === 'object' &&
      'verification_key' in payload.message_data &&
      typeof payload.message_data.verification_key === 'string'
        ? payload.message_data.verification_key
        : null;
    if (verificationKey)
      await env.DB.prepare(
        `INSERT INTO webhook_verifications (provider, verification_code, received_at)
         VALUES ('tba', ?, ?) ON CONFLICT(provider) DO UPDATE SET
         verification_code = excluded.verification_code, received_at = excluded.received_at`,
      )
        .bind(verificationKey, Date.now())
        .run();
    return Response.json({
      ok: true,
      messageType: 'verification',
      verificationKey,
    });
  }
  if (payload.message_type === 'ping')
    return Response.json({ ok: true, messageType: 'ping' });

  const eventKey = findWebhookEventKey(payload.message_data);
  if (!eventKey)
    return Response.json({
      ok: true,
      messageType: payload.message_type,
      refreshed: 0,
    });
  const organizations = await env.DB.prepare(
    'SELECT organization_id AS organizationId FROM events WHERE tba_event_key = ? AND is_current = 1',
  )
    .bind(eventKey)
    .all<{ organizationId: string }>();
  const results = await Promise.allSettled(
    organizations.results.map((row) =>
      syncTbaEvent(row.organizationId, eventKey),
    ),
  );
  const refreshed = results.filter(
    (result) => result.status === 'fulfilled',
  ).length;
  const failed = results.length - refreshed;
  if (failed > 0)
    return Response.json(
      { error: 'TBA data refresh failed.', eventKey, refreshed, failed },
      { status: 502 },
    );
  return Response.json({
    ok: true,
    messageType: payload.message_type,
    eventKey,
    refreshed,
  });
}
