CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`season_year` integer NOT NULL,
	`tba_event_key` text NOT NULL,
	`name` text NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`tba_etag` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_events_org_tba` ON `events` (`organization_id`,`tba_event_key`);--> statement-breakpoint
CREATE INDEX `idx_events_current` ON `events` (`organization_id`,`is_current`);--> statement-breakpoint
CREATE TABLE `match_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`match_id` text NOT NULL,
	`author_user_id` text NOT NULL,
	`plan` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_plans_match` ON `match_plans` (`organization_id`,`match_id`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`tba_match_key` text NOT NULL,
	`comp_level` text NOT NULL,
	`match_number` integer NOT NULL,
	`scheduled_at` integer,
	`predicted_at` integer,
	`alliances` text NOT NULL,
	`result` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_matches_org_tba` ON `matches` (`organization_id`,`tba_match_key`);--> statement-breakpoint
CREATE INDEX `idx_matches_event_order` ON `matches` (`event_id`,`comp_level`,`match_number`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`match_id` text,
	`team_number` integer,
	`uploader_user_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`bytes` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`uploader_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_media_match` ON `media` (`organization_id`,`match_id`);--> statement-breakpoint
CREATE TABLE `memberships` (
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`organization_id`, `user_id`),
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_memberships_user` ON `memberships` (`user_id`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`frc_team_number` integer,
	`owner_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pick_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`name` text NOT NULL,
	`is_official` integer DEFAULT false NOT NULL,
	`rankings` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_picklists_event` ON `pick_lists` (`organization_id`,`event_id`);--> statement-breakpoint
CREATE TABLE `pit_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`team_number` integer NOT NULL,
	`scout_user_id` text NOT NULL,
	`season_year` integer NOT NULL,
	`drivetrain` text,
	`swerve_module` text,
	`motor_types` text,
	`weight_lbs` integer,
	`dimensions` text,
	`payload` text NOT NULL,
	`photo_object_key` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scout_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_pit_team_event` ON `pit_entries` (`organization_id`,`event_id`,`team_number`);--> statement-breakpoint
CREATE TABLE `scout_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`event_id` text NOT NULL,
	`match_id` text NOT NULL,
	`team_number` integer NOT NULL,
	`scout_user_id` text NOT NULL,
	`station` text NOT NULL,
	`season_year` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`payload` text NOT NULL,
	`client_updated_at` integer NOT NULL,
	`sync_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`scout_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`season_year`) REFERENCES `seasons`(`year`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_entries_assignment` ON `scout_entries` (`organization_id`,`match_id`,`team_number`,`scout_user_id`);--> statement-breakpoint
CREATE INDEX `idx_entries_analysis` ON `scout_entries` (`organization_id`,`event_id`,`team_number`);--> statement-breakpoint
CREATE TABLE `seasons` (
	`year` integer PRIMARY KEY NOT NULL,
	`game_key` text NOT NULL,
	`schema_version` integer NOT NULL,
	`field_definition` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_users_email` ON `users` (`email`);