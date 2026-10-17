CREATE TABLE `external_api_cache` (
  `provider` text NOT NULL,
  `cache_key` text NOT NULL,
  `payload` text,
  `etag` text,
  `fetched_at` integer NOT NULL DEFAULT 0,
  `refreshing_until` integer NOT NULL DEFAULT 0,
  PRIMARY KEY (`provider`, `cache_key`)
);
