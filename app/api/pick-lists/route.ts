import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import {
  buildConsensus,
  emptyPickList,
  type PickListData,
} from '@/lib/pick-list';

const entrySchema = z.object({
  teamNumber: z.number().int().positive(),
  note: z.string().max(500),
  tier: z.enum(['first', 'second', 'do-not-pick']),
  avoid: z.boolean(),
});
const listSchema = z.object({
  entries: z.array(entrySchema).max(200),
  selections: z
    .array(
      z.object({
        teamNumber: z.number().int().positive(),
        allianceNumber: z.number().int().min(1).max(16),
      }),
    )
    .max(200),
});
const saveSchema = z.object({
  mode: z.enum(['personal', 'official']),
  data: listSchema,
});

async function identity(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  return membership ? { session, membership } : null;
}

function parseList(value: string): PickListData {
  try {
    const parsed = listSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : emptyPickList;
  } catch {
    return emptyPickList;
  }
}

export async function GET(request: Request) {
  const user = await identity(request);
  if (!user)
    return Response.json(
      { error: 'Sign in to view pick lists.' },
      { status: 401 },
    );
  if (!['owner', 'admin', 'strategy'].includes(user.membership.role))
    return Response.json(
      { error: 'Strategy access is required.' },
      { status: 403 },
    );
  const event = await env.DB.prepare(
    'SELECT id, tba_event_key AS eventKey FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(user.membership.organization_id)
    .first<{ id: string; eventKey: string }>();
  if (!event)
    return Response.json(
      { error: 'Load a current event first.' },
      { status: 404 },
    );
  const rows =
    await env.DB.prepare(`SELECT pick_lists.owner_user_id AS ownerUserId, pick_lists.is_official AS isOfficial,
    pick_lists.rankings, users.name AS ownerName FROM pick_lists JOIN users ON users.id = pick_lists.owner_user_id
    WHERE pick_lists.organization_id = ? AND pick_lists.event_id = ? ORDER BY pick_lists.updated_at DESC`)
      .bind(user.membership.organization_id, event.id)
      .all<{
        ownerUserId: string;
        isOfficial: number;
        rankings: string;
        ownerName: string;
      }>();
  const personalLists = rows.results
    .filter((row) => !row.isOfficial)
    .map((row) => ({
      ownerUserId: row.ownerUserId,
      ownerName: row.ownerName,
      data: parseList(row.rankings),
    }));
  return Response.json({
    eventKey: event.eventKey,
    personal:
      personalLists.find((list) => list.ownerUserId === user.session.user.id)
        ?.data ?? null,
    official: rows.results.find((row) => row.isOfficial)?.rankings
      ? parseList(rows.results.find((row) => row.isOfficial)!.rankings)
      : null,
    consensus: buildConsensus(personalLists.map((list) => list.data)),
    ballotCount: personalLists.length,
    canEditOfficial: ['owner', 'admin', 'strategy'].includes(
      user.membership.role,
    ),
  });
}

export async function POST(request: Request) {
  const user = await identity(request);
  if (!user)
    return Response.json(
      { error: 'Sign in to save a pick list.' },
      { status: 401 },
    );
  if (!['owner', 'admin', 'strategy'].includes(user.membership.role))
    return Response.json(
      { error: 'Strategy access is required.' },
      { status: 403 },
    );
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: 'The pick list is invalid.' },
      { status: 400 },
    );
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(user.membership.organization_id)
    .first<{ id: string }>();
  if (!event)
    return Response.json(
      { error: 'Load a current event first.' },
      { status: 404 },
    );
  const official = parsed.data.mode === 'official';
  const id = official
    ? `pick-list:${user.membership.organization_id}:${event.id}:official`
    : `pick-list:${user.membership.organization_id}:${event.id}:${user.session.user.id}`;
  const now = Date.now();
  await env.DB.prepare(`INSERT INTO pick_lists (id, organization_id, event_id, owner_user_id, name, is_official, rankings, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner_user_id = excluded.owner_user_id,
    rankings = excluded.rankings, updated_at = excluded.updated_at`)
    .bind(
      id,
      user.membership.organization_id,
      event.id,
      user.session.user.id,
      official ? 'Official pick list' : 'Personal pick list',
      official ? 1 : 0,
      JSON.stringify(parsed.data.data),
      now,
      now,
    )
    .run();
  return Response.json({ saved: true, updatedAt: now });
}
