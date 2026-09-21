import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findWebhookEventKey,
  parseTbaWebhook,
  verifyTbaWebhook,
} from '../lib/tba-webhook.ts';

void test('verifies TBA HMAC signatures over the exact raw body', async () => {
  assert.equal(
    await verifyTbaWebhook(
      'Hello, World!',
      '757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17',
      "It's a Secret to Everybody",
    ),
    true,
  );
  assert.equal(
    await verifyTbaWebhook(
      'Hello, World?',
      '757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17',
      "It's a Secret to Everybody",
    ),
    false,
  );
});

void test('parses webhook payloads and finds nested event keys', () => {
  const payload = parseTbaWebhook(
    JSON.stringify({
      message_type: 'match_score',
      message_data: { match: { event_key: '2026vablacksburg' } },
    }),
  );
  assert.equal(payload?.message_type, 'match_score');
  assert.equal(findWebhookEventKey(payload?.message_data), '2026vablacksburg');
  assert.equal(findWebhookEventKey({ event_key: '../bad' }), null);
  assert.equal(parseTbaWebhook('{}'), null);
});
