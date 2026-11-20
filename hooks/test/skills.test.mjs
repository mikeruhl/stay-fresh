import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills');
const skillNames = existsSync(skillsDir) ? readdirSync(skillsDir) : [];

function frontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(match, 'missing frontmatter');
  return Object.fromEntries(
    match[1].split(/\r?\n/).map((line) => {
      const i = line.indexOf(':');
      return [line.slice(0, i).trim(), line.slice(i + 1).trim()];
    }),
  );
}

test('at least the pair-mode skill ships', () => {
  assert.ok(skillNames.includes('pair-mode'));
});

for (const name of skillNames) {
  test(`skill ${name} has matching name and a "Use when" description`, () => {
    const fm = frontmatter(readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8'));
    assert.equal(fm.name, name);
    assert.ok(fm.description.startsWith('Use when'), fm.description);
    assert.ok(fm.description.length <= 1024);
  });
}
