import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'));

test('plugin manifest names the plugin stay-fresh under MIT', () => {
  const plugin = readJson('.claude-plugin/plugin.json');
  assert.equal(plugin.name, 'stay-fresh');
  assert.equal(plugin.license, 'MIT');
});

test('marketplace lists exactly the stay-fresh plugin with matching name', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, 'stay-fresh');
  assert.equal(marketplace.plugins[0].source, './');
});

test('package is an ES module with a test script', () => {
  const pkg = readJson('package.json');
  assert.equal(pkg.type, 'module');
  assert.equal(pkg.scripts.test, 'node --test');
});

test('license file is MIT', () => {
  assert.ok(readFileSync(join(root, 'LICENSE'), 'utf8').startsWith('MIT License'));
});
