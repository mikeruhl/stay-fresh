import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { loadConfig } from './lib/config.mjs';
import { matchPrompt, hasSkipPhrase } from './lib/matcher.mjs';
import { findProjectRoot } from './lib/root.mjs';

const switchValue = (env) => String(env.STAY_FRESH ?? '').toLowerCase();
const isCi = (value) => value !== undefined && !['', '0', 'false'].includes(String(value).toLowerCase());
const isUnattended = (env) =>
  env.CLAUDE_CODE_SESSION_ATTENDED === '0' || String(env.CLAUDE_CODE_ENTRYPOINT ?? '').startsWith('sdk');

function attachAllowed(env, config) {
  if (config._invalid) return false;
  if (switchValue(env) === 'on') return true;
  return config.enabled === true && !isCi(env.CI) && !isUnattended(env);
}

function contextFor(integration) {
  const lines = [`stay-fresh: pair-mode attached to ${integration.id}. Say "skip pair mode" to turn this off.`];
  if (typeof integration.tasks === 'string' && integration.tasks !== '') {
    lines.push(`Its task files match ${integration.tasks}.`);
  }
  lines.push('The stay-fresh:pair-mode skill describes which tasks the engineer writes by hand while the framework skill runs.');
  return lines.join('\n');
}

function main() {
  if (switchValue(process.env) === 'off') return;
  const input = JSON.parse(readFileSync(0, 'utf8'));
  if (input.hook_event_name !== 'UserPromptSubmit' || hasSkipPhrase(input.prompt)) return;
  const home = homedir();
  const root = findProjectRoot({ cwd: input.cwd, env: process.env, homeDir: home });
  const config = loadConfig({ projectDir: root, homeDir: home });
  if (!attachAllowed(process.env, config)) return;
  const integration = matchPrompt(input.prompt, config.integrations);
  if (!integration) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: contextFor(integration),
    },
  }));
}

try {
  main();
} catch {
  // fail safe: any error means no injection
}
process.exitCode = 0;
