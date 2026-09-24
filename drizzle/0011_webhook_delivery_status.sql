CREATE TABLE `webhook_delivery_status` (
  `provider` text PRIMARY KEY NOT NULL,
  `last_received_at` integer NOT NULL,
  `status` text NOT NULL,
  `message_type` text
);
