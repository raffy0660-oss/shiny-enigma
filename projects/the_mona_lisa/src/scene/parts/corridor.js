// ================================================================ SERVICE CORRIDOR (x = 30)
const COR = { X: 30, W: 1.8, H: 2.7, Z0: -5.0, Z1: 4.0 };
const HATCH = { X: 30.05, Z: -0.9, S: 0.64 };
const CORRIDOR = {};
{ const L = COR.Z1 - COR.Z0, cz = (COR.Z0 + COR.Z1) / 2;
  const concT = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#8e8a82"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? "40,38,34" : "200,196,188"},${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
    for (let i = 0; i < 30; i++) { const q = g.createRadialGradient(rnd() * w, rnd() * h, 2, rnd() * w, rnd() * h, 120); q.addColorStop(0, "rgba(60,55,45,.12)"); q.addColorStop(1, "rgba(60,55,45,0)"); g.fillStyle = q; g.fillRect(0, 0, w, h); }
    g.strokeStyle = "rgba(40,38,34,.4)"; g.lineWidth = 3; for (let y = 0; y < h; y += 256) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } }, [1, L / 1.8]);
  CORRIDOR.floor = add(new THREE.PlaneGeometry(COR.W, L), mat({ map: concT, roughness: 0.9 }), COR.X, 0, cz, { rx: -Math.PI / 2, cast: false }); CORRIDOR.floor.userData.ground = true;
  // dust layer: lighter near the walls, the footprints are drawn into it below
  add(new THREE.PlaneGeometry(COR.W, L), new THREE.MeshStandardMaterial({ map: canvasTex(256, 1024, (g, w, h) => { g.clearRect(0, 0, w, h); for (const x of [0, w]) { const q = g.createLinearGradient(x, 0, w / 2, 0); q.addColorStop(0, "rgba(210,200,180,.55)"); q.addColorStop(1, "rgba(210,200,180,0.12)"); g.fillStyle = q; g.fillRect(x === 0 ? 0 : w / 2, 0, w / 2, h); } }), transparent: true, depthWrite: false, roughness: 1 }), COR.X, 0.002, cz, { rx: -Math.PI / 2, cast: false });
  const wallT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#d8d4c6"; g.fillRect(0, 0, w, h * 0.55); g.fillStyle = "#5e6b5a"; g.fillRect(0, h * 0.55, w, h); g.fillStyle = "#3e4a3c"; g.fillRect(0, h * 0.55 - 6, w, 8);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(30,30,20,${rnd() * 0.12})`; g.fillRect(rnd() * w, h * 0.55 + rnd() * h * 0.45, 8 + rnd() * 30, 2); } for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(80,70,50,${rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * h, 4, 4); } });
  wallT.repeat.set(L / 2.6, 1); const wm = mat({ map: wallT, roughness: 0.85 });
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(L, COR.H), wm, COR.X + sx * COR.W / 2, COR.H / 2, cz, { ry: -sx * Math.PI / 2, cast: false });
  add(new THREE.PlaneGeometry(COR.W, COR.H), mat({ color: 0x4a4a46 }), COR.X, COR.H / 2, COR.Z1, { ry: Math.PI, cast: false });
  // drop ceiling (tile grid) with the hatch hole, the hatch panel hinged down, the dark plenum above
  const tileT = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e6e2d8"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(90,80,60,${rnd() * 0.12})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.strokeStyle = "#9a978e"; g.lineWidth = 8; g.strokeRect(0, 0, w, h); }, [COR.W / 0.6, L / 0.6]);
  const cs = new THREE.Shape(); cs.moveTo(COR.X - COR.W / 2, COR.Z0); cs.lineTo(COR.X + COR.W / 2, COR.Z0); cs.lineTo(COR.X + COR.W / 2, COR.Z1); cs.lineTo(COR.X - COR.W / 2, COR.Z1); cs.lineTo(COR.X - COR.W / 2, COR.Z0);
  const hs = HATCH.S / 2, hh = new THREE.Path(); hh.moveTo(HATCH.X - hs, HATCH.Z - hs); hh.lineTo(HATCH.X - hs, HATCH.Z + hs); hh.lineTo(HATCH.X + hs, HATCH.Z + hs); hh.lineTo(HATCH.X + hs, HATCH.Z - hs); hh.lineTo(HATCH.X - hs, HATCH.Z - hs); cs.holes.push(hh);
  const cg = new THREE.ShapeGeometry(cs); { const uv = cg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - COR.X) / 0.6, uv.getY(i) / 0.6); } tileT.repeat.set(1, 1);
  const ceil = new THREE.Mesh(cg, mat({ map: tileT, roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = COR.H; ceil.receiveShadow = true; scene.add(ceil);
  const plen = new THREE.Mesh(new THREE.BoxGeometry(HATCH.S, 0.7, HATCH.S), mat({ color: 0x0c0b0a, side: THREE.BackSide, roughness: 1 })); plen.position.set(HATCH.X, COR.H + 0.35, HATCH.Z); scene.add(plen);
  for (const sx of [-1, 1]) add(box(0.03, 0.03, HATCH.S + 0.04, 0.005), mat({ color: 0xbab6ac }), HATCH.X + sx * hs, COR.H - 0.015, HATCH.Z, { cast: false });
  for (const sz of [-1, 1]) add(box(HATCH.S + 0.04, 0.03, 0.03, 0.005), mat({ color: 0xbab6ac }), HATCH.X, COR.H - 0.015, HATCH.Z + sz * hs, { cast: false });
  const HP = new THREE.Group(); HP.position.set(HATCH.X, COR.H - 0.01, HATCH.Z - hs); scene.add(HP); CORRIDOR.hatch = HP;   // hinge on the far edge
  add(box(HATCH.S - 0.02, 0.025, HATCH.S - 0.02, 0.005), mat({ map: tileT.clone(), roughness: 0.9 }), 0, 0, hs, { parent: HP });
  const cable = catenary([HATCH.X + 0.18, COR.H + 0.2, HATCH.Z + 0.1], [HATCH.X + 0.1, COR.H - 0.35, HATCH.Z + 0.15], 0.05, 0.008, mat({ color: 0x222222 })); CORRIDOR.cable = cable;
  // pipes along the right wall top, fluorescent fixtures, a fire extinguisher, the end door with keycard reader + sign, a wall camera
  for (const [y, r, c] of [[2.45, 0.05, 0x8a8a86], [2.3, 0.035, 0xa83228], [2.2, 0.025, 0x6a6a66]]) add(new THREE.CylinderGeometry(r, r, L, 12), mat({ color: c, metalness: 0.4, roughness: 0.5 }), COR.X + COR.W / 2 - 0.12, y, cz, { rx: Math.PI / 2 });
  CORRIDOR.tubes = []; for (const z of [-3.6, 0.6, 3.0]) { add(box(0.32, 0.06, 1.25, 0.01), mat({ color: 0xd8d8d2 }), COR.X, COR.H - 0.03, z, { cast: false }); CORRIDOR.tubes.push(add(box(0.22, 0.02, 1.15, 0.008), glowMat(0xeaf4ff, 1.6), COR.X, COR.H - 0.065, z, { cast: false })); }
  add(new THREE.CylinderGeometry(0.06, 0.06, 0.38, 14), mat({ color: 0xc42020, roughness: 0.4 }), COR.X - COR.W / 2 + 0.09, 0.55, 2.2);
  const D = group(COR.X, 0, COR.Z0 + 0.02); const steel = mat({ color: 0x4a5258, metalness: 0.6, roughness: 0.4 });
  add(box(1.0, 2.15, 0.06, 0.01), steel, 0, 1.075, 0, { parent: D }); add(box(0.7, 0.04, 0.06, 0.01), mat({ color: 0xb8b8b4, metalness: 0.8, roughness: 0.3 }), 0, 1.0, 0.06, { parent: D });
  add(new THREE.PlaneGeometry(0.26, 0.34), mat({ color: 0x1a2026, roughness: 0.1, metalness: 0.5 }), 0, 1.6, 0.035, { parent: D, cast: false });
  add(new THREE.PlaneGeometry(0.62, 0.2), mat({ map: canvasTex(400, 130, (g, w, h) => { g.fillStyle = "#c22018"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; g.textAlign = "center"; g.font = "900 34px sans-serif"; g.fillText("SECURITY ZONE", w / 2, 52); g.font = "700 22px sans-serif"; g.fillText("AUTHORIZED KEYCARD ONLY", w / 2, 96); }) }), 0, 2.32, 0.01, { parent: D, cast: false });
  add(box(0.1, 0.16, 0.035, 0.01), mat({ color: 0x18181a, roughness: 0.4 }), 0.7, 1.15, 0.02, { parent: D });
  add(new THREE.PlaneGeometry(0.06, 0.06), mat({ map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = "#2a2a2e"; g.fillRect(0, 0, w, h); g.strokeStyle = "#8a8a90"; g.lineWidth = 3; for (const r of [8, 16, 24]) { g.beginPath(); g.arc(w / 2, h / 2, r, -0.8, 0.8); g.stroke(); } }) }), 0.7, 1.13, 0.04, { parent: D, cast: false });
  CORRIDOR.cardLed = add(new THREE.SphereGeometry(0.01, 8, 6), glowMat(0xff2a2a, 2.5), 0.7, 1.21, 0.04, { parent: D, cast: false });
  const WC = group(COR.X - COR.W / 2 + 0.05, 2.35, COR.Z0 + 0.5, 0.6); add(box(0.08, 0.06, 0.04, 0.01), mat({ color: 0xdadad6 }), 0.0, 0, 0.0, { parent: WC }); add(box(0.1, 0.09, 0.2, 0.02), mat({ color: 0xeaeae6 }), 0.08, -0.04, 0.0, { parent: WC, ry: 0.9 });
  CORRIDOR.camLed = add(new THREE.SphereGeometry(0.008, 8, 6), glowMat(0xff2020, 3), 0.16, -0.06, 0.08, { parent: WC, cast: false });
}
{ // footprints in the dust: Pion's world has no feet, so a print is the round base of a pawn, one trail per hop.
  // A (the thief, came DOWN from the hatch): rubber base with a zigzag tread, a heavy landing print under the hatch, hops to the door.
  // B (waiting below): smooth leather base ring with a stitched rim; shuffled prints in one spot by the hatch, then hops to the door.
  const printTex = (kind, glow) => canvasTex(256, 256, (g, w, h) => { g.clearRect(0, 0, w, h); const c = glow ? (kind === "A" ? "rgba(90,255,230," : "rgba(255,120,240,") : "rgba(70,60,45,";
    g.save(); g.translate(w / 2, h / 2); g.beginPath(); g.arc(0, 0, 112, 0, 7); g.arc(0, 0, 74, 0, 7, true); g.fillStyle = c + (glow ? "0.9)" : "0.5)"); g.fill("evenodd");
    if (kind === "A") { g.strokeStyle = c + (glow ? "1)" : "0.6)"); g.lineWidth = 7; for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 80, Math.sin(a) * 80); g.lineTo(Math.cos(a + 0.12) * 106, Math.sin(a + 0.12) * 106); g.stroke(); }
      g.lineWidth = 6; for (let y = -60; y <= 60; y += 20) { g.beginPath(); for (let x = -60; x <= 60; x += 15) g.lineTo(x, y + ((x / 15) % 2 ? 6 : -6)); g.stroke(); } }
    else { g.strokeStyle = c + (glow ? "1)" : "0.55)"); g.setLineDash([8, 8]); g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 96, 0, 7); g.stroke(); g.setLineDash([]); g.fillStyle = c + (glow ? "0.7)" : "0.35)"); g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); }
    g.restore(); });
  const T = { A: [printTex("A"), printTex("A", 1)], B: [printTex("B"), printTex("B", 1)] }; Object.values(T).flat().forEach(t => { t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; });
  CORRIDOR.prints = { A: [], B: [] }; const S = 0.4;
  const put = (k, x, z, rot, sc = 1, a = 1) => { const m = new THREE.MeshBasicMaterial({ map: T[k][0], transparent: true, depthWrite: false, opacity: a, polygonOffset: true, polygonOffsetFactor: -2, fog: true });
    const me = new THREE.Mesh(new THREE.PlaneGeometry(S * sc, S * sc), m); me.rotation.x = -Math.PI / 2; me.rotation.z = rot; me.position.set(x, 0.004, z); me.renderOrder = 3; scene.add(me); CORRIDOR.prints[k].push(me); };
  put("A", HATCH.X, HATCH.Z + 0.02, 0.3, 1.15, 1);                                                 // the landing under the hatch
  for (let i = 1; i <= 6; i++) put("A", HATCH.X - 0.12 + Math.sin(i * 1.3) * 0.06, HATCH.Z - i * 0.62, i * 0.7, 1, 1 - i * 0.07);   // hops toward the door
  for (const [dx, dz, r] of [[0.42, 0.25, 0.4], [0.47, 0.18, 1.6], [0.38, 0.32, 2.4], [0.5, 0.3, 3.1]]) put("B", HATCH.X + dx, HATCH.Z + dz, r, 1, 0.9);   // waiting: shuffled on the spot
  for (let i = 1; i <= 6; i++) put("B", HATCH.X + 0.36 + Math.sin(i * 0.9) * 0.05, HATCH.Z - 0.15 - i * 0.6, i * 1.1, 1, 0.85 - i * 0.06);
  CORRIDOR.printTex = T;
}
const corTubes = [-3.6, 0.6, 3.0].map(z => { const L = new THREE.PointLight(0xe8f2ff, 3.2, 5, 1.6); L.position.set(COR.X, COR.H - 0.25, z); scene.add(L); return L; });
const corHemi = new THREE.HemisphereLight(0xc8d4e0, 0x2a2a26, 0.25); scene.add(corHemi);
const corKey = new THREE.SpotLight(0xe8f2ff, 14, 6, 0.6, 0.6, 1.4); corKey.position.set(COR.X + 0.3, COR.H - 0.1, HATCH.Z + 1.2); corKey.target.position.set(HATCH.X, 0, HATCH.Z); scene.add(corKey, corKey.target);
corKey.castShadow = true; corKey.shadow.mapSize.set(1024, 1024); corKey.shadow.bias = -0.0004;
const hatchBeam = beam([HATCH.X, COR.H + 0.1, HATCH.Z], [HATCH.X, 0, HATCH.Z], 0.25, 0.45, 0xbfd6ff, 0.0);   // off by default (F.hatchBeam)

