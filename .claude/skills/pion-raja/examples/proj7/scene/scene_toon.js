// proj7 (Las Vegas Sphere): the outdoor world of the Pion kingdom, rendered frame by frame (render_scene.js drives it).
// Units: feet. The Sphere stands at the origin. Toon shading + screen-space ink outlines, like the castle scenes.
// Pion is the engine's own render (transparent PNG per frame) on a billboard that casts a real shadow.
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 1, 40000);

// ------------------------------------------------------------------ materials
const GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 165, 225, 255]), 4, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (color, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: GRAD, ...extra });
const INK = new THREE.Color(0x24140c);
const outlineMat = (px) => new THREE.ShaderMaterial({
  uniforms: { px: { value: px }, res: { value: new THREE.Vector2(W, H) }, col: { value: INK } },
  vertexShader: `uniform float px; uniform vec2 res;
    void main(){ vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec3 n = normalize(normalMatrix * normal); vec2 d = n.xy; float l = length(d); d = l > 1e-4 ? d / l : vec2(0.0);
      c.xy += d * px * 2.0 / res * c.w; gl_Position = c; }`,
  fragmentShader: `uniform vec3 col; void main(){ gl_FragColor = vec4(col, 1.0); }`,
  side: THREE.BackSide,
});
const OUT = { thin: outlineMat(2.0), mid: outlineMat(3.0), thick: outlineMat(4.2) };
function inked(mesh, kind = "mid") { // mesh + its ink hull (smooth normals so corners do not open up)
  const g = mesh.geometry.clone(); g.deleteAttribute("uv"); g.deleteAttribute("normal");
  const m = mergeVertices(g, 1e-3); m.computeVertexNormals();
  const hull = new THREE.Mesh(m, OUT[kind]); hull.renderOrder = -1; mesh.add(hull);
  mesh.castShadow = true; mesh.receiveShadow = true; return mesh;
}
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(12345);

