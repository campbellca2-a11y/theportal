import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  ['Dawnline_v3.html', 400_000],
  ['assets/earth-blue-marble.jpg', 1_000_000],
  ['assets/earth-night.jpg', 500_000],
  ['assets/clouds.png', 4_000_000],
  ['src/main.js', 15_000],
  ['dist/dawnline.js', 400_000],
];

for (const [relativePath, minimumBytes] of required) {
  const fullPath = path.join(root, relativePath);
  await access(fullPath);
  const info = await stat(fullPath);
  if (info.size < minimumBytes) throw new Error(`${relativePath} is unexpectedly small (${info.size} bytes)`);
}

const html = await readFile(path.join(root, 'Dawnline_v3.html'), 'utf8');
const forbiddenRuntimeHosts = ['unpkg.com', 'cdn.jsdelivr.net', 'raw.githubusercontent.com'];
for (const host of forbiddenRuntimeHosts) {
  if (html.includes(host)) throw new Error(`Runtime still references ${host}`);
}
if (!html.includes('assets/earth-blue-marble.jpg')) throw new Error('Day texture path is missing');
if (!html.includes('assets/earth-night.jpg')) throw new Error('Night texture path is missing');
if (!html.includes('assets/clouds.png')) throw new Error('Cloud texture path is missing');
if (!html.includes('Dawnline III')) throw new Error('Expected v3 title is missing');
if (html.includes('Dawn Happening Now')) throw new Error('The removed city dashboard is still present');

const scriptPattern = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
const scripts = [...html.matchAll(scriptPattern)].map((match) => match[1]);
if (scripts.length < 2) throw new Error(`Expected at least two inline scripts, found ${scripts.length}`);
scripts.forEach((script, index) => {
  try {
    new vm.Script(script, { filename: `Dawnline_v3.inline-${index + 1}.js` });
  } catch (error) {
    throw new Error(`Inline script ${index + 1} does not parse: ${error.message}`);
  }
});
for (const marker of ['DAWNLINE_V3_INLINE_CSS_SLOT_8F13C7', 'DAWNLINE_V3_INLINE_JS_SLOT_4A91DE']) {
  if (html.includes(marker)) throw new Error(`Unresolved build marker: ${marker}`);
}

console.log('Dawnline v3 validation passed.');
