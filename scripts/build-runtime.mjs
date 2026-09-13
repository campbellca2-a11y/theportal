import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
await build({
 entryPoints:[join(root,'server.mjs')],outfile:join(root,'ThePortal.runtime.mjs'),
 bundle:true,platform:'node',format:'esm',target:'node22',legalComments:'external',
 banner:{js:"import { createRequire as __portalCreateRequire } from 'node:module';\nconst require = __portalCreateRequire(import.meta.url);"},
});
console.log('Built ThePortal.runtime.mjs');
