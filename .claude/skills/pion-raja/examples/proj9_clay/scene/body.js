sky.material.uniforms.showSunDisc.value = 0;   // ======================== proj9 body (no sun disc: it bloomed into a glare over the street)
sky.material.uniforms.showSunDisc.value = 0; // ================================================================== proj9 body sky.material.uniforms.showSunDisc.value = 0;
sky.material.uniforms.mieCoefficient.value = 0.0004; sky.material.uniforms.mieDirectionalG.value = 0.45;   // less sun glare over the street
const LDIR = SUN_DIR.clone();                       // current key-light direction (per shot)
function aimLight(center, radius, dir, col, inten) {
  LDIR.copy(dir).normalize(); sun.color.set(col); sun.intensity = inten;
  sun.target.position.copy(center); sun.position.copy(center).addScaledVector(LDIR, radius * 3);
  const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius; c.near = radius * 0.2; c.far = radius * 7; c.updateProjectionMatrix();
}
const TL = new THREE.TextureLoader();
const loadTex = (u, srgb = true) => { const t = TL.load(u); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
const std = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const add = (geo, mat, x, y, z, parent = scene, cast = true) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true; parent.add(m); return m; };
const noiseTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ["#6a6a6a", "#9a9a9a", "#555", "#aaa"], 3); }, [3, 3], false);

// ------------------------------------------------------------------ cartoon clouds (shared with proj8)
{ const geo = new THREE.IcosahedronGeometry(1, 4), mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xfff6ea, emissiveIntensity: 0.95, fog: false });
  const N = 420, im = new THREE.InstancedMesh(geo, mat, N), d = new THREE.Object3D(); let n = 0;
  const cloud = (cx, cy, cz, sc) => { const k = 9 + ((rnd() * 6) | 0);
    for (let i = 0; i < k && n < N; i++) { const u = i / (k - 1) - 0.5, r = sc * (0.55 + 0.45 * Math.cos(u * Math.PI)) * (0.8 + rnd() * 0.4);
      d.position.set(cx + u * sc * 3.6 + (rnd() - .5) * sc * 0.5, cy + r * 0.35 + rnd() * 0.3 * sc, cz + (rnd() - .5) * sc * 0.9); d.scale.set(r, r * 0.82, r); d.updateMatrix(); im.setMatrixAt(n, d.matrix);
      im.setColorAt(n++, new THREE.Color().setHSL(0.6, 0.1, 0.94 + rnd() * 0.06)); }
    d.position.set(cx, cy - sc * 0.05, cz); d.scale.set(sc * 2.1, sc * 0.35, sc * 0.8); d.updateMatrix(); im.setMatrixAt(n, d.matrix); im.setColorAt(n++, new THREE.Color(0xdfe4ec)); };
  for (const [x, y, z, s] of [[-420, 700, -2600, 70], [300, 820, -2900, 85], [-60, 1000, -3200, 60], [600, 600, -2500, 55], [-800, 880, -2800, 65],
    [-650, 60, 40, 9], [-610, 48, 30, 7], [-580, 70, 60, 11], [-690, 40, 50, 8], [-560, 36, 70, 6], [-730, 72, 30, 10], [-540, 80, 45, 7], [-640, 30, -40, 8], [-600, 55, -70, 10]]) cloud(x, y, z, s);
  im.count = n; im.instanceColor.needsUpdate = true; scene.add(im); }

// ------------------------------------------------------------------ sea (west) and city ground
const sea = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.MeshPhysicalMaterial({ color: 0x2a86b8, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08,
  normalMap: canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#8080ff"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${110 + rnd() * 40},${110 + rnd() * 40},255,.5)`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 14, 2 + rnd() * 3, 0, 0, 7); g.fill(); } }, [60, 60], false) }));
sea.rotation.x = -Math.PI / 2; sea.position.set(-3300, -0.6, 0); scene.add(sea);
const asphalt = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#4a4b4f"; g.fillRect(0, 0, w, h); speckle(g, w, h, 30000, ["#3e3f43", "#56575b", "#5f6064"], 2); }, [1, 1]);
const groundM = new THREE.MeshStandardMaterial({ map: rep(asphalt, 120, 120), roughness: 0.92 });
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), groundM); ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, 0); ground.receiveShadow = true; scene.add(ground);
const beach = new THREE.Mesh(new THREE.PlaneGeometry(60, 600), std(0xe8d3a2, 0.95)); beach.rotation.x = -Math.PI / 2; beach.position.set(-325, 0.02, 0); beach.receiveShadow = true; scene.add(beach);
const flat = (w, d, mat, x, z, y = 0.02) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; };
// road along x with markings, sidewalks
flat(600, 9, std(0x3c3d41, 0.9), 0, 1.2, 0.03);
for (let x = -290; x < 290; x += 6) flat(3, 0.18, new THREE.MeshBasicMaterial({ color: 0xe9e3d0 }), x, 1.2, 0.04);
const paver = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#b9a58a"; g.fillRect(0, 0, w, h); const s = 64; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const v = 170 + rnd() * 40; g.fillStyle = `rgb(${v + 20},${v},${v - 20})`; rr(g, x + 2, y + 2, s - 4, s - 4, 6); g.fill(); } }, [1, 1]);
flat(600, 4.2, new THREE.MeshStandardMaterial({ map: rep(paver, 150, 1), roughness: 0.85 }), 0, -5.0, 0.05);
flat(600, 4.2, new THREE.MeshStandardMaterial({ map: rep(paver, 150, 1), roughness: 0.85 }), 0, 7.4, 0.05);

// ------------------------------------------------------------------ Bangkok street: colourful shophouses, wat, palms, tuk-tuk
function facade(wall) { return canvasTex(512, 512, (g, w, h) => { g.fillStyle = wall; g.fillRect(0, 0, w, h); speckle(g, w, h, 3000, ["rgba(0,0,0,.05)", "rgba(255,255,255,.12)"], 3);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) { const x = 40 + k * 240, y = 40 + r * 160, ww = 190, hh = 110;
    g.fillStyle = "#fffaf0"; rr(g, x - 8, y - 8, ww + 16, hh + 16, 14); g.fill(); const gr = g.createLinearGradient(x, y, x + ww, y + hh); const lit = rnd() < .2;
    gr.addColorStop(0, lit ? "#ffe7a1" : "#9fd6ef"); gr.addColorStop(1, lit ? "#f2b14c" : "#3a6c9c"); g.fillStyle = gr; rr(g, x, y, ww, hh, 12); g.fill();
    g.fillStyle = "#2d3136"; g.fillRect(x - 10, y + hh + 2, ww + 20, 7); } }); }
const WALLS = ["#f6c94c", "#ef8a6f", "#5bbfb5", "#b9a1e3", "#a2dbb0", "#f7b98b", "#86c9ef", "#f4e2c0"];
const FAC = WALLS.map(c => { const t = facade(c); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 0.8, roughness: 0.65 }); });
const ROOF = [0xe4572e, 0x2e86ab, 0xf2c14e, 0x7b5ea7, 0x3fa34d].map(c => std(c, 0.5));
function shophouse(x, z, w, h, side) {
  const m = FAC[(rnd() * FAC.length) | 0].clone(); m.map = rep(m.map, Math.max(1, Math.round(w / 6)), Math.max(1, Math.round(h / 6))); m.bumpMap = m.map;
  const b = add(new RoundedBoxGeometry(w, h, 8, 3, 0.4).translate(0, h / 2, 0), m, x, 0, z); b.rotation.y = side > 0 ? 0 : Math.PI;
  const aw = add(new THREE.BoxGeometry(w * 0.92, 0.12, 1.6), ROOF[(rnd() * ROOF.length) | 0], x, 3.1, z + side * 4.6); aw.rotation.x = side * 0.18;
  const sg = canvasTex(512, 128, (g, cw, ch) => { g.fillStyle = ["#d62828", "#1d3557", "#2a9d8f", "#e76f51"][(rnd() * 4) | 0]; g.fillRect(0, 0, cw, ch); g.fillStyle = "#fff"; g.font = "900 64px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(["NOODLE", "MASSAGE", "7-ELEVEN", "MANGO", "TEA", "SOUVENIR", "PHONE"][(rnd() * 7) | 0], cw / 2, ch / 2); }, null);
  sg.wrapS = sg.wrapT = THREE.ClampToEdgeWrapping;
  const s = add(new THREE.PlaneGeometry(w * 0.6, 0.7), new THREE.MeshStandardMaterial({ map: sg, emissive: 0xffffff, emissiveMap: sg, emissiveIntensity: 0.25 }), x, 3.8, z + side * 4.05, scene, false);
  if (side < 0) s.rotation.y = Math.PI;
  if (rnd() < 0.5) { const c = add(new THREE.ConeGeometry(Math.min(w, 8) * 0.45, 2.5, 4), ROOF[(rnd() * ROOF.length) | 0], x, h + 1.25, z); c.rotation.y = Math.PI / 4; }
  if (Math.abs(x) < 45) shopDetail(x, z, w, h, side);
}
// street-level detail for the houses near the camera: balconies with rails, AC units, shutters, potted plants (own RNG: the street layout stays the same)
const drnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(24680);
const railT = canvasTex(256, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "#f4f1ea"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 6, w, 6); for (let x = 4; x < w; x += 18) g.fillRect(x, 0, 6, h); }, [1, 1]);
const railM = new THREE.MeshStandardMaterial({ map: railT, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5 }), slabM = std(0xf4f1ea, 0.7), acM = std(0xe9ecef, 0.45, 0.1);
const grillT = canvasTex(128, 96, (g, w, h) => { g.fillStyle = "#e9ecef"; g.fillRect(0, 0, w, h); g.fillStyle = "#9aa1a8"; for (let y = 10; y < h - 8; y += 9) g.fillRect(10, y, w * 0.55, 4); g.beginPath(); g.arc(w * 0.82, h / 2, 16, 0, 7); g.fill(); }, null);
const acFront = new THREE.MeshStandardMaterial({ map: grillT, roughness: 0.5 });
const shutT = canvasTex(128, 128, (g, w, h) => { g.fillStyle = "#b8bec5"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(0,0,0,.18)"; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 2); }, null);
function shopDetail(x, z, w, h, side) {
  const fz = z + side * 4.0, rot = side > 0 ? 0 : Math.PI;
  for (let fl = 0; fl < Math.floor((h - 4.2) / 2.6); fl++) { const y = 4.6 + fl * 2.6; if (drnd() < 0.35) continue;
    const bw = w * (0.45 + drnd() * 0.3), bx = x + (drnd() - 0.5) * (w - bw) * 0.8;
    add(new THREE.BoxGeometry(bw, 0.1, 0.8), slabM, bx, y, fz + side * 0.4); const r = add(new THREE.PlaneGeometry(bw, 0.55), railM, bx, y + 0.32, fz + side * 0.8, scene, false); r.rotation.y = rot;
    if (drnd() < 0.6) { const ax = x + (drnd() - 0.5) * w * 0.7, ac = add(new THREE.BoxGeometry(0.8, 0.55, 0.32), acM, ax, y + 1.3, fz + side * 0.17); const fr = add(new THREE.PlaneGeometry(0.78, 0.53), acFront, ax, y + 1.3, fz + side * 0.335, scene, false); fr.rotation.y = rot; }
    if (drnd() < 0.5) { const px = bx + (drnd() - 0.5) * bw * 0.7; add(new THREE.CylinderGeometry(0.16, 0.12, 0.25, 12), std(0xc0533a, 0.6), px, y + 0.18, fz + side * 0.5); const pl = add(new THREE.SphereGeometry(0.25, 10, 8), std(0x3f9a3a, 0.7), px, y + 0.5, fz + side * 0.5); pl.scale.y = 1.2; } }
  if (drnd() < 0.5) { const sh = add(new THREE.PlaneGeometry(w * 0.5, 2.3), new THREE.MeshStandardMaterial({ map: shutT, roughness: 0.6, metalness: 0.3 }), x + (drnd() - 0.5) * w * 0.3, 1.2, fz + side * 0.02, scene, false); sh.rotation.y = rot; }
}
// power poles + sagging cables along the north pavement
{ const poleM = std(0x8d8f93, 0.6), cabM = std(0x1b1b1f, 0.6); const P = []; for (let px = -40; px <= 40; px += 13) { add(new THREE.CylinderGeometry(0.09, 0.12, 7.5, 10), poleM, px, 3.75, -3.4); add(new THREE.BoxGeometry(1.2, 0.08, 0.08), poleM, px, 7.0, -3.4); P.push(px); }
  for (let i = 0; i < P.length - 1; i++) for (const dz of [-0.5, 0, 0.5]) { const a = V(P[i] + dz, 6.95, -3.4), b = V(P[i + 1] + dz, 6.95, -3.4), m = a.clone().lerp(b, 0.5); m.y -= 0.7;
    const c = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, m, b), 20, 0.018, 5), cabM); scene.add(c); } }