// ================================================================ SECURITY ROOM (x = 60)
const SEC = { X: 60, W: 3.4, D: 3.0, H: 2.6 };
const SECURITY = {};
{ const back = -SEC.D / 2;
  add(new THREE.PlaneGeometry(SEC.W, SEC.D), mat({ map: canvasTex(512, 512, (g, w, h) => { for (let y = 0; y < h; y += 64) for (let x = 0; x < w; x += 64) { const c = 60 + ((x + y) / 64 % 2) * 10 + rnd() * 6; g.fillStyle = `rgb(${c},${c + 4},${c + 10})`; g.fillRect(x, y, 64, 64); } }, [3, 3]), roughness: 0.7 }), SEC.X, 0, 0, { rx: -Math.PI / 2, cast: false }).userData.ground = true;
  const wm = mat({ color: 0x3a4250, roughness: 0.85 });
  add(new THREE.PlaneGeometry(SEC.W, SEC.H), wm, SEC.X, SEC.H / 2, back, { cast: false });
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(SEC.D, SEC.H), wm, SEC.X + sx * SEC.W / 2, SEC.H / 2, 0, { ry: -sx * Math.PI / 2, cast: false });
  add(new THREE.PlaneGeometry(SEC.W, SEC.D), mat({ color: 0x2a2e36 }), SEC.X, SEC.H, 0, { rx: Math.PI / 2, cast: false });
  // CCTV wall: 3 x 3 monitors, each a little drawn view of the museum with a timestamp; "off" = blue NO SIGNAL
  const views = ["gallery", "case", "corridor", "entrance", "gallery2", "stairs", "door", "hall", "loading"];
  const camTex = (i, off, stamp) => canvasTex(320, 200, (g, w, h) => { if (off) { g.fillStyle = "#0a1a6a"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8eeff"; g.font = "900 34px monospace"; g.textAlign = "center"; g.fillText("NO SIGNAL", w / 2, h / 2 + 8); g.font = "18px monospace"; g.fillText(`CAM ${String(i + 1).padStart(2, "0")}`, w / 2, h / 2 + 40); return; }
    const v = views[i]; g.fillStyle = "#3a3a36"; g.fillRect(0, 0, w, h); g.fillStyle = "#5a5650"; g.fillRect(0, h * 0.62, w, h);
    if (v.startsWith("gallery") || v === "case") { g.fillStyle = "#4a2024"; g.fillRect(w * 0.32, h * 0.18, w * 0.36, h * 0.46); g.fillStyle = "#8a7a4a"; g.fillRect(w * 0.45, h * 0.28, w * 0.1, h * 0.16); g.fillStyle = "#5a4a2a"; g.fillRect(w * 0.47, h * 0.31, w * 0.06, h * 0.1); }
    if (v === "corridor" || v === "hall") { g.fillStyle = "#6a6a62"; g.beginPath(); g.moveTo(0, 0); g.lineTo(w * 0.42, h * 0.35); g.lineTo(w * 0.42, h * 0.6); g.lineTo(0, h); g.fill(); g.beginPath(); g.moveTo(w, 0); g.lineTo(w * 0.58, h * 0.35); g.lineTo(w * 0.58, h * 0.6); g.lineTo(w, h); g.fill(); }
    if (v === "door" || v === "loading" || v === "entrance" || v === "stairs") { g.fillStyle = "#2a2a28"; g.fillRect(w * 0.4, h * 0.2, w * 0.2, h * 0.45); }
    const im = g.getImageData(0, 0, w, h), d = im.data; for (let p = 0; p < d.length; p += 4) { const l = (d[p] + d[p + 1] + d[p + 2]) / 3 + (rnd() - 0.5) * 18; d[p] = l * 0.85; d[p + 1] = l; d[p + 2] = l * 0.9; } g.putImageData(im, 0, 0);   // grainy green-grey CCTV
    g.fillStyle = "#f0f0e0"; g.font = "16px monospace"; g.fillText(`CAM ${String(i + 1).padStart(2, "0")}`, 10, 22); g.fillText(stamp, w - 96, h - 12); g.fillStyle = "#ff3030"; g.beginPath(); g.arc(w - 18, 18, 6, 0, 7); g.fill(); });
  SECURITY.camTex = camTex; SECURITY.screens = []; SECURITY.state = [];
  const MW = group(SEC.X, 0, back + 0.02); add(box(2.5, 1.5, 0.08, 0.02), mat({ color: 0x14161a, roughness: 0.5 }), 0, 1.62, 0.04, { parent: MW });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const i = r * 3 + c; add(box(0.78, 0.47, 0.06, 0.015), mat({ color: 0x0c0c0e, roughness: 0.4 }), (c - 1) * 0.81, 2.12 - r * 0.49, 0.1, { parent: MW });
    const sc = add(new THREE.PlaneGeometry(0.72, 0.42), new THREE.MeshBasicMaterial({ map: camTex(i, false, "02:08:14"), toneMapped: false, fog: false }), (c - 1) * 0.81, 2.12 - r * 0.49, 0.135, { parent: MW, cast: false }); SECURITY.screens.push(sc); SECURITY.state.push("live:02:08:14"); }
  // console desk, keyboard, the maintenance terminal (access log), a mug, an empty chair
  const DK = group(SEC.X, 0, back + 0.75); add(box(2.6, 0.06, 0.7, 0.02), mat({ color: 0x2a2c30, roughness: 0.5 }), 0, 0.74, 0, { parent: DK }); add(box(2.6, 0.7, 0.05, 0.01), mat({ color: 0x1e2024 }), 0, 0.37, 0.3, { parent: DK });
  add(box(0.45, 0.02, 0.15, 0.006), mat({ color: 0x18181a }), -0.5, 0.78, 0.05, { parent: DK }); add(box(0.45, 0.02, 0.15, 0.006), mat({ color: 0x18181a }), 0.55, 0.78, 0.05, { parent: DK });
  add(box(0.6, 0.38, 0.04, 0.01), mat({ color: 0x101012 }), 0.65, 1.0, -0.15, { parent: DK, rx: -0.12 });
  const logTex = (hi) => canvasTex(600, 380, (g, w, h) => { g.fillStyle = "#06140c"; g.fillRect(0, 0, w, h); g.font = "20px monospace"; g.fillStyle = "#58f08a"; g.fillText("MAINTENANCE ACCESS LOG", 20, 34); g.fillRect(20, 44, w - 40, 2);
    const rows = [["01:47:02", "routine check", "night.guard2"], ["01:58:40", "door 4 status", "night.guard2"], ["02:08:11", "SYSTEM OVERRIDE", "head.technician"], ["02:08:14", "CAMERAS 01-09 OFFLINE", "head.technician"], ["02:11:30", "door S3 keycard", "director"]];
    rows.forEach(([t, a, u], i) => { const y = 84 + i * 52; const hl = hi === i || (hi === "tech" && (i === 2 || i === 3)) || (hi === "dir" && i === 4); if (hl) { g.fillStyle = "rgba(255,70,60,.25)"; g.fillRect(14, y - 28, w - 28, 40); }
      g.fillStyle = hl ? "#ff8a7a" : "#58f08a"; g.fillText(t, 22, y); g.fillText(a, 140, y); g.fillText(u, 410, y); });
    g.fillStyle = "#58f08a"; g.fillText("_", 22, h - 24); });
  SECURITY.logTex = logTex; SECURITY.log = add(new THREE.PlaneGeometry(0.55, 0.34), new THREE.MeshBasicMaterial({ map: logTex(null), toneMapped: false, fog: false }), 0.65, 1.0, -0.125, { parent: DK, rx: -0.12, cast: false }); SECURITY.logHi = null;
  add(new THREE.CylinderGeometry(0.04, 0.035, 0.1, 14), mat({ color: 0xdedad2 }), -1.0, 0.82, 0.1, { parent: DK });
  const CH = group(SEC.X - 0.3, 0, back + 1.55, 0.3); add(box(0.5, 0.08, 0.5, 0.03), mat({ color: 0x1a1a1c }), 0, 0.48, 0, { parent: CH }); add(box(0.48, 0.6, 0.07, 0.03), mat({ color: 0x1a1a1c }), 0, 0.86, 0.22, { parent: CH }); add(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8), mat({ color: 0x6a6a6a, metalness: 0.7 }), 0, 0.24, 0, { parent: CH });
}
const secGlow = new THREE.PointLight(0x9ab8ff, 6, 5, 1.5); secGlow.position.set(SEC.X, 1.7, -SEC.D / 2 + 0.9); scene.add(secGlow);
const secTop = new THREE.SpotLight(0xd8e2ff, 10, 5, 0.7, 0.7, 1.3); secTop.position.set(SEC.X + 0.6, SEC.H - 0.05, 0.4); secTop.target.position.set(SEC.X, 0.7, -0.6); scene.add(secTop, secTop.target); secTop.castShadow = true; secTop.shadow.mapSize.set(1024, 1024);
const secHemi = new THREE.HemisphereLight(0x8090b0, 0x101014, 0.2); scene.add(secHemi);

