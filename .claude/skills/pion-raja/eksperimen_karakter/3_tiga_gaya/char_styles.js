// ---------- Bang Udin in three styles: paper | clay | lowpoly   (metres, ground y = 0, faces +z)
const STYLE = Q.get('style') || 'clay';
const HC = new THREE.Vector3(0, .6875, 0), HR = .194;           // head centre / radius (same proportions as the pixel design)
const BT = .52, BB = .19;                                        // body top / bottom
const bodyHW = y => .125 + (.158 - .125) * (BT - y) / (BT - BB);
const COL = { skin: '#fbecd6', cap: '#34467a', shirt: '#2c3860', vest: '#ff8a1f', stripe: '#eef1f4', pants: '#3e3e4a', shoe: '#2d2a33', ink: '#1e1a24', white: '#ffffff', blush: '#ffa8b2', whistle: '#cfd3de', cord: '#e2475f', hair: '#3a2a22' };
// palette-preserving light (pixel/clay colours stay true; brightness ramps with light + shadow)
function keep(m, lo = .6) { m.toneMapped = false; m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
  'float dl = dot(diffuseColor.rgb, vec3(.299,.587,.114)) + 1e-3; float rl = dot(outgoingLight, vec3(.299,.587,.114)) / dl;\n outgoingLight = diffuseColor.rgb * mix(' + lo.toFixed(2) + ', 1.08, smoothstep(.25, 2.4, rl)) * vec3(1., .975, .94) + max(outgoingLight - diffuseColor.rgb * 2.2, 0.) * .5;\n#include <opaque_fragment>'); }; return m; }
const CHAR = new THREE.Group(); scene.add(CHAR);
function add(geo, mat, x = 0, y = 0, z = 0, parent = CHAR) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; m.userData.ink = 'sil'; parent.add(m); return m; }
function beanPts(scale = 1, y0 = BB, y1 = BT, n = 40) { // lathe profile of the capsule body
  const cy = (BT + BB) / 2, hh = (BT - BB) / 2, p = [];
  for (let i = 0; i <= n; i++) { const v = -1 + 2 * i / n, y = cy + v * hh; if (y < y0 - 1e-6 || y > y1 + 1e-6) continue;
    p.push(new THREE.Vector2(Math.max(.0005, bodyHW(y) * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), 2.7)), 1 / 2.7)) * scale, y)); }
  return p;
}
function tube(pts, r, mat, seg = 8) { return add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 24, r, seg), mat); }
const onHead = (x, y, lift = 0) => { const dy = y - HC.y; return new THREE.Vector3(x, y, Math.sqrt(Math.max(0, HR * HR - x * x - dy * dy)) + lift); };

