import { z } from 'zod';
import {
  clearSessionCookie,
  createScoutingSession,
  getSessionFromHeaders,
  revokeCurrentSession,
} from '@/lib/scouting-session';
import {
  loadOpsRoster,
  signInToOps,
  synchronizeOpsRoster,
} from '@/lib/ops-firebase';
import { createD1RateLimitStorage } from '@/lib/d1-rate-limit';
import { ensureAuthSchema } from '@/lib/ensure-auth-schema';

const schema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(256),
});

export async function GET(request: Request) {
  await ensureAuthSchema((await import('cloudflare:workers')).env.DB);
  return Response.json(await getSessionFromHeaders(request.headers));
}

export async function POST(request: Request) {
  const { env } = await import('cloudflare:workers');
  await ensureAuthSchema(env.DB);
  const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const limit = await createD1RateLimitStorage(env.DB).consume(
    `ops-sign-in:${clientIp}`,
    { window: 60, max: 8 },
  );
  if (!limit.allowed)
    return Response.json(
      { error: 'Too many sign-in attempts. Try again shortly.' },
      {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfter ?? 60) },
      },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Enter your Ops email and password.' },
      { status: 400 },
    );
  try {
    const firebase = await signInToOps(
      parsed.data.email.trim().toLowerCase(),
      parsed.data.password,
    );
    const roster = await loadOpsRoster(firebase.idToken);
    if (!roster.some((profile) => profile.uid === firebase.localId))
      return Response.json(
        { error: 'This Firebase account is not in the Team 401 Ops roster.' },
        { status: 403 },
      );
    const userId = await synchronizeOpsRoster(roster, firebase.localId);
    const membership = await env.DB.prepare(
      "SELECT disabled FROM memberships WHERE organization_id = 'team-401' AND user_id = ? LIMIT 1",
    )
      .bind(userId)
      .first<{ disabled: number }>();
    if (!membership || membership.disabled)
      return Response.json(
        { error: 'Your scouting access is disabled.' },
        { status: 403 },
      );
    const cookie = await createScoutingSession(request, userId);
    return Response.json(
      { signedIn: true },
      { headers: { 'set-cookie': cookie } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sign-in failed.';
    const invalid = /INVALID_(LOGIN_CREDENTIALS|PASSWORD)|EMAIL_NOT_FOUND/.test(
      message,
    );
    return Response.json(
      { error: invalid ? 'Invalid email or password.' : message },
      { status: invalid ? 401 : 502 },
    );
  }
}

export async function DELETE(request: Request) {
  await revokeCurrentSession(request.headers);
  return Response.json(
    { signedOut: true },
    { headers: { 'set-cookie': clearSessionCookie(request) } },
  );
}
