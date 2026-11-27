// Turn the single-file build into the content-only page the Claude Artifact host wants
// (it wraps the file in its own <html><head><body>, so we ship title + styles + markup + script only).
import fs from 'node:fs';
const html = fs.readFileSync('dist-single/index.html', 'utf8');
const title = html.match(/<title>[\s\S]*?<\/title>/)[0];
const styles = [...html.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map((m) => m[0]).join('\n');
const scripts = [...html.matchAll(/<script[^>]*>[\s\S]*?<\/script>/g)].map((m) => m[0].replace(' crossorigin', '')).join('\n');
const out = `${title}\n<meta name="theme-color" content="#3b2630">\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap">\n${styles}\n<div id="game"></div>\n${scripts}\n`;
fs.writeFileSync('dist-single/artifact.html', out);
console.log('dist-single/artifact.html', (out.length / 1024).toFixed(0), 'KB');
