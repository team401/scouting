import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canOverwriteLockedEntry } from '@/lib/scouting-policy';

const mutationSchema = z.object({
  id: z.string().min(1).max(250),
  createdAt: z.number().int(),
  payload: z.looseObject({
    eventKey: z.string().min(1),
    matchKey: z.string().min(1),
    teamNumber: z.number().int().positive(),
    station: z.string().min(1),
    seasonYear: z.number().int(),
    schemaVersion: z.number().int(),
  }),
});
const transferSchema = z.object({
  version: z.literal(1),
  organizationId: z.string().min(1),
  eventKey: z.string().min(1),
  createdAt: z.number().int(),
  mutations: z.array(mutationSchema).min(1).max(24),
});
const envelopeSchema = z.object({
  version: z.literal(1),
  deviceId: z.uuid(),
  payload: z.string().min(1).max(100_000),
  signature: z.string().min(1),
});

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

export async function POST(request: Request) {
  const receiver = await auth.api.getSession({ headers: request.headers });
  if (!receiver)
    return Response.json(
      { error: 'Sign in to relay scouting data.' },
      { status: 401 },
    );
  const receiverMembership = await env.DB.prepare(
    'SELECT organization_id, disabled FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(receiver.user.id)
    .first<{ organization_id: string; disabled: number }>();
  if (!receiverMembership || receiverMembership.disabled)
    return Response.json(
      { error: 'This account is not active.' },
      { status: 403 },
    );
  const envelope = envelopeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!envelope.success)
    return Response.json(
      { error: 'Invalid QR transfer envelope.' },
      { status: 400 },
    );
  const device = await env.DB.prepare(
    `SELECT relay_devices.organization_id AS organizationId, relay_devices.user_id AS userId,
     relay_devices.public_key_jwk AS publicKey, memberships.role, memberships.disabled
     FROM relay_devices JOIN memberships ON memberships.user_id = relay_devices.user_id
      AND memberships.organization_id = relay_devices.organization_id
     WHERE relay_devices.id = ? AND relay_devices.revoked_at IS NULL LIMIT 1`,
  )
    .bind(envelope.data.deviceId)
    .first<{
      organizationId: string;
      userId: string;
      publicKey: string;
      role: string;
      disabled: number;
    }>();
  if (
    !device ||
    device.disabled ||
    device.organizationId !== receiverMembership.organization_id
  )
    return Response.json(
      { error: 'The sending device is not registered for this team.' },
      { status: 403 },
    );
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(device.publicKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify'],
  );
  const validSignature = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    publicKey,
    fromBase64Url(envelope.data.signature),
    new TextEncoder().encode(envelope.data.payload),
  );
  if (!validSignature)
    return Response.json(
      { error: 'QR transfer signature is invalid.' },
      { status: 400 },
    );
  let rawTransfer: unknown;
  try {
    rawTransfer = JSON.parse(envelope.data.payload);
  } catch {
    return Response.json(
      { error: 'QR transfer payload is not valid JSON.' },
      { status: 400 },
    );
  }
  const transfer = transferSchema.safeParse(rawTransfer);
  if (
    !transfer.success ||
    transfer.data.organizationId !== device.organizationId
  )
    return Response.json(
      { error: 'QR transfer contents are invalid.' },
      { status: 400 },
    );
  if (Date.now() - transfer.data.createdAt > 1000 * 60 * 60 * 24 * 7)
    return Response.json(
      { error: 'This QR transfer is more than seven days old.' },
      { status: 400 },
    );

  const accepted: string[] = [];
  const rejected: Array<{ id: string; error: string }> = [];
  for (const mutation of transfer.data.mutations) {
    if (mutation.payload.eventKey !== transfer.data.eventKey) {
      rejected.push({
        id: mutation.id,
        error: 'Submission event does not match the transfer.',
      });
      continue;
    }
    const event = await env.DB.prepare(
      'SELECT id FROM events WHERE organization_id = ? AND tba_event_key = ? LIMIT 1',
    )
      .bind(device.organizationId, mutation.payload.eventKey)
      .first<{ id: string }>();
    const match = event
      ? await env.DB.prepare(
          'SELECT id FROM matches WHERE organization_id = ? AND event_id = ? AND tba_match_key = ? LIMIT 1',
        )
          .bind(device.organizationId, event.id, mutation.payload.matchKey)
          .first<{ id: string }>()
      : null;
    if (!event || !match) {
      rejected.push({
        id: mutation.id,
        error: 'Event or match is not available on the server.',
      });
      continue;
    }
    const existing = await env.DB.prepare(
      'SELECT id, payload FROM scout_entries WHERE organization_id = ? AND match_id = ? AND team_number = ? AND scout_user_id = ?',
    )
      .bind(
        device.organizationId,
        match.id,
        mutation.payload.teamNumber,
        device.userId,
      )
      .first<{ id: string; payload: string }>();
    const reopened = existing
      ? Boolean(
          (JSON.parse(existing.payload) as { reopened?: boolean }).reopened,
        )
      : false;
    if (existing && !canOverwriteLockedEntry(device.role, reopened)) {
      // A repeated relay of an already accepted immutable submission is safe.
      accepted.push(mutation.id);
      continue;
    }
    const now = Date.now();
    await env.DB.prepare(
      `INSERT INTO scout_entries
       (id, organization_id, event_id, match_id, team_number, scout_user_id, station, season_year, schema_version, payload, client_updated_at, sync_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
       ON CONFLICT (organization_id, match_id, team_number, scout_user_id) DO UPDATE SET
       station = excluded.station, payload = excluded.payload, client_updated_at = excluded.client_updated_at,
       schema_version = excluded.schema_version, sync_version = scout_entries.sync_version + 1, updated_at = excluded.updated_at
       WHERE excluded.client_updated_at >= scout_entries.client_updated_at`,
    )
      .bind(
        mutation.id,
        device.organizationId,
        event.id,
        match.id,
        mutation.payload.teamNumber,
        device.userId,
        mutation.payload.station,
        mutation.payload.seasonYear,
        mutation.payload.schemaVersion,
        JSON.stringify({
          ...mutation.payload,
          reopened: false,
          submittedAt: now,
          relayedBy: receiver.user.id,
        }),
        mutation.createdAt,
        now,
        now,
      )
      .run();
    if (existing && reopened)
      await env.DB.prepare(
        `INSERT INTO entry_audit (id, organization_id, entry_id, actor_user_id, action, created_at)
         VALUES (?, ?, ?, ?, 'corrected', ?)`,
      )
        .bind(
          crypto.randomUUID(),
          device.organizationId,
          existing.id,
          device.userId,
          now,
        )
        .run();
    accepted.push(mutation.id);
  }
  await env.DB.prepare('UPDATE relay_devices SET last_used_at = ? WHERE id = ?')
    .bind(Date.now(), envelope.data.deviceId)
    .run();
  return Response.json({ accepted, rejected, sourceUserId: device.userId });
}
