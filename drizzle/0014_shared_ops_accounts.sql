ALTER TABLE `users` ADD COLUMN `firebase_uid` text;
CREATE UNIQUE INDEX `idx_users_firebase_uid` ON `users` (`firebase_uid`);