const SHOP_X = 2.0;      // the clay shop (north side, door faces the road)
for (let x = -150; x < 150; x += 0) { const w = 7 + rnd() * 5; if (Math.abs(x + w / 2 - SHOP_X) > 6) shophouse(x + w / 2, -11, w, 9 + rnd() * 8, 1); x += w + 0.3; }
for (let x = -150; x < 150; x += 0) { const w = 7 + rnd() * 5; shophouse(x + w / 2, 13.5, w, 9 + rnd() * 8, -1); x += w + 0.3; }
// wat: tiered roofs + golden chedi, seen up the street
{ const red = std(0xc0392b, 0.5), green = std(0x2e8b57, 0.5), gold = new THREE.MeshStandardMaterial({ color: 0xf5b82e, metalness: 1, roughness: 0.3 }), white = std(0xf6f1e6, 0.6);
  const grp = new THREE.Group(); grp.position.set(70, 0, -45); scene.add(grp);
  add(new RoundedBoxGeometry(22, 7, 14, 2, 0.5).translate(0, 3.5, 0), white, 0, 0, 0, grp);
  for (let i = 0; i < 3; i++) { const r = add(new THREE.ConeGeometry(15 - i * 3.5, 4.5, 4), i % 2 ? green : red, 0, 9 + i * 3.2, 0, grp); r.rotation.y = Math.PI / 4; r.scale.z = 0.6; }
  const prof = []; for (let i = 0; i <= 30; i++) { const u = i / 30; prof.push(new THREE.Vector2(Math.max(0.05, 6 * Math.pow(1 - u, 1.6) * (1 + 0.25 * Math.sin(u * 18) * (1 - u))), u * 34)); }
  const chedi = add(new THREE.LatheGeometry(prof, 48), gold, -26, 0, -10, grp); add(new THREE.CylinderGeometry(7, 8, 3, 32), white, -26, 1.5, -10, grp); }
const PALM = (x, z, h) => { const tr = add(new THREE.CylinderGeometry(0.18, 0.3, h, 10).translate(0, h / 2, 0), std(0x8a6a4a, 0.9), x, 0, z);
  for (let k = 0; k < 9; k++) { const f = add(new THREE.SphereGeometry(1, 12, 8), std(0x3f9a3a, 0.6), x, h, z); f.scale.set(2.6, 0.18, 0.6); f.rotation.set(0, k / 9 * Math.PI * 2, -0.35); f.position.x += Math.cos(k / 9 * 6.28) * 1.6; f.position.z += Math.sin(k / 9 * 6.28) * 1.6; f.position.y -= 0.3; } };
for (const x of [-34, -20, 16, 30, 44]) { PALM(x, -6.4, 7 + rnd() * 2); PALM(x + 7, 8.8, 7 + rnd() * 2); }
{ // tuk-tuk
  const g = new THREE.Group(); g.position.set(9, 0, 3.4); g.rotation.y = -0.2; scene.add(g);
  add(new RoundedBoxGeometry(2.6, 1.0, 1.4, 3, 0.25).translate(0, 0.9, 0), std(0x1f9ad6, 0.4), 0, 0, 0, g);
  add(new RoundedBoxGeometry(2.4, 0.12, 1.5, 2, 0.05), std(0xf2c14e, 0.4), -0.1, 2.05, 0, g);
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), std(0x333333, 0.4, 0.8), sx * 1.0, 1.65, 0.6, g);
  for (const [wx, wz] of [[-0.9, 0.7], [-0.9, -0.7], [1.0, 0]]) { const w = add(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 18), std(0x222222, 0.8), wx, 0.32, wz, g); w.rotation.x = Math.PI / 2; } }

