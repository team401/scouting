import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canReopenEntries } from '@/lib/scouting-policy';

const schema = z.object({ entryId: z.string().min(1) });

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Sign in to reopen an entry.' }, { status: 401 });
  const membership = await env.DB.prepare('SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1').bind(session.user.id).first<{ organization_id: string; role: string }>();
  if (!membership || !canReopenEntries(membership.role)) return Response.json({ error: 'Strategy, admin, or owner access is required.' }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid entry.' }, { status: 400 });
  const result = await env.DB.prepare("UPDATE scout_entries SET payload = json_set(payload, '$.reopened', json('true')), updated_at = ? WHERE id = ? AND organization_id = ?")
    .bind(Date.now(), parsed.data.entryId, membership.organization_id).run();
  if (!result.meta.changes) return Response.json({ error: 'Entry not found.' }, { status: 404 });
  return Response.json({ reopened: true });
}
