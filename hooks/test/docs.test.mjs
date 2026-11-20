import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULTS } from '../lib/config.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const EM_DASH = String.fromCharCode(0x2014);

function configKeys() {
  const keys = ['test_command'];
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const inner of Object.keys(value)) keys.push(`${key}.${inner}`);
    } else {
      keys.push(key);
    }
  }
  return keys;
}

function shippedFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (['node_modules', '.git', '.superpowers'].includes(name)) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) shippedFiles(path, out);
    else if (['.md', '.mjs', '.json'].includes(extname(name))) out.push(path);
  }
  return out;
}

test('config-schema.md documents every config key', () => {
  const doc = read('shared/config-schema.md');
  for (const key of configKeys()) {
    assert.ok(doc.includes(`\`${key}\``), `missing ${key}`);
  }
});

test('coaching-protocol.md names each rung of the ladder', () => {
  const doc = read('shared/coaching-protocol.md').toLowerCase();
  for (const rung of ['question', 'hint', 'pointed hint', 'worked sketch', 'full solution']) {
    assert.ok(doc.includes(rung), `missing rung ${rung}`);
  }
});

test('pivotal-selection.md carries the decision test and the default exclusions', () => {
  const doc = read('shared/pivotal-selection.md').toLowerCase();
  for (const phrase of ['decision', 'dto', 'dependency injection', 'include', 'exclude', 'flow walk']) {
    assert.ok(doc.includes(phrase), `missing ${phrase}`);
  }
});

test('the handoff records a content hash and the unchanged check compares against it', () => {
  assert.ok(read('shared/config-schema.md').includes('"hash"'));
  const protocol = read('shared/coaching-protocol.md');
  assert.match(protocol, /hash/i);
  assert.doesNotMatch(protocol, /diff since the recorded git HEAD/);
  const skill = read('skills/pair-mode/SKILL.md');
  assert.match(skill, /git hash-object/);
  assert.match(skill, /`hash`/);
});

test('pair-mode relays the attach announcement as its first output', () => {
  const skill = read('skills/pair-mode/SKILL.md');
  assert.match(skill, /Announce/);
  assert.match(skill, /skip pair mode/);
});

test('no shipped file contains an em dash', () => {
  const offenders = shippedFiles(root).filter((f) => readFileSync(f, 'utf8').includes(EM_DASH));
  assert.deepEqual(offenders, []);
});
