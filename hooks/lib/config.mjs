import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULTS = {
  enabled: true,
  share: 'pivotal',
  max_lines_per_handoff: 30,
  max_handoffs_per_run: 3,
  scope: [],
  exclude: [],
  include: [],
  review_depth: 'coach',
  kata: { source: 'repo', suggest: 'off', after_handoffs: 3 },
  tour: { suggest: 'on-attach', max_questions: 3 },
  integrations: [
    {
      id: 'speckit',
      prompt: '^/speckit[.-]implement\\b',
      skill: '^(?:[\\w-]+:)?speckit[.-]implement$',
      tasks: 'specs/*/tasks.md',
    },
    {
      id: 'openspec',
      prompt: '^/(?:openspec[.-]apply(?:-change)?|opsx:apply)\\b',
      skill: '^(?:[\\w-]+:)?openspec-apply-change$',
      tasks: 'openspec/changes/*/tasks.md',
    },
  ],
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function mergeIntegrations(base, layer) {
  const merged = new Map(base.map((i) => [i.id, i]));
  for (const entry of layer) {
    if (isPlainObject(entry) && typeof entry.id === 'string') merged.set(entry.id, entry);
  }
  return [...merged.values()];
}

function merge(base, layer) {
  const out = { ...base };
  for (const [key, value] of Object.entries(layer)) {
    if (key === 'integrations' && Array.isArray(value)) {
      out.integrations = mergeIntegrations(base.integrations ?? [], value);
    } else if (isPlainObject(value) && isPlainObject(base[key])) {
      out[key] = merge(base[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function readLayer(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function loadConfig({ projectDir, homeDir }) {
  const project = readLayer(join(projectDir, '.stay-fresh.json'));
  const user = readLayer(join(homeDir, '.claude', 'stay-fresh.json'));
  return merge(merge(structuredClone(DEFAULTS), project), user);
}
