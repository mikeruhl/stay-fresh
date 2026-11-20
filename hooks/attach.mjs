import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './lib/config.mjs';
import { matchPrompt, matchSkill, hasSkipPhrase, skillNameFromInput } from './lib/matcher.mjs';
import { shouldInject } from './lib/state.mjs';

const isOff = (value) => String(value ?? '').toLowerCase() === 'off';
const isCi = (value) => value !== undefined && !['', '0', 'false'].includes(String(value).toLowerCase());

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

function main() {
  if (isOff(process.env.STAY_FRESH) || isCi(process.env.CI)) return;
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const config = loadConfig({ projectDir: input.cwd, homeDir: homedir() });
  if (!config.enabled) return;
  const integration = findIntegration(input, config.integrations);
  if (!integration) return;
  const allowed = shouldInject({
    stateDir: join(input.cwd, '.stay-fresh'),
    sessionId: String(input.session_id ?? 'unknown'),
    triggerId: integration.id,
  });
  if (!allowed) return;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      additionalContext: contextFor(integration),
    },
  }));
}

try {
  main();
} catch {
  // fail open: any error means no injection
}
process.exitCode = 0;
