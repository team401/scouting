import { env } from 'cloudflare:workers';
import { auth } from '@/lib/auth';
import { observedPoints, type ScoutingPayload } from '@/lib/scouting-metrics';
import { canReopenEntries } from '@/lib/scouting-policy';

type MatchRow = {
  id: string;
  matchKey: string;
  matchNumber: number;
  compLevel: string;
  predictedAt: number | null;
  result: string | null;
  alliances: string;
};

type AssignmentRow = {
  matchId: string;
  teamNumber: number;
  station: string;
  scoutUserId: string;
  scoutName: string;
};

type EntryRow = {
  id: string;
  matchId: string;
  matchKey: string;
  teamNumber: number;
  station: string;
  scoutUserId: string;
  scoutName: string;
  payload: string;
  submittedAt: number;
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json(
      { error: 'Sign in to review scouting.' },
      { status: 401 },
    );
  const membership = await env.DB.prepare(
    'SELECT organization_id, role FROM memberships WHERE user_id = ? LIMIT 1',
  )
    .bind(session.user.id)
    .first<{ organization_id: string; role: string }>();
  if (!membership || !canReopenEntries(membership.role))
    return Response.json(
      { error: 'Strategy, admin, or owner access is required.' },
      { status: 403 },
    );
  const event = await env.DB.prepare(
    'SELECT id FROM events WHERE organization_id = ? AND is_current = 1 LIMIT 1',
  )
    .bind(membership.organization_id)
    .first<{ id: string }>();
  if (!event)
    return Response.json({
      coverage: [],
      issues: [],
      audit: [],
      summary: { assigned: 0, submitted: 0, missing: 0, issues: 0 },
    });

  const [matches, assignments, entries, audit] = await Promise.all([
    env.DB.prepare(
      `SELECT id, tba_match_key AS matchKey, match_number AS matchNumber, comp_level AS compLevel,
       predicted_at AS predictedAt, result, alliances FROM matches
       WHERE organization_id = ? AND event_id = ? ORDER BY match_number`,
    )
      .bind(membership.organization_id, event.id)
      .all<MatchRow>(),
    env.DB.prepare(
      `SELECT scout_assignments.match_id AS matchId, scout_assignments.team_number AS teamNumber,
       scout_assignments.station, scout_assignments.scout_user_id AS scoutUserId, users.name AS scoutName
       FROM scout_assignments JOIN users ON users.id = scout_assignments.scout_user_id
       WHERE scout_assignments.organization_id = ? AND scout_assignments.event_id = ?`,
    )
      .bind(membership.organization_id, event.id)
      .all<AssignmentRow>(),
    env.DB.prepare(
      `SELECT scout_entries.id, scout_entries.match_id AS matchId, matches.tba_match_key AS matchKey,
       scout_entries.team_number AS teamNumber, scout_entries.station, scout_entries.scout_user_id AS scoutUserId,
       users.name AS scoutName, scout_entries.payload, scout_entries.updated_at AS submittedAt
       FROM scout_entries JOIN matches ON matches.id = scout_entries.match_id
       JOIN users ON users.id = scout_entries.scout_user_id
       WHERE scout_entries.organization_id = ? AND scout_entries.event_id = ?`,
    )
      .bind(membership.organization_id, event.id)
      .all<EntryRow>(),
    env.DB.prepare(
      `SELECT entry_audit.id, entry_audit.entry_id AS entryId, entry_audit.action,
       entry_audit.created_at AS createdAt, users.name AS actorName
       FROM entry_audit JOIN users ON users.id = entry_audit.actor_user_id
       WHERE entry_audit.organization_id = ? ORDER BY entry_audit.created_at DESC LIMIT 25`,
    )
      .bind(membership.organization_id)
      .all(),
  ]);

  const entryGroups = new Map<string, EntryRow[]>();
  for (const entry of entries.results) {
    const key = `${entry.matchId}:${entry.teamNumber}`;
    entryGroups.set(key, [...(entryGroups.get(key) ?? []), entry]);
  }
  const matchById = new Map(matches.results.map((match) => [match.id, match]));
  const coverage = assignments.results.map((assignment) => {
    const match = matchById.get(assignment.matchId);
    const matchingEntries =
      entryGroups.get(`${assignment.matchId}:${assignment.teamNumber}`) ?? [];
    const ownEntry = matchingEntries.find(
      (entry) => entry.scoutUserId === assignment.scoutUserId,
    );
    return {
      ...assignment,
      matchKey: match?.matchKey ?? '',
      matchNumber: match?.matchNumber ?? 0,
      compLevel: match?.compLevel ?? '',
      predictedAt: match?.predictedAt ?? null,
      completed: Boolean(match?.result && JSON.parse(match.result).actualTime),
      status: ownEntry
        ? 'submitted'
        : matchingEntries.length
          ? 'covered'
          : 'missing',
      entryId: ownEntry?.id ?? matchingEntries[0]?.id ?? null,
      submittedAt:
        ownEntry?.submittedAt ?? matchingEntries[0]?.submittedAt ?? null,
    };
  });

  const issues = entries.results.flatMap((entry) => {
    const payload = JSON.parse(entry.payload) as ScoutingPayload & {
      reopened?: boolean;
    };
    const duplicateCount =
      entryGroups.get(`${entry.matchId}:${entry.teamNumber}`)?.length ?? 0;
    const flags = [
      duplicateCount > 1 ? `${duplicateCount} submissions for this robot` : '',
      !payload.noShow && observedPoints(payload) === 0
        ? 'zero observed output'
        : '',
      payload.disabled ? 'robot disabled' : '',
      payload.reopened ? 'entry reopened for correction' : '',
    ].filter(Boolean);
    return flags.length
      ? [
          {
            id: entry.id,
            matchKey: entry.matchKey,
            teamNumber: entry.teamNumber,
            scoutName: entry.scoutName,
            submittedAt: entry.submittedAt,
            points: observedPoints(payload),
            activeFuel: payload.activeFuel,
            cycles: payload.cycles,
            flags,
            reopened: Boolean(payload.reopened),
          },
        ]
      : [];
  });
  const completedMissing = coverage.filter(
    (slot) => slot.completed && slot.status === 'missing',
  );
  const allIssues = [
    ...completedMissing.map((slot) => ({
      id: `missing:${slot.matchId}:${slot.station}`,
      matchKey: slot.matchKey,
      teamNumber: slot.teamNumber,
      scoutName: slot.scoutName,
      submittedAt: null,
      points: null,
      activeFuel: null,
      cycles: null,
      flags: ['missing submission for completed match'],
      reopened: false,
    })),
    ...issues,
  ];
  return Response.json({
    coverage,
    issues: allIssues,
    audit: audit.results,
    summary: {
      assigned: coverage.length,
      submitted: coverage.filter((slot) => slot.status !== 'missing').length,
      missing: coverage.filter((slot) => slot.status === 'missing').length,
      issues: allIssues.length,
    },
  });
}
