import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';
import { findProjectRoot } from '../lib/root.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'sf root '));

test('CLAUDE_PROJECT_DIR wins when set', () => {
  const base = tmp();
  const sub = join(base, 'a', 'b');
  mkdirSync(sub, { recursive: true });
  assert.equal(findProjectRoot({ cwd: sub, env: { CLAUDE_PROJECT_DIR: base } }), base);
});

test('walks up from a subdirectory to the directory holding .git', () => {
  const base = tmp();
  mkdirSync(join(base, '.git'));
  const sub = join(base, 'src', 'stock');
  mkdirSync(sub, { recursive: true });
  assert.equal(findProjectRoot({ cwd: sub, env: {} }), base);
});

test('finds the nearest .stay-fresh.json even without git', () => {
  const base = tmp();
  writeFileSync(join(base, '.stay-fresh.json'), '{}');
  const sub = join(base, 'deep', 'er');
  mkdirSync(sub, { recursive: true });
  assert.equal(findProjectRoot({ cwd: sub, env: {} }), base);
});

test('falls back to cwd when no marker exists above it', () => {
  const base = tmp();
  assert.equal(findProjectRoot({ cwd: base, env: {} }), base);
});

test('an empty CLAUDE_PROJECT_DIR is ignored', () => {
  const base = tmp();
  mkdirSync(join(base, '.git'));
  const sub = join(base, 'x');
  mkdirSync(sub);
  assert.equal(findProjectRoot({ cwd: sub, env: { CLAUDE_PROJECT_DIR: '' } }), base);
});

test('the walk stops below the home directory even when home is a git repo', () => {
  const home = tmp();
  mkdirSync(join(home, '.git'));
  const sub = join(home, 'scratch', 'x');
  mkdirSync(sub, { recursive: true });
  assert.equal(findProjectRoot({ cwd: sub, env: {}, homeDir: home }), sub);
});

test('the home directory itself can be the project root', () => {
  const home = tmp();
  mkdirSync(join(home, '.git'));
  assert.equal(findProjectRoot({ cwd: home, env: {}, homeDir: home }), home);
});

test('a drive or filesystem root resolves to itself', () => {
  const root = parse(tmpdir()).root;
  assert.equal(typeof findProjectRoot({ cwd: root, env: {} }), 'string');
});

test('a missing cwd falls back to the process directory', () => {
  assert.equal(typeof findProjectRoot({ cwd: undefined, env: {} }), 'string');
});