// ------------------------------------------------------------------ the clay shop: facade with a real door opening, interior workshop behind it
const SHOP = { x: SHOP_X, z0: -7, z1: -15, w: 9, h: 3.6 }, FACADE = [];
{ const wallM = new THREE.MeshStandardMaterial({ color: 0xf4e2c0, roughness: 0.8, bumpMap: noiseTex, bumpScale: 0.08 });
  const trim = std(0x8b5a3c, 0.6), dw = 1.3, dh = 2.3, x = SHOP.x, z = SHOP.z0;
  FACADE.push(add(new THREE.BoxGeometry((SHOP.w - dw) / 2, 6.5, 0.3), wallM, x - (SHOP.w + dw) / 4, 3.25, z));
  FACADE.push(add(new THREE.BoxGeometry((SHOP.w - dw) / 2, 6.5, 0.3), wallM, x + (SHOP.w + dw) / 4, 3.25, z));
  FACADE.push(add(new THREE.BoxGeometry(dw, 6.5 - dh, 0.3), wallM, x, dh + (6.5 - dh) / 2, z));
  add(new THREE.BoxGeometry(dw + 0.3, 0.18, 0.4), trim, x, dh + 0.09, z); for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.15, dh, 0.4), trim, x + s * (dw / 2 + 0.07), dh / 2, z);
  const sign = canvasTex(1024, 256, (g, w, h) => { g.fillStyle = "#7a3b1f"; rr(g, 6, 6, w - 12, h - 12, 30); g.fill(); g.strokeStyle = "#f3c75a"; g.lineWidth = 12; rr(g, 22, 22, w - 44, h - 44, 24); g.stroke();
    g.fillStyle = "#fff6e0"; g.font = "900 110px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("CLAY STATUES", w / 2, h / 2 + 6); }, null);
  sign.wrapS = sign.wrapT = THREE.ClampToEdgeWrapping;
  add(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshStandardMaterial({ map: sign, roughness: 0.6 }), x, 3.35, z + 0.17, scene, false);
  add(new THREE.BoxGeometry(SHOP.w * 0.95, 0.1, 1.4), std(0xd62828, 0.5), x, 2.75, z + 0.75).rotation.x = 0.2;
  // interior: terracotta tiles, brick dado + warm plaster, ceiling beams, shelves of busts, work bench, tools, string lights
  const floorT = canvasTex(512, 512, (g, w, h) => { const s = 128; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s) { const v = rnd() * 26; g.fillStyle = `rgb(${178 + v},${98 + v * .6},${66 + v * .4})`; g.fillRect(x, y, s, s);
      g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(x + 6, y + 6, s - 40, 10); } g.strokeStyle = "#e9d8c0"; g.lineWidth = 6; for (let k = 0; k <= w; k += s) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); g.beginPath(); g.moveTo(0, k); g.lineTo(w, k); g.stroke(); }
    speckle(g, w, h, 6000, ["rgba(80,30,10,.12)", "rgba(255,230,200,.08)"], 2); }, [4, 3.5]);
  const flr = new THREE.Mesh(new THREE.PlaneGeometry(SHOP.w, 8), new THREE.MeshStandardMaterial({ map: floorT, roughness: 0.55, bumpMap: floorT, bumpScale: 0.3 })); flr.rotation.x = -Math.PI / 2; flr.position.set(x, 0.06, -11); flr.receiveShadow = true; scene.add(flr);
  const wallT = canvasTex(512, 1024, (g, w, h) => { g.fillStyle = "#f1dcb6"; g.fillRect(0, 0, w, h); speckle(g, w, h * 0.62, 9000, ["rgba(150,100,60,.06)", "rgba(255,255,255,.1)"], 4);
      const bh = 40, y0 = h * 0.64; for (let r = 0; y0 + r * bh < h; r++) for (let k = -1; k < 6; k++) { const v = rnd() * 30; g.fillStyle = `rgb(${172 + v},${88 + v * .5},${62 + v * .3})`; rr(g, k * 96 + (r % 2) * 48 + 3, y0 + r * bh + 3, 90, bh - 6, 5); g.fill(); }
      g.fillStyle = "#7b4a2c"; g.fillRect(0, y0 - 16, w, 18); g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(0, y0 + 2, w, 6); }, [3, 1]);
  const iw = new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.85, bumpMap: wallT, bumpScale: 0.5 }), iws = iw.clone(); iws.map = rep(wallT, 2.6, 1); iws.bumpMap = iws.map;
  add(new THREE.BoxGeometry(SHOP.w, SHOP.h + 3, 0.3), iw, x, (SHOP.h + 3) / 2, SHOP.z1, scene, false);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.3, SHOP.h + 3, 8), iws, x + s * SHOP.w / 2, (SHOP.h + 3) / 2, -11, scene, false);
  add(new THREE.BoxGeometry(SHOP.w, 0.3, 8), std(0xe8d2ae, 0.9), x, SHOP.h, -11, scene, false);   // room shell casts no sun shadow: the lamp light reaches inside
  const beamM = std(0x6b3f24, 0.6); for (let k = 0; k < 5; k++) add(new RoundedBoxGeometry(SHOP.w, 0.22, 0.26, 2, 0.04), beamM, x, SHOP.h - 0.16, -7.8 - k * 1.7, scene, false);
  // posters (back wall)
  const poster = (txt, sub, bg, fg, px, py, rot) => { const t = canvasTex(400, 560, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = "#fff6e0"; g.fillRect(14, 14, w - 28, h - 28); g.fillStyle = bg; g.fillRect(28, 28, w - 56, h - 56);
      g.fillStyle = fg; g.textAlign = "center"; g.font = "900 64px Arial Black, sans-serif"; txt.split("\n").forEach((l, i) => g.fillText(l, w / 2, 130 + i * 72));
      g.beginPath(); g.arc(w / 2, 340, 80, 0, 7); g.fillStyle = "#fff6e0"; g.fill(); g.font = "110px serif"; g.fillText(sub, w / 2, 378); g.font = "800 30px Arial, sans-serif"; g.fillStyle = fg; g.fillText("STRESS RELIEF", w / 2, 490); }, null);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; const m = add(new THREE.PlaneGeometry(0.62, 0.87), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }), px, py, SHOP.z1 + 0.16, scene, false); m.rotation.z = rot; };
  poster("PUNCH\nIT OUT", "👊", "#d62828", "#fff6e0", x - 3.7, 2.95, 0.04); poster("100%\nCLAY", "🗿", "#1d6f8c", "#fff6e0", x + 3.7, 2.95, -0.05);
  // shelves of finished busts (head + shoulders, nose, ears, hair) on the back wall
  const shelfM = std(0x8b5a3c, 0.55), CLAY = [0xb87048, 0xa9643f, 0xc27e55, 0x9c5a38];
  const bustGeo = (() => { const pr = [[0, 0], [0.24, 0], [0.25, 0.04], [0.22, 0.13], [0.16, 0.2], [0.07, 0.24], [0.065, 0.31], [0, 0.31]].map(([a, b]) => new THREE.Vector2(a, b)); const g = new THREE.LatheGeometry(pr, 32); g.scale(1, 1, 0.62); return g; })();
  function bust(bx, by, bz, sc, k) { const m = new THREE.MeshStandardMaterial({ color: CLAY[k % 4], roughness: 0.8, bumpMap: noiseTex, bumpScale: 0.35 }), G = new THREE.Group(); G.position.set(bx, by, bz); G.scale.setScalar(sc); G.rotation.y = (rnd() - .5) * 0.6; scene.add(G);
    add(bustGeo, m, 0, 0, 0, G); const hd = add(new THREE.SphereGeometry(0.115, 24, 18), m, 0, 0.42, 0, G); hd.scale.set(0.92, 1.12, 1);
    add(new THREE.ConeGeometry(0.022, 0.06, 10), m, 0, 0.41, 0.105, G).rotation.x = Math.PI / 2; for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.026, 10, 8), m, s * 0.105, 0.42, -0.005, G).scale.set(0.5, 1, 0.8);
    const hm = m.clone(); hm.color = new THREE.Color(CLAY[k % 4]).multiplyScalar(0.72); hm.bumpScale = 1.2; const hair = add(new THREE.SphereGeometry(0.121, 24, 14, 0, Math.PI * 2, 0, k % 3 === 0 ? 1.1 : 1.45), hm, 0, 0.44, -0.01, G); hair.scale.set(0.95, 1.12, 1.04); hair.rotation.x = -0.35;
    const eyeM = std(0x3b2215, 0.7); for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.011, 8, 6), eyeM, s * 0.04, 0.445, 0.098, G, false);
    add(new THREE.BoxGeometry(0.05, 0.008, 0.01), eyeM, 0, 0.37, 0.1, G, false).rotation.z = (k % 2 ? 0.25 : -0.2); }
  for (const sy of [1.25, 2.25]) { add(new RoundedBoxGeometry(7.6, 0.08, 0.62, 2, 0.02), shelfM, x, sy, SHOP.z1 + 0.46); for (const bx of [-3.4, -1.1, 1.1, 3.4]) add(new THREE.BoxGeometry(0.06, 0.25, 0.5), shelfM, x + bx, sy - 0.15, SHOP.z1 + 0.42);
    for (let k = 0; k < 6; k++) bust(x - 3.15 + k * 1.26, sy + 0.04, SHOP.z1 + 0.48, 1.25 + rnd() * 0.2, k + (sy > 2 ? 2 : 0)); }
  // work bench with an unfinished bust, clay lumps, tools; clay buckets and sacks
  add(new RoundedBoxGeometry(2.2, 0.1, 1.0, 2, 0.03), shelfM, x - 2.8, 0.9, -12.6); for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.BoxGeometry(0.08, 0.9, 0.08), shelfM, x - 2.8 + lx * 1.0, 0.45, -12.6 + lz * 0.42);
  add(new THREE.BoxGeometry(2.0, 0.05, 0.8), shelfM, x - 2.8, 0.25, -12.6);
  bust(x - 2.4, 0.95, -12.6, 1.5, 1); const clayM = new THREE.MeshStandardMaterial({ color: 0xb06a43, roughness: 0.85, bumpMap: noiseTex, bumpScale: 0.6 });
  for (let i = 0; i < 4; i++) { const l = add(new THREE.SphereGeometry(0.1 + rnd() * 0.07, 14, 10), clayM, x - 3.6 + i * 0.28, 1.0, -12.5 + (rnd() - .5) * 0.5); l.scale.y = 0.6; }
  const toolM = std(0x9aa3ad, 0.3, 0.8); for (let i = 0; i < 3; i++) { const tl = add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), std(0xc89b5c, 0.6), x - 3.1 + i * 0.12, 0.97, -12.25); tl.rotation.z = Math.PI / 2; tl.rotation.y = 0.3 * i; }
  for (const [bx, bz, c] of [[-3.9, -9.2, 0x2a6f97], [-3.6, -8.6, 0xe76f51], [3.9, -8.4, 0x2a9d8f]]) { add(new THREE.CylinderGeometry(0.26, 0.22, 0.5, 24), std(c, 0.45), x + bx, 0.31, bz); const top = add(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 24), clayM, x + bx, 0.55, bz, scene, false); }
  for (const [bx, bz] of [[3.7, -13.9], [3.2, -14.2]]) { const sk = add(new THREE.SphereGeometry(0.4, 16, 12), std(0xd8c49a, 0.95), x + bx, 0.3, bz); sk.scale.set(1, 0.75, 0.75); }
  // tool board on the left wall
  add(new THREE.BoxGeometry(0.05, 1.0, 1.8), std(0xc89b5c, 0.7), x - SHOP.w / 2 + 0.18, 1.9, -10.6, scene, false);
  for (let i = 0; i < 6; i++) { const tl = add(new THREE.BoxGeometry(0.04, 0.42 - (i % 3) * 0.08, 0.05), i % 2 ? toolM : std(0x7a4a2a, 0.6), x - SHOP.w / 2 + 0.24, 1.9, -11.3 + i * 0.28, scene, false); tl.rotation.x = (i - 2.5) * 0.08; }
  // pendant lamps + warm string lights along the back wall
  const lampGlow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 12 }), bulbM = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb860, emissiveIntensity: 9 });
  for (const lx of [-2.4, 0, 2.4]) { add(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 6), std(0x222222, 0.5), x + lx, SHOP.h - 0.4, -11); const sh = add(new THREE.ConeGeometry(0.28, 0.25, 20, 1, true), std(0x2f4a3a, 0.5, 0.3), x + lx, SHOP.h - 0.85, -11); sh.material.side = THREE.DoubleSide;
    add(new THREE.SphereGeometry(0.08, 12, 10), lampGlow, x + lx, SHOP.h - 0.93, -11, scene, false); }
  for (let i = 0; i <= 28; i++) { const u = i / 28, bx = x - 4.2 + u * 8.4, by = 3.25 - 0.28 * Math.sin(u * Math.PI * 3) ** 2; add(new THREE.SphereGeometry(0.035, 8, 6), bulbM, bx, by, SHOP.z1 + 0.2, scene, false); }
  const wl = new THREE.PointLight(0xffb070, 6, 7, 1.6); wl.position.set(x, 2.6, -12.5); scene.add(wl);
  // side window: daylight
  const winT = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#bfe6ff"); gr.addColorStop(1, "#fff1cf"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#6b3f24"; g.fillRect(w / 2 - 7, 0, 14, h); g.fillRect(0, h / 2 - 7, w, 14); g.fillRect(0, 0, w, 12); g.fillRect(0, h - 12, w, 12); g.fillRect(0, 0, 12, h); g.fillRect(w - 12, 0, 12, h); }, null);
  add(new THREE.PlaneGeometry(1.5, 1.2), new THREE.MeshStandardMaterial({ map: winT, emissive: 0xffffff, emissiveMap: winT, emissiveIntensity: 1.1 }), x + SHOP.w / 2 - 0.16, 2.1, -9.6, scene, false).rotation.y = -Math.PI / 2;
}
// the stand that holds the statue: a sculptor's banding wheel on a tripod
const STAND = V(SHOP.x + 0.9, 0, -11.2);
{ const wd = std(0x7a4a2c, 0.55), mt = std(0x3a3d42, 0.35, 0.7);
  add(new THREE.CylinderGeometry(0.06, 0.07, 0.5, 14), mt, STAND.x, 0.36, STAND.z);
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.4, lg = add(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 8), wd, STAND.x + Math.cos(a) * 0.2, 0.28, STAND.z + Math.sin(a) * 0.2); lg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); }
  add(new THREE.CylinderGeometry(0.38, 0.4, 0.07, 32), wd, STAND.x, 0.625, STAND.z); add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32), mt, STAND.x, 0.665, STAND.z); }

// ------------------------------------------------------------------ the clay statue: relief from the clay bust (colour + height), closed back, dent on impact
const SW = 0.56, SH = SW * 1119 / 865, DEPTH = 0.16;
const statueGrp = new THREE.Group(); statueGrp.position.set(STAND.x, 0.68, STAND.z); scene.add(statueGrp);
const sCol = loadTex("/assets/statue_col.png"), sHgt = loadTex("/assets/statue_h.png", false);
const FACE_UV = new THREE.Vector2(0.49, 1 - 0.39);
const dentU = { value: 0 }, xrayU = { value: 0 };
function statueMat(back) {
  const m = new THREE.MeshStandardMaterial({ map: sCol, emissive: 0xffffff, emissiveMap: sCol, emissiveIntensity: 0.32, alphaTest: 0.5, displacementMap: sHgt, displacementScale: DEPTH, roughness: 0.8, bumpMap: noiseTex, bumpScale: 0.25, side: back ? THREE.BackSide : THREE.FrontSide, transparent: false });
  m.onBeforeCompile = sh => { sh.uniforms.uDent = dentU; sh.uniforms.uFace = { value: FACE_UV };
    sh.vertexShader = "uniform float uDent; uniform vec2 uFace;\n" + sh.vertexShader.replace("#include <displacementmap_vertex>", `#include <displacementmap_vertex>
      { vec2 dd = (uv - uFace) * vec2(1.0, 1.3); float r2 = dot(dd, dd); float dent = uDent * exp(-r2 / 0.012);
        transformed += normalize(objectNormal) * (-dent * ${DEPTH.toFixed(3)} * 0.85); transformed.xy += normalize(dd + 1e-5) * dent * 0.012; }`);
  };
  return m;
}
const sGeo = new THREE.PlaneGeometry(SW, SH, 220, 284); sGeo.translate(0, SH / 2, 0);
const statueReady = new Promise(res => { const im = new Image(); im.onload = () => {   // drop the see-through quads so the AO/ink passes do not see a rectangle
  const c = document.createElement("canvas"); c.width = 220; c.height = 284; const g = c.getContext("2d"); g.drawImage(im, 0, 0, 220, 284); const A = g.getImageData(0, 0, 220, 284).data;
  const idx = [], gx = 220, gy = 284; for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) { if (A[(y * 220 + x) * 4 + 3] < 20) continue;
    const a0 = y * (gx + 1) + x, b0 = a0 + 1, c0 = a0 + gx + 1, d0 = c0 + 1; idx.push(a0, c0, b0, c0, d0, b0); }
  sGeo.setIndex(idx); res(); }; im.src = "/assets/statue_col.png"; });
