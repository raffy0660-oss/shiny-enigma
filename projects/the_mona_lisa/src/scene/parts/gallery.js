// ================================================================ GALLERY (x = 0)  v2: richer room (user: "not as good as our previous rooms")
// herringbone oak parquet, deep teal damask walls over a walnut dado, cream + gold cornice with dentils, navy coffers with gold rosettes,
// the skylight, two crystal chandeliers, salon-hung paintings on the side walls, marble statues flanking the Mona Lisa wall, dust in the light
const GAL = { XL: -4.5, XR: 4.5, BACK: -6.5, FRONT: 3.5, H: 4.4, DADO: 0.95 };
const FW = { Z: -3.6, W: 3.6, H: 3.1, D: 0.4 };
const MONA = { X: 0, Y: 1.45, Z: FW.Z + FW.D / 2, W: 0.53, H: 0.77 };
const CASE = { W: 1.24, H: 1.52, D: 0.3 };
const HOOK = [0, GAL.H, MONA.Z + 0.75];                                           // eye bolt in the ceiling in front of the case: the thief hangs right in front of it
const GALLERY = { washes: [], bulbs: [], crystals: [] };
function moreArt(kind) { return canvasTex(512, 640, (g, w, h) => {
  const gr = (a, b) => { const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
  if (kind === "lady") { g.fillStyle = gr("#2a3a2a", "#141a12"); g.fillRect(0, 0, w, h); g.fillStyle = "#5a1a2a"; g.beginPath(); g.moveTo(w * 0.15, h); g.quadraticCurveTo(w * 0.5, h * 0.35, w * 0.85, h); g.fill();
    g.fillStyle = "#e8c8a0"; g.beginPath(); g.ellipse(w * 0.5, h * 0.36, w * 0.13, h * 0.12, 0, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 4; g.stroke();
    g.fillStyle = "#c89a3a"; g.beginPath(); g.ellipse(w * 0.5, h * 0.27, w * 0.17, h * 0.07, 0, Math.PI, 0); g.fill(); g.fillStyle = "#f4ead0"; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(w * (0.4 + i * 0.025), h * 0.55, 6, 0, 7); g.fill(); } }
  if (kind === "storm") { g.fillStyle = gr("#3a4250", "#7a8a8a"); g.fillRect(0, 0, w, h); g.fillStyle = "#1e3040"; g.beginPath(); g.moveTo(0, h * 0.7); for (let x = 0; x <= w; x += 20) g.lineTo(x, h * 0.7 + Math.sin(x / 30) * 22); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = "#f0f0e8"; for (let x = 0; x <= w; x += 40) { g.beginPath(); g.arc(x, h * 0.7 + Math.sin(x / 30) * 22, 10, Math.PI, 0); g.fill(); } g.fillStyle = "#2a1a10"; g.beginPath(); g.moveTo(w * 0.3, h * 0.66); g.lineTo(w * 0.7, h * 0.62); g.lineTo(w * 0.62, h * 0.7); g.lineTo(w * 0.36, h * 0.72); g.fill(); g.fillRect(w * 0.48, h * 0.28, 6, h * 0.36); }
  if (kind === "garden") { g.fillStyle = gr("#bcd4e0", "#e8dcb0"); g.fillRect(0, 0, w, h); g.fillStyle = "#4a7038"; g.fillRect(0, h * 0.55, w, h); for (let i = 0; i < 7; i++) { g.fillStyle = "#2e5028"; g.beginPath(); g.arc(w * (0.08 + i * 0.14), h * 0.5, w * 0.08, 0, 7); g.fill(); }
    for (let i = 0; i < 60; i++) { g.fillStyle = ["#e04a5a", "#f0c040", "#f4f0f0", "#a050c0"][i % 4]; g.beginPath(); g.arc(rnd() * w, h * 0.62 + rnd() * h * 0.36, 5, 0, 7); g.fill(); } g.fillStyle = "#d8d0c0"; g.fillRect(w * 0.44, h * 0.3, w * 0.12, h * 0.3); }
  if (kind === "horse") { g.fillStyle = gr("#d8b070", "#8a6030"); g.fillRect(0, 0, w, h); g.fillStyle = "#3a2214"; g.beginPath(); g.ellipse(w * 0.5, h * 0.6, w * 0.26, h * 0.1, 0, 0, 7); g.fill(); g.fillRect(w * 0.66, h * 0.4, w * 0.07, h * 0.2);
    g.beginPath(); g.ellipse(w * 0.72, h * 0.38, w * 0.08, h * 0.04, -0.4, 0, 7); g.fill(); for (const x of [0.3, 0.38, 0.6, 0.68]) g.fillRect(w * x, h * 0.65, 10, h * 0.18); g.fillStyle = "#1a1008"; g.fillRect(0, h * 0.85, w, h); }
  g.fillStyle = "rgba(160,110,40,.12)"; g.fillRect(0, 0, w, h); }); }
{ // ---- walls: one shape per wall (holes for the arch / staff door), UV in metres; teal damask above a walnut dado, drawn in one texture
  const wallT = canvasTex(512, 1024, (g, w, h) => { const dado = h * (1 - GAL.DADO / GAL.H);
    g.fillStyle = "#24433f"; g.fillRect(0, 0, w, dado);
    for (let y = 0; y < dado + 80; y += 96) for (let x = ((y / 96) % 2) * 48 - 48; x < w + 48; x += 96) {   // damask medallions (gold, low contrast)
      g.save(); g.translate(x + 48, y + 48); g.strokeStyle = "rgba(205,170,95,.28)"; g.fillStyle = "rgba(205,170,95,.1)"; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, -38); g.bezierCurveTo(22, -26, 26, -6, 0, 0); g.bezierCurveTo(-26, -6, -22, -26, 0, -38); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, 38); g.bezierCurveTo(22, 26, 26, 6, 0, 0); g.bezierCurveTo(-26, 6, -22, 26, 0, 38); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(0, 0, 30, 9, 0, 0, 7); g.stroke(); g.restore(); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "5,15,12" : "120,170,150"},${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * dado, 5, 5); }
    const q = g.createLinearGradient(0, 0, 0, dado); q.addColorStop(0, "rgba(0,0,0,.25)"); q.addColorStop(0.3, "rgba(0,0,0,0)"); g.fillStyle = q; g.fillRect(0, 0, w, dado);
    g.fillStyle = "#5a3820"; g.fillRect(0, dado, w, h - dado);
    for (let x = 0; x < w; x += 128) { g.fillStyle = "#4a2c16"; g.fillRect(x + 14, dado + 22, 100, h - dado - 56); g.strokeStyle = "#2e1a0c"; g.lineWidth = 6; g.strokeRect(x + 14, dado + 22, 100, h - dado - 56); g.strokeStyle = "rgba(255,205,140,.22)"; g.lineWidth = 2; g.strokeRect(x + 20, dado + 28, 88, h - dado - 68); }
    for (let i = 0; i < 1200; i++) { g.strokeStyle = `rgba(30,15,5,${rnd() * 0.14})`; g.lineWidth = 1; const y = dado + rnd() * (h - dado); g.beginPath(); g.moveTo(rnd() * w, y); g.lineTo(rnd() * w, y + (rnd() - 0.5) * 3); g.stroke(); } });
  wallT.repeat.set(1 / 2, 1 / GAL.H); wallT.wrapT = THREE.ClampToEdgeWrapping;
  const wallM = mat({ map: wallT, roughness: 0.78 });
  const arch = (cx, w, h) => { const p = new THREE.Path(), r = w / 2; p.moveTo(cx - r, 0); p.lineTo(cx - r, h - r); p.absarc(cx, h - r, r, Math.PI, 0, true); p.lineTo(cx + r, 0); p.lineTo(cx - r, 0); return p; };
  const rectH = (cx, w, h) => { const p = new THREE.Path(); p.moveTo(cx - w / 2, 0); p.lineTo(cx - w / 2, h); p.lineTo(cx + w / 2, h); p.lineTo(cx + w / 2, 0); p.lineTo(cx - w / 2, 0); return p; };
  function wall(len, x, z, ry, holes = []) { const s = new THREE.Shape(); s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, GAL.H); s.lineTo(-len / 2, GAL.H); s.lineTo(-len / 2, 0); s.holes.push(...holes);
    const me = new THREE.Mesh(new THREE.ShapeGeometry(s, 24), wallM); me.position.set(x, 0, z); me.rotation.y = ry; me.receiveShadow = true; scene.add(me);
    const W = group(x, 0, z, ry); W.userData.len = len; return W; }
  const backW = wall(GAL.XR - GAL.XL, 0, GAL.BACK, 0, [rectH(3.2, 1.0, 2.2)]), frontW = wall(GAL.XR - GAL.XL, 0, GAL.FRONT, Math.PI, [arch(0, 2.2, 3.2)]);
  const leftW = wall(GAL.FRONT - GAL.BACK, GAL.XL, (GAL.FRONT + GAL.BACK) / 2, Math.PI / 2), rightW = wall(GAL.FRONT - GAL.BACK, GAL.XR, (GAL.FRONT + GAL.BACK) / 2, -Math.PI / 2);
  const trimM = mat({ color: 0xe9dcc0, roughness: 0.5 }), dentM = trimM;
  const dentGeo = new THREE.BoxGeometry(0.05, 0.07, 0.05);
  for (const [W, gaps, salon] of [[backW, [[2.7, 3.7]], false], [frontW, [[-1.15, 1.15]], false], [leftW, [], true], [rightW, [], true]]) { const L = W.userData.len;
    const runs = []; let a = -L / 2; for (const [g0, g1] of gaps) { runs.push([a, g0]); a = g1; } runs.push([a, L / 2]);
    for (const [r0, r1] of runs) { const c = (r0 + r1) / 2, l = r1 - r0; if (l < 0.05) continue;
      add(box(l, 0.18, 0.05, 0.01), mat({ color: 0x2a170a, roughness: 0.5 }), c, 0.09, 0.025, { parent: W }); add(box(l, 0.07, 0.07, 0.015), trimM, c, GAL.DADO, 0.035, { parent: W }); add(box(l, 0.02, 0.075, 0.005), GOLD, c, GAL.DADO + 0.045, 0.04, { parent: W }); }
    // cornice: frieze band + gold bead + dentil row + crown
    add(box(L, 0.42, 0.06, 0.01), trimM, 0, GAL.H - 0.21, 0.03, { parent: W }); add(box(L, 0.04, 0.09, 0.01), GOLD, 0, GAL.H - 0.44, 0.045, { parent: W });
    add(box(L, 0.1, 0.2, 0.02), trimM, 0, GAL.H - 0.05, 0.1, { parent: W }); add(box(L, 0.03, 0.14, 0.01), GOLD, 0, GAL.H - 0.115, 0.075, { parent: W });
    const nD = Math.floor(L / 0.11), D = new THREE.InstancedMesh(dentGeo, dentM, nD), m4 = new THREE.Matrix4(); for (let i = 0; i < nD; i++) { m4.makeTranslation(-L / 2 + 0.055 + i * 0.11, GAL.H - 0.19, 0.08); D.setMatrixAt(i, m4); } D.receiveShadow = true; W.add(D);
    // pilasters
    const nP = Math.round(L / 2.2), px = i => -L / 2 + 0.25 + i * (L - 0.5) / nP;
    for (let i = 0; i <= nP; i++) { const x = px(i); if (gaps.some(([g0, g1]) => x > g0 - 0.3 && x < g1 + 0.3)) continue;
      add(box(0.32, GAL.H - 0.46 - GAL.DADO - 0.03, 0.08, 0.02), mat({ color: 0xd7c49a, roughness: 0.55 }), x, (GAL.H - 0.46 + GAL.DADO) / 2, 0.04, { parent: W });
      for (const dx of [-0.08, 0, 0.08]) add(box(0.025, GAL.H - 0.75 - GAL.DADO, 0.02, 0.008), mat({ color: 0xc4ae80, roughness: 0.6 }), x + dx, (GAL.H - 0.46 + GAL.DADO) / 2, 0.085, { parent: W });   // flutes
      add(box(0.42, 0.16, 0.14, 0.02), GOLD, x, GAL.H - 0.54, 0.07, { parent: W }); add(box(0.38, 0.09, 0.12, 0.02), GOLD, x, GAL.DADO + 0.08, 0.06, { parent: W }); }
    if (!salon) { for (let i = 0; i < nP; i++) { const c = (px(i) + px(i + 1)) / 2, pw = px(i + 1) - px(i) - 0.6; if (gaps.some(([g0, g1]) => c > g0 - 1 && c < g1 + 1)) continue;
        const y0 = GAL.DADO + 0.3, y1 = GAL.H - 0.75, ph = y1 - y0;
        for (const [w, h, x, y] of [[pw, 0.04, c, y0], [pw, 0.04, c, y1], [0.04, ph, c - pw / 2, (y0 + y1) / 2], [0.04, ph, c + pw / 2, (y0 + y1) / 2]]) add(box(w, h, 0.035, 0.01), GOLD, x, y, 0.02, { parent: W }); }
      continue; }
    // salon hang: a big painting low + a smaller one above in each bay, brass picture lamps, warm wash glows
    const kinds = W === leftW ? [["hills", 1.25, 0.95], ["lady", 0.85, 1.1], ["sea", 1.25, 0.9], ["portrait", 0.9, 1.15], ["garden", 1.2, 0.95]] : [["storm", 1.25, 0.95], ["horse", 1.2, 0.95], ["fruit", 1.0, 0.8], ["night", 1.2, 0.9], ["geo", 1.0, 1.0]];
    const ups = W === leftW ? ["fruit", "night", "geo", "storm", "horse"] : ["lady", "garden", "hills", "portrait", "sea"];
    for (let i = 0; i < nP; i++) { const c = (px(i) + px(i + 1)) / 2, [k, w, h] = kinds[i % kinds.length], tex = ["lady", "storm", "garden", "horse"].includes(k) ? moreArt(k) : artTex(k, 512, Math.round(512 * h / w));
      const P = group(0, 0, 0); W.add(P); P.position.set(c, 1.85, 0.03);
      add(new THREE.PlaneGeometry(w, h), mat({ map: tex, roughness: 0.6 }), 0, 0, 0.03, { parent: P, cast: false }); pictureFrame(P, w, h, 0.1, 0.045);
      add(box(0.42, 0.035, 0.06, 0.012), BRASS, 0, h / 2 + 0.2, 0.16, { parent: P }); add(box(0.36, 0.012, 0.03, 0.004), glowMat(0xffd9a0, 2.2), 0, h / 2 + 0.18, 0.17, { parent: P, cast: false });
      const wash = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.8, h * 1.75), washMat.clone()); wash.position.set(0, 0.12, 0.012); P.add(wash); GALLERY.washes.push(wash);
      const k2 = ups[i % ups.length], w2 = 0.7, h2 = 0.55, P2 = group(0, 0, 0); W.add(P2); P2.position.set(c, 3.2, 0.03);
      add(new THREE.PlaneGeometry(w2, h2), mat({ map: ["lady", "storm", "garden", "horse"].includes(k2) ? moreArt(k2) : artTex(k2, 384, 300), roughness: 0.6 }), 0, 0, 0.03, { parent: P2, cast: false }); pictureFrame(P2, w2, h2, 0.07, 0.035); }
  }
  // arch surround + a warm hall beyond it (paintings, light); staff door with its sign + keycard reader
  const archT = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 10, 40, Math.PI), GOLD); archT.position.set(0, 3.2 - 1.1, GAL.FRONT - 0.03); scene.add(archT);
  for (const sx of [-1, 1]) add(box(0.16, 2.1, 0.14, 0.02), GOLD, sx * 1.1, 1.05, GAL.FRONT - 0.03);
  { const T = new THREE.Mesh(new THREE.BoxGeometry(5, 3.6, 6), mat({ map: wallT.clone(), side: THREE.BackSide, roughness: 0.8 })); T.material.map.repeat.set(1 / 2, 1 / 3.6); T.position.set(0, 1.8, GAL.FRONT + 3.05); T.receiveShadow = true; scene.add(T);
    for (const [x, z, ry, k] of [[-2.45, GAL.FRONT + 2.5, Math.PI / 2, "garden"], [2.45, GAL.FRONT + 2.5, -Math.PI / 2, "storm"], [0, GAL.FRONT + 6, Math.PI, "hills"]]) { const P = group(x, 1.8, z, ry); add(new THREE.PlaneGeometry(1.1, 0.9), mat({ map: k === "hills" ? artTex(k) : moreArt(k) }), 0, 0, 0.03, { parent: P, cast: false }); pictureFrame(P, 1.1, 0.9, 0.09, 0.04); }
    GALLERY.hallLight = new THREE.PointLight(0xffc07a, 6, 7, 1.6); GALLERY.hallLight.position.set(0, 3.0, GAL.FRONT + 3); scene.add(GALLERY.hallLight); }
  const exitT = canvasTex(256, 96, (g, w, h) => { g.fillStyle = "#0c6a34"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8ffe8"; g.font = "900 64px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("EXIT", w * 0.58, h / 2); g.fillRect(16, 30, 40, 36); });
  GALLERY.exit = add(new THREE.PlaneGeometry(0.42, 0.16), new THREE.MeshBasicMaterial({ map: exitT, toneMapped: false, fog: false }), 0, 3.48, GAL.FRONT - 0.04, { ry: Math.PI, cast: false });
  { const D = group(3.2, 0, GAL.BACK + 0.02); const steel = mat({ color: 0x3a2a1c, roughness: 0.5 });
    add(box(1.0, 2.2, 0.05, 0.01), steel, 0, 1.1, 0.0, { parent: D }); for (const y of [0.55, 1.65]) add(box(0.8, 0.8, 0.02, 0.01), mat({ color: 0x2e2014, roughness: 0.5 }), 0, y, 0.03, { parent: D });
    add(new THREE.SphereGeometry(0.035, 12, 8), BRASS, 0.38, 1.0, 0.05, { parent: D });
    for (const [w, h, x, y] of [[1.16, 0.08, 0, 2.24], [0.08, 2.28, -0.54, 1.14], [0.08, 2.28, 0.54, 1.14]]) add(box(w, h, 0.08, 0.01), trimM, x, y, 0.02, { parent: D });
    add(new THREE.PlaneGeometry(0.44, 0.13), mat({ map: canvasTex(320, 96, (g, w, h) => { g.fillStyle = "#e9dcc0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#a88848"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#2a1a0e"; g.font = "700 38px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("STAFF ONLY", w / 2, h / 2 + 2); }) }), 0, 1.78, 0.045, { parent: D, cast: false });
    add(box(0.09, 0.14, 0.03, 0.01), mat({ color: 0x1a1a1c, roughness: 0.4 }), 0.7, 1.2, 0.02, { parent: D }); GALLERY.doorLed = add(new THREE.SphereGeometry(0.008, 8, 6), glowMat(0xff2a2a, 2), 0.7, 1.25, 0.04, { parent: D, cast: false }); }
}
{ // ---- floor: herringbone oak parquet; ceiling: navy coffers with gold rosettes between cream beams, the skylight in the middle
  const cw = 90, t = 30, floorT = canvasTex(720, 720, (g, w, h) => {
    for (let c = 0; c < w / cw; c++) { const s = c % 2 ? -1 : 1, x0 = c * cw;
      for (let y = -2 * cw; y < h + 2 * cw; y += t) { const v = 150 + rnd() * 45, hue = rnd() * 14; g.fillStyle = `rgb(${v + 18 + hue},${v * 0.72 + hue * 0.5},${v * 0.42})`;
        g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + cw, y + s * cw); g.lineTo(x0 + cw, y + s * cw + t); g.lineTo(x0, y + t); g.closePath(); g.fill();
        g.strokeStyle = "rgba(60,32,14,.75)"; g.lineWidth = 2; g.stroke();
        g.strokeStyle = "rgba(80,45,20,.18)"; g.lineWidth = 1; for (let k = 0; k < 3; k++) { const o = 6 + k * 8; g.beginPath(); g.moveTo(x0 + 4, y + o); g.lineTo(x0 + cw - 4, y + s * cw + o + (rnd() - 0.5) * 3); g.stroke(); } } }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(40,20,5,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [(GAL.XR - GAL.XL) / 1.4, (GAL.FRONT - GAL.BACK) / 1.4]);
  GALLERY.floor = add(new THREE.PlaneGeometry(GAL.XR - GAL.XL, GAL.FRONT - GAL.BACK), mat({ map: floorT, roughness: 0.32, metalness: 0.0 }), 0, 0, (GAL.FRONT + GAL.BACK) / 2, { rx: -Math.PI / 2, cast: false }); GALLERY.floor.userData.ground = true;
  add(new THREE.PlaneGeometry(5, 6), mat({ map: floorT.clone(), roughness: 0.35 }), 0, 0, GAL.FRONT + 3, { rx: -Math.PI / 2, cast: false });   // the hall beyond
  const coffT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#1a2540"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b89048"; g.lineWidth = 6; g.strokeRect(18, 18, w - 36, h - 36); g.lineWidth = 2; g.strokeRect(30, 30, w - 60, h - 60);
    g.save(); g.translate(w / 2, h / 2); g.fillStyle = "#c8a050"; for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, -26, 9, 22, 0, 0, 7); g.fill(); } g.beginPath(); g.arc(0, 0, 12, 0, 7); g.fillStyle = "#e8c870"; g.fill(); g.restore(); }, [(GAL.XR - GAL.XL) / 1.5, (GAL.FRONT - GAL.BACK) / 1.25]);
  const SK = { X: 0, Z: -0.4, W: 3.0, D: 2.5 };
  const cs = new THREE.Shape(); cs.moveTo(GAL.XL, GAL.BACK); cs.lineTo(GAL.XR, GAL.BACK); cs.lineTo(GAL.XR, GAL.FRONT); cs.lineTo(GAL.XL, GAL.FRONT); cs.lineTo(GAL.XL, GAL.BACK);
  const sh = new THREE.Path(); sh.moveTo(SK.X - SK.W / 2, SK.Z - SK.D / 2); sh.lineTo(SK.X - SK.W / 2, SK.Z + SK.D / 2); sh.lineTo(SK.X + SK.W / 2, SK.Z + SK.D / 2); sh.lineTo(SK.X + SK.W / 2, SK.Z - SK.D / 2); sh.lineTo(SK.X - SK.W / 2, SK.Z - SK.D / 2); cs.holes.push(sh);
  const cg = new THREE.ShapeGeometry(cs); { const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - GAL.XL) / (GAL.XR - GAL.XL), (uv.getY(i) - GAL.BACK) / (GAL.FRONT - GAL.BACK)); }
  const ceil = new THREE.Mesh(cg, mat({ map: coffT, roughness: 0.7 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = GAL.H + 0.2; ceil.receiveShadow = true; scene.add(ceil);
  const beamM = mat({ color: 0xe6d6b4, roughness: 0.6 });
  for (let x = GAL.XL; x <= GAL.XR + 0.01; x += 1.5) { add(box(0.16, 0.22, GAL.FRONT - GAL.BACK, 0.01), beamM, x, GAL.H + 0.09, (GAL.FRONT + GAL.BACK) / 2, { cast: false }); add(box(0.17, 0.015, GAL.FRONT - GAL.BACK, 0.004), GOLD, x, GAL.H - 0.025, (GAL.FRONT + GAL.BACK) / 2, { cast: false }); }
  for (let z = GAL.BACK; z <= GAL.FRONT + 0.01; z += 1.25) { add(box(GAL.XR - GAL.XL, 0.22, 0.16, 0.01), beamM, 0, GAL.H + 0.09, z, { cast: false }); add(box(GAL.XR - GAL.XL, 0.015, 0.17, 0.004), GOLD, 0, GAL.H - 0.025, z, { cast: false }); }
  const well = new THREE.Mesh(new THREE.BoxGeometry(SK.W, 0.7, SK.D), mat({ color: 0x2a2418, side: THREE.BackSide })); well.position.set(SK.X, GAL.H + 0.55, SK.Z); scene.add(well);
  GALLERY.skyNight = canvasTex(512, 384, (g, w, h) => { const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, "#0a1430"); q.addColorStop(1, "#22345f"); g.fillStyle = q; g.fillRect(0, 0, w, h); g.fillStyle = "#e8eeff"; for (let i = 0; i < 60; i++) g.fillRect(rnd() * w, rnd() * h, 2, 2); g.beginPath(); g.arc(w * 0.7, h * 0.3, 24, 0, 7); g.fill(); });
  GALLERY.skyDay = canvasTex(512, 384, (g, w, h) => { const q = g.createLinearGradient(0, 0, 0, h); q.addColorStop(0, "#e4eef6"); q.addColorStop(1, "#fbf4e4"); g.fillStyle = q; g.fillRect(0, 0, w, h); });
  GALLERY.sky = add(new THREE.PlaneGeometry(SK.W, SK.D), new THREE.MeshBasicMaterial({ map: GALLERY.skyNight, toneMapped: false, fog: false }), SK.X, GAL.H + 0.88, SK.Z, { rx: Math.PI / 2, cast: false });
  for (let i = 1; i < 4; i++) add(box(0.04, 0.05, SK.D, 0.01), BRONZE, SK.X - SK.W / 2 + i * SK.W / 4, GAL.H + 0.82, SK.Z, { cast: false });
  for (let i = 1; i < 3; i++) add(box(SK.W, 0.05, 0.04, 0.01), BRONZE, SK.X, GAL.H + 0.82, SK.Z - SK.D / 2 + i * SK.D / 3, { cast: false });
  GALLERY.SK = SK;
  // crystal chandeliers (front of the room and behind the Mona Lisa wall): chain, gilt body, ring of arms, candle bulbs, crystal drops
  const crysM = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.05, metalness: 0.2, emissive: 0x8090a0, emissiveIntensity: 0.15 });
  for (const [cx, cz] of [[0, 1.7], [0, -5.3]]) { const C = group(cx, GAL.H, cz);
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 6), GOLD, 0, -0.28, 0, { parent: C, cast: false });
    add(new THREE.LatheGeometry([[0, 0], [0.05, 0.02], [0.1, 0.1], [0.06, 0.2], [0.09, 0.28], [0.03, 0.36], [0, 0.38]].map(([r, y]) => new THREE.Vector2(r, y)), 20), GOLD, 0, -0.98, 0, { parent: C, cast: false });
    add(new THREE.TorusGeometry(0.42, 0.018, 8, 40), GOLD, 0, -0.88, 0, { parent: C, rx: Math.PI / 2, cast: false });
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
      add(new THREE.CylinderGeometry(0.03, 0.02, 0.05, 10), GOLD, x, -0.85, z, { parent: C, cast: false }); add(new THREE.CylinderGeometry(0.012, 0.012, 0.07, 8), mat({ color: 0xf4eee0 }), x, -0.79, z, { parent: C, cast: false });
      GALLERY.bulbs.push(add(new THREE.SphereGeometry(0.022, 10, 8), glowMat(0xffd28a, 2.5), x, -0.735, z, { parent: C, cast: false }));
      for (const r of [0.3, 0.5]) { const a2 = a + 0.39, cr = add(new THREE.OctahedronGeometry(0.022), crysM, Math.cos(a2) * r, -0.97 - (r - 0.3) * 0.3, Math.sin(a2) * r, { parent: C, cast: false }); cr.scale.y = 1.8; GALLERY.crystals.push(cr); } }
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; catenary([cx + Math.cos(a) * 0.42, GAL.H - 0.88, cz + Math.sin(a) * 0.42], [cx + Math.cos(a + 0.52) * 0.42, GAL.H - 0.88, cz + Math.sin(a + 0.52) * 0.42], 0.08, 0.004, crysM); }
    const L = new THREE.PointLight(0xffcf8a, 0, 7, 1.6); L.position.set(cx, GAL.H - 0.95, cz); scene.add(L); (GALLERY.chandLights = GALLERY.chandLights || []).push(L); }
}
{ // ---- the freestanding wall, the painting, frame, backing board (empty frame), glass case (intact / smashed), shards, label
  const fabT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#5c181c"; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "20,0,4" : "150,60,60"},${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    for (let y = 0; y < h; y += 64) for (let x = (y / 64 % 2) * 32; x < w; x += 64) { g.strokeStyle = "rgba(210,150,80,.16)"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y - 14); g.bezierCurveTo(x + 14, y - 6, x + 14, y + 6, x, y + 14); g.bezierCurveTo(x - 14, y + 6, x - 14, y - 6, x, y - 14); g.stroke(); } }, [3, 2.6]);
  const fab = mat({ map: fabT, roughness: 0.9 });
  add(box(FW.W, FW.H, FW.D, 0.03), fab, 0, FW.H / 2, FW.Z);
  add(box(FW.W + 0.1, 0.2, FW.D + 0.1, 0.02), mat({ color: 0x2a170a, roughness: 0.45 }), 0, 0.1, FW.Z); add(box(FW.W + 0.12, 0.025, FW.D + 0.12, 0.006), GOLD, 0, 0.21, FW.Z);
  add(box(FW.W + 0.14, 0.12, FW.D + 0.14, 0.02), GOLD, 0, FW.H + 0.03, FW.Z); add(box(FW.W + 0.04, 0.14, FW.D + 0.04, 0.02), mat({ color: 0x2a170a, roughness: 0.45 }), 0, FW.H - 0.1, FW.Z);
  for (const sx of [-1, 1]) add(box(0.06, FW.H - 0.3, 0.06, 0.01), GOLD, sx * (FW.W / 2 + 0.01), FW.H / 2, FW.Z + FW.D / 2);
  const M = group(MONA.X, MONA.Y, MONA.Z); GALLERY.mona = M;
  GALLERY.backing = add(new THREE.PlaneGeometry(MONA.W, MONA.H), mat({ map: canvasTex(256, 372, (g, w, h) => { g.fillStyle = "#6a4e30"; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,25,10,${rnd() * 0.3})`; g.lineWidth = 2; const y = rnd() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (rnd() - 0.5) * 8); g.stroke(); }
    g.fillStyle = "#3a2a1a"; g.font = "700 20px sans-serif"; g.fillText("INV. 779", 18, h - 20); }) }), 0, 0, 0.012, { parent: M, cast: false });
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(box(0.05, 0.02, 0.012, 0.004), BRASS, x * (MONA.W / 2 - 0.02), y * (MONA.H / 2 - 0.03), 0.02, { parent: M, cast: false });
  GALLERY.monaTex = monaLisaTex();
  GALLERY.canvas = add(new THREE.BoxGeometry(MONA.W, MONA.H, 0.018), [mat({ color: 0x6a4e30 }), mat({ color: 0x6a4e30 }), mat({ color: 0x6a4e30 }), mat({ color: 0x6a4e30 }), mat({ map: GALLERY.monaTex, roughness: 0.55 }), mat({ color: 0x5a4028 })], 0, 0, 0.026, { parent: M, cast: false });
  GALLERY.canvasHome = { pos: GALLERY.canvas.position.clone(), parent: M };
  const fr = pictureFrame(M, MONA.W, MONA.H, 0.11, 0.05); fr.position.z = 0.0;
  const C = group(MONA.X, MONA.Y, MONA.Z + CASE.D / 2); GALLERY.case = C;
  const E = 0.025; for (const sx of [-1, 1]) for (const sy of [-1, 1]) add(box(E, E, CASE.D, 0.004), BRONZE, sx * CASE.W / 2, sy * CASE.H / 2, 0, { parent: C });
  for (const sy of [-1, 1]) add(box(CASE.W, E, E, 0.004), BRONZE, 0, sy * CASE.H / 2, CASE.D / 2, { parent: C }); for (const sx of [-1, 1]) add(box(E, CASE.H, E, 0.004), BRONZE, sx * CASE.W / 2, 0, CASE.D / 2, { parent: C });
  const streak = canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = "rgba(255,255,255,0.025)"; g.fillRect(0, 0, w, h); for (const [x, ww, a] of [[0.12, 0.07, 0.07], [0.27, 0.025, 0.06], [0.72, 0.05, 0.04]]) { g.save(); g.translate(w * x, 0); g.transform(1, 0, -0.45, 1, 0, 0); g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(0, 0, w * ww, h); g.restore(); } });
  streak.wrapS = streak.wrapT = THREE.ClampToEdgeWrapping;
  const glassM = new THREE.MeshStandardMaterial({ map: streak, color: 0xeaf4ff, transparent: true, roughness: 0.05, metalness: 0.1, depthWrite: false });
  GALLERY.glass = [add(new THREE.PlaneGeometry(CASE.W, CASE.H), glassM, 0, 0, CASE.D / 2, { parent: C, cast: false }),
    ...[-1, 1].map(sx => add(new THREE.PlaneGeometry(CASE.D, CASE.H), glassM, sx * CASE.W / 2, 0, 0, { parent: C, ry: Math.PI / 2, cast: false })),
    add(new THREE.PlaneGeometry(CASE.W, CASE.D), glassM, 0, CASE.H / 2, 0, { parent: C, rx: Math.PI / 2, cast: false })];
  GALLERY.glass[0].renderOrder = 5;
  const crackT = canvasTex(512, 640, (g, w, h) => { g.clearRect(0, 0, w, h); const cx = w * 0.5, cy = h * 0.5; g.fillStyle = "rgba(235,245,255,0.16)"; g.fillRect(0, 0, w, h);
    g.save(); g.globalCompositeOperation = "destination-out"; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r = 150 + rnd() * 60; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.3); } g.closePath(); g.fill(); g.restore();
    g.strokeStyle = "rgba(255,255,255,0.75)"; g.lineWidth = 2.5; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + rnd() * 0.2; let x = cx + Math.cos(a) * 170, y = cy + Math.sin(a) * 210; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += Math.cos(a + (rnd() - 0.5) * 0.6) * 50; y += Math.sin(a + (rnd() - 0.5) * 0.6) * 50; g.lineTo(x, y); } g.stroke(); } });
  crackT.wrapS = crackT.wrapT = THREE.ClampToEdgeWrapping;
  GALLERY.glassBroken = add(new THREE.PlaneGeometry(CASE.W, CASE.H), new THREE.MeshStandardMaterial({ map: crackT, transparent: true, roughness: 0.1, metalness: 0.1, depthWrite: false }), 0, 0, CASE.D / 2, { parent: C, cast: false }); GALLERY.glassBroken.renderOrder = 6;
  // shards: on the floor (settled) and flying (F.shatter = seconds since the smash)
  const shardM = new THREE.MeshStandardMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0.75, roughness: 0.05, metalness: 0.3, side: THREE.DoubleSide, emissive: 0x405060, emissiveIntensity: 0.3 });
  GALLERY.shards = []; for (let i = 0; i < 90; i++) { const s = 0.015 + rnd() * 0.05, gS = new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(s, 0, s * (rnd() - 0.5)), V(s * rnd(), 0, s)]); gS.computeVertexNormals();
    const me = new THREE.Mesh(gS, shardM); scene.add(me); const a = rnd() * Math.PI * 2, r = Math.pow(rnd(), 0.7) * 0.8;
    me.userData = { p0: V((rnd() - 0.5) * CASE.W * 0.6, MONA.Y + (rnd() - 0.5) * CASE.H * 0.5, MONA.Z + CASE.D + 0.01), v: V((rnd() - 0.5) * 1.6, rnd() * 1.4, 0.6 + rnd() * 1.6), end: V(Math.cos(a) * r * 1.2, 0.003 + rnd() * 0.004, MONA.Z + CASE.D + 0.3 + Math.abs(Math.sin(a)) * r * 0.8), spin: V(rnd() * 12, rnd() * 12, rnd() * 12), ry: rnd() * 6 }; GALLERY.shards.push(me); }
  add(new THREE.PlaneGeometry(0.3, 0.12), mat({ map: canvasTex(400, 160, (g, w, h) => { g.fillStyle = "#efe6d2"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b8a070"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#2a2018";
    g.font = "700 30px Georgia, serif"; g.fillText("Leonardo da Vinci", 18, 44); g.font = "italic 24px Georgia, serif"; g.fillText("Portrait of Lisa Gherardini", 18, 86); g.font = "22px Georgia, serif"; g.fillText("c. 1503–1519 · oil on poplar", 18, 124); }) }), 0.98, 1.2, FW.Z + FW.D / 2 + 0.004, { cast: false });
  // the ceiling hook: plate + eye bolt, the scrap of black fabric caught in it (shown after the theft)
  const H = group(...HOOK); GALLERY.hook = H; const steelM = mat({ color: 0x9a9a96, metalness: 0.85, roughness: 0.3 });
  add(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 20), mat({ color: 0x8a8a86, metalness: 0.8, roughness: 0.35 }), 0, -0.006, 0, { parent: H });
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10), steelM, 0, -0.05, 0, { parent: H }); add(new THREE.TorusGeometry(0.045, 0.012, 10, 24), steelM, 0, -0.135, 0, { parent: H });
  { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.06, -0.02); s.lineTo(0.07, -0.09); s.lineTo(0.045, -0.075); s.lineTo(0.03, -0.12); s.lineTo(0.01, -0.08); s.lineTo(-0.02, -0.1); s.lineTo(-0.015, -0.03); s.lineTo(0, 0);
    const gF = new THREE.ShapeGeometry(s, 4), p = gF.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getY(i) * 40) * 0.008); gF.computeVertexNormals();
    GALLERY.fabric = add(gF, mat({ color: 0x0c0c10, roughness: 0.95, side: THREE.DoubleSide }), 0.02, -0.15, 0.01, { parent: H, rz: 0.2 }); }
}
{ // ---- stanchions + velvet rope, crime-scene tape, benches, statues, vases on plinths, dome cameras
  const velvet = mat({ color: 0x8a1420, roughness: 0.7 }), R = 1.55, cz = MONA.Z + 0.1, angs = [-68, -34, 0, 34, 68];
  const posts = angs.map(a => [Math.sin(a * Math.PI / 180) * R, cz + Math.cos(a * Math.PI / 180) * R]);
  for (const [x, z] of posts) { add(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 24), BRASS, x, 0.02, z); add(new THREE.CylinderGeometry(0.024, 0.024, 0.86, 12), BRASS, x, 0.47, z); add(new THREE.SphereGeometry(0.04, 16, 10), BRASS, x, 0.92, z); }
  GALLERY.ropes = []; for (let i = 0; i < posts.length - 1; i++) GALLERY.ropes.push(catenary([posts[i][0], 0.86, posts[i][1]], [posts[i + 1][0], 0.86, posts[i + 1][1]], 0.16, 0.022, velvet));
  GALLERY.ropeDown = catenary([posts[2][0], 0.86, posts[2][1]], [posts[2][0] + 0.25, 0.02, posts[2][1] + 0.55], 0.0, 0.022, velvet);
  const tapeT = canvasTex(1024, 64, (g, w, h) => { g.fillStyle = "#f2c412"; g.fillRect(0, 0, w, h); g.fillStyle = "#111"; g.font = "900 36px sans-serif"; g.textBaseline = "middle"; for (let x = 10; x < w; x += 512) g.fillText("CRIME SCENE — DO NOT CROSS", x, h / 2 + 2); }, [2, 1]);
  const tapeM = mat({ map: tapeT, roughness: 0.5, side: THREE.DoubleSide }); GALLERY.tape = new THREE.Group(); scene.add(GALLERY.tape);
  for (let i = 0; i < posts.length - 1; i++) { const [x0, z0] = posts[i], [x1, z1] = posts[i + 1], L = Math.hypot(x1 - x0, z1 - z0); const t = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.06), tapeM); t.position.set((x0 + x1) / 2, 0.74 - 0.03 * (i % 2), (z0 + z1) / 2); t.rotation.y = -Math.atan2(z1 - z0, x1 - x0); t.rotation.z = (rnd() - 0.5) * 0.06; GALLERY.tape.add(t); }
  GALLERY.posts = posts;
  const velB = mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#7a1a24"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) for (let y = 0; y < h; y += 64) { g.fillStyle = "rgba(0,0,0,.25)"; g.beginPath(); g.arc(x + 32, y + 32, 5, 0, 7); g.fill(); } }), roughness: 0.75 });
  const woodD = mat({ color: 0x3a2214, roughness: 0.45 });
  for (const [x, z] of [[-1.5, 0.9], [1.5, 0.9]]) { const B = group(x, 0, z); add(box(1.5, 0.14, 0.5, 0.06), velB, 0, 0.42, 0, { parent: B }); add(box(1.56, 0.06, 0.56, 0.02), woodD, 0, 0.33, 0, { parent: B });
    for (const sx of [-0.68, 0.68]) for (const sz of [-0.2, 0.2]) add(new THREE.CylinderGeometry(0.025, 0.018, 0.32, 10), GOLD, sx, 0.16, sz, { parent: B }); }
  const marbleW = mat({ color: 0xece4d6, roughness: 0.35 });
  const statue = (x, z, ry, pose) => { const S = group(x, 0, z, ry); add(box(0.55, 0.9, 0.55, 0.02), marbleW, 0, 0.45, 0, { parent: S }); add(box(0.65, 0.06, 0.65, 0.02), marbleW, 0, 0.93, 0, { parent: S }); add(box(0.6, 0.04, 0.6, 0.01), GOLD, 0, 0.12, 0, { parent: S });
    const robe = [[0, 0], [0.2, 0], [0.21, 0.08], [0.16, 0.4], [0.18, 0.62], [0.13, 0.78], [0.08, 0.85], [0, 0.86]].map(([r, y]) => new THREE.Vector2(r, y));
    const gR = new THREE.LatheGeometry(robe, 28), p = gR.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)), y = p.getY(i); const k = 1 + 0.07 * Math.sin(a * 9 + y * 4) * (1 - y); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } gR.computeVertexNormals();   // drapery folds
    add(gR, marbleW, 0, 0.96, 0, { parent: S }); add(new THREE.SphereGeometry(0.11, 20, 14), marbleW, 0, 1.93, 0.01, { parent: S });
    const arm = add(new THREE.CylinderGeometry(0.035, 0.03, 0.42, 10), marbleW, pose * 0.17, 1.72, 0.06, { parent: S, rz: pose * 2.5 }); add(new THREE.SphereGeometry(0.04, 10, 8), marbleW, pose * 0.33, 1.9, 0.08, { parent: S }); return S; };
  statue(-2.75, -3.35, 0.25, 1); statue(2.75, -3.35, -0.25, -1);
  for (const sx of [-1, 1]) { const x = sx * 3.85, z = 0.1; add(box(0.45, 1.0, 0.45, 0.02), marbleW, x, 0.5, z); add(box(0.53, 0.06, 0.53, 0.02), marbleW, x, 1.03, z);
    const prof = [[0, 0], [0.09, 0], [0.12, 0.06], [0.16, 0.18], [0.17, 0.28], [0.12, 0.4], [0.07, 0.46], [0.09, 0.5], [0, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
    add(new THREE.LatheGeometry(prof, 28), mat({ color: sx < 0 ? 0x2a4a6a : 0x9a4a2a, roughness: 0.3, metalness: 0.1 }), x, 1.06, z); }
  GALLERY.cams = []; for (const [x, z] of [[-4.1, -6.1], [4.1, -6.1], [-4.1, 3.1], [4.1, 3.1]]) { const D = group(x, GAL.H - 0.12, z);
    add(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 20), mat({ color: 0xe8e8e4, roughness: 0.5 }), 0, -0.02, 0, { parent: D, cast: false });
    add(new THREE.SphereGeometry(0.085, 20, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat({ color: 0x101014, roughness: 0.1, metalness: 0.4 }), 0, -0.04, 0, { parent: D, cast: false });
    GALLERY.cams.push(add(new THREE.SphereGeometry(0.01, 8, 6), glowMat(0xff2020, 3), 0.06, -0.07, 0, { parent: D, cast: false })); }
}
// ---- gallery lights. Night (heist): a hard top light on the thief + the painting spot, everything else falls off into the dark.
const monaSpot = new THREE.SpotLight(0xffd49a, 40, 9, 0.3, 0.45, 1.4); monaSpot.position.set(0, GAL.H - 0.15, MONA.Z + 2.6); monaSpot.target.position.set(MONA.X, MONA.Y, MONA.Z); scene.add(monaSpot, monaSpot.target);
monaSpot.castShadow = true; monaSpot.shadow.mapSize.set(1024, 1024); monaSpot.shadow.bias = -0.0004; monaSpot.shadow.normalBias = 0.02;
add(new THREE.CylinderGeometry(0.06, 0.09, 0.22, 16), mat({ color: 0x1a1a1a, roughness: 0.4 }), 0, GAL.H - 0.12, MONA.Z + 2.6, { rx: 0.55, cast: false });
const thiefSpot = new THREE.SpotLight(0xdce8ff, 0, 7, 0.36, 0.35, 1.2); thiefSpot.position.set(0.15, GAL.H - 0.05, HOOK[2] + 0.35); thiefSpot.target.position.set(0, 0, HOOK[2] - 0.05); scene.add(thiefSpot, thiefSpot.target);
thiefSpot.castShadow = true; thiefSpot.shadow.mapSize.set(1024, 1024); thiefSpot.shadow.bias = -0.0004;
const skyLight = new THREE.DirectionalLight(0xaecbff, 2); skyLight.position.set(1.2, GAL.H + 6, GALLERY.SK.Z + 1.5); skyLight.target.position.set(0, 0, GALLERY.SK.Z - 0.8); scene.add(skyLight, skyLight.target);
skyLight.castShadow = true; skyLight.shadow.mapSize.set(2048, 2048); Object.assign(skyLight.shadow.camera, { left: -4.6, right: 4.6, top: 5, bottom: -5, near: 1, far: 16 }); skyLight.shadow.bias = -0.0005; skyLight.shadow.normalBias = 0.03;
const galHemi = new THREE.HemisphereLight(0xffe0b8, 0x2a1a10, 0.3); scene.add(galHemi);
const galWash = [-3.0, 3.0].map(x => { const L = new THREE.PointLight(0xffc77a, 6, 8, 1.6); L.position.set(x, GAL.H - 0.9, -1.0); scene.add(L); return L; });
const hookSpot = new THREE.SpotLight(0xfff0d8, 0, 3, 0.35, 0.5, 1.2); hookSpot.position.set(HOOK[0] + 0.7, HOOK[1] - 1.4, HOOK[2] + 0.9); hookSpot.target.position.set(...HOOK); scene.add(hookSpot, hookSpot.target);
const monaBeam = beam([0, GAL.H - 0.2, MONA.Z + 2.55], [MONA.X, MONA.Y - 0.35, MONA.Z + 0.05], 0.06, 0.62, 0xffd49a, 0.42);
const thiefBeam = beam([0.15, GAL.H - 0.1, HOOK[2] + 0.35], [0, 0, HOOK[2] - 0.05], 0.08, 1.05, 0xdce8ff, 0.5), thiefPool = pool(0, 0.004, HOOK[2] - 0.05, 1.1, 1.0, 0xdce8ff, 0.5);
const moonBeam = beam([0, GAL.H + 0.8, GALLERY.SK.Z], [-0.4, 0, GALLERY.SK.Z - 0.9], 1.2, 1.6, 0x9ab8ff, 0.18), moonPool = pool(-0.4, 0.003, GALLERY.SK.Z - 0.9, 1.6, 1.3, 0x9ab8ff, 0.25);
// dust motes drifting in the light (additive points, animated with F.t)
const dustN = 260, dustPos = new Float32Array(dustN * 3), dustSeed = []; for (let i = 0; i < dustN; i++) dustSeed.push([rnd(), rnd(), rnd(), rnd()]);
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dustTex = canvasTex(64, 64, (g, w, h) => { const q = g.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, "rgba(255,255,255,1)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, w, h); }); dustTex.wrapS = dustTex.wrapT = THREE.ClampToEdgeWrapping;
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dustTex, size: 0.018, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xfff0d0, opacity: 0.8, toneMapped: false })); dust.frustumCulled = false; scene.add(dust);
function placeDust(t) { for (let i = 0; i < dustN; i++) { const [a, b, c, d] = dustSeed[i], inThief = i % 2 === 0;
  const y = ((b * GAL.H + t * (0.03 + d * 0.05)) % (GAL.H - 0.2)) + 0.1, r = Math.sqrt(a) * (inThief ? 0.15 + 0.85 * (1 - y / GAL.H) : 0.3);
  const ang = c * 6.283 + t * 0.1 * (d - 0.5); const cx = inThief ? 0 : 0, cz = inThief ? HOOK[2] : MONA.Z + 1.2;
  dustPos[i * 3] = cx + Math.cos(ang) * r; dustPos[i * 3 + 1] = inThief ? y : 1.0 + (y / GAL.H) * 3.0; dustPos[i * 3 + 2] = cz + Math.sin(ang) * r * (inThief ? 1 : 2.2); } dustGeo.attributes.position.needsUpdate = true; }
