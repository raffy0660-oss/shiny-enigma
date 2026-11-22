// node render_office.js <outdir> shot1,shot2,...   |   node render_office.js <outdir> --clip <shot> <seconds> [--jobs 3]
const { chromium } = require("playwright"); const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = __dirname, argv = process.argv.slice(2), out = path.resolve(argv[0]); fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": MIME[path.extname(p)] || "application/octet-stream" }); r.end(b); }); });
srv.listen(0, async () => {
  const port = srv.address().port, clip = argv.indexOf("--clip"), jobs = argv.includes("--jobs") ? +argv[argv.indexOf("--jobs") + 1] : 2;
  const tasks = clip > 0 ? Array.from({ length: Math.round(+argv[clip + 2] * 60) }, (_, f) => ({ shot: argv[clip + 1], f, t: f / 60 })) : argv[1].split(",").map(s => ({ shot: s, t: 1.0 }));
  const per = Math.ceil(tasks.length / jobs);
  await Promise.all(Array.from({ length: jobs }, (_, j) => tasks.slice(j * per, (j + 1) * per)).filter(c => c.length).map(async chunk => {
    const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on("pageerror", e => { console.log("ERR", e.message); process.exit(1); }); p.on("console", m => { if (m.type() === "error") console.log("page:", m.text()); });
    await p.goto(`http://localhost:${port}/index.html`); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    for (const T of chunk) {
      const over = clip > 0 ? await p.evaluate(([s, t]) => { const S = window.SHOTS[s], k = t / 5; return { pos: S.pos.clone().lerp(S.tgt, 0.12 * (k * k * (3 - 2 * k))) }; }, [T.shot, T.t]) : null;   // slow push-in for clips
      const img = await p.evaluate(([s, t, o]) => window.renderShot(s, t, o), [T.shot, T.t, over]);
      fs.writeFileSync(path.join(out, clip > 0 ? String(T.f).padStart(5, "0") + ".jpg" : T.shot + ".jpg"), Buffer.from(img.split(",")[1], "base64"));
    }
    await b.close();
  }));
  srv.close(); console.log("done");
});
