CREATE TABLE `scout_assignments` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`),
  `event_id` text NOT NULL REFERENCES `events`(`id`),
  `match_id` text NOT NULL REFERENCES `matches`(`id`),
  `team_number` integer NOT NULL,
  `scout_user_id` text NOT NULL REFERENCES `users`(`id`),
  `station` text NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_assignment_station` ON `scout_assignments` (`organization_id`,`match_id`,`station`);
--> statement-breakpoint
CREATE INDEX `idx_assignment_scout` ON `scout_assignments` (`scout_user_id`,`event_id`);
