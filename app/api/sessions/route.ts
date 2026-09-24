import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const schema = z.object({ sessionId: z.string().min(1) });

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to manage sessions.' },
      { status: 401 },
    );
  const sessions = await env.DB.prepare(
    `SELECT id, ip_address AS ipAddress, user_agent AS userAgent, created_at AS createdAt,
     updated_at AS updatedAt, expires_at AS expiresAt FROM sessions
     WHERE user_id = ? AND expires_at > ? ORDER BY updated_at DESC`,
  )
    .bind(session.user.id, Date.now())
    .all();
  return Response.json({
    sessions: sessions.results,
    currentSessionId: session.session.id,
  });
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to manage sessions.' },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Invalid session.' }, { status: 400 });
  const result = await env.DB.prepare(
    'DELETE FROM sessions WHERE id = ? AND user_id = ?',
  )
    .bind(parsed.data.sessionId, session.user.id)
    .run();
  if (!result.meta.changes)
    return Response.json({ error: 'Session not found.' }, { status: 404 });
  return Response.json({
    revoked: true,
    current: parsed.data.sessionId === session.session.id,
  });
}
