const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2000, height: 1400 } });
  p.on('console', m => console.log('console:', m.text())); p.on('pageerror', e => console.log('ERR', e.message));
  for (const w of process.argv.slice(2)) {
    await p.goto('file://' + __dirname + '/sketsa.html#' + w); await p.reload();
    await p.waitForFunction('window.DONE === true', null, { timeout: 15000 });
    await (await p.$('canvas')).screenshot({ path: __dirname + '/sketsa_' + w + '.png' });
    console.log('ok', w);
  }
  await b.close();
})();
