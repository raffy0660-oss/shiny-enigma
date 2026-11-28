// ---------- Bang Udin, "soft block" style (our version): rounded-box toy figure, big head, painted 2D-ink face
// metres, ground y = 0, faces +z. Built as a joint hierarchy so it can be posed / animated later.
const EXPR = Q.get('expr') || 'smirk';
function keep(m, lo = .66) { m.toneMapped = false; m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
  'float dl = dot(diffuseColor.rgb, vec3(.299,.587,.114)) + 1e-3; float rl = dot(outgoingLight, vec3(.299,.587,.114)) / dl;\n outgoingLight = diffuseColor.rgb * mix(' + lo.toFixed(2) + ', 1.08, smoothstep(.25, 2.4, rl)) * vec3(1., .975, .94);\n#include <opaque_fragment>'); }; return m; }
// painted grain (slightly worn paint, like a hand-painted toy)
const grain = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${rnd() < .5 ? '255,255,255' : '110,95,80'},${.02 + rnd() * .04})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 0, 7); g.fill(); }
  for (let i = 0; i < 60; i++) { g.strokeStyle = 'rgba(110,95,80,.05)'; g.lineWidth = 1 + rnd() * 2; g.beginPath(); const x = rnd() * w, y = rnd() * h; g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 40, y + (rnd() - .5) * 40); g.stroke(); } }, [1, 1]);
const MAT = {}; const mat = (c, lo, extra = {}) => (MAT[c + lo] ||= keep(new THREE.MeshStandardMaterial(Object.assign({ color: c, map: grain, roughness: .75 }, extra)), lo));
const C = { skin: '#f6c49b', skinD: '#e9a77c', cap: '#2f4a8c', hair: '#2b1d17', shirt: '#2a3352', vest: '#ff7f1e', stripe: '#e9eef3', shorts: '#9a7a52',
  sole: '#2c4f8a', strap: '#f2f2f0', towel: '#fbf6ea', towelS: '#e2475f', ink: '#1e1a24', white: '#ffffff', blush: '#ff8f8f', metal: '#c9ced8', cord: '#e2475f', ticket: '#ffd34d' };
const CHAR = new THREE.Group(); scene.add(CHAR);
function box(parent, w, h, d, c, x, y, z, r = .025, lo) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - .001, h / 2 - .001, d / 2 - .001)), mat(c, lo));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; m.userData.ink = 'sil'; parent.add(m); return m; }
function disk(parent, r, c, x, y, z, sy = 1) { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), keep(new THREE.MeshBasicMaterial({ color: c }), 1)); m.material.toneMapped = false;
  m.position.set(x, y, z); m.scale.y = sy; m.userData.ink = 'sil'; parent.add(m); return m; }
function tube(parent, pts, r, c) { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 20, r, 8), mat(c, .6)); m.castShadow = true; m.userData.ink = 'sil'; parent.add(m); return m; }
const joint = (parent, x, y, z) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };

