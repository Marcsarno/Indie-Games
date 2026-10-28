// Bundles the game into one self-contained dist/index.html (three.js, code and the Blender GLBs inlined).
//   npm i && node tools/build.mjs
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const three = path.join(root, 'lib/three');
const out = await build({
  entryPoints: [path.join(root, 'src/main.js')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020',
  plugins: [{
    name: 'three-alias',
    setup(b) {
      b.onResolve({ filter: /^three$/ }, () => ({ path: path.join(three, 'three.module.min.js') }));
      b.onResolve({ filter: /^three\/addons\// }, a => ({ path: path.join(three, 'addons', a.path.slice('three/addons/'.length)) }));
    },
  }],
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const models = {};
for (const f of fs.readdirSync(path.join(root, 'assets/models')).filter(f => f.endsWith('.glb')))
  models[f.replace('.glb', '')] = fs.readFileSync(path.join(root, 'assets/models', f)).toString('base64');
const boot = `const b=${JSON.stringify(models)};window.__MODELS__={};for(const k in b){const s=atob(b[k]),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);window.__MODELS__[k]=u.buffer;}`;

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<script type="importmap">[\s\S]*?<\/script>\s*<script type="module" src="[^"]*"><\/script>/, () => `<script>${boot}</script>\n<script>${js}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0), 'KB');

// Artifact variant: the Artifact tool wraps the page in its own <html>/<head>/<body>, so ship only the content.
const style = html.match(/<style>[\s\S]*?<\/style>/)[0];
const bodyInner = html.match(/<body>([\s\S]*)<\/body>/)[1];
fs.writeFileSync(path.join(root, 'dist/artifact.html'), `<title>Squad Rush</title>\n${style}\n${bodyInner}`);
console.log('dist/artifact.html written');
