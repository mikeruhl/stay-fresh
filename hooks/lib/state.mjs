import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function readState(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function shouldInject({ stateDir, sessionId, triggerId, now = Date.now() }) {
  try {
    const file = join(stateDir, 'state.json');
    const state = readState(file);
    const injected = Object.fromEntries(
      Object.entries(state.injected ?? {}).filter(([, at]) => now - at < MAX_AGE_MS),
    );
    const key = `${sessionId}|${triggerId}`;
    if (key in injected) return false;
    injected[key] = now;
    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, '.gitignore'), '*\n');
    writeFileSync(file,JSON.stringify({ ...state, injected }, null, 2));
    return true;
  } catch {
    return false;
  }
}
