const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const jobs = process.argv.slice(2).map(a => { const i = a.indexOf('='); return [a.slice(0, i), a.slice(i + 1)]; });
  for (const [name, q] of jobs) {
    const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
    p.on('console', m => console.log(name, 'console:', m.text())); p.on('pageerror', e => console.log(name, 'ERR', e.message));
    await p.goto('http://127.0.0.1:8765/' + (process.env.PAGE || 'scene.html') + '?' + q.replace(/,/g, '&'));
    await p.waitForFunction('window.DONE === true', null, { timeout: 120000 });
    await (await p.$('canvas')).screenshot({ path: __dirname + '/' + name + '.png' }); console.log('ok', name); await p.close();
  }
  await b.close();
})();