// ===== shared 3D build (clay = smooth + fingerprints, lowpoly = few faces + flat shading + pixel face)
function build3D(low) {
  const noise = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { g.fillStyle = ['#6c6c6c', '#949494', '#5a5a5a', '#a6a6a6'][i % 4]; g.globalAlpha = .5; g.beginPath(); g.arc(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 0, 7); g.fill(); }
    g.globalAlpha = .25; g.strokeStyle = '#555'; g.lineWidth = 1.5; for (let k = 0; k < 40; k++) { const x = rnd() * w, y = rnd() * h; for (let j = 0; j < 4; j++) { g.beginPath(); g.ellipse(x, y, 6 + j * 4, 4 + j * 3, rnd() * 3, 0, 5); g.stroke(); } } }, [2, 2]);
  noise.colorSpace = THREE.NoColorSpace;
  const M = c => keep(low ? new THREE.MeshStandardMaterial({ color: c, roughness: .9, flatShading: true })
                          : new THREE.MeshStandardMaterial({ color: c, roughness: .5, bumpMap: noise, bumpScale: 1.4 }), low ? .38 : .6);
  const seg = low ? [7, 5] : [48, 32];
  // head (+ hair at the back) and cap
  const headGeo = low ? new THREE.IcosahedronGeometry(HR, 1) : new THREE.SphereGeometry(HR, ...seg);
  if (!low) { const p = headGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); v.multiplyScalar(1 + .012 * Math.sin(v.x * 61 + v.y * 37) * Math.cos(v.z * 53)); p.setXYZ(i, v.x, v.y, v.z); } headGeo.computeVertexNormals(); }
  let faceTex = null;
  if (low) { // pixel face painted into a 32x32 texture on a curved patch
    faceTex = canvasTex(32, 32, (g) => { g.fillStyle = COL.skin; g.fillRect(0, 0, 32, 32); g.fillStyle = COL.ink;
      [[7, 11], [19, 11]].forEach(([x, y]) => { g.fillRect(x + 1, y, 4, 1); g.fillRect(x + 1, y + 5, 4, 1); g.fillRect(x, y + 1, 1, 4); g.fillRect(x + 5, y + 1, 1, 4); g.fillStyle = '#fff'; g.fillRect(x + 1, y + 1, 4, 4); g.fillStyle = COL.ink; g.fillRect(x + 3, y + 1, 2, 2); });
      g.fillRect(8, 8, 4, 1); g.fillRect(20, 8, 4, 1); g.fillRect(9, 21, 4, 1); g.fillRect(13, 20, 2, 1); g.fillStyle = COL.whistle; g.fillRect(15, 20, 4, 2);
      g.fillStyle = COL.blush; g.fillRect(4, 18, 3, 2); g.fillRect(25, 18, 3, 2); });
    faceTex.magFilter = faceTex.minFilter = THREE.NearestFilter; faceTex.generateMipmaps = false;
  }
  const head = add(headGeo, M(COL.skin), HC.x, HC.y, HC.z);
  const hair = add(low ? new THREE.IcosahedronGeometry(HR * 1.02, 1) : new THREE.SphereGeometry(HR * 1.025, 40, 24, Math.PI * 1.04, Math.PI * .92, Math.PI * .24, Math.PI * .4), M(COL.hair), HC.x, HC.y, HC.z);
  if (low) { hair.scale.set(1, 1, 1); hair.position.z -= .02; hair.geometry = new THREE.SphereGeometry(HR * 1.03, 8, 4, Math.PI * 1.04, Math.PI * .92, Math.PI * .24, Math.PI * .4); hair.material.flatShading = true; }
  const capM = M(COL.cap);
  const dome = add(new THREE.SphereGeometry(HR * 1.05, low ? 8 : 48, low ? 4 : 16, 0, Math.PI * 2, 0, .9), capM, HC.x, HC.y + .006, HC.z);
  const brim = add(new THREE.CylinderGeometry(HR * 1.08, HR * 1.08, .014, low ? 8 : 48), capM, 0, HC.y + HR * .62, .045); brim.scale.z = 1.25;
  add(low ? new THREE.BoxGeometry(.03, .02, .03) : new THREE.SphereGeometry(.016, 16, 10), capM, 0, HC.y + HR * 1.05, 0);
  // face
  if (low) { const patch = add(new THREE.SphereGeometry(HR * 1.008, 8, 6, Math.PI * .5 - .5, 1.0, Math.PI * .5 - .42, .84), keep(new THREE.MeshStandardMaterial({ map: faceTex, roughness: .9 })), HC.x, HC.y - .02, HC.z); patch.rotation.y = -Math.PI / 2 + Math.PI / 2; patch.castShadow = false; }
  else {
    const white = M(COL.white), ink = M(COL.ink);
    [-1, 1].forEach(k => { const p = onHead(k * .062, .69, -.004);
      const e = add(new THREE.SphereGeometry(.036, 32, 16), white, p.x, p.y, p.z); e.scale.z = .45; e.lookAt(HC.clone().multiplyScalar(-1).add(p.clone().multiplyScalar(2)));
      const q = onHead(k * .062 + .012, .702, .012); add(new THREE.SphereGeometry(.013, 16, 10), ink, q.x, q.y, q.z);
      const b0 = onHead(k * .062 - .026, .77, .002), b1 = onHead(k * .062 + .026, .77, .002); tube([[b0.x, b0.y, b0.z], [(b0.x + b1.x) / 2, .774, (b0.z + b1.z) / 2 + .003], [b1.x, b1.y, b1.z]], .0075, ink);
      const bl = onHead(k * .128, .628, -.002); const s = add(new THREE.SphereGeometry(.024, 20, 12), M(COL.blush), bl.x, bl.y, bl.z); s.scale.z = .3; s.lookAt(bl.clone().multiplyScalar(2).sub(HC)); });
    const m0 = onHead(-.085, .605, .002), m1 = onHead(-.035, .6, .002), m2 = onHead(-.005, .615, .002); tube([[m0.x, m0.y, m0.z], [m1.x, m1.y, m1.z], [m2.x, m2.y, m2.z]], .0065, ink);
    const w = onHead(.035, .607, .012); const wh = add(new THREE.CapsuleGeometry(.012, .036, 6, 12), M(COL.whistle), w.x, w.y, w.z); wh.rotation.z = Math.PI / 2;
  }
  if (low) add(new THREE.BoxGeometry(.05, .024, .03), M(COL.whistle), .035, .607, HR * .93);
  // body: shirt bean, pants + vest shells
  const lat = (pts, segs, c, ps = 0, pl = Math.PI * 2) => add(new THREE.LatheGeometry(pts, low ? 7 : segs, ps, pl), c);
  const body = lat(beanPts(1), 64, M(COL.shirt)); body.scale.z = .85;
  const pants = lat(beanPts(1.025, BB, .3), 64, M(COL.pants)); pants.scale.z = .87;
  const gap = .3, vm = M(COL.vest), sm = M(COL.stripe);
  [[.3, .388, vm], [.388, .41, sm], [.41, BT - .012, vm]].forEach(([a, b, m]) => { const v = lat(beanPts(1.045, a, b, 160), 64, m, gap, Math.PI * 2 - 2 * gap); v.scale.z = .89; v.material.side = THREE.DoubleSide; });
  if (!low) tube([[.04, .59, .17], [.05, .55, .155], [.045, .5, .14], [.035, .46, .14]], .004, M(COL.cord), 6);
  // limbs: clay rolls / low-poly sticks
  const ink = M(COL.ink), r = low ? .011 : .013, rs = low ? 4 : 10;
  tube([[-.115, .45, 0], [-.15, .37, .015], [-.17, .27, .03], [-.18, .22, .035]], r, ink, rs);
  tube([[.115, .45, 0], [.19, .47, .03], [.235, .53, .05], [.25, .6, .055]], r, ink, rs);
  const hand = low ? new THREE.IcosahedronGeometry(.024, 0) : new THREE.SphereGeometry(.024, 20, 14);
  add(hand, ink, -.18, .215, .035); add(hand, ink, .25, .615, .055);
  [-1, 1].forEach(k => { tube([[k * .052, .21, 0], [k * .053, .12, 0], [k * .055, .035, .005]], r, ink, rs);
    const sh = add(low ? new THREE.BoxGeometry(.07, .04, .11) : new RoundedBoxGeometry(.075, .042, .115, 3, .018), M(COL.shoe), k * .06, .021, .025); });
}

