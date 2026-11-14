// Preview the Pion Raja without the source video / tracking data.
// node preview.js <out.png> [times comma list, seconds] [--cols N] [--size px] [--bg #hex] [--yaw rad] [--pitch deg]
// Builds a synthetic plan (pion standing still, centre of frame, every shot) and neutral-grey thumbs,
// renders the requested timeline moments and tiles them into one contact sheet.
const fs = require('fs'), path = require('path');
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const out = args[0] || 'preview.png';
const times = (args[1] && !args[1].startsWith('--') ? args[1] : '0.9,1.6,2.0,2.7,4.0,5.0,6.6,7.2,8.0,8.5,10.9,12.2').split(',').map(Number);
const cols = +opt('--cols', Math.min(6, times.length)), size = +opt('--size', 560), bg = opt('--bg', '#8f9aa6');
const yaw = +opt('--yaw', 0), pitch = opt('--pitch', null);
const SHOTS = [[0, 66], [67, 123], [124, 179], [180, 204], [205, 227], [228, 297], [298, 340], [341, 384], [385, 437], [438, 466], [467, 493], [494, 583]];
const NF = 584, TW = 36, THH = 64;

const plan = [];
for (let f = 0; f < NF; f++) {
  const s = SHOTS.findIndex(([a, b]) => f >= a && f <= b);
  plan.push({ f, s, vis: true, x: 539, y: 1330, h: size, yaw, roll: 0, rx: 539, ry: 1330, rh: size, arr: SHOTS[s][0] / 30, van: null,
    tpIn: false, pitch: pitch === null ? null : +pitch, fallT: null, noshadow: false, physy: false, track: true, spd: 0, dx: 0, dy: 0, dist: 0 });
}
const hex = bg.replace('#', ''), rgb = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
const thumbs = Buffer.alloc(NF * TW * THH * 3); for (let i = 0; i < thumbs.length; i++) thumbs[i] = rgb[i % 3];

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'] });
  const p = await b.newPage({ viewport: { width: 1078, height: 1920 }, deviceScaleFactor: +opt('--dpr', 2) });
  p.on('pageerror', e => { console.log('ERR', e.message); process.exit(1); });
  await p.goto('file://' + path.resolve(__dirname, 'index.html'));
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await p.evaluate(c => { document.body.style.background = c; }, bg);
  await p.evaluate(([pl, bb]) => window.setData(pl, bb), [plan, thumbs.toString('base64')]);
  const shots = [];
  for (const t of times) {
    const f = Math.min(NF - 1, Math.round(t * 30));
    await p.evaluate(f => window.renderFrame(f), f);
    shots.push(await p.screenshot({ clip: { x: 539 - size * .75, y: 1330 - size * 1.25, width: size * 1.5, height: size * 1.4 } }));
  }
  // tile into a sheet using the page itself as compositor
  const sheet = await p.evaluate(async ([imgs, cols, labels]) => {
    const ims = await Promise.all(imgs.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; })));
    const w = 420, h = Math.round(w * ims[0].height / ims[0].width), rows = Math.ceil(ims.length / cols);
    const c = document.createElement('canvas'); c.width = w * cols; c.height = h * rows; const g = c.getContext('2d');
    ims.forEach((im, i) => { g.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h); g.fillStyle = '#ff0'; g.font = '700 22px Inter, sans-serif'; g.fillText(labels[i], (i % cols) * w + 10, Math.floor(i / cols) * h + 30); });
    return c.toDataURL('image/png').split(',')[1];
  }, [shots.map(s => s.toString('base64')), cols, times.map(t => 't=' + t.toFixed(2))]);
  fs.writeFileSync(out, Buffer.from(sheet, 'base64'));
  console.log('wrote', out);
  await b.close();
})();
