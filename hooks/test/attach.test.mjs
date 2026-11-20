import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const attach = join(here, '..', 'attach.mjs');
const hooksJson = join(here, '..', 'hooks.json');

function sandbox() {
  const cwd = mkdtempSync(join(tmpdir(), 'sf attach '));
  const home = mkdtempSync(join(tmpdir(), 'sf-home '));
  return { cwd, home };
}

function run(input, { cwd, home }, envOver = {}) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, ...envOver };
  for (const [k, v] of Object.entries(envOver)) if (v === undefined) delete env[k];
  if (!('CI' in envOver)) delete env.CI;
  if (!('STAY_FRESH' in envOver)) delete env.STAY_FRESH;
  const stdin = typeof input === 'string' ? input : JSON.stringify(input);
  const r = spawnSync(process.execPath, [attach], { input: stdin, env, encoding: 'utf8' });
  return { status: r.status, out: r.stdout.trim() };
}

const prompt = (cwd, text, session = 's1') => ({
  hook_event_name: 'UserPromptSubmit', session_id: session, cwd, prompt: text,
});

test('typed SpecKit implement injects pair-mode context with the task glob', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s);
  assert.equal(r.status, 0);
  const out = JSON.parse(r.out).hookSpecificOutput;
  assert.equal(out.hookEventName, 'UserPromptSubmit');
  assert.match(out.additionalContext, /stay-fresh: pair-mode attached to speckit/);
  assert.match(out.additionalContext, /specs\/\*\/tasks\.md/);
  assert.match(out.additionalContext, /pair-mode/);
  assert.match(out.additionalContext, /skip pair mode/);
});

test('STAY_FRESH=off disables injection', () => {
  const s = sandbox();
  const r = run(prompt(s.cwd, '/speckit-implement'), s, { STAY_FRESH: 'off' });
  assert.deepEqual([r.status, r.out], [0, '']);
});

test('enabled:false in the project config disables injection', () => {
  const s = sandbox();
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ enabled: false }));
  assert.deepEqual(Object.values(run(prompt(s.cwd, '/speckit-implement'), s)), [0, '']);
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

test('malformed and empty stdin produce no output and exit 0', () => {
  const s = sandbox();
  assert.deepEqual(Object.values(run('not json', s)), [0, '']);
  assert.deepEqual(Object.values(run('', s)), [0, '']);
});

test('invalid project config JSON does not break injection', () => {
  const s = sandbox();
  writeFileSync(join(s.cwd, '.stay-fresh.json'), '{ broken');
  const r = run(prompt(s.cwd, '/opsx:apply'), s);
  assert.match(JSON.parse(r.out).hookSpecificOutput.additionalContext, /attached to openspec/);
});

test('agent-invoked framework skill injects with the PreToolUse event name', () => {
  const s = sandbox();
  const r = run({
    hook_event_name: 'PreToolUse', session_id: 's1', cwd: s.cwd,
    tool_name: 'Skill', tool_input: { skill: 'openspec-apply-change' },
  }, s);
  const out = JSON.parse(r.out).hookSpecificOutput;
  assert.equal(out.hookEventName, 'PreToolUse');
  assert.match(out.additionalContext, /openspec/);
});

test('PreToolUse for another tool or an unrelated skill stays silent', () => {
  const s = sandbox();
  const base = { hook_event_name: 'PreToolUse', session_id: 's1', cwd: s.cwd };
  assert.equal(run({ ...base, tool_name: 'Bash', tool_input: { command: 'speckit-implement' } }, s).out, '');
  assert.equal(run({ ...base, tool_name: 'Skill', tool_input: { skill: 'superpowers:brainstorming' } }, s).out, '');
});

test('an identical second call in the same session is silent', () => {
  const s = sandbox();
  assert.notEqual(run(prompt(s.cwd, '/speckit-implement'), s).out, '');
  assert.equal(run(prompt(s.cwd, '/speckit-implement'), s).out, '');
  assert.notEqual(run(prompt(s.cwd, '/speckit-implement', 's2'), s).out, '');
});

test('prose mentioning a trigger and non-trigger prompts stay silent', () => {
  const s = sandbox();
  assert.equal(run(prompt(s.cwd, 'explain /speckit-implement to me'), s).out, '');
  assert.equal(run(prompt(s.cwd, 'fix the login bug'), s).out, '');
});

test('paths containing spaces work', () => {
  const s = sandbox();
  assert.ok(s.cwd.includes(' '));
  assert.notEqual(run(prompt(s.cwd, '/speckit-implement'), s).out, '');
});

const sessionStart = (cwd, session = 's1') => ({
  hook_event_name: 'SessionStart', session_id: session, cwd,
});

test('SessionStart offers a tour when tour.suggest is session-start', () => {
  const s = sandbox();
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ tour: { suggest: 'session-start' } }));
  const out = JSON.parse(run(sessionStart(s.cwd), s).out).hookSpecificOutput;
  assert.equal(out.hookEventName, 'SessionStart');
  assert.match(out.additionalContext, /stay-fresh:repo-tour/);
  assert.doesNotMatch(out.additionalContext, /stay-fresh:kata/);
});

test('SessionStart offers a kata when kata.suggest is session-start', () => {
  const s = sandbox();
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ kata: { suggest: 'session-start' } }));
  const out = JSON.parse(run(sessionStart(s.cwd), s).out).hookSpecificOutput;
  assert.match(out.additionalContext, /stay-fresh:kata/);
});

test('SessionStart is silent with default settings, when disabled, and on repeat', () => {
  const s = sandbox();
  assert.equal(run(sessionStart(s.cwd), s).out, '');
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ tour: { suggest: 'session-start' } }));
  assert.notEqual(run(sessionStart(s.cwd), s).out, '');
  assert.equal(run(sessionStart(s.cwd), s).out, '');
  assert.equal(run(sessionStart(s.cwd, 's2'), s, { STAY_FRESH: 'off' }).out, '');
  writeFileSync(join(s.cwd, '.stay-fresh.json'), JSON.stringify({ enabled: false, tour: { suggest: 'session-start' } }));
  assert.equal(run(sessionStart(s.cwd, 's3'), s).out, '');
});

test('hooks.json registers all three events in exec form', () => {
  const cfg = JSON.parse(readFileSync(hooksJson, 'utf8')).hooks;
  const submit = cfg.UserPromptSubmit[0].hooks[0];
  const start = cfg.SessionStart[0].hooks[0];
  const pre = cfg.PreToolUse[0];
  assert.equal(pre.matcher, 'Skill');
  for (const h of [submit, start, pre.hooks[0]]) {
    assert.equal(h.type, 'command');
    assert.equal(h.command, 'node');
    assert.deepEqual(h.args, ['${CLAUDE_PLUGIN_ROOT}/hooks/attach.mjs']);
  }
});
