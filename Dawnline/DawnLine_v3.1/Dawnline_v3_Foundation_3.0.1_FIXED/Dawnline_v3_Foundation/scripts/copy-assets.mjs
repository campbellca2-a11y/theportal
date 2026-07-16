import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules/three-globe/example');
const target = path.join(root, 'assets');
await mkdir(target, { recursive: true });
await Promise.all([
  copyFile(path.join(source, 'img/earth-blue-marble.jpg'), path.join(target, 'earth-blue-marble.jpg')),
  copyFile(path.join(source, 'img/earth-night.jpg'), path.join(target, 'earth-night.jpg')),
  copyFile(path.join(source, 'clouds/clouds.png'), path.join(target, 'clouds.png')),
]);
console.log('Copied local Earth assets');
