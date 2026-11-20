import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEFAULTS, loadConfig } from '../lib/config.mjs';

function sandbox(name = 'sf-config') {
  const projectDir = mkdtempSync(join(tmpdir(), `${name} `));
  const homeDir = mkdtempSync(join(tmpdir(), `${name}-home `));
  mkdirSync(join(homeDir, '.claude'), { recursive: true });
  return {
    projectDir,
    homeDir,
    writeProject: (obj) => writeFileSync(join(projectDir, '.stay-fresh.json'), typeof obj === 'string' ? obj : JSON.stringify(obj)),
    writeUser: (obj) => writeFileSync(join(homeDir, '.claude', 'stay-fresh.json'), typeof obj === 'string' ? obj : JSON.stringify(obj)),
  };
}

test('no config files yields the defaults', () => {
  const s = sandbox();
  assert.deepEqual(loadConfig(s), DEFAULTS);
});

test('defaults carry the documented values', () => {
  assert.equal(DEFAULTS.enabled, true);
  assert.equal(DEFAULTS.share, 'pivotal');
  assert.equal(DEFAULTS.max_lines_per_handoff, 30);
  assert.equal(DEFAULTS.max_handoffs_per_run, 3);
  assert.equal(DEFAULTS.kata.suggest, 'off');
  assert.equal(DEFAULTS.kata.after_handoffs, 3);
  assert.equal(DEFAULTS.tour.max_questions, 3);
  assert.equal(DEFAULTS.test_command, undefined);
  assert.deepEqual(DEFAULTS.integrations.map((i) => i.id), ['speckit', 'openspec']);
});

test('project file overrides a default and leaves the rest intact', () => {
  const s = sandbox();
  s.writeProject({ share: 40 });
  const cfg = loadConfig(s);
  assert.equal(cfg.share, 40);
  assert.equal(cfg.max_lines_per_handoff, 30);
});

test('user file wins over project file', () => {
  const s = sandbox();
  s.writeProject({ max_lines_per_handoff: 50 });
  s.writeUser({ max_lines_per_handoff: 10 });
  assert.equal(loadConfig(s).max_lines_per_handoff, 10);
});

test('nested objects deep-merge', () => {
  const s = sandbox();
  s.writeProject({ kata: { source: 'generic' } });
  const cfg = loadConfig(s);
  assert.equal(cfg.kata.source, 'generic');
  assert.equal(cfg.kata.suggest, 'off');
});

test('scope from the user file replaces the project value', () => {
  const s = sandbox();
  s.writeProject({ scope: ['b'] });
  s.writeUser({ scope: ['a'] });
  assert.deepEqual(loadConfig(s).scope, ['a']);
});

test('integrations merge by id with the user entry winning', () => {
  const s = sandbox();
  s.writeProject({ integrations: [{ id: 'x', prompt: '^/x', skill: '^x$', tasks: 'x/*.md' }] });
  s.writeUser({ integrations: [{ id: 'speckit', prompt: '^/mine', skill: '^mine$', tasks: 'mine/*.md' }] });
  const byId = Object.fromEntries(loadConfig(s).integrations.map((i) => [i.id, i]));
  assert.ok(byId.x);
  assert.equal(byId.speckit.prompt, '^/mine');
  assert.ok(byId.openspec);
});

test('invalid JSON in a layer is ignored and the other layers still apply', () => {
  const s = sandbox();
  s.writeProject('{ not json');
  s.writeUser({ share: 25 });
  const cfg = loadConfig(s);
  assert.equal(cfg.share, 25);
  assert.equal(cfg.enabled, true);
});

test('project directories containing spaces work', () => {
  const s = sandbox('sf config spaces');
  s.writeProject({ enabled: false });
  assert.equal(loadConfig(s).enabled, false);
});
