import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  decryptInviteCode,
  encryptInviteCode,
  hashInviteCode,
} from '@/lib/invite-code';

const schema = z.object({ code: z.string().trim().min(8).max(128) });

async function getActor(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
}

export async function GET(request: Request) {
  const actor = await getActor(request);
  if (!actor || !['owner', 'admin'].includes(actor.role))
    return Response.json(
      { error: 'Owner or admin access is required.' },
      { status: 403 },
    );
  const setting = await env.DB.prepare(
    'SELECT invite_code_hash, invite_code_encrypted, invite_code_iv FROM organization_settings WHERE organization_id = ?',
  )
    .bind(actor.organization_id)
    .first<{
      invite_code_hash: string | null;
      invite_code_encrypted: string | null;
      invite_code_iv: string | null;
    }>();
  let code: string | null = null;
  if (setting?.invite_code_encrypted && setting.invite_code_iv)
    code = await decryptInviteCode(
      setting.invite_code_encrypted,
      setting.invite_code_iv,
      env.BETTER_AUTH_SECRET,
      actor.organization_id,
    ).catch(() => null);
  return Response.json({
    configured: Boolean(setting?.invite_code_hash),
    code,
    recoverable: Boolean(code),
  });
}

export async function PUT(request: Request) {
  const actor = await getActor(request);
  if (!actor || !['owner', 'admin'].includes(actor.role))
    return Response.json(
      { error: 'Owner or admin access is required.' },
      { status: 403 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'Invite codes must contain 8–128 characters.' },
      { status: 400 },
    );
  try {
    const code = parsed.data.code;
    const [{ hash, salt }, encrypted] = await Promise.all([
      hashInviteCode(code),
      encryptInviteCode(code, env.BETTER_AUTH_SECRET, actor.organization_id),
    ]);
    await env.DB.prepare(
      `INSERT INTO organization_settings (organization_id, invite_code_hash, invite_code_salt, invite_code_encrypted, invite_code_iv, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (organization_id) DO UPDATE SET invite_code_hash = excluded.invite_code_hash, invite_code_salt = excluded.invite_code_salt,
       invite_code_encrypted = excluded.invite_code_encrypted, invite_code_iv = excluded.invite_code_iv, updated_at = excluded.updated_at`,
    )
      .bind(
        actor.organization_id,
        hash,
        salt,
        encrypted.encrypted,
        encrypted.iv,
        Date.now(),
      )
      .run();
    return Response.json({ configured: true, code });
  } catch (error) {
    console.error('Could not save the team invite code.', error);
    return Response.json(
      { error: 'The invite code could not be saved. Check the Worker logs.' },
      { status: 500 },
    );
  }
}
