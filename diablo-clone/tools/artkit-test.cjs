// renders every art-kit example (or the given .js files) in studio.html: node tools/artkit-test.cjs <outDir> [files...]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
(async () => {
  const [out, ...files] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1200 } }); const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + path.resolve(__dirname, '../art-kit/studio.html'));
  const list = files.length ? files.map(f => [path.basename(f, '.js'), fs.readFileSync(f, 'utf8')]) : await p.evaluate(() => Object.entries(ART_EXAMPLES));
  for (const [name, code] of list) {
    await p.evaluate(c => { document.getElementById('code').value = c; }, code);
    await p.click('#render'); await p.waitForFunction(() => document.getElementById('msg').textContent !== 'Rendering...', null, { timeout: 60000 });
    const r = await p.evaluate(() => ({ msg: document.getElementById('msg').textContent, url: document.getElementById('sheet').src, lint: [...document.querySelectorAll('#lint tr')].slice(1).map(tr => tr.innerText.replace(/\t/g, ' | ')) }));
    console.log('==', name, '|', r.msg.split('\n')[0]); r.lint.forEach(l => console.log('   ', l));
    if (r.url.startsWith('data:')) fs.writeFileSync(path.join(out, name + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
  }
  if (errs.length) console.log('ERR', errs.join('\n')); await b.close();
})();
