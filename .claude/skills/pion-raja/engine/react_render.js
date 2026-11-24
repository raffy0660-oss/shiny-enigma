// Reaction mode renderer: voice-over + cue file -> Pion Raja talking on green screen / transparent video.
//
//   node react_render.js --audio vo.m4a --cues cues.txt --out hasil/reaksi1 [options]
//
// options:
//   --frame small|mid|big|full|close|face|bottom  framing preset (default mid). Custom: --frame "cy,vh[,cx]" (model units:
//                                    aim height, visible height, sideways shift; pion is 4.55 tall, + cx = pion moves left)
//   --bg green|black|blue|#rrggbb    background colour of the .mp4 (default green, for CapCut chroma key)
//   --alpha                          also write a transparent ProRes 4444 .mov (large file)
//   --png                            keep the PNG frames (transparent) next to the videos
//   --jelly 1.0                      jelly strength multiplier
//   --fps 60 --size 1080x1920 --jobs N --start 0 --dur <s>  (cut a section of the audio)
//   --preview t1,t2,...              only render a contact sheet of these moments (fast check)
//   --blur 16                        motion blur: max samples per frame (default 16, 1 = off); --shutter 0.4 (frames)
//   --local                          cue times are relative to --start (default: absolute audio times)
//   --view view.json                 per-frame [orbit°, tilt°] of the engine camera around Pion (3D world camera, see examples/proj8)
//   --shake 1                        camera shake while the autozoom camera moves (0 = off)
// cue `light dir x y z key r g b amb r g b rim r g b ...` overrides the toon light preset (to match a 3D background)
// cue `<t> autozoom [N] [strength]` / `<t> autozoom off`: micro zoom punch-ins every N karaoke words, centred on the face
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');

const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf('--' + k); return i < 0 ? d : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const AUDIO = arg('audio', null), CUES = arg('cues', null), OUT = arg('out', 'reaksi'), FPS = +arg('fps', 60); // 60 fps by default (smoother motion); the simulation steps with dt = 1 / fps
const [RW, RH] = String(arg('size', '1080x1920')).split('x').map(Number), JELLY = +arg('jelly', 1);
const BLUR = +arg('blur', 16), SHUTTER = +arg('shutter', .4);
const START = +arg('start', 0), BG = String(arg('bg', 'green')), PREVIEW = arg('preview', null);
const lerp = (a, b, u) => a + (b - a) * u;
const hexOf = b => ({ green: '00FF00', black: '000000', blue: '0047FF', white: 'FFFFFF' }[b] || b.replace('#', ''));
const BGS = BG.split(','), BGHEX = hexOf(BGS[0]); // --bg green,black -> one render, several videos

/* ---------- audio -> per-frame loudness envelope + syllable onsets ---------- */
function analyse(file) {
  const SR = 16000, a = ['-v', 'error', '-ss', String(START), ...(arg('dur') ? ['-t', String(arg('dur'))] : []), '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', 'pipe:1'];
  const buf = execFileSync('ffmpeg', a, { maxBuffer: 1 << 30 }), x = new Float32Array(buf.buffer, buf.byteOffset, buf.length >> 2);
  const n = Math.ceil(x.length / SR * FPS), hop = SR / FPS, db = new Float32Array(n);
  for (let f = 0; f < n; f++) {
    const c = f * hop + hop / 2, i0 = Math.max(0, Math.floor(c - hop)), i1 = Math.min(x.length, Math.floor(c + hop)); let s = 0;
    for (let i = i0; i < i1; i++) s += x[i] * x[i];
    db[f] = 10 * Math.log10(s / Math.max(1, i1 - i0) + 1e-12);
  }
  const srt = Array.from(db).sort((p, q) => p - q), pc = p => srt[Math.min(srt.length - 1, Math.floor(p * srt.length))];
  const hi = pc(.95), lo = Math.max(pc(.1), hi - 45), gate = lo + 6;
  const raw = new Float32Array(n), env = new Float32Array(n); let prev = 0;
  for (let f = 0; f < n; f++) {
    const e = raw[f] = Math.pow(Math.min(1, Math.max(0, (db[f] - gate) / Math.max(6, hi - gate))), .8);
    prev = e > prev ? prev + (e - prev) * .85 : prev + (e - prev) * .45; env[f] = prev;
  }
  // syllable onsets: peaks of the loudness rise (raw, unsmoothed), at least 100 ms apart
  const rise = new Float32Array(n), onset = new Float32Array(n); let last = -99;
  for (let f = 2; f < n; f++) rise[f] = raw[f] - Math.min(raw[f - 1], raw[f - 2]);
  for (let f = 2; f < n - 1; f++) {
    if (rise[f] < .1 || rise[f] < rise[f - 1] || rise[f] < rise[f + 1] || f - last < 3) continue;
    onset[f] = Math.min(1, Math.max(.3, rise[f] * 1.5)); last = f;
  }
  return { n, env: Array.from(env), onset: Array.from(onset), dur: x.length / SR };
}