const statueF = add(sGeo, statueMat(false), 0, 0, 0, statueGrp); const statueB = add(sGeo, statueMat(true), 0, 0, 0, statueGrp); statueB.scale.z = -1;
statueF.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: sCol, alphaTest: 0.5, displacementMap: sHgt, displacementScale: DEPTH });
// x-ray: a translucent ghost of the statue + the steel armature inside
const ghostM = new THREE.MeshBasicMaterial({ map: sCol, transparent: true, opacity: 0, color: 0x9fdcff, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide });
const steelM = new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.9, roughness: 0.35, emissive: 0x32c8ff, emissiveIntensity: 0 });
const arm = new THREE.Group(); statueGrp.add(arm); arm.visible = false;
{ const rod = (a, b, r = 0.012) => { const L = a.distanceTo(b), m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), steelM); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); arm.add(m); };
  rod(V(0, 0, 0), V(0, SH * 0.84, 0), 0.02); rod(V(-SW * 0.4, SH * 0.12, 0), V(SW * 0.4, SH * 0.12, 0), 0.016);
  const hc = V(0, SH * 0.66, 0.02); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; rod(hc.clone().add(V(Math.cos(a) * 0.15, -0.16, Math.sin(a) * 0.06)), hc.clone().add(V(Math.cos(a) * 0.12, 0.17, Math.sin(a) * 0.05)), 0.008); }
  for (const y of [-0.12, 0, 0.12]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15 - Math.abs(y) * 0.3, 0.008, 6, 40), steelM); ring.position.copy(hc).add(V(0, y, 0)); ring.rotation.x = Math.PI / 2; ring.scale.y = 0.4; arm.add(ring); }
  rod(V(0, SH * 0.42, 0), V(-SW * 0.35, SH * 0.2, 0), 0.01); rod(V(0, SH * 0.42, 0), V(SW * 0.35, SH * 0.2, 0), 0.01); }
const ghost = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH).translate(0, SH / 2, DEPTH * 0.55), ghostM); ghost.renderOrder = 3;
// cloth over the statue (pulled off up and to the right)
const clothM = new THREE.MeshStandardMaterial({ color: 0x8e1b2c, roughness: 0.75, side: THREE.DoubleSide, bumpMap: noiseTex, bumpScale: 0.2 });
const cloth = (() => { const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24; prof.push(new THREE.Vector2(0.02 + 0.38 * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2) * (1 + 0.06 * Math.sin(u * 30)), SH + 0.05 - u * (SH + 0.1))); }
  const g = new THREE.LatheGeometry(prof, 48); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i); const w = 1 + 0.08 * Math.sin(a * 7) * (1 - y / SH); p.setX(i, p.getX(i) * w); p.setZ(i, p.getZ(i) * w * 0.75); }
  g.computeVertexNormals(); const m = new THREE.Mesh(g, clothM); m.castShadow = true; statueGrp.add(m); return m; })();
// clay chips on impact (sprites in the Pion layer: no AO/ink on them)
const chipScene = new THREE.Scene(); const chips = [];
for (let i = 0; i < 26; i++) { const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012 + rnd() * 0.014, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xa0603c).multiplyScalar(0.8 + rnd() * 0.4) })); s.visible = false; chipScene.add(s); chips.push([s, V(rnd() - 0.2, rnd() * 0.9 + 0.3, rnd() * 0.8 + 0.2).normalize().multiplyScalar(1.2 + rnd() * 1.4), rnd() * 6]); }

