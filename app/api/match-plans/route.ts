import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';

const planSchema = z.object({
  matchId: z.string().min(1),
  objective: z.string().max(500),
  autonomous: z.string().max(1000),
  offense: z.string().max(1000),
  defense: z.string().max(1000),
  endgame: z.string().max(1000),
  notes: z.string().max(2000),
  teamRoles: z.record(z.string(), z.string().max(500)),
  board: z.object({
    robots: z
      .array(
        z.object({
          team: z.number().int().positive(),
          station: z.string().max(4),
          alliance: z.enum(['red', 'blue']),
          x: z.number(),
          y: z.number(),
        }),
      )
      .max(6),
    strokes: z
      .array(
        z.object({
          id: z.string().max(100),
          color: z.string().max(20),
          points: z.array(z.object({ x: z.number(), y: z.number() })).max(5000),
        }),
      )
      .max(100),
  }),
});

async function identity(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  return membership
    ? {
        session,
        organizationId: membership.organization_id,
        role: membership.role,
      }
    : null;
}

export async function GET(request: Request) {
  const user = await identity(request);
  if (!user)
    return Response.json(
      { error: 'Sign in to view match plans.' },
      { status: 401 },
    );
  const matchId = new URL(request.url).searchParams.get('matchId');
  if (!matchId)
    return Response.json({ error: 'Choose a match.' }, { status: 400 });
  const match = await env.DB.prepare(
    'SELECT id FROM matches WHERE id = ? AND organization_id = ?',
  )
    .bind(matchId, user.organizationId)
    .first();
  if (!match)
    return Response.json(
      { error: 'That match is not in the current team event.' },
      { status: 404 },
    );
  const row =
    await env.DB.prepare(`SELECT match_plans.plan, match_plans.updated_at AS updatedAt, users.name AS authorName
    FROM match_plans JOIN users ON users.id = match_plans.author_user_id
    WHERE match_plans.organization_id = ? AND match_plans.match_id = ? ORDER BY match_plans.updated_at DESC LIMIT 1`)
      .bind(user.organizationId, matchId)
      .first<{ plan: string; updatedAt: number; authorName: string }>();
  return Response.json({
    plan: row ? JSON.parse(row.plan) : null,
    updatedAt: row?.updatedAt ?? null,
    authorName: row?.authorName ?? null,
    canEdit: ['owner', 'admin', 'strategy'].includes(user.role),
  });
}

export async function POST(request: Request) {
  const user = await identity(request);
  if (!user)
    return Response.json(
      { error: 'Sign in to save match plans.' },
      { status: 401 },
    );
  if (!['owner', 'admin', 'strategy'].includes(user.role))
    return Response.json(
      {
        error: 'Only strategy, admin, or owner accounts can edit match plans.',
      },
      { status: 403 },
    );
  const parsed = planSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'The match plan is invalid or too long.' },
      { status: 400 },
    );
  const match = await env.DB.prepare(
    'SELECT id, event_id FROM matches WHERE id = ? AND organization_id = ?',
  )
    .bind(parsed.data.matchId, user.organizationId)
    .first<{ id: string; event_id: string }>();
  if (!match)
    return Response.json(
      { error: 'That match is not in the current team event.' },
      { status: 404 },
    );
  const now = Date.now();
  const id = `${user.organizationId}:${match.id}:official`;
  const plan = {
    objective: parsed.data.objective,
    autonomous: parsed.data.autonomous,
    offense: parsed.data.offense,
    defense: parsed.data.defense,
    endgame: parsed.data.endgame,
    notes: parsed.data.notes,
    teamRoles: parsed.data.teamRoles,
    board: parsed.data.board,
  };
  await env.DB.prepare(`INSERT INTO match_plans (id, organization_id, event_id, match_id, author_user_id, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET author_user_id = excluded.author_user_id, plan = excluded.plan, updated_at = excluded.updated_at`)
    .bind(
      id,
      user.organizationId,
      match.event_id,
      match.id,
      user.session.user.id,
      JSON.stringify(plan),
      now,
      now,
    )
    .run();
  return Response.json({
    ok: true,
    updatedAt: now,
    authorName: user.session.user.name,
  });
}
