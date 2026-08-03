import assert from 'node:assert/strict';
import test from 'node:test';

import { assertReleaseTag } from './verify-release-tag.mjs';

test('accepts the exact v-prefixed package version', () => {
  assert.doesNotThrow(() => assertReleaseTag('v26.8.0-beta.0', '26.8.0-beta.0'));
});

test('rejects a different prerelease version', () => {
  assert.throws(
    () => assertReleaseTag('v26.8.0-beta.1', '26.8.0-beta.0'),
    /expected v26\.8\.0-beta\.0.*received v26\.8\.0-beta\.1/i,
  );
});

test('rejects a tag without the v prefix', () => {
  assert.throws(
    () => assertReleaseTag('26.8.0-beta.0', '26.8.0-beta.0'),
    /expected v26\.8\.0-beta\.0.*received 26\.8\.0-beta\.0/i,
  );
});

test('rejects a malformed tag containing a slash', () => {
  assert.throws(
    () => assertReleaseTag('release/v26.8.0-beta.0', '26.8.0-beta.0'),
    /expected v26\.8\.0-beta\.0.*received release\/v26\.8\.0-beta\.0/i,
  );
});

test('rejects an empty tag', () => {
  assert.throws(
    () => assertReleaseTag('', '26.8.0-beta.0'),
    /expected v26\.8\.0-beta\.0.*received an empty tag/i,
  );
});
