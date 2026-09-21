import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';

async function isAdministrator(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return false;
  const membership = await env.DB.prepare(
    'SELECT role, disabled FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ role: string; disabled: number }>();
  return Boolean(
    membership &&
    !membership.disabled &&
    ['owner', 'admin'].includes(membership.role),
  );
}

export async function GET(request: Request) {
  if (!(await isAdministrator(request)))
    return Response.json(
      { error: 'Owner or admin access is required.' },
      { status: 403 },
    );
  const verification = await env.DB.prepare(
    `SELECT verification_code AS verificationCode, received_at AS receivedAt
     FROM webhook_verifications WHERE provider = 'tba'`,
  ).first<{ verificationCode: string; receivedAt: number }>();
  return Response.json({ verification: verification ?? null });
}

export async function DELETE(request: Request) {
  if (!(await isAdministrator(request)))
    return Response.json(
      { error: 'Owner or admin access is required.' },
      { status: 403 },
    );
  await env.DB.prepare(
    "DELETE FROM webhook_verifications WHERE provider = 'tba'",
  ).run();
  return Response.json({ ok: true });
}
