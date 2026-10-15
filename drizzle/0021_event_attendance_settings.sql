CREATE TABLE IF NOT EXISTS event_attendance_settings (
  event_id TEXT PRIMARY KEY NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  configured_at INTEGER NOT NULL
);
