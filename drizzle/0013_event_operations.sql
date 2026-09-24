ALTER TABLE `events` ADD COLUMN `timezone` text;
ALTER TABLE `scout_assignments` ADD COLUMN `source` text DEFAULT 'manual' NOT NULL;
ALTER TABLE `scout_assignments` ADD COLUMN `shift_id` text;

CREATE TABLE `scout_shifts` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON DELETE CASCADE,
  `station` text NOT NULL,
  `scout_user_id` text NOT NULL REFERENCES `users`(`id`),
  `starts_at` integer NOT NULL,
  `ends_at` integer NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `idx_scout_shifts_event_time` ON `scout_shifts` (`event_id`, `starts_at`, `ends_at`);

CREATE TABLE `review_cases` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `event_id` text NOT NULL REFERENCES `events`(`id`) ON DELETE CASCADE,
  `entry_id` text REFERENCES `scout_entries`(`id`) ON DELETE CASCADE,
  `match_id` text NOT NULL REFERENCES `matches`(`id`) ON DELETE CASCADE,
  `team_number` integer NOT NULL,
  `station` text NOT NULL,
  `kind` text NOT NULL,
  `status` text DEFAULT 'open' NOT NULL,
  `flags` text NOT NULL,
  `assigned_reviewer_id` text REFERENCES `users`(`id`),
  `reviewer_notes` text,
  `resolved_by` text REFERENCES `users`(`id`),
  `resolved_at` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE INDEX `idx_review_cases_event_status` ON `review_cases` (`event_id`, `status`, `updated_at`);
