import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const sortedNames = async (directory, kind) =>
  (await readdir(new URL(directory, root), { withFileTypes: true }))
    .filter(entry => (kind === 'directory' ? entry.isDirectory() : entry.isFile()))
    .map(entry => entry.name)
    .sort();
const sortedNonemptyDirectories = async directory => {
  const directories = await sortedNames(directory, 'directory');
  const inspected = await Promise.all(
    directories.map(async name => ({
      name,
      entries: await readdir(new URL(`${directory}${name}/`, root), { recursive: true, withFileTypes: true })
    }))
  );
  return inspected.filter(item => item.entries.some(entry => entry.isFile())).map(item => item.name);
};

assert.deepEqual(await sortedNonemptyDirectories('src/views/'), [
  '_builtin',
  'applications',
  'platform',
  'user-center'
]);
assert.deepEqual(await sortedNonemptyDirectories('src/views/_builtin/'), ['403', '404', '500', 'login']);
assert.deepEqual(await sortedNames('src/views/_builtin/login/modules/', 'file'), ['pwd-login.vue', 'reset-pwd.vue']);

const packageJSON = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const installed = { ...packageJSON.dependencies, ...packageJSON.devDependencies };
const demoOnlyDependencies = [
  '@antv/data-set',
  '@antv/g2',
  '@antv/g6',
  '@visactor/vtable-editors',
  '@visactor/vtable-gantt',
  'dhtmlx-gantt',
  'dompurify',
  'jsbarcode',
  'pinyin-pro',
  'swiper',
  'typeit',
  'vditor',
  'vue-pdf-embed',
  'xgplayer',
  'xlsx'
];
for (const dependency of demoOnlyDependencies) {
  assert.equal(installed[dependency], undefined, `${dependency} is reserved for removed scaffold demonstrations`);
}