/* ---------- cue file ---------- */
// lines: <time> <command> [args]   time = seconds or m:ss.xx ; '#' starts a comment
//   <t> <expression>                 e.g. "1.2 kaget"  (see EXPR below: 33 expressions; soktahu adds nerd glasses)
//   <t> gest catat <dur>             takes a black notebook (DEATH NOTE) out of the coat, opens it on his chest and writes in it with a pen; closes it at the end
//   <t> gest hp <dur> [kiri|kanan] [angkat x y z]   holds a phone in front of the chest and READS it (screen tilted up to his face); angkat: picks it up from x y z first
//   <t> gest <type> [dur] [kiri|kanan] [x y]   type: up cheer present shrug wave point press clap lookout dance facepalm knock cross
//   <t> look <turn°> [nod°] [tilt°]  head turn (+ = toward screen right), nod (+ = down), tilt; "look 0" resets
//   <t> startle                      jump of surprise
//   frame small|mid|big|full|close|face|bottom|cy,vh[,cx]
//   <t> fly [dur] [jauh|kiri|kanan|atas|bawah]   fly in toward the camera (invisible before)
//   <t> flyout [dur] [jauh|kiri|kanan|atas|bawah] fly away
//   <t> hover off|on                 gentle floating (on by default)
const EXPR = ['datar', 'imut', 'senang', 'kaget', 'penasaran', 'curiga', 'pusing', 'sinis', 'ngakak', 'duit', 'marah', 'sakit', 'kecewa', 'ragu', 'licik',
  'nangis', 'tersedu', 'girang', 'bahagia', 'cium', 'lega', 'gemas', 'syok', 'kesal', 'ngiler', 'merajuk', 'memelas', 'bosan', 'cemas', 'bangga', 'ngamuk', 'santai', 'soktahu', 'melet', 'gembung', 'tiup', 'malu', 'sewot', 'mati'];