// ------------------------------------------------------------------ home: a stylish evening apartment: slat wall + LED, neon crown, skyline window, desk in front of Pion
const HOME = V(80, 0, -500);
const tvMat = new THREE.MeshStandardMaterial({ color: 0x050505, emissive: 0xffffff, emissiveMap: loadTex("/assets/boss_yell.jpg"), emissiveIntensity: 0, roughness: 0.25 });
const homeShelfY = 1.15, SHELF_X = 0.75;                 // shelf (with the statue) behind Pion's right shoulder
const DESK = { x: -0.25, z: -0.72, w: 1.55, d: 0.62, h: 0.45 };
const deskPhoneScreen = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x6fe3ff, emissiveIntensity: 0 });
const deskPhone = new THREE.Group();
{ const H0 = HOME, A = (g, m, x, y, z, c = true) => add(g, m, H0.x + x, H0.y + y, H0.z + z, scene, c);
  // floor: herringbone oak
  const hb = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#6e4426"; g.fillRect(0, 0, w, h); const L = 128, T = 32;
      for (let y = -L; y < h + L; y += T) for (let x = -L; x < w + L; x += L) { for (const o of [0, 1]) { const v = rnd() * 40; g.save(); g.translate(x + o * T * 2, y + (o ? 0 : T * 2)); g.rotate(o ? Math.PI / 4 : -Math.PI / 4);
        g.fillStyle = `rgb(${168 + v},${112 + v * .7},${66 + v * .4})`; g.fillRect(0, 0, L * 0.7, T * 0.92); g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(4, 3, L * 0.6, 4); g.restore(); } }
      speckle(g, w, h, 5000, ["rgba(60,30,10,.12)"], 2); }, null);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(9, 8), new THREE.MeshStandardMaterial({ map: rep(hb, 5, 4.5), roughness: 0.35, bumpMap: rep(hb, 5, 4.5), bumpScale: 0.2 })); f.rotation.x = -Math.PI / 2; f.position.copy(H0).add(V(0, 0.01, 0)); f.receiveShadow = true; scene.add(f);
  // walls: deep teal plaster; back wall: vertical oak slats with a warm LED strip behind
  const plT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#24525a"; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ["rgba(255,255,255,.04)", "rgba(0,0,0,.06)"], 4); }, [4, 2]);
  const wallM = new THREE.MeshStandardMaterial({ map: plT, roughness: 0.9, bumpMap: plT, bumpScale: 0.3 });
  A(new THREE.BoxGeometry(9, 4, 0.2), wallM, 0, 2, -2.55, false); A(new THREE.BoxGeometry(0.2, 4, 8), wallM, -3.6, 2, 1, false); A(new THREE.BoxGeometry(0.2, 4, 8), wallM, 3.6, 2, 1, false);
  A(new THREE.BoxGeometry(9, 0.2, 8), std(0x1d3f45, 0.9), 0, 3.4, 1, false);
  const slatM = std(0xb07a48, 0.5); for (let k = 0; k < 26; k++) A(new RoundedBoxGeometry(0.075, 2.9, 0.06, 2, 0.015), slatM, -2.35 + k * 0.105, 1.6, -2.4, false);
  A(new THREE.BoxGeometry(2.9, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffb15c, emissiveIntensity: 14 }), 0.27, 3.08, -2.43, false);
  A(new THREE.BoxGeometry(2.9, 0.025, 0.02), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffb15c, emissiveIntensity: 10 }), 0.27, 0.12, -2.43, false);
  const ledL = new THREE.PointLight(0xffa456, 3.5, 4, 1.5); ledL.position.copy(H0).add(V(0.2, 2.6, -2.0)); scene.add(ledL);
  // neon crown sign on the slats (blooms)
  const neonM = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xff4fa0, emissiveIntensity: 16 }), neonC = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffc23d, emissiveIntensity: 16 });
  { const pts = [[-0.42, 0], [-0.46, 0.38], [-0.22, 0.16], [0, 0.46], [0.22, 0.16], [0.46, 0.38], [0.42, 0], [-0.42, 0]].map(([u, v]) => V(H0.x - 0.25 + u * 0.75, H0.y + 2.55 + v * 0.75, H0.z - 2.33));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.05), 120, 0.016, 8), neonC); scene.add(tube);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.014, 8, 80), neonM); ring.position.copy(H0).add(V(-0.25, 2.66, -2.33)); ring.scale.y = 0.62; scene.add(ring);
    const nl = new THREE.PointLight(0xff6fb0, 2.2, 3, 1.6); nl.position.copy(H0).add(V(-0.25, 2.6, -1.8)); scene.add(nl); }
  // shelf with books, plant, and the statue's spot
  const wood = std(0x5b3a22, 0.5); A(new RoundedBoxGeometry(1.25, 0.06, 0.36, 2, 0.015), wood, SHELF_X, homeShelfY, -2.2);
  for (let k = 0; k < 5; k++) A(new THREE.BoxGeometry(0.055, 0.24 + rnd() * 0.07, 0.2), std([0xd62828, 0x1d3557, 0xf2c14e, 0x2a9d8f, 0xf4a261][k], 0.6), SHELF_X + 0.26 + k * 0.065, homeShelfY + 0.15, -2.2);
  A(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 16), std(0xf1ece2, 0.4), SHELF_X - 0.45, homeShelfY + 0.095, -2.2); const sp = A(new THREE.SphereGeometry(0.11, 14, 10), std(0x3f9a3a, 0.7), SHELF_X - 0.45, homeShelfY + 0.24, -2.2); sp.scale.y = 1.25;
  // big window on the left wall: evening skyline (emissive), curtains
  const sky = canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#2b2f6b"); gr.addColorStop(0.45, "#c45a7a"); gr.addColorStop(0.75, "#ffb36b"); gr.addColorStop(1, "#ffd59a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.fillStyle = "#fff3d0"; g.beginPath(); g.arc(w * 0.68, h * 0.7, 40, 0, 7); g.fill();
      for (let i = 0; i < 22; i++) { const bw = 20 + rnd() * 40, bh = 90 + rnd() * 230, bx = i * 24 - 10; g.fillStyle = `rgb(${34 + rnd() * 20},${30 + rnd() * 16},${60 + rnd() * 26})`; g.fillRect(bx, h - bh, bw, bh);
        for (let y = h - bh + 8; y < h - 6; y += 14) for (let x = bx + 4; x < bx + bw - 5; x += 9) if (rnd() < 0.35) { g.fillStyle = rnd() < 0.7 ? "#ffd27a" : "#9fe8ff"; g.fillRect(x, y, 4, 6); } } }, null);
  const winM = new THREE.MeshStandardMaterial({ map: sky, emissive: 0xffffff, emissiveMap: sky, emissiveIntensity: 1.25 });
  const win = A(new THREE.PlaneGeometry(2.6, 2.0), winM, -3.48, 1.85, -0.3, false); win.rotation.y = Math.PI / 2;
  const frM = std(0x1b1b1f, 0.4, 0.3); for (const [dy, dz, h2, w2] of [[0, -1.32, 2.1, 0.06], [0, 1.32, 2.1, 0.06], [0, 0, 2.1, 0.04], [1.02, 0, 0.06, 2.7], [-1.02, 0, 0.06, 2.7]]) A(new THREE.BoxGeometry(0.06, h2, w2), frM, -3.46, 1.85 + dy, -0.3 + dz, false);
  const curM = new THREE.MeshStandardMaterial({ color: 0xe9d9bd, roughness: 0.9, side: THREE.DoubleSide });
  for (const s2 of [-1, 1]) { const cg = new THREE.PlaneGeometry(0.55, 2.9, 24, 1), pp = cg.attributes.position; for (let i = 0; i < pp.count; i++) pp.setZ(i, 0.05 * Math.sin(pp.getX(i) * 34)); cg.computeVertexNormals(); const c = A(cg, curM, -3.4, 1.75, -0.3 + s2 * 1.6, false); c.rotation.y = Math.PI / 2; }
  // sofa (left), rug, arc floor lamp, big plant (right)
  const sofaM = new THREE.MeshStandardMaterial({ color: 0xd9822b, roughness: 0.85, bumpMap: noiseTex, bumpScale: 0.3 });
  A(new RoundedBoxGeometry(0.9, 0.42, 2.0, 3, 0.1), sofaM, -2.8, 0.25, 0.5); A(new RoundedBoxGeometry(0.25, 0.75, 2.0, 3, 0.1), sofaM, -3.15, 0.5, 0.5); for (const z2 of [-0.5, 1.5]) A(new RoundedBoxGeometry(0.9, 0.6, 0.22, 3, 0.09), sofaM, -2.8, 0.38, z2);
  A(new RoundedBoxGeometry(0.35, 0.35, 0.12, 3, 0.06), std(0x2a9d8f, 0.8), -2.85, 0.6, 0.2).rotation.y = 1.2;
  const rugT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#e8dcc4"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c0533a"; g.lineWidth = 18; g.strokeRect(30, 30, w - 60, h - 60); g.strokeStyle = "#24525a"; g.lineWidth = 10; g.strokeRect(70, 70, w - 140, h - 140); speckle(g, w, h, 20000, ["rgba(0,0,0,.05)", "rgba(255,255,255,.1)"], 2); }, null);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.2), new THREE.MeshStandardMaterial({ map: rugT, roughness: 1, bumpMap: noiseTex, bumpScale: 0.4 })); rug.rotation.x = -Math.PI / 2; rug.position.copy(H0).add(V(-0.3, 0.02, -0.6)); rug.receiveShadow = true; scene.add(rug);
  const lampM = std(0x1b1b1f, 0.35, 0.6), arc = new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V(-2.9, 0.05, -1.9), V(-2.7, 2.9, -1.9), V(-1.6, 2.2, -1.5)), 40, 0.022, 8), lampM); arc.position.copy(H0); arc.castShadow = true; scene.add(arc);
  A(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 24), lampM, -2.9, 0.03, -1.9); const shd = A(new THREE.SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(0xf2c14e, 0.4, 0.2), -1.6, 2.2, -1.5); shd.material.side = THREE.DoubleSide;
  A(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xffd08a, emissiveIntensity: 14 }), -1.6, 2.1, -1.5, false);
  const fl = new THREE.PointLight(0xffc27a, 4.5, 5, 1.5); fl.position.copy(H0).add(V(-1.6, 1.95, -1.5)); scene.add(fl);
  A(new THREE.CylinderGeometry(0.22, 0.17, 0.42, 20), std(0xf1ece2, 0.4), 3.05, 0.21, -1.0); const leafM = new THREE.MeshStandardMaterial({ color: 0x2f8a3a, roughness: 0.6, side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) { const a2 = i / 11 * Math.PI * 2, L2 = 0.55 + rnd() * 0.4, lf = A(new THREE.CircleGeometry(0.2, 12), leafM, 3.05 + Math.cos(a2) * 0.25, 0.65 + L2 * 0.8, -1.0 + Math.sin(a2) * 0.25); lf.scale.set(1, 1.5, 1); lf.rotation.set(-0.9 + rnd() * 0.4, -a2 + Math.PI / 2, 0); }
  // the desk in front of Pion: monitor glow, keyboard, mug, papers, desk lamp, the phone
  const deskM = std(0x8a5a34, 0.45); A(new RoundedBoxGeometry(DESK.w, 0.05, DESK.d, 2, 0.015), deskM, DESK.x, DESK.h, DESK.z);
  A(new RoundedBoxGeometry(DESK.w - 0.04, DESK.h - 0.02, 0.03, 2, 0.01), std(0x6e4428, 0.5), DESK.x, DESK.h / 2, DESK.z + DESK.d / 2 - 0.03);   // modesty panel: hides Pion's lower half
  for (const s2 of [-1, 1]) A(new THREE.BoxGeometry(0.03, DESK.h - 0.02, DESK.d - 0.04), std(0x6e4428, 0.5), DESK.x + s2 * (DESK.w / 2 - 0.03), DESK.h / 2, DESK.z);
  { const w2 = A(new THREE.PlaneGeometry(1.45, 1.75), winM, 2.3, 1.85, -2.43, false); for (const [dx, dy, ww, hh] of [[0, 0.9, 1.55, 0.06], [0, -0.9, 1.55, 0.06], [-0.75, 0, 0.06, 1.85], [0.75, 0, 0.06, 1.85], [0, 0, 0.04, 1.8]]) A(new THREE.BoxGeometry(ww, hh, 0.05), frM, 2.3 + dx, 1.85 + dy, -2.41, false); }
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) A(new THREE.CylinderGeometry(0.022, 0.018, DESK.h, 8), lampM, DESK.x + lx * (DESK.w / 2 - 0.08), DESK.h / 2, DESK.z + lz * (DESK.d / 2 - 0.06));
  const mon = A(new RoundedBoxGeometry(0.62, 0.38, 0.03, 2, 0.012), lampM, DESK.x - 0.48, DESK.h + 0.32, DESK.z - 0.08); mon.rotation.y = 0.55;
  const scrT = canvasTex(256, 160, (g, w, h) => { g.fillStyle = "#0f2233"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { g.fillStyle = ["#4cc9f0", "#f72585", "#ffd166"][i % 3]; g.fillRect(16, 14 + i * 15, 40 + rnd() * 160, 7); } }, null);
  const scr = A(new THREE.PlaneGeometry(0.57, 0.33), new THREE.MeshStandardMaterial({ map: scrT, emissive: 0xffffff, emissiveMap: scrT, emissiveIntensity: 1.6 }), DESK.x - 0.48 + Math.sin(0.55) * 0.017, DESK.h + 0.32, DESK.z - 0.08 + Math.cos(0.55) * 0.017, false); scr.rotation.y = 0.55;
  A(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), lampM, DESK.x - 0.48, DESK.h + 0.08, DESK.z - 0.1); A(new THREE.BoxGeometry(0.16, 0.012, 0.1), lampM, DESK.x - 0.48, DESK.h + 0.03, DESK.z - 0.1);
  A(new RoundedBoxGeometry(0.34, 0.018, 0.11, 2, 0.006), std(0xeeeeee, 0.5), DESK.x - 0.12, DESK.h + 0.035, DESK.z + 0.16).rotation.y = 0.15;
  A(new THREE.CylinderGeometry(0.035, 0.032, 0.09, 16), std(0xe76f51, 0.4), DESK.x + 0.55, DESK.h + 0.07, DESK.z + 0.1);
  for (let i = 0; i < 3; i++) A(new THREE.BoxGeometry(0.21, 0.004, 0.29), std(0xfaf6ee, 0.8), DESK.x + 0.2 + i * 0.015, DESK.h + 0.03 + i * 0.005, DESK.z - 0.05, false).rotation.y = -0.2 + i * 0.12;
  const dl = A(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 8), lampM, DESK.x + 0.6, DESK.h + 0.2, DESK.z - 0.18); dl.rotation.z = 0.35; const dh = A(new THREE.ConeGeometry(0.07, 0.1, 16, 1, true), std(0x2a9d8f, 0.4), DESK.x + 0.5, DESK.h + 0.4, DESK.z - 0.12); dh.rotation.z = 2.4; dh.material.side = THREE.DoubleSide;
  A(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshStandardMaterial({ color: 0, emissive: 0xfff0c8, emissiveIntensity: 10 }), DESK.x + 0.47, DESK.h + 0.36, DESK.z - 0.1, false);
  deskPhone.position.copy(H0).add(V(DESK.x + 0.32, DESK.h + 0.035, DESK.z + 0.12)); deskPhone.rotation.y = -0.4; scene.add(deskPhone);
  add(new RoundedBoxGeometry(0.075, 0.012, 0.15, 2, 0.006), std(0x15151a, 0.3, 0.4), 0, 0, 0, deskPhone); add(new THREE.PlaneGeometry(0.066, 0.135), deskPhoneScreen, 0, 0.007, 0, deskPhone, false).rotation.x = -Math.PI / 2;
}

// ------------------------------------------------------------------ the plane (cartoon prop plane, open cockpit)
const plane = new THREE.Group(); scene.add(plane);
{ const white = std(0xf7f7f2, 0.35), red = std(0xd62828, 0.35), dark = std(0x222222, 0.5), glass = new THREE.MeshPhysicalMaterial({ color: 0x9fd6ef, roughness: 0.05, transmission: 0, metalness: 0.2, clearcoat: 1 });
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(0.85, 6.0, 8, 24), white); fus.rotation.z = Math.PI / 2; fus.scale.set(1, 1, 0.95); fus.castShadow = true; plane.add(fus);
  const stripe = new THREE.Mesh(new THREE.CapsuleGeometry(0.87, 6.0, 8, 24, 1), red); stripe.rotation.z = Math.PI / 2; stripe.scale.set(0.35, 1.002, 0.96); stripe.position.y = -0.2; plane.add(stripe);
  const wing = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.16, 9.5, 3, 0.07), white); wing.position.set(0.3, -0.25, 0); wing.castShadow = true; plane.add(wing);
  for (const s of [-1, 1]) { const tip = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.18, 0.5, 2, 0.08), red); tip.position.set(0.3, -0.25, s * 4.6); plane.add(tip); }
  const fin = new THREE.Mesh(new RoundedBoxGeometry(1.3, 1.6, 0.14, 3, 0.06), red); fin.position.set(-3.4, 0.9, 0); fin.rotation.z = 0.35; plane.add(fin);
  const hs = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.12, 3.2, 3, 0.05), white); hs.position.set(-3.5, 0.15, 0); plane.add(hs);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 14), red); nose.position.set(3.95, 0, 0); plane.add(nose);
  const prop = new THREE.Group(); prop.position.set(4.3, 0, 0); plane.add(prop); plane.userData.prop = prop;
  for (let k = 0; k < 2; k++) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.08, 2.4, 0.22, 2, 0.04), dark); b.rotation.x = k * Math.PI / 2; prop.add(b); }
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05, depthWrite: false })); disc.rotation.y = Math.PI / 2; prop.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 10, 32), red); rim.rotation.x = Math.PI / 2; rim.position.set(0.9, 0.78, 0); plane.add(rim);
  const ws = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), glass); ws.scale.set(0.35, 0.7, 0.9); ws.position.set(1.65, 0.8, 0); plane.add(ws);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), dark); st.position.set(1.2, -0.95, s * 0.8); plane.add(st);
    const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 18), dark); wh.rotation.x = Math.PI / 2; wh.position.set(1.2, -1.42, s * 0.8); plane.add(wh); }
  const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 14), dark); tw.rotation.x = Math.PI / 2; tw.position.set(-3.3, -0.75, 0); plane.add(tw);
  plane.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); }
const PLANE_GROUND = 1.70;    // fuselage centre height when the wheels touch the road
const cockpitClip = new THREE.Plane(V(0, 1, 0), 0), deskClip = new THREE.Plane();

