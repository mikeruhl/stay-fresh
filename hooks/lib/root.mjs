import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const MARKERS = ['.stay-fresh.json', '.git'];

const samePath = (a, b) => relative(a, b) === '';

export function findProjectRoot({ cwd = process.cwd(), env, homeDir }) {
  const fromEnv = env.CLAUDE_PROJECT_DIR;
  if (typeof fromEnv === 'string' && fromEnv !== '') return fromEnv;
  const start = resolve(cwd);
  for (let dir = start; ; dir = dirname(dir)) {
    if (dir !== start && homeDir && samePath(dir, homeDir)) return start;
    if (MARKERS.some((marker) => existsSync(join(dir, marker)))) return dir;
    if (dirname(dir) === dir) return start;
  }
}
