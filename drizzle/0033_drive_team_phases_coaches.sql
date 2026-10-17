CREATE TABLE drive_team_slots_next (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  phase TEXT NOT NULL DEFAULT 'qual',
  slot_number INTEGER NOT NULL,
  driver_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  technician_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  human_player_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  coach_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  match_id TEXT REFERENCES matches(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (event_id, phase, slot_number)
);

INSERT INTO drive_team_slots_next
  (id, organization_id, event_id, phase, slot_number, driver_user_id, operator_user_id,
   technician_user_id, human_player_user_id, match_id, created_at, updated_at)
SELECT id, organization_id, event_id, 'qual', slot_number, driver_user_id, operator_user_id,
  technician_user_id, human_player_user_id, match_id, created_at, updated_at
FROM drive_team_slots;

DROP TABLE drive_team_slots;
ALTER TABLE drive_team_slots_next RENAME TO drive_team_slots;

ALTER TABLE published_drive_team_slots ADD COLUMN phase TEXT NOT NULL DEFAULT 'qual';
ALTER TABLE published_drive_team_slots ADD COLUMN coach_user_id TEXT;
