CREATE TABLE `guest_access_passes` (
  `id` text PRIMARY KEY NOT NULL,
  `organization_id` text NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `user_id` text NOT NULL REFERENCES `users`(`id`) ON DELETE CASCADE,
  `token_hash` text NOT NULL,
  `expires_at` integer NOT NULL,
  `revoked_at` integer,
  `created_by` text NOT NULL REFERENCES `users`(`id`),
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `idx_guest_access_token` ON `guest_access_passes` (`token_hash`);
CREATE INDEX `idx_guest_access_org` ON `guest_access_passes` (`organization_id`);
