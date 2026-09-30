CREATE TABLE `event_teams` (
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON DELETE CASCADE,
  `team_number` integer NOT NULL,
  `name` text NOT NULL,
  `updated_at` integer NOT NULL,
  PRIMARY KEY (`organization_id`, `event_id`, `team_number`)
);
CREATE INDEX `idx_event_teams_event` ON `event_teams` (`event_id`, `team_number`);
