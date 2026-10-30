import { build } from 'esbuild';
import fs from 'node:fs';
const config = JSON.parse(fs.readFileSync('deploy.json','utf8'));
fs.writeFileSync('src/env.d.ts', '// Generated from deploy.json. Do not edit.\nexport interface Env {\n' + Object.entries(config.bindings).map(([key,type]) => `  ${key}: ${type === 'D1Database' ? type : 'string'};`).join('\n') + '\n}\n');
await build({entryPoints:['src/index.ts'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,outfile:'dist/worker.js',metafile:true}).then(result=>fs.writeFileSync('dist/meta.json',JSON.stringify(result.metafile)));