const GEST = ['kantong', 'flail', 'tread', 'cough', 'windup', 'blow', 'gaya', 'up', 'cheer', 'present', 'shrug', 'wave', 'point', 'press', 'clap', 'lookout', 'dance', 'facepalm', 'knock', 'cross', 'think', 'phone', 'paper', 'throw', 'hang', 'fist', 'write', 'magnify', 'nerd', 'crownlift', 'salam', 'pocket', 'click', 'toss', 'cointhrow', 'pouch', 'deathnote', 'call', 'gun', 'hp', 'catat'];
function parseCues(txt) {
  const C = { expr: [], gest: [], startle: [], look: [], fly: [], hover: [], cams: [], shakes: [], turns: [], fx: [], boing: [], float: [], panic: [], bg: null, frame: null, frameOverride: null }, warn = [];
  const time = s => { const m = s.split(':').map(Number); return m.length > 1 ? m[0] * 60 + m[1] : m[0]; };
  txt.split(/\r?\n/).forEach((raw, ln) => {
    const line = raw.replace(/#.*/, '').trim(); if (!line) return;
    const w = line.split(/\s+/);
    if (w[0] === 'bg') { C.bg = w[1] || null; return; }
    if (w[0] === 'light') { // match a 3D background: light dir x y z | key r g b | amb | sky | gnd | rim | exp v
      C.light = C.light || {}; for (let i = 1; i < w.length;) { const k = w[i], n = (k === 'exp' || k === 'soft' || k === 'flat') ? 1 : 3; C.light[k] = n === 1 ? +w[i + 1] : w.slice(i + 1, i + 4).map(Number); i += n + 1; }
      return; }
    if (w[0] === 'paperimg') { C.paperImg = 'data:image/' + (/\.png$/i.test(w[1]) ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(path.resolve(w[1])).toString('base64'); return; } // the sheet in `gest paper` shows this picture
    if (w[0] === 'face') { C.faceCy = +w[1]; return; }
    if (w[0] === 'acting' || w[0] === 'gerak') { C.acting = +(w[1] ?? 1); return; }  // automatic acting layer strength (0 = off, default 1)
    if (w[1] === 'light' && !isNaN(+w[0])) { // timed light: <t> light dir .. key .. -> crossfades (0.4 s) from the previous light
      const L = {}; for (let i = 2; i < w.length;) { const k = w[i], n = (k === 'exp' || k === 'soft' || k === 'flat') ? 1 : 3; L[k] = n === 1 ? +w[i + 1] : w.slice(i + 1, i + 4).map(Number); i += n + 1; }
      (C.lights = C.lights || []).push({ t: +w[0], L }); return; }
    if (w[0] === 'booktitle' || w[0] === 'judulbuku') { C.bookTitle = (w[1] || '').toLowerCase(); return; }   // booktitle deathnote: the soktahu book becomes the Death Note
    if (w[0] === 'hurt') { C.hurt = +(w[1] ?? 1); return; }
    if (w[0] === 'frame') { const v = w[1] || 'close'; if (v.includes(',')) { const [cy, vh, cx, tilt] = v.split(',').map(Number); C.frameOverride = { cy, vh, cx: cx || 0 }; if (!isNaN(tilt)) C.frameOverride.tiltDeg = tilt; } else C.frame = v; return; } // frame cy,vh[,cx[,tilt°]]: tilt = camera elevation (6 = default, 50 = looking down on the head)
    const t = time(w[0]) - (arg('local') ? 0 : START), cmd = (w[1] || '').toLowerCase();
    if (isNaN(t)) return warn.push(`baris ${ln + 1}: waktu tidak dikenali: ${raw}`);
    if (EXPR.includes(cmd)) C.expr.push([t, cmd]);
    else if (cmd === 'expr' && EXPR.includes(w[2])) C.expr.push([t, w[2]]);
    else if (cmd === 'gest' || GEST.includes(cmd)) {
      const r = cmd === 'gest' ? w.slice(2) : w.slice(1), type = r[0]; if (!GEST.includes(type)) return warn.push(`baris ${ln + 1}: gesture tidak dikenal: ${type}`);
      const dur = r[1] && !isNaN(+r[1]) ? +r[1] : .9, rest = r.slice(r[1] && !isNaN(+r[1]) ? 2 : 1);
      let side = type === 'point' || type === 'press' || type === 'knock' ? -1 : 1, nums = [];
      for (const v of rest) { if (/^(kiri|left|l)$/i.test(v)) side = -1; else if (/^(kanan|right|r)$/i.test(v)) side = 1; else if (!isNaN(+v)) nums.push(+v); }
      const G = { t0: t, t1: t + dur, type, side };
      if (type === 'point' || type === 'press') { G.tgt = nums.length >= 2 ? nums.slice(0, 2) : [side < 0 ? 180 : 900, 420]; if (type === 'press') G.hit = t + dur * .45; }
      if (type === 'throw' && nums.length) G.fly = nums[0];
      if (type === 'click') G.hit = t + dur * .4;
      if (type === 'paper' && rest.some(v => /^(will|wasiat)$/i.test(v))) G.will = true;
      if ((type === 'phone' || type === 'hp') && rest.some(v => /^(angkat|lift)$/i.test(v))) { G.lift = true; G.grab = .32; G.reach = nums.length >= 3 ? nums.slice(0, 3) : null; }   // phone angkat [x y z]: the hand reaches down, grabs it (no pop) at t0+.32, lifts it beside the head
      C.gest.push(G);
    }
    else if (cmd === 'look') { const d = w.slice(2).map(Number).map(v => (isNaN(v) ? 0 : v) * Math.PI / 180); C.look.push([t, d[0] || 0, d[1] || 0, -(d[2] || 0)]); }
    else if (cmd === 'startle' || cmd === 'kagetlompat') C.startle.push(t);
    else if (cmd === 'fly' || cmd === 'terbang' || cmd === 'flyout' || cmd === 'pergi') {
      const out = cmd === 'flyout' || cmd === 'pergi', r = w.slice(2), dur = r[0] && !isNaN(+r[0]) ? +r[0] : (out ? 1.6 : 2.8);
      const dir = (r.find(v => isNaN(+v)) || 'jauh').toLowerCase();
      C.fly.push({ t0: t, dur, dir, out });
      C.gest.push(out ? { t0: t, t1: t + dur, type: 'up', side: 1 } : { t0: t, t1: t + dur * .92, type: 'flyarms', side: 1 });
    }
    else if (cmd === 'cam' || cmd === 'kamera') { // cam <preset|cy,vh[,cx]> [dur]
      const v = w[2] || 'mid', dur = w[3] !== undefined ? +w[3] : .4; let K;   // cam <preset|cy,vh[,cx[,roll°]]> [dur] [roll°]
      if (v.includes(',')) { const [cy, vh, cx, roll] = v.split(',').map(Number); K = { cy, vh, cx: isNaN(cx) ? undefined : cx, roll: isNaN(roll) ? 0 : roll }; }
      else { const P = { small: [2.3, 12], mid: [2.4, 9.5], big: [2.6, 7], full: [2.4, 5.7], half: [2.7, 4.9], close: [3.0, 4.6], face: [3.2, 3.6], bottom: [4.0, 8.5] }[v]; if (!P) return warn.push(`baris ${ln + 1}: framing tidak dikenal: ${v}`); K = { cy: P[0], vh: P[1] }; }
      if (w[4] !== undefined && !isNaN(+w[4])) K.roll = +w[4];
      C.cams.push(Object.assign({ t, dur }, K));
    }
    else if (cmd === 'shake' || cmd === 'goyang') C.shakes.push({ t, amp: +(w[2] || 1), dur: +(w[3] || .4) });
    else if (cmd === 'turn' || cmd === 'balik') C.turns.push({ t, deg: +(w[2] || 180), dur: +(w[3] || .4) });
    else if (cmd === 'photo' || cmd === 'foto') { const n = w.slice(4).map(Number); C.fx.push({ type: 'photo', t0: t, t1: t + +(w[2] || 1), src: 'data:image/' + (/\.png$/i.test(w[3]) ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(path.resolve(w[3])).toString('base64'), x: n[0], y: n[1], w: n[2], rot: n[3], swap: /swap/.test(line), q: (line.match(/q=(\S+)/) || [])[1] }); }
    else if (cmd === 'costume' || cmd === 'kostum') C.fx.push({ type: 'costume', t0: t, t1: t + +(w[3] || 999), kind: (w[2] || 'doc').toLowerCase() }); // costume doc: lab coat, head mirror, stethoscope, no crown
    else if (cmd === 'hair' || cmd === 'rambut') C.fx.push({ type: 'hair', t0: t, t1: 999 });                 // magic hair grows on his head
    else if (cmd === 'sebum') C.fx.push({ type: 'sebum', t0: t, t1: t + +(w[2] || 1.2) });                  // the oil-drop buddy walks in from the right
    else if (cmd === 'arrow' || cmd === 'panah') C.fx.push({ type: 'arrow', t0: t, t1: t + +(w[2] || 1.5), text: w.slice(3).join(' ') || '*grease' });
    else if (cmd === 'subbtn' || cmd === 'tombol') C.fx.push({ type: 'subbtn', t0: t, t1: t + +(w[2] || 999) }); // floating SUBSCRIBE button (gest click presses it)
    else if (cmd === 'glow' || cmd === 'cahaya') C.fx.push({ type: 'glow', t0: t, t1: 999, amt: +(w[2] ?? .35) }); // book-glow strength from t on
    else if (cmd === 'coin' || cmd === 'koin') C.fx.push({ type: 'coin', t0: t, t1: t + +(w[2] || 99) });          // "brilliant" coin in the right hand (gest toss / cointhrow play with it)
    else if (cmd === 'hearteyes' || cmd === 'matahati') C.fx.push({ type: 'hearteyes', t0: t, t1: t + +(w[2] || 1) }); // heart eyes pop in with a jelly wobble
    else if (cmd === 'stomp' || cmd === 'injak') C.fx.push({ type: 'stomp', t0: t, t1: t + +(w[2] || 1.2) });       // hops on the spot (on the torn book)
    else if (cmd === 'hide') C.fx.push({ type: 'hide', t0: t, t1: 999 });
    else if (cmd === 'outfit' || cmd === 'baju') C.fx.push({ type: 'outfit', t0: -1, t1: 1e9, kind: (w[2] || '').toLowerCase() }); // clothes on a chess piece: daniel, police
    else if (cmd === 'dead' || cmd === 'mati') C.fx.push({ type: 'dead', t0: t, t1: 1e9 }); // dead look on a piece: pale skin + face stains overlay (use with expression `mati`)
    else if (cmd === 'lie' || cmd === 'rebah') C.fx.push({ type: 'lie', t0: t, t1: 1e9, deg: +(w[2] ?? 88) }); // lying on the floor (dead / knocked out): the 3D body is laid on its side, drawn from the view angle
    else if (cmd === 'toon' || cmd === 'kartun') C.fx.push({ type: 'toon', t0: -1, t1: 1e9 }); // cartoon clothing: flat colour blocks, big checks, thick ink + piping, big buttons (all outfits)
    else if (cmd === 'style2d' || cmd === 'gaya2d') C.fx.push({ type: 'style2d', t0: -1, t1: 1e9 }); // flat 2D reference look (PANDUAN_SINEMATIK §7)
    else if (cmd === 'piece' || cmd === 'bidak') C.fx.push({ type: 'piece', t0: -1, t1: 1e9, kind: (w[2] || 'pawn').toLowerCase() }); // another chess piece instead of Pion: knight rook bishop queen pawn
    else if (cmd === 'detective' || cmd === 'detektif') C.fx.push({ type: 'detective', t0: t, t1: t + +(w[2] || 99), kind: (w[3] || '').toLowerCase() || null }); // detective <dur> [light|light2]: blazer under the cape
    else if (cmd === 'poof') C.fx.push({ type: 'poof', t0: t, t1: t + +(w[2] || .5) });
    else if (cmd === 'aha') C.fx.push({ type: 'aha', t0: t, t1: t + +(w[2] || 1) });
    else if (cmd === 'glasses' || cmd === 'kacamata') C.fx.push({ type: 'glasses', t0: t, t1: t + +(w[2] || 99) });
    else if (cmd === 'stamp') { const n = line.replace(/"[^"]*"/, '').trim().split(/\s+/).slice(3, 6).map(Number); C.fx.push({ type: 'stamp', t0: t, t1: t + +(w[2] || 2), text: (line.match(/"([^"]+)"/) || [, 'CASE|SOLVED'])[1], x: n[0], y: n[1], size: n[2] }); }
    else if (cmd === 'wz' || cmd === 'wzo') (C.wz = C.wz || []).push([t, cmd === 'wzo' ? 0 : +(w[2] || 1)]);
    else if (cmd === 'anger' || cmd === 'marahfx') C.fx.push({ type: 'anger', t0: t, t1: t + +(w[2] || 1) });
    else if (cmd === 'sweat' || cmd === 'keringat') C.fx.push({ type: 'sweat', t0: t, t1: t + +(w[2] || 1) });
    else if (cmd === 'ask' || cmd === 'tanya') C.fx.push({ type: 'ask', t0: t, t1: t + +(w[2] || 1.2) });
    else if (cmd === 'money' || cmd === 'uang') C.fx.push({ type: 'money', t0: t, t1: t + +(w[2] || 3) });
    else if (cmd === 'board' || cmd === 'papan') C.fx.push({ type: 'board', t0: t, t1: t + +(w[2] || 999) });
    else if (cmd === 'scan') C.fx.push({ type: 'scan', t0: t, t1: t + +(w[2] || .8) });
    else if (cmd === 'boing') C.boing.push([t, +(w[2] || .8)]);
    else if (cmd === 'say' || cmd === 'bilang') { const dur = +(w[2] || 1.2), text = w.slice(3).join(' ') || '...'; C.fx.push({ type: 'say', t0: t, t1: t + dur, text }); C.say = (C.say || []).concat([{ t, dur: Math.min(dur, .25 + text.length * .055), text }]); }
    else if (cmd === 'word' || cmd === 'kata') (C.subs = C.subs || []).push([t, w.slice(2).join(' ')]); // word timing only (no subtitles drawn): drives autozoom
    else if (cmd === 'autozoom' || cmd === 'zoomauto') { // <t> autozoom [every N words] [strength]  |  <t> autozoom off
      if (/^(off|mati)$/i.test(w[2] || '')) (C.az = C.az || []).push({ t, off: true });
      else (C.az = C.az || []).push({ t, every: Math.max(1, +(w[2] || 3)), amt: +(w[3] || 1) }); }
    else if (cmd === 'float' || cmd === 'apung') C.float.push({ t, v: +(w[2] ?? 1), dur: +(w[3] ?? .8) });   // <t> float <0..1> [dur]: floats up in water, drifting and bobbing
    else if (cmd === 'panic' || cmd === 'panik') C.panic.push({ t, v: +(w[2] ?? 1), dur: +(w[3] ?? .3) });   // <t> panic <0..1> [dur]: jittery struggling on top of the float
    else if (cmd === 'hover' || cmd === 'melayang') C.hover.push([t, /^(off|mati|0|no)$/i.test(w[2] || '') ? 0 : 1]);
    else warn.push(`baris ${ln + 1}: perintah tidak dikenal: ${raw}`);
  });
  for (const k of ['expr', 'gest', 'look']) C[k].sort((p, q) => (p[0] ?? p.t0) - (q[0] ?? q.t0));
  C.startle.sort((p, q) => p - q);
  warn.forEach(w => console.log('PERINGATAN', w));
  return C;
}

/* ---------- render ---------- */
async function openPage(data) {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-accelerated-2d-canvas'] });
  const p = await b.newPage({ viewport: { width: RW, height: RH }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.log('ERR', e.message); process.exit(1); });
  p.on('console', m => { if (process.env.DBG) console.log('page:', m.text()); });
  await p.goto('file://' + path.resolve(__dirname, 'react.html') + `?w=${RW}&h=${RH}`);
  await p.waitForFunction(() => window.__reactReady === true, null, { timeout: 60000 });
  await p.evaluate(d => window.setReact(d), data);
  await p.waitForFunction(() => window.__paperReady !== false, null, { timeout: 30000 });   // `paperimg` loads async: wait before the first frame
  await p.evaluate(([n, s]) => { window.MB.maxN = n; window.MB.shutter = s; }, [BLUR, SHUTTER]);
  await p.evaluate(() => Promise.all(Object.values(RX.imgs).map(i => i.decode().catch(() => 0))));
  return { b, p };
}
(async () => {
  const cues = CUES ? parseCues(fs.readFileSync(CUES, 'utf8')) : parseCues('');
  const fr = arg('frame', null); if (fr && fr !== true) { if (String(fr).includes(',')) { const [cy, vh, cx, tilt] = String(fr).split(',').map(Number); cues.frameOverride = { cy, vh, cx: cx || 0 }; if (!isNaN(tilt)) cues.frameOverride.tiltDeg = tilt; } else cues.frame = fr; }
  const au = AUDIO ? analyse(AUDIO) : (() => { const n = Math.ceil(+arg('dur', 5) * FPS); return { n, env: Array(n).fill(0), onset: Array(n).fill(0), dur: n / FPS }; })();
  if (cues.wz && cues.frameOverride) {
    const B = cues.frameOverride, FC = cues.faceCy || 3.05; let n = 0, side = 1;
    for (const [t, step] of cues.wz.sort((a, b) => a[0] - b[0])) {
      n = step ? n + step : 0; const k = Math.pow(.92, n); side = -side;
      cues.cams.push({ t, dur: step ? .1 : .18, cy: lerp(FC, B.cy, k), vh: B.vh * k, cx: (B.cx || 0) * k, roll: step ? side * Math.min(4, 1.2 * n) : 0 });
    }
    cues.cams.sort((a, b) => a.t - b.t);
  }
  { // expression 'soktahu' brings its own pose (book in the left hand, right index finger up) unless a gesture already covers it
    const ex = cues.expr.slice().sort((p, q) => p[0] - q[0]), tEnd = au.dur + (arg('local') ? 0 : START);
    ex.forEach(([t0, k], i) => { if (k !== 'soktahu') return; const t1 = i + 1 < ex.length ? ex[i + 1][0] : tEnd;
      if (!cues.gest.some(G => G.t0 < t1 && G.t1 > t0)) cues.gest.push({ t0, t1, type: 'nerd', side: 1, auto: true }); });
  }
  // autozoom -> camera plan (engine/camplan.js): sampled per frame here, read by react.js camAt()
  let camz = null;
  if (cues.az && cues.az.length) {
    const CP = require('./camplan.js'), off = arg('local') ? 0 : START;
    const onsets = []; for (let f = 0; f < au.n; f++) if (au.onset[f] > 0) onsets.push(f / FPS + off);
    const keys = CP.planCamera({ words: (cues.subs || []).map(([t, text]) => ({ t, text })), exprs: cues.expr, az: cues.az, onsets });
    camz = []; const sh = arg('shake') === null ? 1 : +arg('shake'); for (let f = 0; f < au.n; f++) { const c = CP.sampleCam(keys, f / FPS + off, sh); camz.push([c.z, c.ox, c.oy, c.roll].map(v => +v.toFixed(5))); }
    if (arg('camplan')) fs.writeFileSync(String(arg('camplan')), JSON.stringify(keys, null, 1));
  }
  // acting layer events: '!' words (emphasis hop) and expression changes (a little "take")
  const off0 = arg('local') ? 0 : START, fr0 = t => Math.round((t - off0) * FPS);
  const bangF = (cues.subs || []).filter(([, txt]) => /!/.test(txt)).map(([t]) => fr0(t));
  const ex = cues.expr.slice().sort((p, q) => p[0] - q[0]), takeF = ex.filter((e, i) => i > 0 && e[1] !== ex[i - 1][1]).map(([t]) => fr0(t));
  const VIEW = arg('view') ? JSON.parse(fs.readFileSync(path.resolve(arg('view')))) : null; // [[orbit°, tilt°], ...] per frame from the 3D world camera
  const data = { paperImg: cues.paperImg || null, view: VIEW, fps: FPS, n: au.n, camz, acting: cues.acting ?? 1, bangF, takeF, lights: (cues.lights || []).sort((p, q) => p.t - q.t), env: au.env, onset: au.onset, jelly: JELLY, float: cues.float, panic: cues.panic, bookTitle: cues.bookTitle, frame: cues.frame || 'mid', frameOverride: cues.frameOverride, expr: cues.expr, gest: cues.gest, startle: cues.startle, look: cues.look, fly: cues.fly, hover: cues.hover, cams: cues.cams, shakes: cues.shakes, turns: cues.turns, fx: cues.fx, bg: cues.bg, light: cues.light || null, hurt: cues.hurt || 0, subs: (cues.subs || []).sort((a, b) => a[0] - b[0]) };
  for (const [bt, s] of cues.boing) { const f = Math.round(bt * FPS); if (f >= 0 && f < data.n) data.onset[f] = Math.max(data.onset[f], s); }
  for (const S of cues.say || []) { // speech bubble: fake syllables drive the mouth + jelly
    const syl = Math.max(2, Math.round(S.text.replace(/[^a-z]/gi, '').length / 2.2)), f0 = Math.round(S.t * FPS), f1 = Math.round((S.t + S.dur) * FPS);
    for (let f = f0; f < f1 && f < data.n; f++) { const ph = (f - f0) / Math.max(1, f1 - f0) * syl; data.env[f] = Math.max(data.env[f], .25 + .55 * Math.abs(Math.sin(ph * Math.PI))); }
    for (let k = 0; k < syl; k++) { const f = f0 + Math.round(k * (f1 - f0) / syl); if (f < data.n) data.onset[f] = Math.max(data.onset[f], .45); }
  }
  console.log(`audio ${au.dur.toFixed(2)}s -> ${au.n} frames @${FPS}fps, ${au.onset.filter(v => v > 0).length} suku kata terdeteksi, ${cues.expr.length} ekspresi, ${cues.gest.length} gesture`);
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  if (arg('dump')) fs.writeFileSync(OUT + '_data.json', JSON.stringify(data));

  if (PREVIEW) { // contact sheet on the chosen background
    const { b, p } = await openPage(data); await p.evaluate(c => { document.body.style.background = c; }, '#' + BGHEX);
    const ts = String(PREVIEW).split(',').map(Number), shots = [];
    for (const t of ts) shots.push(await p.evaluate(([f, bg, mb]) => mb ? window.grabReactMB(f, bg) : (window.renderReact(f), window.grabReact(bg)), [Math.min(au.n - 1, Math.round(t * FPS)), '#' + BGHEX, BLUR > 1]));
    const PW = +arg('pw', 270);   // --pw <cell width px> for a bigger contact sheet
    const sheet = await p.evaluate(async ([imgs, labels, PW]) => {
      const ims = await Promise.all(imgs.map(s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/jpeg;base64,' + s; })));
      const w = PW, h = Math.round(PW * 16 / 9), cols = Math.min(6, ims.length), c = document.createElement('canvas'); c.width = w * cols; c.height = h * Math.ceil(ims.length / cols); const g = c.getContext('2d');
      ims.forEach((im, i) => { g.drawImage(im, (i % cols) * w, Math.floor(i / cols) * h, w, h); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 4; g.font = '700 22px Inter, sans-serif'; g.strokeText(labels[i], (i % cols) * w + 8, Math.floor(i / cols) * h + 28); g.fillText(labels[i], (i % cols) * w + 8, Math.floor(i / cols) * h + 28); });
      return c.toDataURL('image/jpeg', .9).split(',')[1];
    }, [shots, ts.map(t => 't=' + t.toFixed(2)), PW]);
    fs.writeFileSync(OUT + '_preview.jpg', Buffer.from(sheet, 'base64')); console.log('preview ->', OUT + '_preview.jpg'); await b.close(); return;
  }

  const dir = OUT + '_frames'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = Array.from({ length: au.n }, (_, i) => i), JOBS = Math.max(1, Math.min(+arg('jobs', Math.min(6, Math.max(1, os.cpus().length - 1))), frames.length));
  const per = Math.ceil(frames.length / JOBS), t0 = Date.now(); let done = 0; const track = new Array(frames.length).fill(null);
  await Promise.all(Array.from({ length: JOBS }, (_, j) => frames.slice(j * per, (j + 1) * per)).filter(c => c.length).map(async list => {
    const { b, p } = await openPage(data);
    for (const f of list) {
      const png = await p.evaluate(([f, mb]) => mb ? window.grabReactMB(f, null) : (window.renderReact(f), window.grabReact(null)), [f, BLUR > 1]);
      fs.writeFileSync(path.join(dir, String(f).padStart(5, '0') + '.png'), Buffer.from(png, 'base64'));
      track[f] = await p.evaluate(() => window.__track || null);
      if (++done % 60 === 0 || done === frames.length) console.log(`frame ${done}/${frames.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await b.close();
  }));
  const pngs = ['-framerate', String(FPS), '-i', path.join(dir, '%05d.png')];
  const aud = AUDIO ? ['-ss', String(START), ...(arg('dur') ? ['-t', String(arg('dur'))] : []), '-i', AUDIO] : [];
  const amap = AUDIO ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : [];
  for (const b of BGS) {
    const mp4 = `${OUT}_${b.replace('#', '')}.mp4`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', ...pngs, ...aud, '-filter_complex', `color=c=0x${hexOf(b)}:s=${RW}x${RH}:r=${FPS}[bg];[bg][0:v]overlay=shortest=1,format=yuv420p[v]`, '-map', '[v]', ...amap, '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-movflags', '+faststart', mp4]);
    console.log('->', mp4);
  }
  if (arg('alpha')) {
    const mov = `${OUT}_alpha.mov`;
    execFileSync('ffmpeg', ['-y', '-v', 'error', ...pngs, ...aud, '-map', '0:v', ...(AUDIO ? ['-map', '1:a', '-c:a', 'pcm_s16le'] : []), '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-shortest', mov]);
    console.log('->', mov);
  }
  fs.writeFileSync(OUT + '_track.json', JSON.stringify({ fps: FPS, W: RW, H: RH, frames: track })); // Pion's screen position per frame (castle3d follows it)
  if (!arg('png')) fs.rmSync(dir, { recursive: true, force: true }); else console.log('-> PNG transparan:', dir);
  console.log('selesai dalam', ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
