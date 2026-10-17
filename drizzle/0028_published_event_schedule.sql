CREATE TABLE published_event_role_assignments (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_published_event_roles_event_time ON published_event_role_assignments(event_id, starts_at, ends_at);
CREATE INDEX idx_published_event_roles_user_time ON published_event_role_assignments(user_id, starts_at, ends_at);

CREATE TABLE published_scout_shifts (
  id TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  station TEXT NOT NULL,
  scout_user_id TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_published_scout_shifts_event_time ON published_scout_shifts(event_id, starts_at, ends_at);

CREATE TABLE event_schedule_publications (
  event_id TEXT PRIMARY KEY NOT NULL,
  published_at INTEGER,
  draft_updated_at INTEGER NOT NULL
);

INSERT INTO published_event_role_assignments
SELECT id, organization_id, event_id, user_id, role, starts_at, ends_at, created_at, updated_at
FROM event_role_assignments;

INSERT INTO published_scout_shifts
SELECT id, organization_id, event_id, station, scout_user_id, starts_at, ends_at, created_at, updated_at
FROM scout_shifts;

INSERT INTO event_schedule_publications (event_id, published_at, draft_updated_at)
SELECT id, CAST(strftime('%s', 'now') AS INTEGER) * 1000,
  CAST(strftime('%s', 'now') AS INTEGER) * 1000
FROM events;