// ------------------------------------------------------------------ sky, sun, lights
const sky = new THREE.Mesh(new THREE.SphereGeometry(30000, 48, 24), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  uniforms: { sun: { value: new THREE.Vector3(-0.45, 0.55, 0.7).normalize() } },
  vertexShader: `varying vec3 vd; void main(){ vd = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `uniform vec3 sun; varying vec3 vd;
    void main(){ float h = clamp(vd.y, 0.0, 1.0);
      vec3 top = vec3(0.16, 0.44, 0.86), mid = vec3(0.42, 0.70, 0.97), hor = vec3(0.86, 0.94, 1.0);
      vec3 c = mix(hor, mid, smoothstep(0.0, 0.18, h)); c = mix(c, top, smoothstep(0.18, 0.75, h));
      float s = max(dot(vd, sun), 0.0); c += vec3(1.0, 0.92, 0.7) * (pow(s, 64.0) * 0.6 + pow(s, 6.0) * 0.12);
      gl_FragColor = vec4(c, 1.0); }`,
}));
scene.add(sky);
const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x6f8f3e, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.9);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(-0.55, 0.78, 0.62).normalize();
function aimSun(center, radius) { // the shadow box follows the shot
  sun.target.position.copy(center); sun.position.copy(center).addScaledVector(SUN_DIR, radius * 3);
  const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius; c.near = radius * 0.5; c.far = radius * 6; c.updateProjectionMatrix();
}

// clouds: toon puffs with ink
const cloudMat = toon(0xffffff, { emissive: 0x9fb6cc, emissiveIntensity: 0.35 });
function cloud(x, y, z, s) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const m = inked(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), cloudMat), "thin");
    m.castShadow = false; const r = (0.6 + rnd() * 0.6) * s; m.scale.set(r * 1.3, r * 0.75, r); m.position.set((i - 2.5) * s * 0.9 + rnd() * s * 0.4, rnd() * s * 0.4, rnd() * s * 0.3); g.add(m); }
  g.position.set(x, y, z); scene.add(g); return g;
}
for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, d = 6000 + rnd() * 9000; cloud(Math.cos(a) * d, 1800 + rnd() * 2400, Math.sin(a) * d, 260 + rnd() * 320); }
cloud(-900, 1500, -2600, 220); cloud(700, 1900, -3400, 300); cloud(-5600, 420, -1500, 120); cloud(-4300, 520, -1900, 140);

// ------------------------------------------------------------------ ground: mowed lawn, plaza, hills, trees, tufts
const grassTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = "#5fa83a"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#66b23f" : "#589f35"; g.fillRect(0, i * h / 8, w, h / 8); }
  for (let i = 0; i < 9000; i++) { const v = rnd(); g.fillStyle = v < .5 ? "rgba(40,90,20,.18)" : "rgba(170,220,110,.16)"; g.fillRect(rnd() * w, rnd() * h, 2, 5); }
}, [40, 40]);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(24000, 24000), toon(0xffffff, { map: grassTex }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const plaza = new THREE.Mesh(new THREE.CircleGeometry(330, 96), toon(0xd9cfbf));
plaza.rotation.x = -Math.PI / 2; plaza.position.y = 0.3; plaza.receiveShadow = true; scene.add(plaza);
const plazaRing = new THREE.Mesh(new THREE.RingGeometry(326, 336, 96), new THREE.MeshBasicMaterial({ color: INK }));
plazaRing.rotation.x = -Math.PI / 2; plazaRing.position.y = 0.45; scene.add(plazaRing);
for (let i = 0; i < 14; i++) { // far hills
  const a = -Math.PI * 0.95 + i / 13 * Math.PI * 0.9 + rnd() * 0.1, d = 9000 + rnd() * 3000, r = 1400 + rnd() * 1600;
  const m = inked(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), toon(i % 2 ? 0x4f9a3a : 0x5aa844)), "thin");
  m.scale.set(r * 1.8, r * 0.55, r); m.position.set(Math.cos(a) * d, -r * 0.18, Math.sin(a) * d); m.castShadow = false; scene.add(m);
}
const trunkMat = toon(0x7a4a26), leafMats = [toon(0x3f8f2e), toon(0x4c9d34), toon(0x367f28)];
function tree(x, z, s) {
  const g = new THREE.Group();
  const tr = inked(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 4, 10), trunkMat), "thin"); tr.position.y = 2; g.add(tr);
  for (let i = 0; i < 4; i++) { const b = inked(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), leafMats[i % 3]), "mid");
    const r = 1.7 + rnd() * 0.9; b.scale.setScalar(r); b.position.set((rnd() - .5) * 2.2, 4.6 + rnd() * 2.2 + i * 0.5, (rnd() - .5) * 2.2); g.add(b); }
  g.scale.setScalar(s); g.position.set(x, 0, z); scene.add(g); return g;
}
// grass tufts (instanced) around the spots the camera gets close to
const tuftGeo = (() => { const parts = []; for (let i = 0; i < 3; i++) { const c = new THREE.ConeGeometry(0.07, 0.42 + i * 0.08, 3); c.translate(0, 0.21 + i * 0.04, 0); c.rotateZ((i - 1) * 0.35); c.translate((i - 1) * 0.06, 0, 0); parts.push(c); }
  const g = new THREE.BufferGeometry(); const pos = [], nrm = []; for (const c of parts) { const n = c.toNonIndexed(); pos.push(...n.attributes.position.array); nrm.push(...n.attributes.normal.array); }
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); return g; })();
function tufts(cx, cz, rad, n) {
  const im = new THREE.InstancedMesh(tuftGeo, toon(0x4f9a32), n), d = new THREE.Object3D();
  for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * rad; d.position.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r);
    d.rotation.set((rnd() - .5) * .5, rnd() * 3, (rnd() - .5) * .5); d.scale.setScalar(0.6 + rnd() * 1.2); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    im.setColorAt(i, new THREE.Color().setHSL(0.27 + rnd() * 0.03, 0.5, 0.36 + rnd() * 0.1)); }
  im.receiveShadow = true; scene.add(im);
}

// ------------------------------------------------------------------ the Sphere: yellow LED skin with a big emoji, flattens into a 480 x 333 ft sheet
const SR = 258, SC = 108, THETA_MAX = Math.acos(-SC / SR);           // 516 ft wide, 366 ft tall
const sphereTex = canvasTex(4096, 2048, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ffe55c"); gr.addColorStop(1, "#ffb81f");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = "rgba(150,90,0,.22)"; for (let y = 6; y < h; y += 14) for (let x = (y / 14 % 2) * 7; x < w; x += 14) g.fillRect(x, y, 4, 4); // LED pucks
  // emoji face centred on u = 0.5 (faces local +x; the mesh is turned toward the camera)
  const cx = w * 0.5, cy = h * 0.5, s = h * 0.36;
  g.fillStyle = "#3a1d0b";
  for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * s * 0.42, cy - s * 0.25, s * 0.11, s * 0.2, 0, 0, 7); g.fill(); }
  g.lineWidth = s * 0.09; g.strokeStyle = "#3a1d0b"; g.lineCap = "round";
  g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.55, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  g.fillStyle = "rgba(255,120,60,.35)"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * s * 0.72, cy + s * 0.18, s * 0.16, s * 0.1, 0, 0, 7); g.fill(); }
});
const sphereGeo = new THREE.SphereGeometry(SR, 192, 128, 0, Math.PI * 2, 0, THETA_MAX);
sphereGeo.translate(0, SC, 0);
const sphereMat = toon(0xffffff, { map: sphereTex, emissive: 0xffc21a, emissiveMap: sphereTex, emissiveIntensity: 0.55 });
const sphere = inked(new THREE.Mesh(sphereGeo, sphereMat), "thick");
sphere.rotation.y = -1.86;                                            // emoji (local +x) toward the cameras (front-left)
scene.add(sphere);
const hullGeo = sphere.children[0].geometry;
const P0 = sphereGeo.attributes.position.array.slice(), P1 = new Float32Array(P0.length);
const H0 = hullGeo.attributes.position.array.slice(), H1 = new Float32Array(H0.length);
const SHEET = { w: 480, d: 333 };                                     // 159,840 sq ft
function flatTarget(src, dst, uvs) { // world-space unwrap: u -> x (front in the middle), theta -> z (top at the far edge)
  const inv = new THREE.Matrix4().makeRotationY(-sphere.rotation.y), v = new THREE.Vector3();
  for (let i = 0; i < src.length / 3; i++) {
    let u, th;
    if (uvs) { u = uvs[i * 2]; th = (1 - uvs[i * 2 + 1]) * THETA_MAX; }
    else { const x = src[i * 3], y = src[i * 3 + 1] - SC, z = src[i * 3 + 2]; th = Math.acos(Math.max(-1, Math.min(1, y / Math.hypot(x, y, z)))); u = (Math.atan2(z, -x) / (Math.PI * 2) + 1) % 1; }
    v.set((u - 0.5) * SHEET.w, 1.2, -SHEET.d / 2 + th / THETA_MAX * SHEET.d).applyMatrix4(inv);
    dst[i * 3] = v.x; dst[i * 3 + 1] = v.y; dst[i * 3 + 2] = v.z;
  }
}
flatTarget(P0, P1, sphereGeo.attributes.uv.array);
flatTarget(H0, H1, null);
let morphNow = -1;
function setMorph(e) {
  if (Math.abs(e - morphNow) < 1e-4) return; morphNow = e;
  const k = e * e * (3 - 2 * e), sq = Math.pow(1 - k, 1.6);
  for (const [geo, A, B] of [[sphereGeo, P0, P1], [hullGeo, H0, H1]]) {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) { p[i] = A[i] + (B[i] - A[i]) * k; p[i + 2] = A[i + 2] + (B[i + 2] - A[i + 2]) * k;
      p[i + 1] = Math.max(1.0, B[i + 1] + (A[i + 1] - B[i + 1]) * sq); }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  }
}

// ------------------------------------------------------------------ football fields (160 x 360 ft), dropped one by one onto the sheet
const fieldTex = canvasTex(640, 1440, (g, w, h) => {
  const ez = h * 30 / 360;
  for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? "#3f9a3a" : "#348a31"; g.fillRect(0, ez + i * (h - 2 * ez) / 10, w, (h - 2 * ez) / 10 + 1); }
  g.fillStyle = "#c8322e"; g.fillRect(0, 0, w, ez); g.fillStyle = "#e8b12a"; g.fillRect(0, h - ez, w, ez);
  g.fillStyle = "#fff"; g.font = "900 70px Arial Black, Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("PION", w / 2, ez / 2 + 4); g.save(); g.translate(w / 2, h - ez / 2 + 4); g.rotate(Math.PI); g.fillText("RAJA", 0, 0); g.restore();
  g.strokeStyle = "#fff"; g.lineWidth = 8;
  for (let i = 0; i <= 20; i++) { const y = ez + i * (h - 2 * ez) / 20; g.lineWidth = i % 2 ? 4 : 8; g.beginPath(); g.moveTo(14, y); g.lineTo(w - 14, y); g.stroke(); }
  g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20);
  g.beginPath(); g.arc(w / 2, h / 2, 70, 0, 7); g.lineWidth = 8; g.stroke();
  g.fillStyle = "#ffd34a"; g.beginPath(); const cx = w / 2, cy = h / 2; g.moveTo(cx - 45, cy + 25); g.lineTo(cx - 45, cy - 15); g.lineTo(cx - 22, cy + 5); g.lineTo(cx, cy - 30); g.lineTo(cx + 22, cy + 5); g.lineTo(cx + 45, cy - 15); g.lineTo(cx + 45, cy + 25); g.closePath(); g.fill();
});
const fieldMats = [toon(0x2f6d27), toon(0x2f6d27), toon(0xffffff, { map: fieldTex }), toon(0x2f6d27), toon(0x2f6d27), toon(0x2f6d27)];
const FIELD_X = [-160, 0, 160];
const fields = FIELD_X.map(() => { const m = inked(new THREE.Mesh(new THREE.BoxGeometry(160, 5, 360), fieldMats), "mid"); m.visible = false; scene.add(m); return m; });
// dust puffs for the slams
const puffGeo = new THREE.IcosahedronGeometry(1, 2), puffMat = toon(0xf4efe4);
const PUFFS = 46;
const puffs = FIELD_X.map(() => { const im = new THREE.InstancedMesh(puffGeo, puffMat, PUFFS); im.visible = false; scene.add(im); return im; });
const puffSeeds = Array.from({ length: PUFFS }, () => [rnd(), rnd(), rnd()]);

// ------------------------------------------------------------------ the Pion kingdom castle (The Notebook shot), far west
const NB = new THREE.Vector3(-5000, 0, 0);
const stone = toon(0xe9dfcc), stoneDk = toon(0xcfc2aa), roofMat = toon(0xc23a2e), goldMat = toon(0xf0bf3a), winMat = toon(0x2a2236), doorMat = toon(0x6b3d22);
function box(w, h, d, mat, x, y, z, ink = "mid", parent = scene) { const m = inked(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), ink); m.position.set(x, y, z); parent.add(m); return m; }
function crenels(parent, w, d, y, mat) {
  const n = Math.round(w / 7);
  for (let i = 0; i < n; i++) { const x = -w / 2 + (i + .5) * w / n; if (i % 2 === 0) { box(w / n, 4, 3, mat, x, y, d / 2 - 1.5, "thin", parent); box(w / n, 4, 3, mat, x, y, -d / 2 + 1.5, "thin", parent); } }
}
function towerAt(parent, x, z, r, h) {
  const t = inked(new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, h, 32), stone), "mid"); t.position.set(x, h / 2, z); parent.add(t);
  const roof = inked(new THREE.Mesh(new THREE.ConeGeometry(r * 1.32, r * 2.6, 32), roofMat), "mid"); roof.position.set(x, h + r * 1.3, z); parent.add(roof);
  const ball = inked(new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 14, 10), goldMat), "thin"); ball.position.set(x, h + r * 2.65, z); parent.add(ball);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), toon(0x3a2a1a)); pole.position.set(x, h + r * 2.6 + 6, z); parent.add(pole);
  const flag = inked(new THREE.Mesh(new THREE.PlaneGeometry(9, 5.5, 6, 2), toon(0xd8a21e, { side: THREE.DoubleSide })), "thin"); flag.position.set(x + 4.6, h + r * 2.6 + 9.5, z); parent.add(flag);
  for (let i = 0; i < 3; i++) { const wy = h * (0.35 + i * 0.2); const w2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5), winMat); const a = 0.55; w2.position.set(x + Math.sin(a) * (r + 0.05), wy, z + Math.cos(a) * (r + 0.05)); w2.rotation.y = a; parent.add(w2); }
}
const castle = new THREE.Group(); castle.position.set(NB.x + 22, 0, NB.z - 195); scene.add(castle);
{
  const keepW = 120, keepH = 46, keepD = 50;
  box(keepW, keepH, keepD, stone, 0, keepH / 2, 0, "mid", castle);
  box(keepW + 4, 3, keepD + 4, stoneDk, 0, keepH + 1.5, 0, "thin", castle);
  crenels(castle, keepW, keepD, keepH + 5, stone);
  // central gatehouse, taller, with the big door and a balcony (the columns of the house, kingdom style)
  box(44, 66, 54, stone, 0, 33, 4, "mid", castle);
  crenels(castle, 44, 54, 68, stone);
  const roofG = inked(new THREE.Mesh(new THREE.ConeGeometry(30, 30, 4), roofMat), "mid"); roofG.rotation.y = Math.PI / 4; roofG.position.set(0, 85, 4); castle.add(roofG);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), doorMat); door.position.set(0, 11, 31.1); castle.add(door);
  const arch = inked(new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 1.5, 24, 1, false, -Math.PI / 2, Math.PI), doorMat), "thin"); arch.rotation.x = Math.PI / 2; arch.position.set(0, 22, 31.3); castle.add(arch);
  for (const sx of [-1, 1]) { const col = inked(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 28, 16), toon(0xf6f1e6)), "thin"); col.position.set(sx * 14, 14, 33); castle.add(col); }
  box(36, 2.5, 8, toon(0xf6f1e6), 0, 29, 33, "thin", castle);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) { if (Math.abs(i - 2.5) < 1) continue; const wnd = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), winMat);
    wnd.position.set(-50 + i * 20, 14 + row * 18, keepD / 2 + 0.1); castle.add(wnd); const sill = box(8, 1.2, 1.5, toon(0xf6f1e6), -50 + i * 20, 8.6 + row * 18, keepD / 2 + 0.6, "thin", castle); }
  for (const sx of [-1, 1]) towerAt(castle, sx * 66, 22, 12, 70);
  for (const sx of [-1, 1]) towerAt(castle, sx * 22, 34, 7, 80);
  // chimneys of the house -> two small turrets on the back roof
  for (const sx of [-1, 1]) { const ch = box(8, 14, 8, toon(0xb5543a), sx * 40, keepH + 7, -12, "thin", castle); }
  // steps and a low hedge along the front
  box(30, 1.6, 8, stoneDk, 0, 0.8, 36, "thin", castle);
  for (const sx of [-1, 1]) box(42, 4, 4, toon(0x3d8a30), sx * 45, 2, 34, "thin", castle);
}
tree(NB.x - 34, NB.z - 70, 2.6); tree(NB.x - 52, NB.z - 30, 3.3); tree(NB.x - 22, NB.z - 120, 2.4); tree(NB.x - 70, NB.z - 110, 3.0); tree(NB.x + 120, NB.z - 210, 2.8); tree(NB.x - 90, NB.z + 10, 3.6);
tufts(NB.x, NB.z, 60, 6000);
// a road and lights far behind the Sphere, a few trees around the plaza
for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, d = 420 + rnd() * 500; tree(Math.cos(a) * d, Math.sin(a) * d - 200, 5 + rnd() * 4); }
tufts(-330, 300, 50, 6000);

// ------------------------------------------------------------------ Pion billboard
const pionGeo = new THREE.PlaneGeometry(1, 1);
const pionMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: true, toneMapped: false });
const pion = new THREE.Mesh(pionGeo, pionMat);
pion.castShadow = true;
pion.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
scene.add(pion);
let PION = null;   // {base:[x,y] px, ppu, w, h} from the engine track (frame 0)
const texLoader = new THREE.TextureLoader();
let curTex = null;
async function pionFrame(url) {
  const t = await texLoader.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true;
  if (curTex) curTex.dispose(); curTex = t; pionMat.map = t; pion.customDepthMaterial.map = t; pionMat.needsUpdate = true; pion.customDepthMaterial.needsUpdate = true;
}
function placePion(anchor, height, mode) { // mode 'y': upright billboard (turns about Y), 'full': faces the camera fully
  const k = height / (4.65 * PION.ppu), pw = PION.w * k, ph = PION.h * k;
  pion.scale.set(pw, ph, 1);
  const off = new THREE.Vector3((PION.w / 2 - PION.base[0]) * k, (PION.base[1] - PION.h / 2) * k, 0);
  if (mode === "full") { pion.quaternion.copy(camera.quaternion); }
  else { const d = new THREE.Vector3().subVectors(camera.position, anchor); pion.rotation.set(0, Math.atan2(d.x, d.z), 0); }
  off.applyQuaternion(pion.quaternion);
  pion.position.copy(anchor).add(off);
}

// ------------------------------------------------------------------ timelines
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const clamp01 = u => Math.max(0, Math.min(1, u));
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function keyed(keys, t) { // keys [{t, ...vectors/numbers}] eased between neighbours, held outside
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const u = ease((t - a.t) / Math.max(1e-6, b.t - a.t)), o = {};
      for (const k in a) o[k] = a[k] && a[k].isVector3 ? a[k].clone().lerp(b[k], u) : typeof a[k] === "number" ? a[k] + (b[k] - a[k]) * u : a[k];
      return o; } }
  return keys[keys.length - 1];
}
const PA = V(-330, 0, 300);          // where Pion stands beside the Sphere
const PNB = V(NB.x - 13, 0, NB.z);   // The Notebook spot
const SHOTS = {
  w1: {
    cam: [
      { t: 0.00, pos: V(-330, 4.3, 312.5), tgt: V(-326.5, 5.9, 272.6), fov: 44 },
      { t: 0.76, pos: V(-330, 4.35, 312.0), tgt: V(-326.5, 6.0, 272.1), fov: 44 },
      { t: 1.55, pos: V(-430, 150, 1450), tgt: V(-60, 165, 0), fov: 46 },
      { t: 2.30, pos: V(-300, 200, 1640), tgt: V(-92, 186, 0), fov: 46 },
      { t: 5.80, pos: V(-296, 198, 1590), tgt: V(-92, 186, 0), fov: 46 },
    ],
    nbcam: [{ t: 5.80, pos: V(PNB.x + 0.7, 4.2, 14.5), tgt: V(PNB.x + 0.9, 6.4, -26), fov: 44 }, { t: 7.90, pos: V(PNB.x + 0.65, 4.2, 13.2), tgt: V(PNB.x + 0.85, 6.3, -26), fov: 44 }],
    pion: [{ t: 0, h: 7 }, { t: 1.55, h: 7 }, { t: 2.05, h: 290 }, { t: 7.9, h: 290 }],
    cut: 5.80,
  },
  w2: {
    cam: [
      { t: 0.00, pos: V(-296, 198, 1590), tgt: V(-92, 186, 0), fov: 46 },
      { t: 2.50, pos: V(-290, 196, 1550), tgt: V(-92, 184, 0), fov: 46 },
      { t: 4.10, pos: V(-60, 980, 760), tgt: V(-10, 0, 10), fov: 46 },
      { t: 4.90, pos: V(-30, 950, 720), tgt: V(0, 0, 0), fov: 46 },
      { t: 6.80, pos: V(0, 930, 700), tgt: V(0, 0, -10), fov: 46 },
      { t: 7.97, pos: V(0, 960, 860), tgt: V(0, 150, -130), fov: 46 },
    ],
    pion: [{ t: 0, h: 290, a: PA.clone() }, { t: 2.5, h: 290, a: PA.clone() }, { t: 4.1, h: 150, a: V(-175, 0, 470) }, { t: 6.8, h: 150, a: V(-175, 0, 470) }, { t: 7.5, h: 400, a: V(0, 170, -210) }],
    morph: [2.55, 4.05],
    drops: [5.05, 5.60, 6.15],
  },
};
function shake(t, hits) { // decaying quake after each slam
  let x = 0, y = 0;
  for (const h of hits) { const e = t - h; if (e < 0 || e > 0.55) continue; const a = Math.exp(-e * 7.5) * 1;
    x += a * (Math.sin(e * 91) * 0.6 + Math.sin(e * 57 + 1) * 0.4); y += a * (Math.sin(e * 73 + 2) * 0.6 + Math.sin(e * 131) * 0.4); }
  return [x, y];
}
const project = v => { const p = v.clone().project(camera); return [+((p.x + 1) / 2).toFixed(4), +((1 - p.y) / 2).toFixed(4), +p.z.toFixed(4)]; };

window.setup = (pionInfo) => { PION = pionInfo; return true; };
window.renderFrame = async (which, f, fps, pionUrl) => {
  const t = f / fps, S = SHOTS[which], pts = {}, WP = {};
  await pionFrame(pionUrl);
  let anchor = PA.clone(), height = 7, mode = "y";
  setMorph(0); fields.forEach(m => (m.visible = false)); puffs.forEach(p => (p.visible = false));
  if (which === "w1") {
    const nb = t >= S.cut, C = keyed(nb ? S.nbcam : S.cam, t);
    camera.position.copy(C.pos); camera.lookAt(C.tgt); camera.fov = C.fov;
    height = keyed(S.pion, t).h;
    if (nb) { anchor = PNB.clone(); height = 7.2; aimSun(V(NB.x, 0, NB.z - 80), 260); }
    else {
      const g = clamp01((t - 1.55) / 0.5);                                // grow with a little overshoot ("boing")
      if (t > 1.55) height = 7 + (290 - 7) * (g < 1 ? 1 - Math.pow(1 - g, 3) * Math.cos(g * 7.5) : 1);
      aimSun(t < 1.0 ? V(-330, 0, 300) : V(-150, 0, 100), t < 1.0 ? 120 : 900);
    }
    Object.assign(WP, { top: V(0, 366, 0), base: V(0, 0, 0), left: V(-SR, SC, 0), right: V(SR, SC, 0), gl: V(-SR, 0, 60), gr: V(SR, 0, 60) }); pts.nb = nb ? 1 : 0;
  } else {
    const C = keyed(S.cam, t); camera.position.copy(C.pos); camera.lookAt(C.tgt); camera.fov = C.fov;
    const Pk = keyed(S.pion, t); anchor = Pk.a; height = Pk.h; mode = t > 4.1 ? "full" : "y";
    setMorph(clamp01((t - S.morph[0]) / (S.morph[1] - S.morph[0])));
    S.drops.forEach((t0, i) => {
      const e = t - t0, m = fields[i]; if (e < -0.35) return; m.visible = true; m.castShadow = e > -0.04;
      const u = clamp01((e + 0.35) / 0.35);                           // falls from high in the middle to its place, lands at t0
      const start = V(0, 520, -40), end = V(FIELD_X[i], 2.6, 0);
      m.position.lerpVectors(start, end, u); m.position.y = start.y + (end.y - start.y) * u * u;
      const sc = 0.35 + 0.65 * u; m.scale.set(sc, sc, sc); m.rotation.set(0, (1 - u) * 0.6 * (i - 1 || 1), (1 - u) * 0.15);
      if (e > 0) { const b = Math.exp(-e * 9) * Math.sin(e * 30) * 0.06; m.scale.set(1 + b, 1 - b * 2, 1 + b); m.rotation.set(0, 0, 0); m.position.set(end.x, end.y, end.z); }
      if (e > 0 && e < 0.9) { const P = puffs[i], d = new THREE.Object3D(); P.visible = true;
        for (let k = 0; k < PUFFS; k++) { const [a, b, c] = puffSeeds[k], ang = a * Math.PI * 2, side = k % 2 ? 1 : -1;
          const px = end.x + (k < PUFFS / 2 ? side * 80 : (b - .5) * 160), pz = end.z + (k < PUFFS / 2 ? (b - .5) * 360 : side * 180);
          const out = 1 - Math.exp(-e * 5), r = (6 + c * 10) * Math.sin(Math.min(1, e / 0.9) * Math.PI) * 1.4;
          d.position.set(px + Math.cos(ang) * out * 26, 3 + out * (8 + c * 18), pz + Math.sin(ang) * out * 26); d.scale.setScalar(Math.max(0.01, r)); d.updateMatrix(); P.setMatrixAt(k, d.matrix); }
        P.instanceMatrix.needsUpdate = true; }
      WP["field" + (i + 1)] = V(FIELD_X[i], 6, 0);
    });
    aimSun(V(-80, 0, 80), 900);
    WP.sheet = V(0, 2, 0);
    const [sx, sy] = shake(t, S.drops); camera.position.x += sx * 7; camera.position.y += sy * 7; camera.lookAt(keyed(S.cam, t).tgt);
  }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  placePion(anchor, height, mode);
  for (const k in WP) pts[k] = project(WP[k]);
  pts.head = project(pion.localToWorld(V(0, 0.25, 0)));
  renderer.render(scene, camera);
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};
window.__ready = true;