function paperMask(map) { return new THREE.ShaderMaterial({ uniforms: { map: { value: map } }, side: THREE.DoubleSide, blending: THREE.NoBlending,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: 'uniform sampler2D map; varying vec2 vUv; void main(){ if (texture2D(map, vUv).a < .5) discard; gl_FragColor = vec4(0.); }' }); }
// ===== paper cut-out: clean 2D drawing on card, white paper border, real thickness, folded stand
function buildPaper() {
  const PX = 1000, CW = 820, CHh = 1080, G = 1050;            // 1000 px per metre
  const X = x => CW / 2 + x * PX, Y = y => G - y * PX;
  const art = document.createElement('canvas'); art.width = CW; art.height = CHh; const g = art.getContext('2d');
  g.lineCap = g.lineJoin = 'round'; const INKc = COL.ink, LW = 7;
  const bean = () => { g.beginPath(); for (let i = 0; i <= 120; i++) { const a = i / 120 * Math.PI * 2, u = Math.cos(a), v = Math.sin(a), y = (BT + BB) / 2 - v * (BT - BB) / 2;
    const x = Math.sign(u) * Math.pow(Math.abs(u), 2 / 2.7) * bodyHW(y), yy = (BT + BB) / 2 - Math.sign(v) * Math.pow(Math.abs(v), 2 / 2.7) * (BT - BB) / 2; i ? g.lineTo(X(x), Y(yy)) : g.moveTo(X(x), Y(yy)); } g.closePath(); };
  const line = (pts, w = LW, c = INKc) => { g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
  const curve = (p, w = LW) => { g.beginPath(); g.moveTo(X(p[0][0]), Y(p[0][1])); g.quadraticCurveTo(X(p[1][0]), Y(p[1][1]), X(p[2][0]), Y(p[2][1])); g.strokeStyle = INKc; g.lineWidth = w; g.stroke(); };
  const circ = (x, y, r, fill, w = LW) => { g.beginPath(); g.arc(X(x), Y(y), r * PX, 0, 7); if (fill) { g.fillStyle = fill; g.fill(); } if (w) { g.strokeStyle = INKc; g.lineWidth = w; g.stroke(); } };
  // legs + shoes
  [-1, 1].forEach(k => { line([[k * .052, .21], [k * .055, .04]], 9);
    g.beginPath(); g.roundRect(X(k * .06 - .04), Y(.045), .08 * PX, .045 * PX, 14); g.fillStyle = COL.shoe; g.fill(); g.lineWidth = 5; g.strokeStyle = INKc; g.stroke(); });
  // arms behind? (both in front here)
  // body
  bean(); g.fillStyle = COL.shirt; g.fill(); g.save(); bean(); g.clip();
  g.fillStyle = COL.pants; g.fillRect(0, Y(.3), CW, CHh);
  g.fillStyle = COL.vest; g.fillRect(0, Y(BT), X(-.034), Y(.3) - Y(BT)); g.fillRect(X(.034), Y(BT), CW, Y(.3) - Y(BT));
  g.fillStyle = COL.stripe; g.fillRect(0, Y(.41), X(-.034), Y(.388) - Y(.41)); g.fillRect(X(.034), Y(.41), CW, Y(.388) - Y(.41));
  const sh = g.createLinearGradient(X(0), 0, X(.16), 0); sh.addColorStop(0, 'rgba(40,20,60,0)'); sh.addColorStop(1, 'rgba(40,20,60,.28)'); g.fillStyle = sh; g.fillRect(X(.02), 0, CW, CHh);
  line([[-.034, BT], [-.034, .3]], 4); line([[.034, BT], [.034, .3]], 4); line([[-.2, .3], [.2, .3]], 4);
  g.restore(); bean(); g.strokeStyle = INKc; g.lineWidth = LW; g.stroke();
  line([[.045, .585], [.05, .54], [.04, .47]], 4, COL.cord);
  // head
  circ(HC.x, HC.y, HR, COL.skin, 0); g.save(); g.beginPath(); g.arc(X(HC.x), Y(HC.y), HR * PX, 0, 7); g.clip();
  const hs = g.createLinearGradient(X(.06), 0, X(.2), 0); hs.addColorStop(0, 'rgba(250,215,180,0)'); hs.addColorStop(1, 'rgba(240,200,160,.9)'); g.fillStyle = hs; g.fillRect(X(.06), 0, CW, CHh); g.restore();
  circ(HC.x, HC.y, HR, null);
  // cap
  g.save(); g.beginPath(); g.rect(0, 0, CW, Y(HC.y + HR * .62)); g.clip(); circ(HC.x, HC.y + .004, HR * 1.05, COL.cap); g.restore();
  g.beginPath(); g.roundRect(X(-HR * 1.16), Y(HC.y + HR * .66), HR * 2.32 * PX, .03 * PX, 12); g.fillStyle = '#26345e'; g.fill(); g.lineWidth = LW; g.strokeStyle = INKc; g.stroke();
  circ(0, HC.y + HR * 1.06, .015, COL.cap, 5);
  // face
  [-1, 1].forEach(k => { circ(k * .062, .69, .034, COL.white, 6); circ(k * .062 + .012, .7, .013, INKc, 0);
    curve([[k * .062 - .028, .768], [k * .062, .778], [k * .062 + .028, .768]], 8);
    g.globalAlpha = .55; circ(k * .128, .628, .022, COL.blush, 0); g.globalAlpha = 1; });
  curve([[-.088, .605], [-.05, .592], [-.012, .615]], 7);
  g.beginPath(); g.roundRect(X(.01), Y(.62), .055 * PX, .026 * PX, 8); g.fillStyle = COL.whistle; g.fill(); g.lineWidth = 4; g.strokeStyle = INKc; g.stroke();
  // arms
  curve([[-.115, .45], [-.16, .34], [-.18, .22]], 8); circ(-.18, .215, .022, INKc, 0);
  curve([[.115, .45], [.24, .46], [.25, .6]], 8); circ(.25, .615, .024, INKc, 0);
  // white paper border (dilate the silhouette) + card edge colour for the thickness layers
  const border = document.createElement('canvas'); border.width = CW; border.height = CHh; const b = border.getContext('2d');
  for (let a = 0; a < 32; a++) b.drawImage(art, Math.cos(a / 32 * 6.283) * 18, Math.sin(a / 32 * 6.283) * 18);
  b.globalCompositeOperation = 'source-in'; b.fillStyle = '#fffdf6'; b.fillRect(0, 0, CW, CHh);
  b.globalCompositeOperation = 'source-over'; b.drawImage(art, 0, 0);
  // paper grain
  b.globalCompositeOperation = 'source-atop'; for (let i = 0; i < 14000; i++) { b.fillStyle = `rgba(120,100,70,${rnd() * .07})`; b.fillRect(rnd() * CW, rnd() * CHh, 2, 2); }
  const edge = document.createElement('canvas'); edge.width = CW; edge.height = CHh; const e = edge.getContext('2d'); e.drawImage(border, 0, 0); e.globalCompositeOperation = 'source-in'; e.fillStyle = '#d8ccb6'; e.fillRect(0, 0, CW, CHh);
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const front = tex(border), side = tex(edge), w = CW / PX, h = CHh / PX;
  const card = new THREE.Group(); CHAR.add(card); card.position.y = h / 2 - (CHh - G) / PX;
  const T = .008, N = 6;
  for (let i = 0; i <= N; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), keep(new THREE.MeshStandardMaterial({ map: i === 0 ? front : side, alphaTest: .5, side: THREE.DoubleSide, roughness: .95 })));
    m.position.z = -i * T / N; m.castShadow = true; m.receiveShadow = i === 0; m.userData.ink = 'sil'; m.userData.maskMat = paperMask(front); card.add(m); }
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), keep(new THREE.MeshStandardMaterial({ map: side, alphaTest: .5, roughness: .95 }))); back.rotation.y = Math.PI; back.position.z = -T - .0005; back.userData.ink = 'sil'; back.userData.maskMat = paperMask(front); card.add(back);
  // folded card stand behind
  const stand = new THREE.Mesh(new THREE.PlaneGeometry(.16, .34), keep(new THREE.MeshStandardMaterial({ color: '#d8ccb6', side: THREE.DoubleSide, roughness: .95 })));
  stand.position.set(0, .16, -.1); stand.rotation.x = -.55; stand.castShadow = true; stand.userData.ink = 'full';
  CHAR.rotation.y = .32;   // turned a little towards the camera so the card thickness reads
}
if (STYLE === 'paper') buildPaper(); else build3D(STYLE === 'lowpoly');
