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
  assert.equal(DEFAULTS.enabled, false);
  assert.equal(DEFAULTS.max_lines_per_handoff, 30);
  assert.equal(DEFAULTS.kata.suggest, 'off');
  assert.equal(DEFAULTS.kata.after_handoffs, 3);
  assert.equal(DEFAULTS.tour.suggest, 'off');
  assert.equal(DEFAULTS.tour.max_questions, 3);
  assert.equal(DEFAULTS.test_command, undefined);
  assert.deepEqual(DEFAULTS.integrations.map((i) => i.id), ['speckit', 'openspec']);
});

test('project file overrides a default and leaves the rest intact', () => {
  const s = sandbox();
  s.writeProject({ include: ['parser'] });
  const cfg = loadConfig(s);
  assert.deepEqual(cfg.include, ['parser']);
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

test('arrays from a later layer replace the earlier value', () => {
  const s = sandbox();
  s.writeProject({ exclude: ['b'] });
  s.writeUser({ exclude: ['a'] });
  assert.deepEqual(loadConfig(s).exclude, ['a']);
});

test('project integrations are ignored and user integrations merge by id', () => {
  const s = sandbox();
  s.writeProject({ integrations: [{ id: 'x', prompt: '^/x', tasks: 'x/*.md' }, { id: 'openspec', prompt: '^' }] });
  s.writeUser({ integrations: [{ id: 'speckit', prompt: '^/mine', tasks: 'mine/*.md' }] });
  const byId = Object.fromEntries(loadConfig(s).integrations.map((i) => [i.id, i]));
  assert.equal(byId.x, undefined);
  assert.equal(byId.openspec.prompt, DEFAULTS.integrations[1].prompt);
  assert.equal(byId.speckit.prompt, '^/mine');
});

test('an integration override merges field by field over the default entry', () => {
  const s = sandbox();
  s.writeUser({ integrations: [{ id: 'speckit', disabled: true }] });
  const speckit = loadConfig(s).integrations.find((i) => i.id === 'speckit');
  assert.equal(speckit.disabled, true);
  assert.equal(speckit.prompt, DEFAULTS.integrations[0].prompt);
  assert.equal(speckit.tasks, DEFAULTS.integrations[0].tasks);
});

test('invalid JSON in a layer is flagged and the other layers still apply', () => {
  const s = sandbox();
  s.writeProject('{ not json');
  s.writeUser({ max_lines_per_handoff: 20 });
  const cfg = loadConfig(s);
  assert.equal(cfg._invalid, true);
  assert.equal(cfg.max_lines_per_handoff, 20);
});

test('missing files are not flagged as invalid', () => {
  assert.equal('_invalid' in loadConfig(sandbox()), false);
});

test('project directories containing spaces work', () => {
  const s = sandbox('sf config spaces');
  s.writeProject({ enabled: true });
  assert.equal(loadConfig(s).enabled, true);
});
