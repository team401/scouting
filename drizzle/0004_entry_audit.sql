CREATE TABLE `entry_audit` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `entry_id` text NOT NULL REFERENCES `scout_entries`(`id`) ON DELETE CASCADE,
  `actor_user_id` text NOT NULL REFERENCES `users`(`id`),
  `action` text NOT NULL,
  `created_at` integer NOT NULL
);
CREATE INDEX `idx_entry_audit_org_time` ON `entry_audit` (`organization_id`, `created_at`);
