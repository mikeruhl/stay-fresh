import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './lib/config.mjs';
import { matchPrompt, matchSkill, hasSkipPhrase, skillNameFromInput } from './lib/matcher.mjs';
import { findProjectRoot } from './lib/root.mjs';
import { shouldInject } from './lib/state.mjs';

const switchValue = (env) => String(env.STAY_FRESH ?? '').toLowerCase();
const isCi = (value) => value !== undefined && !['', '0', 'false'].includes(String(value).toLowerCase());
const isUnattended = (env) =>
  env.CLAUDE_CODE_SESSION_ATTENDED === '0' || String(env.CLAUDE_CODE_ENTRYPOINT ?? '').startsWith('sdk');

function suppressedByEnvironment(env) {
  const forced = switchValue(env);
  if (forced === 'off') return true;
  if (forced === 'on') return false;
  return isCi(env.CI) || isUnattended(env);
}

function findIntegration(input, integrations) {
  if (input.hook_event_name === 'UserPromptSubmit') {
    if (hasSkipPhrase(input.prompt)) return null;
    return matchPrompt(input.prompt, integrations);
  }
  if (input.hook_event_name === 'PreToolUse' && input.tool_name === 'Skill') {
    return matchSkill(skillNameFromInput(input.tool_input), integrations);
  }
  return null;
}

function contextFor(integration) {
  return [
    `stay-fresh: pair-mode attached to ${integration.id}. Say "skip pair mode" to turn this off.`,
    `Pair mode is active for this ${integration.id} run. Its task files match ${integration.tasks}.`,
    'The stay-fresh:pair-mode skill describes how the tasks are split between the engineer and the agent.',
  ].join('\n');
}

function sessionStartContext(config) {
  const lines = [];
  if (config.tour.suggest === 'session-start') {
    lines.push('stay-fresh: the engineer\'s settings suggest a short repo tour at session start. The stay-fresh:repo-tour skill runs it. A one-line offer that the engineer can skip is enough.');
  }
  if (config.kata.suggest === 'session-start') {
    lines.push('stay-fresh: the engineer\'s settings suggest a kata at session start. The stay-fresh:kata skill runs it. A one-line offer that the engineer can skip is enough.');
  }
  return lines.join('\n');
}

function trigger(input, config) {
  if (input.hook_event_name === 'SessionStart') {
    const context = sessionStartContext(config);
    return context ? { id: 'session-start', context } : null;
  }
  const integration = findIntegration(input, config.integrations);
  return integration ? { id: integration.id, context: contextFor(integration) } : null;
}

function main() {
  if (suppressedByEnvironment(process.env)) return;
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const root = findProjectRoot({ cwd: input.cwd, env: process.env });
  const config = loadConfig({ projectDir: root, homeDir: homedir() });
  if (config._invalid || !config.enabled) return;
  const hit = trigger(input, config);
  if (!hit) return;
  const allowed = shouldInject({
    stateDir: join(root, '.stay-fresh'),
    sessionId: String(input.session_id ?? 'unknown'),
    triggerId: hit.id,
  });
  if (!allowed) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: hit.context,
    },
  }));
}

try {
  main();
} catch {
  // fail open: any error means no injection
}
process.exitCode = 0;
