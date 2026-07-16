import { build } from 'esbuild';
import { readFile, writeFile, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
await mkdir(dist, { recursive: true });

await build({
  entryPoints: [path.join(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  outfile: path.join(dist, 'dawnline.js'),
});

const [template, css, javascript] = await Promise.all([
  readFile(path.join(root, 'src/index.html'), 'utf8'),
  readFile(path.join(root, 'styles.css'), 'utf8'),
  readFile(path.join(dist, 'dawnline.js'), 'utf8'),
]);

const safeJavascript = javascript.replaceAll('</script', '<\\/script');
const output = template
  .replace(
    '<!-- DAWNLINE_V3_INLINE_CSS_SLOT_8F13C7 -->',
    () => `<style>\n${css}\n</style>`,
  )
  .replace(
    '<!-- DAWNLINE_V3_INLINE_JS_SLOT_4A91DE -->',
    () => `<script>\n${safeJavascript}\n</script>`,
  );

await writeFile(path.join(root, 'Dawnline_v3.html'), output, 'utf8');
console.log('Built Dawnline_v3.html');
