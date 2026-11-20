import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { shouldInject } from '../lib/state.mjs';

const HOUR = 60 * 60 * 1000;
const freshDir = () => join(mkdtempSync(join(tmpdir(), 'sf-state ')), '.stay-fresh');
const args = (stateDir, over = {}) => ({ stateDir, sessionId: 's1', triggerId: 'speckit', now: 1_000_000, ...over });

test('first call for a session and trigger injects, repeat does not', () => {
  const dir = freshDir();
  assert.equal(shouldInject(args(dir)), true);
  assert.equal(shouldInject(args(dir)), false);
});

test('another session or another trigger injects independently', () => {
  const dir = freshDir();
  assert.equal(shouldInject(args(dir)), true);
  assert.equal(shouldInject(args(dir, { sessionId: 's2' })), true);
  assert.equal(shouldInject(args(dir, { triggerId: 'openspec' })), true);
});

test('markers older than 24 hours are pruned so the pair injects again', () => {
  const dir = freshDir();
  assert.equal(shouldInject(args(dir)), true);
  assert.equal(shouldInject(args(dir, { now: 1_000_000 + 25 * HOUR })), true);
});

test('a marker younger than 24 hours still blocks', () => {
  const dir = freshDir();
  assert.equal(shouldInject(args(dir)), true);
  assert.equal(shouldInject(args(dir, { now: 1_000_000 + 23 * HOUR })), false);
});

test('existing areas entries survive an injection', () => {
  const dir = freshDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ areas: { 'src/api': '2026-01-01' } }));
  assert.equal(shouldInject(args(dir)), true);
  const saved = JSON.parse(readFileSync(join(dir, 'state.json'), 'utf8'));
  assert.deepEqual(saved.areas, { 'src/api': '2026-01-01' });
  assert.ok(saved.injected['s1|speckit']);
});

test('a corrupt state file is treated as empty', () => {
  const dir = freshDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'state.json'), '{ nope');
  assert.equal(shouldInject(args(dir)), true);
});

test('an uncreatable state directory fails open with no injection', () => {
  const base = mkdtempSync(join(tmpdir(), 'sf-state-file '));
  const blocker = join(base, 'blocker');
  writeFileSync(blocker, 'regular file');
  assert.equal(shouldInject(args(join(blocker, '.stay-fresh'))), false);
});
