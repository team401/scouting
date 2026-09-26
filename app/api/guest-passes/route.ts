import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createGuestPassCode, hashGuestPassCode } from '@/lib/guest-pass';

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  expiresInHours: z.union([
    z.literal(8),
    z.literal(24),
    z.literal(72),
    z.literal(168),
  ]),
});
const revokeSchema = z.object({ id: z.string().uuid() });

async function getAdmin(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    `SELECT organization_id AS organizationId, role FROM memberships
     WHERE user_id = ? AND disabled = 0 LIMIT 1`,
  )
    .bind(session.user.id)
    .first<{ organizationId: string; role: string }>();
  if (!membership || !['owner', 'admin'].includes(membership.role)) return null;
  return { session, membership };
}

export async function GET(request: Request) {
  const actor = await getAdmin(request);
  if (!actor)
    return Response.json({ error: 'Admin access is required.' }, { status: 403 });
  const rows = await env.DB.prepare(
    `SELECT guest_access_passes.id, guest_access_passes.user_id AS userId,
       users.name, guest_access_passes.expires_at AS expiresAt,
       guest_access_passes.revoked_at AS revokedAt,
       guest_access_passes.created_at AS createdAt,
       memberships.disabled AS memberDisabled,
       CASE WHEN guest_access_passes.expires_at <= ? THEN 1 ELSE 0 END AS expired
     FROM guest_access_passes
     JOIN users ON users.id = guest_access_passes.user_id
     JOIN memberships ON memberships.user_id = guest_access_passes.user_id
       AND memberships.organization_id = guest_access_passes.organization_id
     WHERE guest_access_passes.organization_id = ?
     ORDER BY guest_access_passes.created_at DESC`,
  )
    .bind(Date.now(), actor.membership.organizationId)
    .all();
  return Response.json({ passes: rows.results });
}

export async function POST(request: Request) {
  const actor = await getAdmin(request);
  if (!actor)
    return Response.json({ error: 'Admin access is required.' }, { status: 403 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Enter a guest name and duration.' }, { status: 400 });

  const id = crypto.randomUUID();
  const userId = `guest:${id}`;
  const code = createGuestPassCode();
  const tokenHash = await hashGuestPassCode(code);
  const now = Date.now();
  const expiresAt = now + parsed.data.expiresInHours * 60 * 60 * 1000;
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO users (id, email, name, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
    ).bind(userId, `${id}@guest.invalid`, parsed.data.name, now, now),
    env.DB.prepare(
      `INSERT INTO memberships (organization_id, user_id, role, disabled, created_at, updated_at)
       VALUES (?, ?, 'scout', 0, ?, ?)`,
    ).bind(actor.membership.organizationId, userId, now, now),
    env.DB.prepare(
      `INSERT INTO guest_access_passes
       (id, organization_id, user_id, token_hash, expires_at, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      actor.membership.organizationId,
      userId,
      tokenHash,
      expiresAt,
      actor.session.user.id,
      now,
      now,
    ),
  ]);
  return Response.json({ id, userId, name: parsed.data.name, code, expiresAt });
}

export async function DELETE(request: Request) {
  const actor = await getAdmin(request);
  if (!actor)
    return Response.json({ error: 'Admin access is required.' }, { status: 403 });
  const parsed = revokeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: 'Invalid guest pass.' }, { status: 400 });
  const pass = await env.DB.prepare(
    `SELECT user_id AS userId FROM guest_access_passes
     WHERE id = ? AND organization_id = ? LIMIT 1`,
  )
    .bind(parsed.data.id, actor.membership.organizationId)
    .first<{ userId: string }>();
  if (!pass)
    return Response.json({ error: 'Guest pass not found.' }, { status: 404 });
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(
      'UPDATE guest_access_passes SET revoked_at = ?, updated_at = ? WHERE id = ?',
    ).bind(now, now, parsed.data.id),
    env.DB.prepare(
      'UPDATE memberships SET disabled = 1, updated_at = ? WHERE organization_id = ? AND user_id = ?',
    ).bind(now, actor.membership.organizationId, pass.userId),
    env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(pass.userId),
  ]);
  return Response.json({ revoked: true });
}
