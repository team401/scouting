import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const schema = z.object({ userId: z.string(), role: z.enum(['admin', 'strategy', 'scout', 'video']) });

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Sign in to manage members.' }, { status: 401 });
  const actor = await env.DB.prepare('SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1').bind(session.user.id).first<{ organization_id: string; role: string }>();
  if (!actor || !['owner', 'admin'].includes(actor.role)) return Response.json({ error: 'Owner or admin access is required.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid member role.' }, { status: 400 });
  const target = await env.DB.prepare('SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?').bind(actor.organization_id, parsed.data.userId).first<{ role: string }>();
  if (!target) return Response.json({ error: 'Member not found.' }, { status: 404 });
  if (target.role === 'owner') return Response.json({ error: 'The owner role cannot be changed here.' }, { status: 400 });
  if (actor.role === 'admin' && (parsed.data.role === 'admin' || target.role === 'admin')) return Response.json({ error: 'Only the owner can manage admin roles.' }, { status: 403 });
  await env.DB.prepare('UPDATE memberships SET role = ?, updated_at = ? WHERE organization_id = ? AND user_id = ?').bind(parsed.data.role, Date.now(), actor.organization_id, parsed.data.userId).run();
  return Response.json({ userId: parsed.data.userId, role: parsed.data.role });
}