// ------------------------------------------------------------------ Pion billboard (engine frames): sun-facing shadow card, contact shadow, optional cockpit clip
const pionMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
const pion = new THREE.Object3D(); scene.add(pion);
const pionSh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
pionSh.castShadow = true; pionSh.layers.set(1); sun.shadow.camera.layers.enable(1);
pionSh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide }); scene.add(pionSh);
const pionScene = new THREE.Scene(), pionShow = new THREE.Mesh(pionSh.geometry, pionMat); pionShow.renderOrder = 2; pionScene.add(pionShow);
const contactTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(0,0,0,.92)"); gr.addColorStop(0.35, "rgba(0,0,0,.6)"); gr.addColorStop(0.7, "rgba(0,0,0,.18)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, null);
contactTex.colorSpace = THREE.NoColorSpace;
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthTest: false, depthWrite: false, color: 0x1a120a }));
contact.rotation.x = -Math.PI / 2; contact.renderOrder = 1; pionScene.add(contact);
// the photo of the boss, held in Pion's hands (drawn over the engine's blank sheet)
const photoM = new THREE.MeshBasicMaterial({ map: loadTex("/assets/boss_photo.jpg"), toneMapped: false, depthTest: false, transparent: true });
const photo = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.825), photoM); photo.renderOrder = 4; photo.visible = false; pionScene.add(photo);
const photoFrame = new THREE.Mesh(new THREE.PlaneGeometry(1.08, 0.9), new THREE.MeshBasicMaterial({ color: 0xfffaf0, toneMapped: false, depthTest: false })); photoFrame.renderOrder = 3; photoFrame.visible = false; pionScene.add(photoFrame);
let PION = null;
// Pion is the creator's own 2D drawing: a flat sprite in the 3D world; the drawing changes with the view (front / left / right / back)
const P2D = {}; for (const k of ["depan", "kiri", "kanan", "belakang", "datar_sinis", "marah", "mata_berbinar", "nangis_TOT", "cemas"]) P2D[k] = loadTex(`/assets/p2d/pion2d_${k}.png`);
const P2D_ASPECT = 374 / 598, P2D_H = 1.45;
let ENV = [];
const EXPR = [[0, "depan"], [1.5, "mata_berbinar"], [2.0, "depan"], [3.05, "datar_sinis"], [4.8, "mata_berbinar"], [7.6, "datar_sinis"], [15.0, "marah"], [18.6, "nangis_TOT"], [20.2, "cemas"], [20.81, "depan"], [24.4, "cemas"], [26.9, "depan"], [29.2, "datar_sinis"]];
function spriteFor(t, az) { const a = ((az % 360) + 540) % 360 - 180; if (Math.abs(a) > 135) return "belakang"; if (a > 45) return "kiri"; if (a < -45) return "kanan"; let e = "depan"; for (const [tt, k] of EXPR) if (t >= tt) e = k; return e; }
const P2N = {}, P2A = {}; for (const k in P2D) { P2N[k] = loadTex(`/assets/p2d/pion2d_${k}_n.png`, false); P2A[k] = loadTex(`/assets/p2d/pion2d_${k}_ao.png`, false); }
let PMODE = "engine";
// lit 2D drawing: pseudo-3D normals (inflated from the drawing), sun/lamp key, sky/ground fill, rim, AO in the creases, the crown's shadow on the head
const spriteU = { map: { value: null }, nmap: { value: null }, aomap: { value: null }, L: { value: V(0, 1, 0) }, keyC: { value: new THREE.Color() }, skyC: { value: new THREE.Color() }, gndC: { value: new THREE.Color() },
  ambC: { value: new THREE.Color(0.1, 0.1, 0.1) }, shDir: { value: new THREE.Vector2() }, clipY: { value: -1e9 } };
