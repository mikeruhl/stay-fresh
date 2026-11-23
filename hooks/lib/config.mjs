import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DEFAULTS = {
  enabled: false,
  max_lines_per_handoff: 30,
  exclude: [],
  include: [],
  kata: { source: 'repo', suggest: 'off', after_handoffs: 3 },
  tour: { suggest: 'off', max_questions: 3 },
  integrations: [
    {
      id: 'speckit',
      prompt: '^/speckit[.-]implement\\b',
      tasks: 'specs/*/tasks.md',
    },
    {
      id: 'openspec',
      prompt: '^/(?:openspec[.-]apply(?:-change)?|opsx:apply)\\b',
      tasks: 'openspec/changes/*/tasks.md',
    },
  ],
};

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function mergeIntegrations(base, layer) {
  const merged = new Map(base.map((i) => [i.id, i]));
  for (const entry of layer) {
    if (isPlainObject(entry) && typeof entry.id === 'string') {
      merged.set(entry.id, { ...merged.get(entry.id), ...entry });
    }
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
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return { data: {}, invalid: false };
  }
  try {
    const parsed = JSON.parse(text);
    return isPlainObject(parsed) ? { data: parsed, invalid: false } : { data: {}, invalid: true };
  } catch {
    return { data: {}, invalid: true };
  }
}

const withoutIntegrations = ({ integrations, ...rest }) => rest;

/**
 * Loads defaults, then the project file, then the user file. The user file wins.
 * Project files can be committed by anyone, so their `integrations` are ignored:
 * trigger patterns run on every prompt and only the engineer may define them.
 */
export function loadConfig({ projectDir, homeDir }) {
  const project = readLayer(join(projectDir, '.stay-fresh.json'));
  const user = readLayer(join(homeDir, '.claude', 'stay-fresh.json'));
  const merged = merge(merge(structuredClone(DEFAULTS), withoutIntegrations(project.data)), user.data);
  if (project.invalid || user.invalid) merged._invalid = true;
  return merged;
}
