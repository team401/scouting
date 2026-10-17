import {
  autoMapDriveTeamMatches,
  type DrivePhase,
  type ScheduleMatch,
} from '@/lib/drive-team';

export type DraftSlotRow = {
  id: string;
  organizationId: string;
  eventId: string;
  phase: DrivePhase;
  slotNumber: number;
  driverUserId: string | null;
  operatorUserId: string | null;
  humanPlayerUserId: string | null;
  technicianUserId: string | null;
  coachUserId: string | null;
  createdAt: number;
  updatedAt: number;
};

export type ScheduledMatchRow = ScheduleMatch & {
  scheduledAt: number | null;
  predictedAt: number | null;
};

export type DraftSlotWithMatch = DraftSlotRow & {
  match: ScheduledMatchRow | null;
};

// Planned rows with their official match, mapped automatically from our team's
// number. Shared by the planner view and publishing so both show the same match.
export async function draftSlotsWithMatches(
  db: D1Database,
  organizationId: string,
  eventId: string,
): Promise<DraftSlotWithMatch[]> {
  const [team, slots, matches] = await Promise.all([
    db
      .prepare(
        `SELECT COALESCE(settings.test_team_number, organizations.frc_team_number) AS teamNumber
         FROM organizations
         LEFT JOIN organization_settings settings ON settings.organization_id = organizations.id
         WHERE organizations.id = ?`,
      )
      .bind(organizationId)
      .first<{ teamNumber: number | null }>(),
    db
      .prepare(
        `SELECT id, organization_id AS organizationId, event_id AS eventId, phase,
          slot_number AS slotNumber, driver_user_id AS driverUserId,
          operator_user_id AS operatorUserId, human_player_user_id AS humanPlayerUserId,
          technician_user_id AS technicianUserId, coach_user_id AS coachUserId,
          created_at AS createdAt, updated_at AS updatedAt
         FROM drive_team_slots WHERE organization_id = ? AND event_id = ?
         ORDER BY CASE phase WHEN 'qual' THEN 0 ELSE 1 END, slot_number`,
      )
      .bind(organizationId, eventId)
      .all<DraftSlotRow>(),
    db
      .prepare(
        `SELECT id, comp_level AS compLevel, match_number AS matchNumber, alliances,
          scheduled_at AS scheduledAt, predicted_at AS predictedAt
         FROM matches WHERE organization_id = ? AND event_id = ?`,
      )
      .bind(organizationId, eventId)
      .all<ScheduledMatchRow>(),
  ]);
  const mapped = autoMapDriveTeamMatches(
    slots.results,
    matches.results,
    team?.teamNumber ?? null,
  );
  return slots.results.map((slot) => ({
    ...slot,
    match: mapped.get(`${slot.phase}:${slot.slotNumber}`) ?? null,
  }));
}
