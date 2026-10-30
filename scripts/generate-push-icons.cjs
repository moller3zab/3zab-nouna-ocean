// Reuse the existing character, rather than introducing new artwork.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Resvg } = require('@resvg/resvg-js');
const source = fs.readFileSync('src/components/layout/SanctuaryCharacter.tsx', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { module: mod, exports: mod.exports, require });
const html = renderToStaticMarkup(React.createElement(mod.exports.SanctuaryCharacter, { mood: 'idle', gaze: 0 }));
let svg = html.match(/<svg[\s\S]*?<\/svg>/)[0];
svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"').replace('viewBox="0 0 400 590"', 'viewBox="50 0 300 300"');
// Remove alternate animation states from the static portrait.
svg = svg.replace(/<g class="guardian-eyes-closed"[\s\S]*?<\/g>/, '');
svg = svg.replace(/<g class="guardian-moving-arms"[\s\S]*?(?=<g class="guardian-thumbs-up")/, '');
svg = svg.replace(/<g class="guardian-thumbs-up"[\s\S]*?<\/g>\s*<\/g>/, '');
fs.writeFileSync('public/squidward-icon.svg', svg);
for (const [size, name] of [[192, 'pwa-192x192.png'], [512, 'pwa-512x512.png'], [180, 'apple-touch-icon.png']]) {
  const image = new Resvg(svg, { fitTo: { mode: 'width', value: size }, background: '#d9eff5' }).render().asPng();
  fs.writeFileSync(`public/${name}`, image);
}