// ---- legs + sandals jepit
[-1, 1].forEach(k => {
  const x = k * .072;
  box(CHAR, .09, .022, .155, C.sole, x, .011, .02, .009);
  box(CHAR, .074, .04, .12, C.skin, x, .042, .022, .018);                   // foot
  [-.02, 0, .02].forEach((dx, i) => box(CHAR, .018, .016, .02, C.skin, x + dx, .03, .085, .007));  // toes
  tube(CHAR, [[x - .036, .03, -.005], [x - .01, .06, .055], [x, .036, .088]], .0055, C.strap);     // Y strap
  tube(CHAR, [[x + .036, .03, -.005], [x + .01, .06, .055], [x, .036, .088]], .0055, C.strap);
  box(CHAR, .078, .22, .082, C.skin, x, .17, 0, .03);                        // calf
});
// ---- shorts (cargo, khaki) with a centre seam and side pockets
box(CHAR, .29, .14, .19, C.shorts, 0, .325, 0, .035);
box(CHAR, .006, .1, .005, '#6e5536', 0, .3, .096, .002);
[-1, 1].forEach(k => box(CHAR, .012, .07, .07, '#86683f', k * .148, .31, 0, .006));
// ---- torso: navy t-shirt + safety vest (open front) with reflective stripe
const torso = joint(CHAR, 0, .395, 0);
box(torso, .29, .29, .18, C.shirt, 0, .14, 0, .05);
[-1, 1].forEach(k => {
  box(torso, .105, .26, .03, C.vest, k * .088, .135, .09, .012);           // front panels
  box(torso, .105, .026, .034, C.stripe, k * .088, .095, .092, .006);
  box(torso, .03, .26, .17, C.vest, k * .148, .135, 0, .012);              // sides
  box(torso, .034, .026, .172, C.stripe, k * .149, .095, 0, .006);
});
box(torso, .29, .26, .03, C.vest, 0, .135, -.09, .012); box(torso, .292, .026, .034, C.stripe, 0, .095, -.092, .006);
box(torso, .05, .04, .012, '#ffd34d', -.088, .2, .108, .005);               // name badge on the vest
// little towel around the neck (white with red stripes), ends hanging in front
const towelTex = canvasTex(64, 256, (g, w, h) => { g.fillStyle = C.towel; g.fillRect(0, 0, w, h); g.fillStyle = C.towelS; [40, 56, 200, 216].forEach(y => g.fillRect(0, y, w, 8)); });
const towelM = keep(new THREE.MeshStandardMaterial({ map: towelTex, roughness: .95 }), .6);
[[.112, .05], [-.112, -.04]].forEach(([z, rz]) => { const t = new THREE.Mesh(new RoundedBoxGeometry(.08, .19, .016, 2, .007), towelM); t.position.set(-.085, .19, z); t.rotation.z = rz; t.castShadow = true; t.userData.ink = 'sil'; torso.add(t); });
box(torso, .1, .03, .24, C.towel, -.088, .292, 0, .012);
// ---- head
const neck = joint(torso, 0, .29, 0);
box(neck, .08, .04, .08, C.skinD, 0, .01, 0, .02);
const head = joint(neck, 0, .03, 0);
const HW = .315, HH = .305, HD = .275, FZ = HD / 2;
box(head, HW, HH, HD, C.skin, 0, HH / 2, 0, .06);
[-1, 1].forEach(k => { box(head, .035, .075, .06, C.skin, k * (HW / 2 + .01), .15, 0, .015); box(head, .012, .04, .03, C.skinD, k * (HW / 2 + .026), .15, 0, .005); });
box(head, .056, .05, .05, C.skinD, 0, .125, FZ + .012, .02);               // nose
// hair below the cap (back + sideburns + a few tufts)
box(head, HW - .014, .12, .16, C.hair, 0, .215, -.066, .04);
[[-.1, .29, -.13], [.03, .30, -.145], [.12, .28, -.12]].forEach(([x, y, z]) => box(head, .07, .05, .05, C.hair, x, y, z, .015));
// cap: dome + brim + button
box(head, HW + .014, .095, HD + .016, C.cap, 0, HH - .02, 0, .04);
const brim = box(head, .26, .018, .13, '#26407a', 0, HH - .062, FZ + .06, .008); brim.rotation.x = .08;
box(head, .03, .014, .03, '#26407a', 0, HH + .03, 0, .006);
box(head, .07, .035, .006, '#f2c230', 0, HH - .015, FZ + .009, .004);       // cap badge "P"
// face: painted 2D ink features on the front
const F = FZ + .001;
const EY = .175, EX = .066;
const eyes = { smirk: [1, 1], happy: [0, 0], shock: [1.25, 1.25] }[EXPR] || [1, 1];
[-1, 1].forEach((k, i) => {
  const s = eyes[i];
  if (s) { disk(head, .043 * s, C.ink, k * EX, EY, F, 1.12); disk(head, .036 * s, C.white, k * EX, EY, F + .001, 1.12); disk(head, .016 * (EXPR === 'shock' ? .7 : 1), C.ink, k * EX + .01, EY + .006, F + .002); disk(head, .005, C.white, k * EX + .015, EY + .013, F + .003); }
  else tube(head, [[k * EX - .03, EY - .005, F + .002], [k * EX, EY + .022, F + .004], [k * EX + .03, EY - .005, F + .002]], .006, C.ink);
  const b = box(head, .062, .014, .008, C.ink, k * EX, EY + .066 + (EXPR === 'smirk' && k > 0 ? .012 : 0), F + .002, .006);
  b.rotation.z = EXPR === 'smirk' ? (k > 0 ? -.18 : .1) * 1 : EXPR === 'shock' ? k * .25 : -k * .1;
  disk(head, .022, C.blush, k * .108, .108, F + .001).material.opacity = .9;
});
if (EXPR === 'smirk') {
  tube(head, [[-.07, .072, F + .002], [-.035, .062, F + .003], [-.005, .07, F + .002]], .0062, C.ink);
  const w = new THREE.Mesh(new THREE.CapsuleGeometry(.011, .045, 6, 12), mat(C.metal, .5, { roughness: .35, metalness: .4 })); w.rotation.z = Math.PI / 2; w.position.set(.03, .068, F + .012); w.castShadow = true; w.userData.ink = 'sil'; head.add(w);
  tube(head, [[.05, .06, F + .012], [.07, .0, F + .01], [.05, -.06, F + .02]], .0032, C.cord);
} else {
  const sh = new THREE.Shape(); sh.moveTo(-.045, 0); sh.lineTo(.045, 0); sh.absarc(0, 0, .045, 0, -Math.PI, true);
  const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 24), keep(new THREE.MeshBasicMaterial({ color: '#7a2a2e' }), 1)); m.position.set(0, .085, F + .002); m.scale.y = EXPR === 'shock' ? 1.2 : .8; m.userData.ink = 'sil'; head.add(m);
  box(head, .07, .012, .004, C.white, 0, .079, F + .004, .003);
}
// ---- arms (shoulder -> elbow -> hand), sleeves of the t-shirt, mitten hands with thumb
function arm(side, sh, el, wr) {
  const s = joint(torso, side * .168, .25, 0); s.rotation.z = sh[0]; s.rotation.x = sh[1] || 0;
  box(s, .09, .13, .095, C.shirt, 0, -.05, 0, .03);
  box(s, .072, .07, .074, C.skin, 0, -.13, 0, .025);
  const e = joint(s, 0, -.15, 0); e.rotation.z = el[0]; e.rotation.x = el[1] || 0;
  box(e, .068, .11, .07, C.skin, 0, -.05, 0, .025);
  const h = joint(e, 0, -.12, 0); h.rotation.z = wr || 0;
  box(h, .085, side > 0 && wr ? .11 : .092, side > 0 && wr ? .04 : .06, C.skin, 0, side > 0 && wr ? -.048 : -.038, 0, .018);
  box(h, .028, .045, .03, C.skin, -side * .045, -.02, .015, .012);
  if (side > 0 && wr) [-.02, .0, .02].forEach(dx => box(h, .004, .04, .004, C.skinD, dx, -.06, .021, .0015));
  return h;
}
const handR = arm(1, [2.55, -.15], [.45, 0], .1);                          // raised: "stop / maju terus"
const handL = arm(-1, [-.12, .12], [-.25, .55], 0);                        // relaxed, holding parking tickets
box(handL, .07, .012, .05, C.ticket, .0, -.055, .04, .003); box(handL, .07, .012, .05, '#ff9fb0', .004, -.045, .042, .003);
