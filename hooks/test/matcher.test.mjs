import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS } from '../lib/config.mjs';
import { matchPrompt, matchSkill, hasSkipPhrase, skillNameFromInput } from '../lib/matcher.mjs';

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

test('matchSkill recognizes bare and plugin-prefixed skill names', () => {
  assert.equal(matchSkill('speckit-implement', integrations).id, 'speckit');
  assert.equal(matchSkill('some-plugin:speckit-implement', integrations).id, 'speckit');
  assert.equal(matchSkill('openspec-apply-change', integrations).id, 'openspec');
});

test('matchSkill ignores unrelated skills', () => {
  assert.equal(matchSkill('superpowers:brainstorming', integrations), null);
  assert.equal(matchSkill('', integrations), null);
});

test('invalid regex sources are skipped instead of thrown', () => {
  const bad = [{ id: 'bad', prompt: '(', skill: '(', tasks: 'x' }, ...integrations];
  assert.equal(matchPrompt('/opsx:apply', bad).id, 'openspec');
  assert.equal(matchSkill('openspec-apply-change', bad).id, 'openspec');
});

test('hasSkipPhrase matches the whole phrase case-insensitively', () => {
  assert.equal(hasSkipPhrase('/speckit-implement skip pair mode'), true);
  assert.equal(hasSkipPhrase('Skip Pair Mode please'), true);
  assert.equal(hasSkipPhrase('skipping pairs'), false);
  assert.equal(hasSkipPhrase('skip pair modes'), false);
});

test('skillNameFromInput tolerates unknown input shapes', () => {
  assert.equal(skillNameFromInput({ skill: 'a' }), 'a');
  assert.equal(skillNameFromInput({ name: 'b' }), 'b');
  assert.equal(skillNameFromInput({ command: 'c' }), 'c');
  assert.equal(skillNameFromInput({ other: 'd', n: 1 }), 'd');
  assert.equal(skillNameFromInput({}), '');
  assert.equal(skillNameFromInput(undefined), '');
});
