import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const schema = z.object({
  deviceId: z.uuid(),
  publicKey: z.looseObject({
    kty: z.literal('EC'),
    crv: z.literal('P-256'),
    x: z.string().min(1),
    y: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to register this device.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id, disabled FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; disabled: number }>();
  if (!membership || membership.disabled)
    return Response.json(
      { error: 'This account is not active.' },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Invalid device key.' }, { status: 400 });
  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO relay_devices (id, organization_id, user_id, public_key_jwk, created_at, last_used_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, NULL, NULL)
     ON CONFLICT (id) DO UPDATE SET public_key_jwk = excluded.public_key_jwk, revoked_at = NULL
     WHERE relay_devices.organization_id = excluded.organization_id AND relay_devices.user_id = excluded.user_id`,
  )
    .bind(
      parsed.data.deviceId,
      membership.organization_id,
      session.user.id,
      JSON.stringify(parsed.data.publicKey),
      now,
    )
    .run();
  return Response.json({ registered: true, deviceId: parsed.data.deviceId });
}
