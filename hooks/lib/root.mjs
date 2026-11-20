import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const MARKERS = ['.stay-fresh.json', '.git'];

export function findProjectRoot({ cwd, env }) {
  const fromEnv = env.CLAUDE_PROJECT_DIR;
  if (typeof fromEnv === 'string' && fromEnv !== '') return fromEnv;
  let dir = cwd;
  for (;;) {
    if (MARKERS.some((marker) => existsSync(join(dir, marker)))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return cwd;
    dir = parent;
  }
}
