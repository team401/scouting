import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { canOverwriteLockedEntry } from '@/lib/scouting-policy';

const scoutPayloadSchema = z.object({
  eventKey: z.string().min(1),
  matchKey: z.string().min(1),
  teamNumber: z.number().int().positive(),
  station: z.string().min(1),
  seasonYear: z.number().int(),
  schemaVersion: z.number().int().positive(),
  autoFuel: z.number().int().nonnegative(),
  activeFuel: z.number().int().nonnegative(),
  inactiveFuel: z.number().int().nonnegative(),
  cycles: z.number().int().nonnegative(),
  autoTower: z.string(),
  tower: z.string(),
  path: z.string(),
});

const pitPayloadSchema = z.object({
  eventKey: z.string().min(1), teamNumber: z.number().int().positive(), seasonYear: z.number().int(), schemaVersion: z.number().int().positive(),
  drivetrain: z.string().min(1).max(60), swerveModule: z.string().max(80), motorTypes: z.array(z.string().max(80)).max(12),
  weightLbs: z.number().nonnegative().max(500), widthInches: z.number().nonnegative().max(200), lengthInches: z.number().nonnegative().max(200), heightInches: z.number().nonnegative().max(300),
  fuelCapacity: z.number().int().nonnegative().max(500), climbCapability: z.string().max(120), autonomousCapabilities: z.string().max(500), notes: z.string().max(2000),
});

const mutationBase = {
  id: z.string().min(1).max(200),
  organizationId: z.string().min(1),
  operation: z.literal('upsert'),
  createdAt: z.number().int(),
  attempts: z.number().int().nonnegative(),
};
const mutationSchema = z.discriminatedUnion('entity', [
  z.object({ ...mutationBase, entity: z.literal('scoutEntry'), payload: scoutPayloadSchema }),
  z.object({ ...mutationBase, entity: z.literal('pitEntry'), payload: pitPayloadSchema }),
]);

const requestSchema = z.object({ mutations: z.array(mutationSchema).min(1).max(50) });

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: 'Sign in before synchronizing.' }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Invalid synchronization request.' }, { status: 400 });

  const accepted: string[] = [];
  const rejected: { id: string; error: string; retryable: boolean }[] = [];

  for (const mutation of parsed.data.mutations) {
    const membership = await env.DB.prepare('SELECT role FROM memberships WHERE organization_id = ? AND user_id = ?')
      .bind(mutation.organizationId, session.user.id).first<{ role: string }>();
    if (!membership) {
      rejected.push({ id: mutation.id, error: 'You are not a member of this scouting team.', retryable: false });
      continue;
    }

    const event = await env.DB.prepare('SELECT id FROM events WHERE organization_id = ? AND tba_event_key = ?')
      .bind(mutation.organizationId, mutation.payload.eventKey).first<{ id: string }>();
    if (!event) {
      rejected.push({ id: mutation.id, error: 'The current event pack is not available on the server yet.', retryable: true });
      continue;
    }
    if (mutation.entity === 'pitEntry') {
      const now = Date.now();
      const payload = mutation.payload;
      await env.DB.prepare(`INSERT INTO pit_entries
        (id, organization_id, event_id, team_number, scout_user_id, season_year, drivetrain, swerve_module, motor_types, weight_lbs, dimensions, payload, photo_object_key, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        ON CONFLICT (organization_id, event_id, team_number) DO UPDATE SET
          scout_user_id = excluded.scout_user_id, drivetrain = excluded.drivetrain, swerve_module = excluded.swerve_module,
          motor_types = excluded.motor_types, weight_lbs = excluded.weight_lbs, dimensions = excluded.dimensions,
          payload = excluded.payload, updated_at = excluded.updated_at`)
        .bind(mutation.id, mutation.organizationId, event.id, payload.teamNumber, session.user.id, payload.seasonYear,
          payload.drivetrain, payload.swerveModule || null, JSON.stringify(payload.motorTypes), payload.weightLbs || null,
          JSON.stringify({ width: payload.widthInches, length: payload.lengthInches, height: payload.heightInches }), JSON.stringify(payload), now, now).run();
      accepted.push(mutation.id);
      continue;
    }
    const match = await env.DB.prepare('SELECT matches.id FROM matches JOIN events ON events.id = matches.event_id WHERE matches.organization_id = ? AND matches.tba_match_key = ? AND events.tba_event_key = ?')
      .bind(mutation.organizationId, mutation.payload.matchKey, mutation.payload.eventKey).first<{ id: string }>();
    if (!match) {
      rejected.push({ id: mutation.id, error: 'The current event pack is not available on the server yet.', retryable: true });
      continue;
    }

    const existing = await env.DB.prepare('SELECT payload FROM scout_entries WHERE organization_id = ? AND match_id = ? AND team_number = ? AND scout_user_id = ?')
      .bind(mutation.organizationId, match.id, mutation.payload.teamNumber, session.user.id).first<{ payload: string }>();
    const reopened = existing ? Boolean((JSON.parse(existing.payload) as { reopened?: boolean }).reopened) : false;
    if (existing && !canOverwriteLockedEntry(membership.role, reopened)) {
      rejected.push({ id: mutation.id, error: 'This synchronized entry is locked. Ask strategy or an admin to reopen it.', retryable: false });
      continue;
    }

    const now = Date.now();
    await env.DB.prepare(`INSERT INTO scout_entries
      (id, organization_id, event_id, match_id, team_number, scout_user_id, station, season_year, schema_version, payload, client_updated_at, sync_version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT (organization_id, match_id, team_number, scout_user_id) DO UPDATE SET
        station = excluded.station, payload = excluded.payload, client_updated_at = excluded.client_updated_at,
        schema_version = excluded.schema_version, sync_version = scout_entries.sync_version + 1, updated_at = excluded.updated_at
      WHERE excluded.client_updated_at >= scout_entries.client_updated_at`)
      .bind(mutation.id, mutation.organizationId, event.id, match.id, mutation.payload.teamNumber, session.user.id,
        mutation.payload.station, mutation.payload.seasonYear, mutation.payload.schemaVersion, JSON.stringify({ ...mutation.payload, reopened: false, submittedAt: now }),
        mutation.createdAt, now, now).run();
    accepted.push(mutation.id);
  }

  return Response.json({ accepted, rejected });
}
