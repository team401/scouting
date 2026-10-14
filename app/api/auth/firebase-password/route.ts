import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { createD1RateLimitStorage } from '@/lib/d1-rate-limit';
import { ensureAuthSchema } from '@/lib/ensure-auth-schema';
import {
  changeOpsPassword,
  clearOpsPasswordReset,
  loadOpsRoster,
  signInToOps,
} from '@/lib/ops-firebase';
import { getSessionFromHeaders } from '@/lib/scouting-session';

const schema = z.object({
  email: z.string().email().max(320).optional(),
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(6).max(256),
});

export async function POST(request: Request) {
  await ensureAuthSchema(env.DB);
  const session = await getSessionFromHeaders(request.headers);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      {
        error:
          'Enter your current password and a new password of at least 6 characters.',
      },
      { status: 400 },
    );
  const email = session?.user.email ?? parsed.data.email?.trim().toLowerCase();
  if (!email)
    return Response.json(
      { error: 'Enter the email address for your Ops account.' },
      { status: 400 },
    );

  const clientIp = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const limit = await createD1RateLimitStorage(env.DB).consume(
    `ops-password-change:${email}:${clientIp}`,
    { window: 300, max: 5 },
  );
  if (!limit.allowed)
    return Response.json(
      { error: 'Too many password attempts. Try again later.' },
      {
        status: 429,
        headers: { 'retry-after': String(limit.retryAfter ?? 300) },
      },
    );

  try {
    const firebase = await signInToOps(email, parsed.data.currentPassword);
    const roster = await loadOpsRoster(firebase.idToken);
    if (!roster.some((profile) => profile.uid === firebase.localId))
      return Response.json(
        { error: 'This Firebase account is not in the Team 401 Ops roster.' },
        { status: 403 },
      );

    if (session) {
      const linkedUser = await env.DB.prepare(
        'SELECT firebase_uid AS firebaseUid FROM users WHERE id = ? LIMIT 1',
      )
        .bind(session.user.id)
        .first<{ firebaseUid: string | null }>();
      if (
        !linkedUser?.firebaseUid ||
        linkedUser.firebaseUid !== firebase.localId
      )
        return Response.json(
          { error: 'This scouting account is not linked to your Ops account.' },
          { status: 403 },
        );
    }

    const changed = await changeOpsPassword(
      firebase.idToken,
      parsed.data.newPassword,
    );
    await clearOpsPasswordReset(changed.idToken, firebase.localId);
    if (session)
      await env.DB.prepare('DELETE FROM sessions WHERE user_id = ? AND id <> ?')
        .bind(session.user.id, session.session.id)
        .run();
    return Response.json({ changed: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Password change failed.';
    const invalid = /INVALID_(LOGIN_CREDENTIALS|PASSWORD)|EMAIL_NOT_FOUND/.test(
      message,
    );
    const weak = /WEAK_PASSWORD/.test(message);
    return Response.json(
      {
        error: invalid
          ? 'Your current password is incorrect.'
          : weak
            ? 'Choose a stronger password with at least 6 characters.'
            : message,
      },
      { status: invalid ? 401 : weak ? 400 : 502 },
    );
  }
}
