// node render_scene.js <w1|w2> <outdir> [--from f0] [--to f1] [--every n] [--jobs 3]
// Serves ~/pion/proj7 over http (ES modules), renders the three.js world frame by frame with the engine Pion as a billboard.
const { chromium } = require("playwright");
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const which = argv[0], out = path.resolve(argv[1]), FPS = 60, shot = arg("as", which);
const engDir = path.join(ROOT, "eng", which + "_frames"), track = JSON.parse(fs.readFileSync(path.join(ROOT, "eng", which + "_track.json")));
const n = track.frames.length, f0 = +arg("from", 0), f1 = Math.min(n, +arg("to", n)), every = +arg("every", 1), JOBS = +arg("jobs", 3);
fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".json": "application/json" };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); r.end(b); }); });
srv.listen(0, async () => {
  const port = srv.address().port, fr0 = track.frames[0], sx = track.W / 1078;
  const info = { base: [fr0.base[0] * sx, fr0.base[1]], ppu: fr0.ppu * sx, w: track.W, h: track.H, mode: arg("mode", "engine") };
  const list = []; if (arg("frames")) arg("frames").split(",").forEach(x => list.push(+x)); else for (let f = f0; f < f1; f += every) list.push(f);
  const per = Math.ceil(list.length / JOBS), pts = {}, t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: JOBS }, (_, j) => list.slice(j * per, (j + 1) * per)).filter(c => c.length).map(async chunk => {
    const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on("pageerror", e => { console.log("ERR", e.message); process.exit(1); });
    p.on("console", m => { if (m.type() === "error") console.log("page:", m.text()); });
    await p.goto(`http://localhost:${port}/scene/index.html`);
    await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await p.evaluate(i => window.setup(i), info); if (arg("ptsonly")) await p.evaluate(() => { window.PTSONLY = true; });
    if (arg("view")) { const v = await p.evaluate(([w, fps, n]) => window.viewTrack(w, fps, n), [shot, FPS, +arg("n", n)]); fs.writeFileSync(path.resolve(arg("view")), JSON.stringify(v)); console.log("view ->", arg("view")); process.exit(0); }
    for (const f of chunk) {
      const tf = track.frames[f] || fr0, items = {}; for (const k in (tf.items || {})) items[k] = [tf.items[k][0] * sx, tf.items[k][1]];
      const pinfo = { base: [tf.base[0] * sx, tf.base[1]], ppu: tf.ppu * sx, items };
      const r = await p.evaluate(([w, f, fps, u, pi]) => window.renderFrame(w, f, fps, u, pi), [shot, f, FPS, `/eng/${which}_frames/${String(f).padStart(5, "0")}.png`, pinfo]);
      if (r.img) fs.writeFileSync(path.join(out, String(f).padStart(5, "0") + ".jpg"), Buffer.from(r.img.split(",")[1], "base64"));
      pts[f] = r.pts;
      if (++done % 30 === 0 || done === list.length) console.log(`${which} ${done}/${list.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await b.close();
  }));
  { const pp = path.join(out, "pts.json"); let old = {}; try { old = JSON.parse(fs.readFileSync(pp)); } catch (e) {} fs.writeFileSync(pp, JSON.stringify(Object.assign(old, pts))); }
  srv.close(); console.log("done", out);
});
