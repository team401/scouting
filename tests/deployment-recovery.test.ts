import assert from 'node:assert/strict';
import test from 'node:test';
import { isChunkFailureDetails } from '../lib/deployment-recovery.ts';

void test('recognizes failed versioned assets and dynamic imports', () => {
  assert.equal(
    isChunkFailureDetails(
      'Failed to load https://scout.team401.org/_next/static/chunks/page-abc.js',
    ),
    true,
  );
  assert.equal(
    isChunkFailureDetails('error loading dynamically imported module'),
    true,
  );
  assert.equal(isChunkFailureDetails('ordinary API request failed'), false);
});
