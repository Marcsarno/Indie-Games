// Writes dist/artifact.html: the content-only variant of index.html for the Artifact tool.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = src.match(/<!-- ARTIFACT:START -->\n([\s\S]*?)<!-- ARTIFACT:END -->/);
if (!m) throw new Error('markers not found');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'artifact.html'), m[1]);
console.log('dist/artifact.html', m[1].length, 'bytes');
