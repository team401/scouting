ALTER TABLE event_schedule_days ADD COLUMN scouting_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE event_schedule_days ADD COLUMN outreach_enabled INTEGER NOT NULL DEFAULT 1;

UPDATE event_schedule_days
SET scouting_enabled = COALESCE(
      (SELECT scouting_enabled FROM events WHERE events.id = event_schedule_days.event_id),
      1
    ),
    outreach_enabled = COALESCE(
      (SELECT outreach_enabled FROM events WHERE events.id = event_schedule_days.event_id),
      1
    );
