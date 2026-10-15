CREATE TABLE IF NOT EXISTS event_schedule_days (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_hour INTEGER NOT NULL,
  end_hour INTEGER NOT NULL,
  PRIMARY KEY (event_id, date)
);
