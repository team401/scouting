CREATE TABLE `webhook_verifications` (
  `provider` text PRIMARY KEY NOT NULL,
  `verification_code` text NOT NULL,
  `received_at` integer NOT NULL
);
