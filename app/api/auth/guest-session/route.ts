import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { createD1RateLimitStorage } from '@/lib/d1-rate-limit';
import { ensureAuthSchema } from '@/lib/ensure-auth-schema';
import { hashGuestPassCode } from '@/lib/guest-pass';
import { createScoutingSession } from '@/lib/scouting-session';

const schema = z.object({ code: z.string().trim().min(8).max(80) });

export async function POST(request: Request) {
  await ensureAuthSchema(env.DB);
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const limit = await createD1RateLimitStorage(env.DB).consume(
    `guest-sign-in:${clientIp}`,
    { window: 60, max: 10 },
  );
  if (!limit.allowed)
    return Response.json(
      { error: 'Too many guest sign-in attempts. Try again shortly.' },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter ?? 60) } },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Enter a valid guest pass.' }, { status: 400 });
  const hash = await hashGuestPassCode(parsed.data.code);
  const pass = await env.DB.prepare(
    `SELECT guest_access_passes.user_id AS userId,
       guest_access_passes.expires_at AS expiresAt
     FROM guest_access_passes
     JOIN memberships ON memberships.user_id = guest_access_passes.user_id
       AND memberships.organization_id = guest_access_passes.organization_id
     WHERE guest_access_passes.token_hash = ?
       AND guest_access_passes.revoked_at IS NULL
       AND guest_access_passes.expires_at > ?
       AND memberships.disabled = 0 LIMIT 1`,
  )
    .bind(hash, Date.now())
    .first<{ userId: string; expiresAt: number }>();
  if (!pass)
    return Response.json(
      { error: 'This guest pass is invalid, expired, or revoked.' },
      { status: 401 },
    );
  const cookie = await createScoutingSession(
    request,
    pass.userId,
    pass.expiresAt,
  );
  return Response.json(
    { signedIn: true },
    { headers: { 'set-cookie': cookie } },
  );
}
