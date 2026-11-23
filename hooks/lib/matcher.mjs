const SKIP_PHRASE = /\bskip pair mode\b/i;

function compile(source) {
  if (typeof source !== 'string' || !source.startsWith('^')) return null;
  try {
    return new RegExp(source, 'i');
  } catch {
    return null;
  }
}

export function matchPrompt(prompt, integrations) {
  if (typeof prompt !== 'string') return null;
  const text = prompt.trimStart();
  return integrations.find((i) => i.disabled !== true && compile(i.prompt)?.test(text)) ?? null;
}

export function hasSkipPhrase(prompt) {
  return typeof prompt === 'string' && SKIP_PHRASE.test(prompt);
}
