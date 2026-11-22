// node render_seq.js <plan.js> <outdir> [--from f0] [--to f1] [--jobs 3] [--frames a,b,c]
// plan.js exports frame(f) -> { t, cam, mood, mood2, moodK, lampK, pion: { eng, anchor, height, tint } }; eng = engine frames dir name in ../eng
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf("--" + k); return i < 0 ? d : argv[i + 1]; };
const plan = require(path.resolve(argv[0])), out = path.resolve(argv[1]); fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png" };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); r.end(b); }); });
const tracks = {}; const track = n => tracks[n] || (tracks[n] = JSON.parse(fs.readFileSync(path.join(ROOT, "eng", n + "_track.json"))));
srv.listen(0, async () => {
  const port = srv.address().port, JOBS = +arg("jobs", 3), list = [];
  if (arg("frames")) arg("frames").split(",").forEach(x => list.push(+x)); else for (let f = +arg("from", 0); f < +arg("to", plan.N); f++) list.push(f);
  const per = Math.ceil(list.length / JOBS), pts = {}, t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: JOBS }, (_, j) => list.slice(j * per, (j + 1) * per)).filter(c => c.length).map(async chunk => {
    const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on("pageerror", e => { console.log("ERR", e.message); process.exit(1); }); p.on("console", m => { if (m.type() === "error") console.log("page:", m.text()); });
    await p.goto(`http://localhost:${port}/scene/index.html`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    for (const f of chunk) {
      const F = plan.frame(f);
      if (F.pion && F.pion.eng) { const tr = track(F.pion.eng), fr = tr.frames[Math.min(F.pion.ef ?? f, tr.frames.length - 1)];
        Object.assign(F.pion, { url: `/eng/${F.pion.eng}_frames/${String(F.pion.ef ?? f).padStart(5, "0")}.png`, base: fr.base, ppu: fr.ppu, w: tr.W, h: tr.H }); }
      const r = await p.evaluate(F => window.renderFrame(F), F);
      fs.writeFileSync(path.join(out, String(f).padStart(5, "0") + ".jpg"), Buffer.from(r.img.split(",")[1], "base64")); pts[f] = r.pts;
      if (++done % 30 === 0 || done === list.length) console.log(`${done}/${list.length} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await b.close();
  }));
  { const pp = path.join(out, "pts.json"); let old = {}; try { old = JSON.parse(fs.readFileSync(pp)); } catch (e) {} fs.writeFileSync(pp, JSON.stringify(Object.assign(old, pts))); }
  srv.close(); console.log("done", out);
});
