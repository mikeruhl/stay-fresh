const SKIP_PHRASE = /\bskip pair mode\b/i;

function compile(source) {
  try {
    return new RegExp(source, 'i');
  } catch {
    return null;
  }
}

function firstMatch(text, integrations, field) {
  if (typeof text !== 'string' || text === '') return null;
  for (const integration of integrations) {
    const pattern = compile(integration[field]);
    if (pattern && pattern.test(text)) return integration;
  }
  return null;
}

export function matchPrompt(prompt, integrations) {
  return firstMatch(typeof prompt === 'string' ? prompt.trimStart() : '', integrations, 'prompt');
}

export function matchSkill(skillName, integrations) {
  return firstMatch(skillName, integrations, 'skill');
}

export function hasSkipPhrase(prompt) {
  return typeof prompt === 'string' && SKIP_PHRASE.test(prompt);
}

export function skillNameFromInput(toolInput) {
  if (toolInput === null || typeof toolInput !== 'object') return '';
  for (const key of ['skill', 'name', 'command']) {
    if (typeof toolInput[key] === 'string') return toolInput[key];
  }
  return Object.values(toolInput).find((v) => typeof v === 'string') ?? '';
}
