import assert from 'node:assert/strict';
import test from 'node:test';
import type { PendingMutation, RelayDevice } from '../lib/offline-db.ts';
import { createRelayFrames, parseRelayFrame } from '../lib/qr-relay.ts';

void test('creates one QR frame for one normal match submission', async () => {
  const keys = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify'],
  );
  const device: RelayDevice = {
    id: 'qr-relay',
    deviceId: 'test-device',
    privateKey: keys.privateKey,
    publicKey: await crypto.subtle.exportKey('jwk', keys.publicKey),
    registered: true,
  };
  const mutation: PendingMutation = {
    id: 'entry:test',
    organizationId: 'team-401',
    entity: 'scoutEntry',
    operation: 'upsert',
    createdAt: Date.now(),
    attempts: 0,
    payload: {
      eventKey: '2026vabla',
      matchKey: '2026vabla_qm1',
      teamNumber: 401,
      station: 'red1',
      seasonYear: 2026,
      schemaVersion: 1,
      autoFuel: 12,
      activeFuel: 35,
      inactiveFuel: 4,
      cycles: 7,
      autoTower: 'None',
      tower: 'Level 2',
      notes: 'Consistent scoring with brief defense in the middle of teleop.',
    },
  };

  const frames = await createRelayFrames(device, 'team-401', '2026vabla', [
    mutation,
  ]);
  assert.equal(frames.length, 1);
  assert.equal(parseRelayFrame(frames[0]).total, 1);
});
