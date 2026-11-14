// node drive.js <outdir> [frames comma list | a-b range | all]
// env: RW/RH  render size (default 1078x1920)
//      JOBS   parallel browsers (default: half the CPU cores, max 6). Frames are split into contiguous chunks;
//             physics is re-simulated from the start of the shot when a chunk begins mid-shot, so output is identical.
//      SKIP=1 skip frames whose PNG already exists (resume an interrupted render)
//      BLUR   motion blur: max samples per frame (default 16, 1 = off). Still frames stay sharp; fast moves get more samples.
//      SHUTTER shutter length in frames (default 0.4; the smear is capped at MB.maxPx so fast moves stay readable)
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path'), os = require('os');
const out = process.argv[2]; if (!out) { console.log('usage: node drive.js <outdir> [frames|a-b|all]'); process.exit(1); }
fs.mkdirSync(out, { recursive: true });
const RW = +(process.env.RW || 1078), RH = +(process.env.RH || 1920);
const plan = JSON.parse(fs.readFileSync(process.env.PLAN || path.join(__dirname, 'plan.json'))); // PLAN / THUMBS / PAGE env: render another project's files
const b64 = fs.readFileSync(process.env.THUMBS || path.join(__dirname, 'thumbs.raw')).toString('base64');
const sel = process.argv[3];
let frames = !sel || sel === 'all' ? plan.map((_, i) => i)
  : /^\d+-\d+$/.test(sel) ? (([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))(sel.split('-').map(Number))
  : sel.split(',').map(Number);
const png = f => path.join(out, String(f).padStart(4, '0') + '.png');
if (process.env.SKIP) frames = frames.filter(f => !fs.existsSync(png(f)));
const BLUR = +(process.env.BLUR ?? 16), SHUTTER = +(process.env.SHUTTER ?? .4);
const JOBS = Math.max(1, Math.min(frames.length, +(process.env.JOBS || Math.min(6, Math.max(1, os.cpus().length >> 1)))));

async function worker(list, id) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'] });
  const p = await b.newPage({ viewport: { width: RW, height: RH }, deviceScaleFactor: 1 });
  p.on('console', m => console.log(`page[${id}]:`, m.text())); p.on('pageerror', e => { console.log('ERR', e.message); process.exit(1); });
  await p.goto('file://' + path.resolve(process.env.PAGE || path.join(__dirname, 'index.html')) + `?w=${RW}&h=${RH}`);
  await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 });
  await p.evaluate(() => Promise.all(['900 50px Inter', '600 26px Inter'].map(f => document.fonts.load(f))));
  await p.evaluate(([pl, bb]) => window.setData(pl, bb), [plan, b64]);
  await p.evaluate(([n, s]) => { window.MB.maxN = n; window.MB.shutter = s; }, [BLUR, SHUTTER]);
  for (const f of list) {
    const data = await p.evaluate(([f, mb]) => mb ? window.grabFrameMB(f) : (window.renderFrame(f), window.grabFrame()), [f, BLUR > 1]);
    if (process.env.MBLOG) console.log('mb', f, await p.evaluate(() => window.__mbN));
    fs.writeFileSync(png(f), Buffer.from(data, 'base64'));
    done++; if (done % 50 === 0 || done === frames.length) console.log(`frame ${done}/${frames.length}`, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  }
  await b.close();
}
let done = 0; const t0 = Date.now();
(async () => {
  const per = Math.ceil(frames.length / JOBS), chunks = [];
  for (let i = 0; i < JOBS; i++) { const c = frames.slice(i * per, (i + 1) * per); if (c.length) chunks.push(c); }
  console.log(`${frames.length} frames, ${chunks.length} job(s), ${RW}x${RH}, motion blur ${BLUR > 1 ? 'max ' + BLUR + ' samples, shutter ' + SHUTTER : 'off'}`);
  await Promise.all(chunks.map(worker));
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(1) + 's');
})();
