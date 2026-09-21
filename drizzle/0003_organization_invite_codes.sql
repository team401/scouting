CREATE TABLE `organization_settings` (
  `organization_id` text PRIMARY KEY NOT NULL REFERENCES `organizations`(`id`) ON DELETE CASCADE,
  `invite_code_hash` text,
  `invite_code_salt` text,
  `updated_at` integer NOT NULL
);
