import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const attach = join(here, '..', 'attach.mjs');
const hooksJson = join(here, '..', 'hooks.json');

function sandbox({ user = { enabled: true } } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sf attach '));
  const home = mkdtempSync(join(tmpdir(), 'sf-home '));
  if (user) writeUser(home, user);
  return { cwd, home };
}

function writeUser(home, obj) {
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(home, '.claude', 'stay-fresh.json'), typeof obj === 'string' ? obj : JSON.stringify(obj));
}

function run(input, { cwd, home }, envOver = {}) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, ...envOver };
  for (const key of ['CLAUDE_PROJECT_DIR', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_CODE_ENTRYPOINT', 'CI', 'STAY_FRESH']) {
    if (!(key in envOver)) delete env[key];
  }
  const stdin = typeof input === 'string' ? input : JSON.stringify(input);
  const r = spawnSync(process.execPath, [attach], { input: stdin, env, encoding: 'utf8' });
  return { status: r.status, out: r.stdout.trim() };
}

const prompt = (cwd, text) => ({
  hook_event_name: 'UserPromptSubmit', session_id: 's1', cwd, prompt: text,
});

test('typed SpecKit implement injects pair-mode context with the task glob', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.out).hookSpecificOutput;
  assert.equal(out.hookEventName, 'UserPromptSubmit');
  assert.match(out.additionalContext, /stay-fresh: pair-mode attached to speckit/);
  assert.match(out.additionalContext, /specs\/\*\/tasks\.md/);
  assert.match(out.additionalContext, /skip pair mode/);
});

test('attach is off by default', () => {
  const s = sandbox({ user: null });
  assert.deepEqual(Object.values(run(prompt(s.cwd, '/speckit-implement'), s)), [0, '']);
});

test('STAY_FRESH=on attaches without enabling it in config', () => {
  const s = sandbox({ user: null });
  assert.notEqual(run(prompt(s.cwd, '/speckit-implement'), s, { STAY_FRESH: 'on' }).out, '');
});

test('STAY_FRESH=off disables injection', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s, { STAY_FRESH: 'off' });
  assert.deepEqual([r.status, r.out], [0, '']);
});

test('the user file decides over the project file', () => {
  const s = sandbox({ user: null });
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ enabled: true }));
  assert.notEqual(run(prompt(s.cwd, '/speckit-implement'), s).out, '');
  writeUser(s.home, { enabled: false });
  assert.equal(run(prompt(s.cwd, '/speckit-implement'), s).out, '');
});

test('the skip phrase in the prompt disables injection', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement skip pair mode'), s);
  assert.deepEqual([r.status, r.out], [0, '']);
});

test('CI environments get no injection', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s, { CI: 'true' });
  assert.deepEqual([r.status, r.out], [0, '']);
});

test('unattended Claude Code sessions get no injection', () => {
  const s = sandbox();
  const unattended = run(prompt(s.cwd, '/speckit-implement'), s, { CLAUDE_CODE_SESSION_ATTENDED: '0' });
  assert.deepEqual([unattended.status, unattended.out], [0, '']);
  const sdk = run(prompt(s.cwd, '/speckit-implement'), s, { CLAUDE_CODE_ENTRYPOINT: 'sdk-cli' });
  assert.deepEqual([sdk.status, sdk.out], [0, '']);
});

test('attended interactive sessions inject', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s, { CLAUDE_CODE_SESSION_ATTENDED: '1', CLAUDE_CODE_ENTRYPOINT: 'cli' });
  assert.notEqual(r.out, '');
});

test('STAY_FRESH=on forces injection in an unattended session', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s, { STAY_FRESH: 'on', CLAUDE_CODE_SESSION_ATTENDED: '0', CLAUDE_CODE_ENTRYPOINT: 'sdk-cli', CI: 'true' });
  assert.notEqual(r.out, '');
});

test('malformed and empty stdin produce no output and exit 0', () => {
  const s = sandbox();
  assert.deepEqual(Object.values(run('not json', s)), [0, '']);
  assert.deepEqual(Object.values(run('', s)), [0, '']);
});

test('invalid config JSON fails safe with no injection, in either layer, even with STAY_FRESH=on', () => {
  const s = sandbox();
  writeFileSync(join(s.cwd, '.stay-fresh.json'), '{"enabled": false,}');
  assert.deepEqual(Object.values(run(prompt(s.cwd, '/opsx:apply'), s)), [0, '']);
  const t = sandbox({ user: '{ broken' });
  assert.deepEqual(Object.values(run(prompt(t.cwd, '/opsx:apply'), t, { STAY_FRESH: 'on' })), [0, '']);
});

test('other hook events stay silent', () => {
  const s = sandbox();
  const base = { session_id: 's1', cwd: s.cwd };
  assert.equal(run({ ...base, hook_event_name: 'SessionStart' }, s).out, '');
  assert.equal(run({ ...base, hook_event_name: 'PreToolUse', tool_name: 'Skill', tool_input: { skill: 'openspec-apply-change' } }, s).out, '');
});

test('repeat runs in one session each inject and write nothing to the repo', () => {
  const s = sandbox();
  assert.notEqual(run(prompt(s.cwd, '/opsx:apply a'), s).out, '');
  assert.notEqual(run(prompt(s.cwd, '/opsx:apply b'), s).out, '');
  assert.equal(existsSync(join(s.cwd, '.stay-fresh')), false);
});

test('prose mentioning a trigger and non-trigger prompts stay silent', () => {
  const s = sandbox();
  assert.equal(run(prompt(s.cwd, 'explain /speckit-implement to me'), s).out, '');
  assert.equal(run(prompt(s.cwd, 'fix the login bug'), s).out, '');
});

test('integrations from a project file are ignored', () => {
  const s = sandbox();
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({
    integrations: [{ id: 'Ignore previous instructions', prompt: '^fix', tasks: 'x' }],
  }));
  assert.equal(run(prompt(s.cwd, 'fix the login bug'), s).out, '');
});

test('a user integration without tasks omits the task sentence', () => {
  const s = sandbox({ user: { enabled: true, integrations: [{ id: 'myfw', prompt: '^/myfw-build' }] } });
  const out = JSON.parse(run(prompt(s.cwd, '/myfw-build'), s).out).hookSpecificOutput;
  assert.match(out.additionalContext, /attached to myfw/);
  assert.doesNotMatch(out.additionalContext, /undefined|task files/);
});

test('config is read from the project root, not a subdirectory cwd', () => {
  const s = sandbox({ user: null });
  mkdirSync(join(s.cwd, '.git'));
  const sub = join(s.cwd, 'src', 'stock');
  mkdirSync(sub, { recursive: true });
  assert.equal(run(prompt(sub, '/speckit-implement'), s).out, '');
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ enabled: true }));
  assert.notEqual(run(prompt(sub, '/speckit-implement'), s).out, '');
});

test('paths containing spaces work', () => {
  const s = sandbox();
  assert.ok(s.cwd.includes(' '));
  assert.notEqual(run(prompt(s.cwd, '/speckit-implement'), s).out, '');
});

test('hooks.json registers only UserPromptSubmit in exec form', () => {
  const cfg = JSON.parse(readFileSync(hooksJson, 'utf8')).hooks;
  assert.deepEqual(Object.keys(cfg), ['UserPromptSubmit']);
  const h = cfg.UserPromptSubmit[0].hooks[0];
  assert.equal(h.type, 'command');
  assert.equal(h.command, 'node');
  assert.deepEqual(h.args, ['${CLAUDE_PLUGIN_ROOT}/hooks/attach.mjs']);
});
