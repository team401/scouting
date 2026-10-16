CREATE TABLE IF NOT EXISTS drive_team_slots (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  driver_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  operator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  technician_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  human_player_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  match_id TEXT REFERENCES matches(id) ON DELETE SET NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (event_id, slot_number)
);

CREATE TABLE IF NOT EXISTS published_drive_team_slots (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  slot_number INTEGER NOT NULL,
  driver_user_id TEXT,
  operator_user_id TEXT,
  technician_user_id TEXT,
  human_player_user_id TEXT,
  match_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_published_drive_team_event ON published_drive_team_slots(event_id, slot_number);

CREATE TABLE IF NOT EXISTS drive_team_publications (
  event_id TEXT PRIMARY KEY NOT NULL,
  published_at INTEGER,
  draft_updated_at INTEGER NOT NULL
);
