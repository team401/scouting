ALTER TABLE `memberships` ADD COLUMN `disabled` integer DEFAULT 0 NOT NULL;
CREATE TABLE `rate_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `count` integer NOT NULL,
  `last_request` integer NOT NULL
);
