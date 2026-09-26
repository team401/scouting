import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const updateSchema = z.object({
  userId: z.string(),
  role: z.enum(['admin', 'strategy', 'scout', 'video']).optional(),
  disabled: z.boolean().optional(),
});

async function getActor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  return membership ? { session, membership } : null;
}

async function authorizeTarget(
  actor: NonNullable<Awaited<ReturnType<typeof getActor>>>,
  userId: string,
) {
  if (!['owner', 'admin'].includes(actor.membership.role))
    return {
      error: 'Owner or admin access is required.',
      status: 403,
    } as const;
  const target = await env.DB.prepare(
    'SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?',
  )
    .bind(actor.membership.organization_id, userId)
    .first<{ role: string }>();
  if (!target) return { error: 'Member not found.', status: 404 } as const;
  if (target.role === 'owner')
    return {
      error: 'The owner account cannot be changed here.',
      status: 400,
    } as const;
  if (actor.membership.role === 'admin' && target.role === 'admin')
    return {
      error: 'Only the owner can manage admin accounts.',
      status: 403,
    } as const;
  return { target } as const;
}

export async function PATCH(request: Request) {
  const actor = await getActor(request);
  if (!actor)
    return Response.json(
      { error: 'Sign in to manage members.' },
      { status: 401 },
    );
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (
    !parsed.success ||
    (parsed.data.role === undefined && parsed.data.disabled === undefined)
  )
    return Response.json({ error: 'Invalid member update.' }, { status: 400 });
  if (parsed.data.userId.startsWith('guest:') && parsed.data.role)
    return Response.json(
      { error: 'Guest passes are restricted to the scout role.' },
      { status: 400 },
    );
  const authorization = await authorizeTarget(actor, parsed.data.userId);
  if ('error' in authorization)
    return Response.json(
      { error: authorization.error },
      { status: authorization.status },
    );
  if (actor.membership.role === 'admin' && parsed.data.role === 'admin')
    return Response.json(
      { error: 'Only the owner can grant admin access.' },
      { status: 403 },
    );
  const now = Date.now();
  if (parsed.data.role)
    await env.DB.prepare(
      'UPDATE memberships SET role = ?, updated_at = ? WHERE organization_id = ? AND user_id = ?',
    )
      .bind(
        parsed.data.role,
        now,
        actor.membership.organization_id,
        parsed.data.userId,
      )
      .run();
  if (parsed.data.disabled !== undefined) {
    const statements = [
      env.DB.prepare(
        'UPDATE memberships SET disabled = ?, updated_at = ? WHERE organization_id = ? AND user_id = ?',
      ).bind(
        parsed.data.disabled ? 1 : 0,
        now,
        actor.membership.organization_id,
        parsed.data.userId,
      ),
    ];
    if (parsed.data.disabled)
      statements.push(
        env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(
          parsed.data.userId,
        ),
      );
    await env.DB.batch(statements);
  }
  return Response.json({
    userId: parsed.data.userId,
    role: parsed.data.role,
    disabled: parsed.data.disabled,
  });
}
