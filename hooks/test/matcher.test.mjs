import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../lib/config.mjs';
import { matchPrompt, hasSkipPhrase } from '../lib/matcher.mjs';

const integrations = DEFAULTS.integrations;

test('matchPrompt recognizes SpecKit implement in hyphen and dot forms', () => {
  assert.equal(matchPrompt('/speckit-implement', integrations).id, 'speckit');
  assert.equal(matchPrompt('/speckit.implement now', integrations).id, 'speckit');
  assert.equal(matchPrompt('   /speckit-implement', integrations).id, 'speckit');
});

test('matchPrompt recognizes OpenSpec apply in all installed forms', () => {
  assert.equal(matchPrompt('/openspec-apply-change my-change', integrations).id, 'openspec');
  assert.equal(matchPrompt('/openspec-apply foo', integrations).id, 'openspec');
  assert.equal(matchPrompt('/opsx:apply', integrations).id, 'openspec');
});

test('matchPrompt ignores trigger text inside ordinary prose', () => {
  assert.equal(matchPrompt('please explain /speckit-implement', integrations), null);
  assert.equal(matchPrompt('what does /opsx:apply do', integrations), null);
});

test('matchPrompt ignores near misses', () => {
  assert.equal(matchPrompt('/speckit-implementation', integrations), null);
  assert.equal(matchPrompt('/speckit-plan', integrations), null);
});

test('invalid regex sources are skipped instead of thrown', () => {
  const bad = [{ id: 'bad', prompt: '^(', tasks: 'x' }, ...integrations];
  assert.equal(matchPrompt('/opsx:apply', bad).id, 'openspec');
});

test('unanchored, missing, or empty patterns never match', () => {
  const partial = [
    { id: 'unanchored', prompt: '/myfw-build', tasks: 'x' },
    { id: 'missing', tasks: 'x' },
    { id: 'empty', prompt: '', tasks: 'x' },
  ];
  assert.equal(matchPrompt('please /myfw-build', partial), null);
  assert.equal(matchPrompt('/myfw-build', partial), null);
  assert.equal(matchPrompt('fix the login bug', partial), null);
});

test('a disabled entry never matches', () => {
  const off = [{ ...integrations[0], disabled: true }, integrations[1]];
  assert.equal(matchPrompt('/speckit-implement', off), null);
  assert.equal(matchPrompt('/opsx:apply', off).id, 'openspec');
});

test('non-string prompts never match', () => {
  assert.equal(matchPrompt(undefined, integrations), null);
});

test('hasSkipPhrase matches the whole phrase case-insensitively', () => {
  assert.equal(hasSkipPhrase('/speckit-implement skip pair mode'), true);
  assert.equal(hasSkipPhrase('Skip Pair Mode please'), true);
  assert.equal(hasSkipPhrase('skipping pairs'), false);
  assert.equal(hasSkipPhrase('skip pair modes'), false);
});