const spriteMat = new THREE.ShaderMaterial({ uniforms: spriteU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: `varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
  fragmentShader: `uniform sampler2D map, nmap, aomap; uniform vec3 L, keyC, skyC, gndC, ambC; uniform vec2 shDir; uniform float clipY; varying vec2 vUv; varying vec3 vW;
    void main(){
      if (vW.y < clipY) discard;
      vec4 a = texture2D(map, vUv); if (a.a < 0.04) discard;
      vec4 nn = texture2D(nmap, vUv); vec3 n = normalize(nn.rgb * 2.0 - 1.0); float ao = texture2D(aomap, vUv).r;
      float cs = 0.0; for (int i = 1; i <= 8; i++) cs = max(cs, texture2D(nmap, vUv + shDir * float(i) / 8.0).a * (1.0 - float(i) / 10.0));
      cs *= 1.0 - nn.a;                                                    // the crown shades the head under it (not itself)
      float ndl = dot(n, normalize(L)); float diff = smoothstep(-0.15, 0.85, ndl);
      float sh = 1.0 - 0.7 * cs;
      vec3 hemi = mix(gndC, skyC, n.y * 0.5 + 0.5);
      float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.2) * max(dot(normalize(n.xy + 1e-4), normalize(L.xy + 1e-4)), 0.0);
      vec3 col = a.rgb * (ambC + hemi * ao + keyC * diff * sh * mix(0.75, 1.0, ao)) + keyC * rim * 0.55 * sh;
      gl_FragColor = vec4(col, a.a); }` });
let curKey = "", curTex = null;
async function pionFrame(url) { const t = await TL.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; if (curTex) curTex.dispose(); curTex = t; curKey = ""; pionMat.map = t; pionSh.customDepthMaterial.map = t; pionMat.needsUpdate = true; pionSh.customDepthMaterial.needsUpdate = true; }
function placePion(anchor, height) {
  const k = height / (4.65 * PION.ppu), pw = PION.w * k, ph = PION.h * k;
  const off = V((PION.w / 2 - PION.base[0]) * k, (PION.base[1] - PION.h / 2) * k, 0);
  const d = V(0, 0, 0).subVectors(camera.position, anchor); pion.rotation.set(0, Math.atan2(d.x, d.z), 0); pion.scale.set(pw, ph, 1);
  const offS = off.clone(); off.applyQuaternion(pion.quaternion); pion.position.copy(anchor).add(off);
  pionSh.scale.set(pw, ph, 1); pionSh.rotation.set(0, Math.atan2(LDIR.x, LDIR.z), 0); offS.applyQuaternion(pionSh.quaternion); pionSh.position.copy(anchor).add(offS);
  return k;
}
function setSprite(k) { if (k === curKey) return; curKey = k; pionMat.map = P2D[k]; pionSh.customDepthMaterial.map = P2D[k]; pionMat.needsUpdate = true; pionSh.customDepthMaterial.needsUpdate = true; }
function placeSprite(anchor, height, sy, sx, roll) {   // bottom of the drawing sits on the anchor; squash/stretch and a lean pivot on the base
  const ph = height * sy, pw = height * P2D_ASPECT * sx;
  const d = V(0, 0, 0).subVectors(camera.position, anchor); const yaw = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), Math.atan2(d.x, d.z));
  const q = yaw.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), roll));
  pion.quaternion.copy(q); pion.scale.set(pw, ph, 1); pion.position.copy(anchor).add(V(0, ph / 2, 0).applyQuaternion(q));
  pionSh.scale.set(pw, ph, 1); pionSh.rotation.set(0, Math.atan2(LDIR.x, LDIR.z), 0); pionSh.position.copy(anchor).add(V(0, ph / 2, 0));
}

// ------------------------------------------------------------------ timeline (local seconds; narration in the comments)
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, easeOut = u => 1 - Math.pow(1 - u, 3), clamp01 = u => Math.max(0, Math.min(1, u));
const sstep = (a, b, t) => { const u = clamp01((t - a) / (b - a)); return u * u * (3 - 2 * u); };
function keyed(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const raw = (t - a.t) / Math.max(1e-6, b.t - a.t), u = (b.ease === "out" ? easeOut : b.ease === "lin" ? (x => x) : ease)(raw), o = {};
      for (const k in a) o[k] = a[k] && a[k].isVector3 ? a[k].clone().lerp(b[k], u) : typeof a[k] === "number" ? a[k] + (b[k] - a[k]) * u : a[k];
      return o; } }
  return keys[keys.length - 1];
}
const CUTS = [1.10, 3.05, 9.40, 15.0, 20.81];
const PLANE_T = { touch: 1.55, stop: 1.95 };
const PSTART = V(-1.0, 0, 1.2);                                   // Pion's landing spot next to the plane
const DOOR = V(SHOP.x, 0, SHOP.z0 + 0.6);
const SPOT_D = V(SHOP.x - 0.7, 0, -10.2), SPOT_G = STAND.clone().add(V(0.72, 0, 0.42));
const SUNSET = { dir: V(-0.62, 0.42, -0.66), col: 0xffc888, i: 5.4, hemi: 0.62 };
const LAMP = { dir: V(-0.35, 0.85, 0.42), col: 0xffd9a8, i: 3.2, hemi: 0.75 };
const WINDOW = { dir: V(-0.8, 0.45, 0.4), col: 0xffe2b8, i: 3.0, hemi: 0.85 };
// shot list: camera keys, Pion (anchor, facing yaw psi, height), light, extra state
function shotAt(t) {
  if (t < CUTS[0]) {          // A: over the sea, chasing the plane toward the coast
    const u = t / CUTS[0], pp = V(-700 + 110 * u, 42 - 6 * u, 1.2);
    return { key: "A", plane: { pos: pp, roll: 0.12 * Math.sin(u * 3), pitch: -0.05 }, cam: { pos: pp.clone().add(V(8.0 - 2.5 * u, 2.6, -13.5)), tgt: pp.clone().add(V(0.6, 0.7, 0)), fov: 40, roll: 3 },
      pion: { a: pp.clone().add(V(0.9, -0.12, 0)), psi: Math.PI / 2, h: 1.35, clip: pp.y + 0.72 }, light: SUNSET, sunC: pp, sunR: 12 };
  }
  if (t < CUTS[1]) {          // B/C: landing on the street, Pion hops out and into the shop
    const pk = [{ t: 1.10, pos: V(-60, 14, 1.2), pitch: -0.18 }, { t: PLANE_T.touch, pos: V(-6, PLANE_GROUND, 1.2), pitch: 0, ease: "out" }, { t: PLANE_T.stop, pos: V(-2.6, PLANE_GROUND, 1.2), pitch: 0, ease: "out" }, { t: 3.1, pos: V(-2.6, PLANE_GROUND, 1.2), pitch: 0 }];
    const P = keyed(pk, t); const bounce = t > PLANE_T.touch ? Math.exp(-(t - PLANE_T.touch) * 9) * Math.abs(Math.sin((t - PLANE_T.touch) * 22)) * 0.25 : 0; P.pos.y += bounce;
    const inCock = P.pos.clone().add(V(0.9, -0.12, 0));
    // Pion: rides in until 1.95, jumps out (2.0-2.3), two hops to the door (2.3-2.95), through it
    let a, psi = Math.PI / 2, clip = P.pos.y + 0.72;
    if (t < 2.0) a = inCock;
    else if (t < 2.32) { const u = (t - 2.0) / 0.32; a = inCock.clone().lerp(PSTART, u); a.y = inCock.y * (1 - u) + Math.sin(u * Math.PI) * 0.9; clip = u < 0.3 ? clip : -9; psi = 0.4; }
    else { const u = clamp01((t - 2.32) / 0.68), seg = Math.min(1, u * 2) , k2 = u < 0.5 ? 0 : 1; const p0 = k2 ? PSTART.clone().lerp(DOOR, 0.5) : PSTART, p1 = k2 ? DOOR.clone().add(V(0, 0, -0.9)) : PSTART.clone().lerp(DOOR, 0.5);
      const v = u < 0.5 ? u * 2 : (u - 0.5) * 2; a = p0.clone().lerp(p1, v); a.y = Math.sin(v * Math.PI) * 0.45; clip = -9; psi = Math.atan2(DOOR.x - PSTART.x, DOOR.z - PSTART.z); }
    const ck = [{ t: 1.10, pos: V(7.5, 1.5, 9.5), tgt: V(-6, 3.5, 0.5), fov: 42 }, { t: 1.95, pos: V(6.8, 1.45, 8.6), tgt: V(-2.4, 1.6, 0.6), fov: 42 },
                { t: 2.3, pos: V(2.2, 1.35, 4.6), tgt: V(-0.6, 0.9, 0.6), fov: 42 }, { t: 2.7, pos: V(3.4, 1.35, 1.6), tgt: V(1.2, 0.8, -3.5), fov: 42 }, { t: 3.05, pos: V(SHOP.x + 0.4, 1.4, -4.6), tgt: V(SHOP.x, 1.2, -9.5), fov: 44 }];
    return { key: "B", plane: { pos: P.pos, roll: 0, pitch: P.pitch, prop: t < 2.4 }, cam: keyed(ck, t), pion: { a, psi, h: 1.35, clip }, light: SUNSET, sunC: V(-1, 0, -1), sunR: 16 };
  }
  if (t < 4.80) {             // D: inside the shop, Pion shows the photo (zoom onto it on "photo")
    const ck = [{ t: 3.05, pos: V(SHOP.x - 0.2, 1.3, -7.3), tgt: V(SHOP.x - 0.65, 0.8, -10.2), fov: 50 }, { t: 3.8, pos: V(SHOP.x - 0.35, 1.15, -8.0), tgt: V(SHOP.x - 0.68, 0.76, -10.2), fov: 47 },
                { t: 4.15, pos: V(SHOP.x - 0.55, 0.98, -8.75), tgt: V(SHOP.x - 0.7, 0.76, -10.2), fov: 44, ease: "out" }, { t: 4.8, pos: V(SHOP.x - 0.57, 0.97, -8.85), tgt: V(SHOP.x - 0.7, 0.76, -10.2), fov: 43 }];
    return { key: "D", cam: keyed(ck, t), pion: { a: SPOT_D, psi: 0, h: 1.35 }, light: LAMP, sunC: V(SHOP.x, 0, -11), sunR: 5, photo: t > 3.32 && t < 4.78 };
  }
  if (t < CUTS[2]) {          // E: a few days later: slow dolly, the cloth comes off (push), snap zoom on the smug clay face
    const ck = [{ t: 4.8, pos: V(SHOP.x + 0.3, 1.6, -7.6), tgt: V(STAND.x - 0.4, 1.0, -11), fov: 46 }, { t: 5.8, pos: V(SHOP.x + 0.5, 1.35, -8.3), tgt: V(STAND.x - 0.3, 1.05, -11), fov: 42 },
                { t: 6.45, pos: V(SHOP.x + 0.75, 1.25, -9.0), tgt: V(STAND.x - 0.12, 1.05, -11.2), fov: 40, ease: "out" }, { t: 7.55, pos: V(SHOP.x + 0.82, 1.22, -9.2), tgt: V(STAND.x - 0.1, 1.06, -11.2), fov: 39 },
                { t: 7.95, pos: V(STAND.x + 0.05, 1.16, -10.1), tgt: V(STAND.x, 1.12, -11.2), fov: 36, ease: "out" }, { t: 9.4, pos: V(STAND.x + 0.07, 1.15, -10.2), tgt: V(STAND.x, 1.12, -11.2), fov: 35 }];
    return { key: "E", cam: keyed(ck, t), pion: { a: V(SHOP.x - 0.35, 0, -10.6), psi: 0.35, h: 1.35 }, light: LAMP, sunC: V(SHOP.x, 0, -11), sunR: 5, clothT: (t - 5.82) / 0.62 };
  }
  if (t < CUTS[3]) {          // F: x-ray: soft clay over a heavy-duty steel frame
    const u = (t - CUTS[2]) / (CUTS[3] - CUTS[2]), ang = -0.38 + 0.76 * ease(u);
    const K = keyed([{ t: 9.4, r: 1.35, y: 1.0 }, { t: 12.6, r: 1.25, y: 1.0 }, { t: 13.15, r: 0.82, y: 1.1, ease: "out" }, { t: 14.2, r: 0.76, y: 1.1 }, { t: 14.65, r: 1.35, y: 0.95, ease: "out" }, { t: 15, r: 1.4, y: 0.95 }], t), R = K.r;   // in on "soft", out on "frame"
    const cam = { pos: V(STAND.x + Math.sin(ang) * R, 1.15, STAND.z + Math.cos(ang) * R), tgt: V(STAND.x, K.y, STAND.z), fov: 40 };
    return { key: "F", cam, pion: { a: V(SHOP.x - 0.6, 0, -10.4), psi: 0.4, h: 1.35, hide: true }, light: LAMP, sunC: V(SHOP.x, 0, -11), sunR: 5, xray: sstep(10.15, 10.8, t) * (1 - sstep(14.75, 15.0, t)) };
  }
  if (t < CUTS[4]) {          // G: the punch: face caves in like a cartoon, he keeps standing
    const psi = Math.atan2(STAND.x - SPOT_G.x, STAND.z - SPOT_G.z), hit = 16.18;
    const S0 = (x, y, z) => STAND.clone().add(V(x, y, z));   // push before the swing, zoom on the caved face, pull back ("keeps standing"), push on "the real him"
    const ck = [{ t: 15.0, pos: S0(-1.0, 1.35, 3.9), tgt: S0(0.35, 0.85, 0.2), fov: 42 }, { t: 15.9, pos: S0(-0.78, 1.25, 3.2), tgt: S0(0.3, 0.9, 0.2), fov: 41 }, { t: 16.3, pos: S0(-0.74, 1.25, 3.12), tgt: S0(0.3, 0.9, 0.2), fov: 41 },
                { t: 16.75, pos: S0(0.12, 1.15, 0.95), tgt: S0(0, 1.1, 0), fov: 36, ease: "out" }, { t: 18.3, pos: S0(0.1, 1.14, 0.82), tgt: S0(0, 1.1, 0), fov: 36 },
                { t: 18.85, pos: S0(-0.85, 1.3, 3.6), tgt: S0(0.3, 0.88, 0.2), fov: 41, ease: "out" }, { t: 19.85, pos: S0(-0.7, 1.26, 3.25), tgt: S0(0.3, 0.9, 0.2), fov: 41 },
                { t: 20.35, pos: S0(-0.1, 1.15, 1.4), tgt: S0(0.1, 1.02, 0), fov: 38, ease: "out" }, { t: 20.81, pos: S0(-0.08, 1.15, 1.3), tgt: S0(0.1, 1.02, 0), fov: 38 }];
    const e = t - hit, dent = sstep(hit, hit + 0.12, t), wob = e > 0 ? Math.exp(-e * 1.6) * Math.sin(e * 11) * 0.16 : 0;
    const dash = sstep(15.95, hit, t) * (1 - sstep(hit + 0.12, hit + 0.6, t)), back = sstep(15.3, 15.9, t) * (1 - sstep(15.9, 16.0, t));
    const pa = SPOT_G.clone().lerp(STAND.clone().add(V(0.3, 0, 0.18)), dash * 0.62).add(SPOT_G.clone().sub(STAND).setY(0).normalize().multiplyScalar(0.12 * back)); pa.y = 0.06 * Math.sin(dash * Math.PI);
    return { key: "G", cam: keyed(ck, t), pion: { a: pa, psi, h: 1.35, lean: 0.38 * dash - 0.16 * back, toward: STAND }, light: LAMP, sunC: V(SHOP.x, 0, -11), sunR: 5, dent, wob, hit, shake: [hit] };
  }
  // H/I: at home: establishing dolly, statue drops on the shelf, the desk phone rings, the boss yells down the line, "okay" -> zoom in, the rifle
  const Hh = (x, y, z) => HOME.clone().add(V(x, y, z));
  const ck = [{ t: 20.81, pos: Hh(1.9, 1.75, 3.3), tgt: Hh(-0.3, 1.0, -1.4), fov: 50 }, { t: 22.0, pos: Hh(1.35, 1.55, 2.5), tgt: Hh(-0.1, 1.0, -1.5), fov: 48 },
              { t: 22.5, pos: Hh(1.05, 1.42, 0.5), tgt: Hh(SHELF_X, 1.38, -2.2), fov: 40, ease: "out" }, { t: 23.65, pos: Hh(1.0, 1.4, 0.3), tgt: Hh(SHELF_X, 1.36, -2.2), fov: 38 },
              { t: 24.05, pos: Hh(0.4, 1.3, 1.55), tgt: Hh(-0.02, 0.6, -0.85), fov: 42, ease: "out" }, { t: 24.75, pos: Hh(0.4, 1.4, 2.2), tgt: Hh(-0.15, 0.72, -1.1), fov: 46 },
              { t: 27.4, pos: Hh(0.25, 1.3, 1.9), tgt: Hh(-0.2, 0.74, -1.2), fov: 48 },
              { t: 27.95, pos: Hh(-0.23, 1.1, 1.2), tgt: Hh(-0.25, 0.96, -1.25), fov: 41, ease: "out" }, { t: 29.85, pos: Hh(-0.24, 1.1, 1.05), tgt: Hh(-0.25, 0.96, -1.25), fov: 40 }];
  const ring = t > 23.95 && t < 24.42, yell = t > 24.75 && t < 27.0;
  return { key: "H", cam: keyed(ck, t), pion: { a: Hh(DESK.x, 0.3 * sstep(27.6, 28.1, t) * (1 + 0.15 * Math.exp(-Math.max(0, t - 28.1) * 6) * Math.sin(Math.max(0, t - 28.1) * 20)), -1.25), psi: 0, h: 1.35, desk: true }, light: WINDOW, sunC: Hh(0, 0, -1), sunR: 5, home: true, drop: 23.2, ring, yell, phoneGone: t >= 24.42, shake: yell ? [24.8, 25.4, 26.1] : t > 28.2 && t < 28.9 ? [28.25] : [] };
}
function shakeAt(t, hits, amp) { let x = 0, y = 0; for (const h of hits || []) { const e = t - h; if (e < 0 || e > 0.6) continue; const a = Math.exp(-e * 7) * amp; x += a * Math.sin(e * 93); y += a * Math.sin(e * 71 + 1); } return [x, y]; }
const project = v => { const p = v.clone().project(camera); return [+((p.x + 1) / 2).toFixed(4), +((1 - p.y) / 2).toFixed(4), +p.z.toFixed(4)]; };
function viewOf(S) { const d = S.cam.pos.clone().sub(S.pion.a); return [+((Math.atan2(d.x, d.z) - S.pion.psi) * 180 / Math.PI).toFixed(3), +(Math.atan2(d.y - 0.7, Math.hypot(d.x, d.z)) * 180 / Math.PI).toFixed(3)]; }
window.viewTrack = (which, fps, n) => { const out = []; let prev = 0; for (let f = 0; f < n; f++) { const S = shotAt(f / fps); let [az, tl] = viewOf(S); while (az - prev > 180) az -= 360; while (az - prev < -180) az += 360; prev = az; out.push([az, tl]); } return out; };

window.setup = async (pionInfo) => { PION = pionInfo; PMODE = pionInfo.mode || "engine"; ENV = await (await fetch("/assets/env.json")).json(); await envReady; await statueReady; return true; };
window.renderFrame = async (which, f, fps, pionUrl, pinfo) => {
  const t = f / fps, S = shotAt(t), pts = {}; if (pinfo) Object.assign(PION, pinfo);
  // camera
  const sh = shakeAt(t, S.shake, S.key === "G" ? 0.03 : 0.02);
  camera.position.copy(S.cam.pos); camera.position.x += sh[0]; camera.position.y += sh[1]; camera.fov = S.cam.fov; camera.lookAt(S.cam.tgt); camera.rotateZ((S.cam.roll || 0) * Math.PI / 180);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  aimLight(S.sunC, S.sunR, S.light.dir, S.light.col, S.light.i); hemi.intensity = S.light.hemi;
  const inside = S.key === "D" || S.key === "E" || S.key === "F" || S.key === "G"; for (const m of FACADE) m.castShadow = !inside;
  scene.fog.near = S.key === "A" ? 250 : 12; scene.fog.far = S.key === "A" ? 5000 : 1500;
  // plane
  plane.visible = !!S.plane; if (S.plane) { plane.position.copy(S.plane.pos); plane.rotation.set(S.plane.roll || 0, 0, S.plane.pitch || 0); plane.userData.prop.rotation.x = (S.plane.prop === false ? 0.4 : t * 61); }
  // statue state
  dentU.value = S.dent ?? (S.home || t > 16.2 ? 1 : 0);
  if (S.home) { statueGrp.position.copy(HOME).add(V(SHELF_X - 0.12, homeShelfY + 0.035, -2.2)); statueGrp.scale.setScalar(0.62); const e = t - S.drop; statueGrp.position.y += e < 0 ? Math.max(0, -e) * 3.0 : Math.exp(-e * 8) * Math.abs(Math.sin(e * 18)) * 0.05; statueGrp.rotation.set(0, 0, 0); }
  else { statueGrp.position.set(STAND.x, 0.68, STAND.z); statueGrp.scale.setScalar(1); statueGrp.rotation.set(0, 0, S.wob || 0); }
  const ct = S.clothT ?? (t < 5.82 ? -1 : 2);
  cloth.visible = (S.key === "D" || S.key === "E") && ct < 1; if (cloth.visible) { const u = clamp01(ct); cloth.position.set(0.9 * u * u, 1.3 * u, 0.25 * u); cloth.rotation.set(0.6 * u, 0.4 * u, -1.6 * u * u); cloth.scale.set(1 + 0.5 * u, 1 - 0.3 * u, 1 + 0.3 * u); }
  const xr = S.xray || 0; arm.visible = xr > 0.01; ghost.visible = xr > 0.01; statueF.visible = statueB.visible = xr < 0.98;
  if (xr > 0.01) { if (!ghost.parent) statueGrp.add(ghost); ghostM.opacity = 0.35 * xr; steelM.emissiveIntensity = 1.6 * xr; } else { ghostM.opacity = 0; steelM.emissiveIntensity = 0; }
  statueF.material.opacity = 1; statueF.material.transparent = false;
  if (xr > 0.01 && xr < 0.98) { statueF.material.transparent = true; statueF.material.opacity = 1 - xr; statueF.material.depthWrite = xr < 0.5; } else statueF.material.depthWrite = true;
  statueF.material.needsUpdate = true;
  deskPhone.visible = !S.phoneGone; deskPhoneScreen.emissiveIntensity = S.ring ? 2.2 + 1.2 * Math.sin(t * 30) : 0;
  deskPhone.rotation.set(0, -0.4 + (S.ring ? 0.12 * Math.sin(t * 95) : 0), 0); deskPhone.position.y = HOME.y + DESK.h + 0.035 + (S.ring ? 0.004 * Math.abs(Math.sin(t * 60)) : 0);
  // Pion: either the 3D model rendered flat by the engine (turned to this camera), or the creator's 2D drawing lit like a 3D object
  const anchor = S.pion.a.clone();
  if (PMODE === "sprite") {
    const [az] = viewOf(S), k2 = spriteFor(t, az); spriteU.map.value = P2D[k2]; spriteU.nmap.value = P2N[k2]; spriteU.aomap.value = P2A[k2];
    if (pionSh.customDepthMaterial.map !== P2D[k2]) { pionSh.customDepthMaterial.map = P2D[k2]; pionSh.customDepthMaterial.needsUpdate = true; }
    pionShow.material = spriteMat;
    const env = ENV[f] || 0, inAir = anchor.y - (S.home ? HOME.y : 0) > 0.04 && !(S.pion.clip > -5);
    const sy = 1 + 0.05 * env + 0.012 * Math.sin(t * 3.1) + (inAir ? 0.07 : 0), sx = 1 / Math.sqrt(sy);
    let roll = 0; if (S.pion.lean) { const sp = project(anchor), st = project(S.pion.toward); roll = S.pion.lean * (st[0] < sp[0] ? 1 : -1); }
    placeSprite(anchor, P2D_H, sy, sx, roll);
    const dd = V(0, 0, 0).subVectors(camera.position, anchor), yaw = Math.atan2(dd.x, dd.z), right = V(Math.cos(yaw), 0, -Math.sin(yaw)), fwd = V(Math.sin(yaw), 0, Math.cos(yaw));
    const Ls = V(LDIR.dot(right), LDIR.y, LDIR.dot(fwd)); spriteU.L.value.copy(Ls);
    spriteU.keyC.value.copy(sun.color).multiplyScalar(sun.intensity / 4.2); spriteU.skyC.value.copy(hemi.color).multiplyScalar(hemi.intensity * 0.55); spriteU.gndC.value.copy(hemi.groundColor).multiplyScalar(hemi.intensity * 0.55);
    const l2 = Math.hypot(Ls.x, Ls.y) || 1; spriteU.shDir.value.set(Ls.x / l2 * 0.09, Ls.y / l2 * 0.09 * P2D_ASPECT);
    spriteU.clipY.value = (S.pion.clip !== undefined && S.pion.clip > -5) ? S.pion.clip : -1e9;
  } else { pionShow.material = pionMat; await pionFrame(pionUrl); placePion(anchor, 1.35); }
  pionMat.clippingPlanes = (S.pion.clip !== undefined && S.pion.clip > -5) ? [cockpitClip] : null; cockpitClip.constant = -(S.pion.clip ?? 0);
  if (S.pion.desk) { const P0 = HOME.clone().add(V(DESK.x, DESK.h + 0.025, DESK.z - DESK.d / 2)), v = camera.position.clone().sub(P0), n = V(0, v.z, -v.y).normalize();   // the desk's back top edge hides what is below it (seen from this camera)
    deskClip.setFromNormalAndCoplanarPoint(n, P0); pionMat.clippingPlanes = [deskClip]; }
  pionMat.needsUpdate = true;
  pionShow.visible = !S.pion.hide; pionSh.visible = !S.pion.hide && !(S.pion.clip > -5);
  pionShow.position.copy(pion.position); pionShow.quaternion.copy(pion.quaternion); pionShow.scale.copy(pion.scale);
  const gy = (S.home ? HOME.y : 0), airC = Math.max(0, anchor.y - gy); contact.visible = !S.pion.hide && !(S.pion.clip > -5) && !S.pion.desk;
  const cw = P2D_H * 0.62 / (1 + airC * 2); contact.scale.set(cw, cw * 0.45, 1); contact.material.opacity = 1 / (1 + airC * 3); contact.position.set(anchor.x, gy + (S.key === "D" || S.key === "E" || S.key === "G" ? 0.075 : 0.02), anchor.z);
  // the photo of the boss, held up in front of Pion
  photo.visible = photoFrame.visible = !!S.photo && PMODE === "sprite";   // the engine version holds it on its own sheet
  if (photo.visible) { const toCam = camera.position.clone().sub(anchor).setY(0).normalize(), side = V(0, 1, 0).cross(toCam).normalize();
    const pop = Math.min(1, (t - 3.32) / 0.18), wdt = 0.62 * (pop < 1 ? 0.4 + 0.75 * pop : 1 + 0.03 * Math.sin((t - 3.5) * 6)), c = anchor.clone().add(V(0, 0.5 + 0.02 * Math.sin(t * 4), 0)).addScaledVector(toCam, 0.25).addScaledVector(side, 0.05);
    photo.scale.set(wdt, wdt, 1); photoFrame.scale.set(wdt, wdt, 1); photo.position.copy(c).addScaledVector(toCam, 0.01); photoFrame.position.copy(c);
    photo.quaternion.copy(camera.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), -0.06)); photoFrame.quaternion.copy(photo.quaternion); pts.photo = project(c); }
  // clay chips on impact
  for (const [s, v, r] of chips) { const e = S.hit !== undefined ? t - S.hit : -1; s.visible = e > 0 && e < 1.2; if (!s.visible) continue;
    const face = statueGrp.localToWorld(V((FACE_UV.x - 0.5) * SW, FACE_UV.y * SH, DEPTH)); s.position.copy(face).addScaledVector(v.clone().applyAxisAngle(V(0, 1, 0), -0.5), e * 0.55); s.position.y -= 2.2 * e * e; s.rotation.set(r + e * 9, e * 7, 0); }
  // overlay anchors
  const face = statueGrp.localToWorld(V((FACE_UV.x - 0.5) * SW, FACE_UV.y * SH, DEPTH * 0.6));
  Object.assign(pts, { face: project(face), clay: project(statueGrp.localToWorld(V(SW * 0.22, SH * 0.55, DEPTH * 0.4))), frame: project(statueGrp.localToWorld(V(0, SH * 0.3, 0))),
    head: project(anchor.clone().add(V(0, 1.15, 0))), plane: S.plane ? project(S.plane.pos) : [0, 0, 0], tv: project(HOME.clone().add(V(2.0, 1.75, -2.3))), dphone: project(deskPhone.position), ear: project(anchor.clone().add(V(0.3, 0.9, 0.1))) });
  pts.shot = S.key;
  if (window.PTSONLY) return { img: null, pts };
  // render
  renderer.setRenderTarget(pionRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.autoClear = false;
  renderer.render(chipScene, camera); renderer.render(pionScene, camera); renderer.autoClear = true; renderer.setRenderTarget(null);
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture; inkPass.uniforms.near.value = camera.near; inkPass.uniforms.far.value = camera.far;
  gtao.updateGtaoMaterial({ radius: S.key === "A" ? 2.0 : 0.35, thickness: S.key === "A" ? 1.5 : 0.25 });
  inkPass.uniforms.fadeA.value = S.key === "A" ? 60 : 25; inkPass.uniforms.fadeB.value = S.key === "A" ? 600 : 220;
  composer.render();
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};
window.__ready = true;
