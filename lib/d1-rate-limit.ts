export function createD1RateLimitStorage(db: D1Database) {
  return {
    async consume(key: string, rule: { window: number; max: number }) {
      const now = Date.now();
      const windowMs = rule.window * 1000;
      const row = await db
        .prepare(
          `INSERT INTO rate_limits (key, count, last_request) VALUES (?, 1, ?)
           ON CONFLICT(key) DO UPDATE SET
             count = CASE
               WHEN ? - last_request >= ? THEN 1
               WHEN count < ? THEN count + 1
               ELSE ? + 1
             END,
             last_request = CASE
               WHEN ? - last_request >= ? THEN ?
               WHEN count < ? THEN ?
               ELSE last_request
             END
           RETURNING count, last_request AS lastRequest`,
        )
        .bind(
          key,
          now,
          now,
          windowMs,
          rule.max,
          rule.max,
          now,
          windowMs,
          now,
          rule.max,
          now,
        )
        .first<{ count: number; lastRequest: number }>();
      if (!row)
        throw new Error('The authentication rate limit could not be recorded.');
      const allowed = row.count <= rule.max;
      return {
        allowed,
        retryAfter: allowed
          ? null
          : Math.max(1, Math.ceil((row.lastRequest + windowMs - now) / 1000)),
      };
    },
  };
}
