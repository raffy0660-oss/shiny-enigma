// proj7 (Las Vegas Sphere), HD stylized city: cartoon shapes and colours, real 3D light (sky, sun shadows, HDRI, fog, bloom). Rendered frame by frame by render_scene.js.
// Units: feet. The Sphere stands at the origin in a paved plaza, surrounded by roads, casino hotels, glass towers and
// landmarks (glass pyramid, iron lattice tower, observation needle, giant observation wheel), palm trees and traffic.
// PBR materials, physical sky, city HDRI for light and reflections (CC0, @pmndrs/assets), ACES tone mapping, bloom on
// the LED skin. Pion is the engine's own render (transparent PNG per frame) on a billboard that casts a real shadow.
import * as THREE from "three";
import { Sky } from "three/addons/objects/Sky.js";
import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import cityHdr from "@pmndrs/assets/hdri/city.exr.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H);
renderer.toneMapping = THREE.AgXToneMapping;          // like the castle renders (AgX, punchy grade below)
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, W / H, 1, 60000);
scene.fog = new THREE.FogExp2(0xd9c3a4, 0.000032);

// The castle look, imitated in real time: ambient occlusion (bounce-light darkening in creases), Freestyle-like ink
// lines from depth + normal edges, AgX with a punchy grade, soft bloom on emissive LEDs, a light vignette.
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H);
gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 1.0;
gtao.updateGtaoMaterial({ radius: 9, distanceExponent: 1.6, thickness: 4, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
composer.addPass(gtao);
const inkPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2(W, H) },
    near: { value: 1 }, far: { value: 60000 }, ink: { value: new THREE.Color(0x1a120d) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tNormal, tDepth; uniform vec2 res; uniform float near, far; uniform vec3 ink; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv); float r0 = texture2D(tDepth, vUv).x;
      if (r0 > 0.99995) { gl_FragColor = c; return; }
      float d0 = lin(r0); vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0; float dm = 0.0, nm = 0.0;
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982; vec2 o = vec2(cos(a), sin(a)) * 1.8 / res;
        float r = texture2D(tDepth, vUv + o).x; float d = r > 0.99995 ? far : lin(r);
        dm = max(dm, (d - d0) / d0); vec3 n = texture2D(tNormal, vUv + o).xyz * 2.0 - 1.0; nm = max(nm, 1.0 - dot(n0, n)); }
      float e = max(smoothstep(0.035, 0.09, dm), smoothstep(0.22, 0.45, nm));
      float fade = 1.0 - smoothstep(3000.0, 14000.0, d0);
      gl_FragColor = vec4(mix(c.rgb, ink * c.rgb * 0.35 + ink * 0.65, e * 0.9 * fade), c.a); }`,
});
composer.addPass(inkPass);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.16, 0.3, 1.8));
composer.addPass(new OutputPass());
composer.addPass(new ShaderPass({   // punchy grade + vignette (display space, after AgX)
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.16); c = (c - 0.5) * 1.07 + 0.5;
      vec2 q = vUv - 0.5; c *= 1.0 - 0.32 * smoothstep(0.35, 0.85, length(q * vec2(1.0, 0.75)));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
}));

const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(24680);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ sky, sun, environment
const SUN_DIR = V(-0.78, 0.43, 0.46).normalize();   // golden hour from the left: long shadows, warm key, cool fill
const sky = new Sky(); sky.scale.setScalar(50000); scene.add(sky);
sky.material.uniforms.turbidity.value = 2.4; sky.material.uniforms.rayleigh.value = 1.9;
sky.material.uniforms.mieCoefficient.value = 0.004; sky.material.uniforms.mieDirectionalG.value = 0.82;
sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
const sun = new THREE.DirectionalLight(0xffcf98, 3.3);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.8;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x5a4636, 0.32));
function aimSun(center, radius) {
  sun.target.position.copy(center); sun.position.copy(center).addScaledVector(SUN_DIR, radius * 3);
  const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius; c.near = radius * 0.3; c.far = radius * 7; c.updateProjectionMatrix();
}
const envReady = (async () => {
  const hdr = await new EXRLoader().loadAsync(cityHdr);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; scene.environmentIntensity = 0.45;
})();

// ------------------------------------------------------------------ procedural PBR textures
function canvasTex(w, h, draw, repeat, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
}
const speckle = (g, w, h, n, cols, sz = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(rnd() * w, rnd() * h, sz * (0.5 + rnd()), sz * (0.5 + rnd())); } };
const asphaltTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#3b3c3f"; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 60000, ["#2c2d30", "#45464a", "#505156", "#36373a", "#5a5a5e"], 2);
  for (let i = 0; i < 40; i++) { g.strokeStyle = "rgba(20,20,22,.45)"; g.lineWidth = 1 + rnd() * 2; g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - .5) * 60; y += (rnd() - .5) * 60; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 25; i++) { const cx = rnd() * w, cy = rnd() * h, r = 30 + rnd() * 120; const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r); gr.addColorStop(0, "rgba(25,25,28,.25)"); gr.addColorStop(1, "rgba(25,25,28,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }, [1, 1]);
const paverTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#8a6f5a"; g.fillRect(0, 0, w, h);
  const s = 64; for (let y = 0; y < h; y += s) for (let x = -s; x < w; x += s * 2) { const off = (y / s) % 2 ? s : 0, v = 118 + rnd() * 34;
    g.fillStyle = ((x / s + y / s) | 0) % 3 ? `rgb(${v + 40},${v + 22},${v})` : `rgb(${v + 70},${v + 60},${v + 44})`; g.fillRect(x + off + 2, y + 2, s * 2 - 4, s - 4); }
  speckle(g, w, h, 20000, ["rgba(90,80,70,.25)", "rgba(240,230,215,.25)"], 2); }, [1, 1]);
const concreteTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#8d8b86"; g.fillRect(0, 0, w, h); speckle(g, w, h, 16000, ["#9b9994", "#b6b4ae", "#8f8d88"], 2);
  g.strokeStyle = "rgba(70,70,70,.5)"; g.lineWidth = 3; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.stroke(); g.beginPath(); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); } }, [1, 1]);
const grassTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#4f7a2e"; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 90000, ["#46702a", "#5a8a34", "#3f6626", "#66943b", "#557f30"], 2); }, [1, 1]);
function facadeTex(wall, glassy) { // cartoon facade tile: 3 bays x 3 floors, big rounded windows, white frames, the odd awning
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = wall; g.fillRect(0, 0, w, h);
    speckle(g, w, h, 2500, ["rgba(255,255,255,.06)", "rgba(0,0,0,.05)"], 3);
    const bw = w / 3, fh = h / 3;
    g.fillStyle = "rgba(0,0,0,.10)"; for (let r = 0; r < 3; r++) g.fillRect(0, r * fh + fh - 10, w, 10);            // floor band shadow
    g.fillStyle = "rgba(255,255,255,.35)"; for (let r = 0; r < 3; r++) g.fillRect(0, r * fh, w, 6);                 // floor band light
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) {
      const x = k * bw + (glassy ? 10 : 30), y = r * fh + (glassy ? 14 : 30), ww = bw - (glassy ? 20 : 60), hh = fh - (glassy ? 30 : 64), rr = glassy ? 14 : 26;
      const rect = () => { g.beginPath(); g.moveTo(x + rr, y); g.arcTo(x + ww, y, x + ww, y + hh, rr); g.arcTo(x + ww, y + hh, x, y + hh, rr); g.arcTo(x, y + hh, x, y, rr); g.arcTo(x, y, x + ww, y, rr); g.closePath(); };
      rect(); g.fillStyle = "#fbfaf4"; g.lineWidth = glassy ? 10 : 16; g.strokeStyle = "#fbfaf4"; g.stroke();
      const lit = rnd() < 0.15, gr = g.createLinearGradient(x, y, x + ww, y + hh);
      gr.addColorStop(0, lit ? "#ffe9a8" : "#9fdcf5"); gr.addColorStop(1, lit ? "#f5c45c" : "#3f86c4"); g.fillStyle = gr; rect(); g.fill();
      g.save(); rect(); g.clip(); g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(x + ww * .15, y); g.lineTo(x + ww * .35, y); g.lineTo(x, y + hh * .5); g.lineTo(x, y + hh * .3); g.closePath(); g.fill(); g.restore();
      if (!glassy && rnd() < 0.18) { g.fillStyle = ["#e4572e", "#2e86ab", "#f2c14e"][(rnd() * 3) | 0]; g.beginPath(); g.moveTo(x - 8, y - 6); g.lineTo(x + ww + 8, y - 6); g.lineTo(x + ww + 2, y + 16); g.lineTo(x - 2, y + 16); g.closePath(); g.fill(); }
    } });
}
const roofTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#77746e"; g.fillRect(0, 0, w, h); speckle(g, w, h, 6000, ["#6b6862", "#84817b"], 2);
  g.fillStyle = "#8d8a84"; for (let i = 0; i < 5; i++) g.fillRect(rnd() * w * .7, rnd() * h * .7, 30 + rnd() * 40, 20 + rnd() * 30); });
const WALLS = { cream: "#f4e2c0", coral: "#ef8a6f", teal: "#5bbfb5", sunny: "#f6c94c", lavender: "#b9a1e3", mint: "#a2dbb0", peach: "#f7b98b", sky: "#86c9ef" };
const MATS = {};
for (const [k, c] of Object.entries(WALLS)) { const ft = facadeTex(c, k === "sky"); MATS[k] = new THREE.MeshStandardMaterial({ map: ft, bumpMap: ft, bumpScale: -3, roughness: k === "sky" ? 0.25 : 0.62, metalness: k === "sky" ? 0.15 : 0.0, envMapIntensity: k === "sky" ? 1.1 : 0.55 }); }
MATS.roof = new THREE.MeshStandardMaterial({ map: roofTex, color: 0xd9d2c6, roughness: 0.85 });
MATS.concrete = new THREE.MeshStandardMaterial({ map: concreteTex, color: 0xf0e8dc, roughness: 0.8 });
const ROOFCOLS = [0xe4572e, 0x2e86ab, 0xf2c14e, 0x7b5ea7, 0x3fa34d, 0xf08a4b].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }));

// ------------------------------------------------------------------ ground: asphalt city grid, plaza, lawns
asphaltTex.repeat.set(160, 160);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), new THREE.MeshStandardMaterial({ map: asphaltTex, roughness: 0.92 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
function flat(w, d, mat, x, z, y = 0.25, rot = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; }
const rep = (tex, x, y) => { const t = tex.clone(); t.repeat.set(x, y); t.needsUpdate = true; return t; };
flat(1100, 1100, new THREE.MeshStandardMaterial({ map: rep(paverTex, 18, 18), roughness: 0.8 }), 0, 0, 0.4);
const walkMat = new THREE.MeshStandardMaterial({ map: rep(concreteTex, 60, 3), roughness: 0.85 });
const lawnMat = new THREE.MeshStandardMaterial({ map: rep(grassTex, 12, 12), roughness: 0.95 });
const markW = new THREE.MeshBasicMaterial({ color: 0xbdbbb4 }), markY = new THREE.MeshBasicMaterial({ color: 0xb08f33 });
function road(x0, z0, x1, z1, lanes = 3) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, wid = lanes * 2 * 12;
  for (const sd of [-1, 1]) { const o = sd * (wid / 2 + 9); flat(len, 16, walkMat, cx + Math.cos(ang) * o, cz - Math.sin(ang) * o, 0.5, ang + Math.PI / 2); }
  flat(len, 1.2, markY, cx + Math.cos(ang) * 0.9, cz - Math.sin(ang) * 0.9, 0.3, ang + Math.PI / 2); flat(len, 1.2, markY, cx - Math.cos(ang) * 0.9, cz + Math.sin(ang) * 0.9, 0.3, ang + Math.PI / 2);
  for (let l = 1; l < lanes; l++) for (const sd of [-1, 1]) for (let s = -Math.min(len, 6000) / 2; s < Math.min(len, 6000) / 2; s += 40) {
    const px = cx + Math.sin(ang) * s + Math.cos(ang) * sd * l * 12, pz = cz + Math.cos(ang) * s - Math.sin(ang) * sd * l * 12; flat(12, 0.9, markW, px, pz, 0.3, ang + Math.PI / 2); }
}
road(-9000, 640, 9000, 640, 4); road(-9000, -640, 9000, -640, 3); road(640, -9000, 640, 9000, 4); road(-640, -9000, -640, 9000, 3);
road(-9000, 2400, 9000, 2400, 3); road(-9000, -2400, 9000, -2400, 3); road(2400, -9000, 2400, 9000, 3); road(-2400, -9000, -2400, 9000, 3);
flat(1000, 300, lawnMat, -1100, 1100, 0.35); flat(900, 900, lawnMat, 1450, 1450, 0.35);

// ------------------------------------------------------------------ palm trees (instanced trunks + fronds)
const frondTex = canvasTex(256, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#3e5e1e"; g.lineWidth = 6; g.beginPath(); g.moveTo(w / 2, h); g.lineTo(w / 2, 0); g.stroke();
  for (let i = 0; i < 46; i++) { const y = h - i * h / 46, L = Math.sin((i / 46) * Math.PI) * w * 0.48 + 6; for (const sd of [-1, 1]) {
    g.strokeStyle = ["#4d7a26", "#5b8a2c", "#3f6a20"][(rnd() * 3) | 0]; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, y); g.quadraticCurveTo(w / 2 + sd * L * .6, y - 6, w / 2 + sd * L, y + 18); g.stroke(); } } }, null);
frondTex.wrapS = frondTex.wrapT = THREE.ClampToEdgeWrapping;
const barkTex = canvasTex(128, 512, (g, w, h) => { g.fillStyle = "#7d6a52"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 12) { g.fillStyle = `rgba(60,48,35,${.35 + rnd() * .3})`; g.fillRect(0, y, w, 4); } speckle(g, w, h, 3000, ["#6a5844", "#8d7a60"], 2); }, [2, 6]);
const frondGeo = (() => { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.quadraticCurveTo(4.2, 8, 0.4, 22); sh.quadraticCurveTo(-4.2, 8, 0, 0); const g = new THREE.ShapeGeometry(sh, 12); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = y / 22; p.setZ(i, -u * u * 9); p.setY(i, y * (1 - u * 0.25)); } g.computeVertexNormals(); return g; })();
const PALM_N = 900;
const palmTrunks = new THREE.InstancedMesh((() => { const g = new THREE.CylinderGeometry(1.1, 1.7, 1, 14, 24).translate(0, 0.5, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 1 + 0.18 * Math.abs(Math.sin(p.getY(i) * Math.PI * 9)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); } g.computeVertexNormals(); return g; })(), new THREE.MeshStandardMaterial({ map: barkTex, roughness: 0.95 }), PALM_N);
const palmFronds = new THREE.InstancedMesh(frondGeo, new THREE.MeshStandardMaterial({ color: 0x5cbf3f, side: THREE.DoubleSide, roughness: 0.55 }), PALM_N * 12);
palmTrunks.castShadow = palmFronds.castShadow = true; palmTrunks.receiveShadow = palmFronds.receiveShadow = true;
let palmI = 0;
function palm(x, z, h = 50) {
  if (palmI >= PALM_N) return; const d = new THREE.Object3D(), lean = (rnd() - .5) * 0.08;
  d.position.set(x, 0, z); d.rotation.set(lean, rnd() * 6, lean); d.scale.set(1, h, 1); d.updateMatrix(); palmTrunks.setMatrixAt(palmI, d.matrix);
  const top = V(0, h, 0).applyEuler(new THREE.Euler(lean, 0, lean)).add(V(x, 0, z));
  for (let k = 0; k < 12; k++) { d.position.copy(top); d.rotation.set(0, k / 12 * Math.PI * 2 + rnd() * 0.3, 0, "YXZ"); d.rotateX(-0.9 - rnd() * 0.5); const s = 0.9 + rnd() * 0.35; d.scale.set(s, s, s); d.updateMatrix(); palmFronds.setMatrixAt(palmI * 12 + k, d.matrix); }
  palmI++;
}
for (let i = -24; i <= 24; i++) { palm(i * 160 + 40, 662, 48 + rnd() * 14); palm(i * 160 + 40, 618, 48 + rnd() * 14); palm(i * 160, -662, 45 + rnd() * 10); }
for (let i = -24; i <= 24; i++) { palm(662, i * 160 + 70, 46 + rnd() * 12); palm(-662, i * 160 + 70, 46 + rnd() * 12); }
for (let a = 0; a < 28; a++) { const r = 420 + (a % 2) * 70, an = a / 28 * Math.PI * 2; palm(Math.cos(an) * r, Math.sin(an) * r, 42 + rnd() * 10); }
palmTrunks.count = palmI; palmFronds.count = palmI * 12; scene.add(palmTrunks, palmFronds);

// ------------------------------------------------------------------ cars (instanced), street lights
const carGeo = (() => { const parts = [new RoundedBoxGeometry(6.8, 2.8, 14, 3, 1.2).translate(0, 2.2, 0), new RoundedBoxGeometry(5.6, 2.6, 7.5, 3, 1.3).translate(0, 4.6, -0.6)].map(g => g.toNonIndexed());
  const pos = [], nrm = []; for (const g of parts) { pos.push(...g.attributes.position.array); nrm.push(...g.attributes.normal.array); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3)); return g; })();
const cars = new THREE.InstancedMesh(carGeo, new THREE.MeshPhysicalMaterial({ metalness: 0.6, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }), 700);
cars.castShadow = true; cars.receiveShadow = true;
{ let i = 0; const d = new THREE.Object3D(), cols = [0xff5a5f, 0x2ec4b6, 0xffbf3f, 0x5b8def, 0xa06cd5, 0xf7f7f2, 0x7bd389, 0xff8fab];
  const put = (x, z, r) => { if (i >= 700) return; d.position.set(x, 0, z); d.rotation.set(0, r, 0); d.updateMatrix(); cars.setMatrixAt(i, d.matrix); cars.setColorAt(i, new THREE.Color(cols[(rnd() * cols.length) | 0])); i++; };
  for (const zr of [640, -640, 2400, -2400]) for (let x = -6000; x < 6000; x += 30 + rnd() * 110) put(x, zr + (rnd() < .5 ? -1 : 1) * (6 + ((rnd() * 3) | 0) * 12), Math.PI / 2);
  for (const xr of [640, -640, 2400, -2400]) for (let z = -6000; z < 6000; z += 30 + rnd() * 120) put(xr + (rnd() < .5 ? -1 : 1) * (6 + ((rnd() * 3) | 0) * 12), z, 0);
  for (let r = 0; r < 6; r++) for (let k = 0; k < 22; k++) if (rnd() < .75) put(-1500 + k * 11, 1500 + r * 34, 0);
  cars.count = i; cars.instanceColor.needsUpdate = true; }
scene.add(cars);
{ const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.4, 0.55, 34, 8).translate(0, 17, 0), new THREE.MeshStandardMaterial({ color: 0x55585c, metalness: 0.7, roughness: 0.4 }), 400);
  const d = new THREE.Object3D(); let pi = 0; for (let x = -5000; x <= 5000; x += 120) for (const z of [610, 670, -612, -668]) { if (pi >= 400) break; d.position.set(x, 0, z); d.updateMatrix(); poles.setMatrixAt(pi++, d.matrix); }
  poles.count = pi; poles.castShadow = true; scene.add(poles); }

// ------------------------------------------------------------------ buildings
function uvScale(geo, w, h, d, bay = 30, floor = 13) {
  const uv = geo.attributes.uv, n = geo.attributes.normal;
  for (let i = 0; i < uv.count; i++) { const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)); if (ny > 0.5) continue;
    const across = nx > 0.5 ? d : w; uv.setXY(i, uv.getX(i) * across / (bay * 4), uv.getY(i) * h / (floor * 4)); }
  uv.needsUpdate = true;
}
function toonify(g, h, bulge, taper, lean) { // cartoon proportions: a bit of belly, a taper or flare, a little lean
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const u = p.getY(i) / h, k = 1 + bulge * Math.sin(Math.PI * u) + taper * u; p.setX(i, p.getX(i) * k + lean * u * h * 0.04); p.setZ(i, p.getZ(i) * k); }
  g.computeVertexNormals();
}
function tower(x, z, w, d, h, style, rotY = 0) {
  if (!MATS[style]) style = "cream";
  const g = new RoundedBoxGeometry(w, h, d, 3, Math.min(w, d) * 0.09); uvScale(g, w, h, d, 34, 16); g.translate(0, h / 2, 0);
  toonify(g, h, (rnd() - .3) * 0.08, (rnd() - .5) * 0.18, (rnd() - .5) * 0.6);
  const side = MATS[style], m = new THREE.Mesh(g, side);
  m.position.set(x, 0, z); m.rotation.y = rotY; m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const roofM = ROOFCOLS[(rnd() * ROOFCOLS.length) | 0], kind = rnd();
  if (kind < 0.35) { const c = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.62, Math.min(w, d) * 0.9, 4), roofM); c.rotation.y = Math.PI / 4 + rotY; c.position.set(x, h + Math.min(w, d) * 0.45, z); c.castShadow = true; scene.add(c); }
  else if (kind < 0.65) { const c = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), roofM); c.position.set(x, h, z); c.castShadow = true; scene.add(c);
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.6, 40, 8), MATS.concrete); sp.position.set(x, h + Math.min(w, d) * 0.42 + 18, z); scene.add(sp); }
  else { const tank = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 16, 20), new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: .8 })); tank.position.set(x + w * .2, h + 12, z - d * .15); tank.castShadow = true; scene.add(tank);
    const top = new THREE.Mesh(new THREE.ConeGeometry(10, 7, 20), roofM); top.position.set(x + w * .2, h + 23.5, z - d * .15); scene.add(top);
    const crown = new THREE.Mesh(new RoundedBoxGeometry(w * 0.55, 14, d * 0.55, 2, 4), MATS.concrete); crown.position.set(x, h + 7, z); crown.rotation.y = rotY; crown.castShadow = true; scene.add(crown); }
  return m;
}
function ywing(x, z, h, style) { for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.3, L = 190; const g = new RoundedBoxGeometry(60, h, L, 3, 8); uvScale(g, 60, h, L, 34, 16); g.translate(0, h / 2, L / 2);
  const m = new THREE.Mesh(g, MATS[style] || MATS.cream); m.position.set(x, 0, z); m.rotation.y = a; m.castShadow = m.receiveShadow = true; scene.add(m); } }
function curved(x, z, r, h, style, arc = 1.6, rot = 0) { const g = new THREE.CylinderGeometry(r, r, h, 48, 8, false, 0, arc); const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * r * arc / 102, uv.getY(i) * h / 48); g.translate(0, h / 2, 0); toonify(g, h, 0.06, -0.1, 0);
  const m = new THREE.Mesh(g, [MATS[style] || MATS.cream, MATS.roof, MATS.roof]); m.position.set(x, 0, z); m.rotation.y = rot; m.castShadow = m.receiveShadow = true; scene.add(m); }
function podium(x, z, w, d, h) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); const m = new THREE.Mesh(g, MATS.concrete); m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m); }
function sign(x, y, z, w, h, text, col, rotY = 0) {
  const t = canvasTex(1024, 256, (g, cw, ch) => { const gr = g.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, "#14100c"); gr.addColorStop(1, "#050403"); g.fillStyle = gr; g.fillRect(0, 0, cw, ch);
    g.strokeStyle = col; g.lineWidth = 14; g.strokeRect(14, 14, cw - 28, ch - 28); g.fillStyle = col; g.font = "900 150px Arial Black, Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, cw / 2, ch / 2 + 6); }, null);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.6 }));
  m.position.set(x, y, z); m.rotation.y = rotY; scene.add(m); return m;
}
const STY = ["cream", "coral", "teal", "sunny", "lavender", "mint", "peach", "sky", "coral", "sunny"];
const hero = [
  [-950, -1150, 140, 120, 560, "coral"], [-1350, -1050, 120, 160, 430, "teal"], [-1250, -1500, 110, 110, 640, "sunny"],
  [1250, -1350, 150, 110, 610, "lavender"], [1300, -980, 120, 120, 380, "mint"], [260, -2250, 130, 130, 720, "peach"],
  [-1700, -1700, 140, 140, 520, "cream"], [1750, -1600, 120, 180, 470, "sky"], [-120, -2100, 160, 120, 800, "coral"],
  [-2300, -900, 160, 140, 360, "sunny"], [2200, -700, 140, 140, 420, "teal"], [-1900, 300, 130, 170, 450, "lavender"], [1950, 250, 160, 120, 520, "peach"],
];
for (const [x, z, w, d, h, s] of hero) { tower(x, z, w, d, h, s, rnd() * 0.3 - 0.15); podium(x, z + d * 0.7, w * 1.8, d * 0.9, 50); }
ywing(-1250, -2050, 520, "peach"); ywing(1500, -2300, 600, "cream"); ywing(-2600, -1700, 420, "mint");
curved(1100, -1900, 220, 520, "sunny", 1.7, 0.8); curved(-900, -2600, 260, 600, "sky", 1.5, -0.6); curved(2700, -1300, 200, 450, "lavender", 1.8, 1.2);
for (let i = 0; i < 170; i++) {
  const a = rnd() * Math.PI * 2, r = 1900 + rnd() * 7000, x = Math.cos(a) * r, z = Math.sin(a) * r;
  if (z > 500 && Math.abs(x) < 2600) continue;
  const h = 120 + rnd() * rnd() * 620, w = 70 + rnd() * 130, d = 70 + rnd() * 130; tower(x, z, w, d, h, STY[(rnd() * STY.length) | 0], rnd() * 0.6);
}
sign(-950, 34, -1150 + 84 + 46, 160, 34, "CASINO", "#ff4d4d"); sign(950, 34, -1250 + 77 + 46, 180, 36, "LIVE SHOWS", "#ffd23a");
sign(-1350, 34, -1050 + 112 + 46, 150, 32, "HOTEL", "#4dd2ff"); sign(-1900, 34, 300 + 119 + 46, 170, 34, "BUFFET", "#ff9a3a");

// ------------------------------------------------------------------ landmarks
{ const g = new THREE.ConeGeometry(330, 360, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, 180, 0);   // black glass pyramid
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: 0x4a2f8f, metalness: 0.35, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.2 }));
  m.position.set(-700, 0, -1650); m.castShadow = m.receiveShadow = true; scene.add(m); }
{ const grp = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: 0xc98b3c, metalness: 0.5, roughness: 0.4 });   // iron lattice tower
  const TH = 540, prof = y => 70 * Math.pow(1 - y / TH, 1.8) + 5;
  const beam = (a, b, r = 1.6) => { const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), iron); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = true; grp.add(m); };
  const N = 14;
  for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) for (let i = 0; i < N; i++) { const y0 = i / N * TH, y1 = (i + 1) / N * TH, r0 = prof(y0), r1 = prof(y1); beam(V(sx * r0, y0, sz * r0), V(sx * r1, y1, sz * r1), 5.2 - i * 0.2); }
  for (let i = 0; i < N; i++) { const y0 = i / N * TH, y1 = (i + 1) / N * TH, r0 = prof(y0), r1 = prof(y1);
    for (const [ax, az, bx, bz] of [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]]) { beam(V(ax * r0, y0, az * r0), V(bx * r1, y1, bz * r1), 2.0); beam(V(bx * r0, y0, bz * r0), V(ax * r1, y1, az * r1), 2.0); } }
  for (const y of [120, 250]) { const r = prof(y) + 8; const p = new THREE.Mesh(new THREE.BoxGeometry(r * 2, 9, r * 2), iron); p.position.y = y; p.castShadow = true; grp.add(p); }
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(1, 4, 50, 8), iron); tip.position.y = TH + 25; grp.add(tip);
  grp.position.set(760, 0, -1350); scene.add(grp); }
{ const grp = new THREE.Group(), conc = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.6 });   // observation needle
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(28, 46, 900, 32), conc); shaft.position.y = 450; shaft.castShadow = true; grp.add(shaft);
  for (const [y, r, h, mat] of [[900, 70, 20, conc], [925, 76, 30, new THREE.MeshPhysicalMaterial({ color: 0x223040, metalness: 0.8, roughness: 0.1 })], [952, 70, 24, conc], [975, 56, 22, conc]]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, h, 40), mat); d.position.y = y; d.castShadow = true; grp.add(d); }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(4, 8, 160, 12), new THREE.MeshStandardMaterial({ map: canvasTex(64, 256, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e4352e'; g.fillRect(0, i * h / 8, w, h / 8); } }, null), roughness: 0.4 })); ant.position.y = 1066; grp.add(ant);
  grp.position.set(-300, 0, -3300); scene.add(grp); }
{ const grp = new THREE.Group(), steel = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.35 }), R = 260;   // observation wheel
  for (const zz of [-10, 10]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 7, 12, 120), steel); rim.position.z = zz; grp.add(rim); }
  for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, R, 4), steel); sp.position.set(Math.cos(a) * R / 2, Math.sin(a) * R / 2, 0); sp.rotation.z = a - Math.PI / 2; grp.add(sp);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(15, 20, 14), new THREE.MeshPhysicalMaterial({ color: [0xff5a5f, 0x2ec4b6, 0xffbf3f, 0x5b8def, 0xa06cd5][k % 5], metalness: 0.1, roughness: 0.2, clearcoat: 1 })); cab.scale.set(1, 0.8, 1.3); cab.position.set(Math.cos(a) * (R + 12), Math.sin(a) * (R + 12), 0); grp.add(cab); }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 40, 24), steel); hub.rotation.x = Math.PI / 2; grp.add(hub);
  for (const sx of [-1, 1]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 300, 10), steel); leg.position.set(sx * 70, -150, 0); leg.rotation.z = sx * 0.25; grp.add(leg); }
  grp.position.set(1500, 300, -2600); grp.rotation.y = -0.3; grp.traverse(o => { o.castShadow = true; }); scene.add(grp); }

// ------------------------------------------------------------------ the Sphere: LED skin with the big emoji; melts flat into a 480 x 333 ft screen
const SR = 258, SC = 108, THETA_MAX = Math.acos(-SC / SR);
const sphereTex = canvasTex(4096, 2048, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#ffd84a"); gr.addColorStop(1, "#f7a81a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const cx = w * 0.5, cy = h * 0.5, s = h * 0.36; g.fillStyle = "#4a2508";
  for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * s * 0.42, cy - s * 0.25, s * 0.11, s * 0.2, 0, 0, 7); g.fill(); }
  g.lineWidth = s * 0.09; g.strokeStyle = "#4a2508"; g.lineCap = "round"; g.beginPath(); g.arc(cx, cy + s * 0.05, s * 0.55, Math.PI * 0.18, Math.PI * 0.82); g.stroke();
  g.fillStyle = "rgba(255,110,50,.35)"; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(cx + sd * s * 0.72, cy + s * 0.18, s * 0.16, s * 0.1, 0, 0, 7); g.fill(); }
  g.fillStyle = "rgba(0,0,0,.55)"; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 3); for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 3, h);
}, null);
sphereTex.wrapT = THREE.ClampToEdgeWrapping;
const sphereGeo = new THREE.SphereGeometry(SR, 192, 128, 0, Math.PI * 2, 0, THETA_MAX);
sphereGeo.translate(0, SC, 0);
const sphere = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.55, metalness: 0.3, emissive: 0xffffff, emissiveMap: sphereTex, emissiveIntensity: 1.9 }));
sphere.rotation.y = -1.86; sphere.castShadow = true; sphere.receiveShadow = true; scene.add(sphere);
const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(SR * 0.93, SR * 0.95, 6, 96, 1, true), MATS.concrete); baseRing.position.y = 3; scene.add(baseRing);
const P0 = sphereGeo.attributes.position.array.slice(), P1 = new Float32Array(P0.length);
const SHEET = { w: 480, d: 333 };
{ const inv = new THREE.Matrix4().makeRotationY(-sphere.rotation.y), v = new THREE.Vector3(), uvs = sphereGeo.attributes.uv.array;
  for (let i = 0; i < P0.length / 3; i++) { const u = uvs[i * 2], th = (1 - uvs[i * 2 + 1]) * THETA_MAX;
    v.set((u - 0.5) * SHEET.w, 1.4, -SHEET.d / 2 + th / THETA_MAX * SHEET.d).applyMatrix4(inv); P1[i * 3] = v.x; P1[i * 3 + 1] = v.y; P1[i * 3 + 2] = v.z; } }
let morphNow = -1;
function setMorph(e) {
  if (Math.abs(e - morphNow) < 1e-4) return; morphNow = e;
  const k = e * e * (3 - 2 * e), sq = Math.pow(1 - k, 1.6), p = sphereGeo.attributes.position.array;
  for (let i = 0; i < p.length; i += 3) { p[i] = P0[i] + (P1[i] - P0[i]) * k; p[i + 2] = P0[i + 2] + (P1[i + 2] - P0[i + 2]) * k; p[i + 1] = Math.max(1.4, P1[i + 1] + (P0[i + 1] - P1[i + 1]) * sq); }
  sphereGeo.attributes.position.needsUpdate = true; sphereGeo.computeVertexNormals(); sphereGeo.computeBoundingSphere();
  baseRing.visible = e < 0.15;
}

// ------------------------------------------------------------------ football fields (160 x 360 ft), real turf, dust
const turfTex = canvasTex(640, 1440, (g, w, h) => {
  const ez = h * 30 / 360;
  for (let i = 0; i < 20; i++) { g.fillStyle = i % 2 ? "#3f7d2c" : "#376f27"; g.fillRect(0, ez + i * (h - 2 * ez) / 20, w, (h - 2 * ez) / 20 + 1); }
  speckle(g, w, h, 50000, ["rgba(30,60,20,.25)", "rgba(110,160,70,.2)"], 2);
  g.fillStyle = "#8b1d1d"; g.fillRect(0, 0, w, ez); g.fillStyle = "#b7891f"; g.fillRect(0, h - ez, w, ez);
  g.fillStyle = "rgba(255,255,255,.92)"; g.font = "900 72px Arial Black, Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText("PION", w / 2, ez / 2 + 4); g.save(); g.translate(w / 2, h - ez / 2 + 4); g.rotate(Math.PI); g.fillText("RAJA", 0, 0); g.restore();
  g.strokeStyle = "rgba(255,255,255,.95)";
  for (let i = 0; i <= 20; i++) { const y = ez + i * (h - 2 * ez) / 20; g.lineWidth = i % 2 ? 3 : 6; g.beginPath(); g.moveTo(16, y); g.lineTo(w - 16, y); g.stroke(); }
  for (let i = 0; i <= 100; i++) { const y = ez + i * (h - 2 * ez) / 100; for (const x of [40, w - 40, w * .38, w * .62]) { g.lineWidth = 3; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y); g.stroke(); } }
  g.lineWidth = 8; g.strokeRect(10, 10, w - 20, h - 20);
}, null);
turfTex.wrapS = turfTex.wrapT = THREE.ClampToEdgeWrapping;
const dirt = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
const fieldMats = [dirt, dirt, new THREE.MeshStandardMaterial({ map: turfTex, roughness: 0.92 }), dirt, dirt, dirt];
const FIELD_X = [-160, 0, 160];
const fields = FIELD_X.map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(160, 5, 360), fieldMats); m.visible = false; m.receiveShadow = true; scene.add(m); return m; });
const dustTex = canvasTex(128, 128, (g, w, h) => { for (let i = 0; i < 26; i++) { const x = w / 2 + (rnd() - .5) * w * .5, y = h / 2 + (rnd() - .5) * h * .5, r = 20 + rnd() * 30;
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(205,190,165,.35)"); gr.addColorStop(1, "rgba(205,190,165,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }, null);
const PUFFS = 40;
const puffs = FIELD_X.map(() => Array.from({ length: PUFFS }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, transparent: true, depthWrite: false, opacity: 0 })); s.visible = false; scene.add(s); return s; }));
const puffSeeds = Array.from({ length: PUFFS }, () => [rnd(), rnd(), rnd()]);

// ------------------------------------------------------------------ the Pion kingdom castle (The Notebook shot), a quiet lawn west of the city
const NB = V(-5000, 0, 0);
const stoneTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#c9b48e"; g.fillRect(0, 0, w, h); const bh = 48;
  for (let y = 0; y < h; y += bh) { let x = -((y / bh) % 2) * 40; while (x < w) { const bw = 90 + rnd() * 70, v = 222 + rnd() * 30, tint = rnd() * 14;
    g.fillStyle = `rgb(${v},${v - 6 - tint * .3},${v - 18 - tint})`; g.fillRect(x + 3, y + 3, bw - 6, bh - 6); x += bw; } }
  speckle(g, w, h, 30000, ["rgba(60,55,45,.18)", "rgba(250,245,230,.15)"], 2);
  for (let i = 0; i < 60; i++) { const cx = rnd() * w, cy = rnd() * h, gr = g.createRadialGradient(cx, cy, 0, cx, cy, 80); gr.addColorStop(0, "rgba(70,80,50,.12)"); gr.addColorStop(1, "rgba(70,80,50,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }, [1, 1]);
const slateTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#b8b8b8"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 24) for (let x = -((y / 24) % 2) * 16; x < w; x += 32) { const v = 200 + rnd() * 40; g.fillStyle = `rgb(${v},${v + 4},${v + 10})`; g.fillRect(x + 1, y + 1, 30, 22); } }, [6, 6]);
const stoneMat = (rx, ry) => { const t = rep(stoneTex, rx, ry); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.88, bumpMap: t, bumpScale: 0.6 }); };
const slate = new THREE.MeshStandardMaterial({ map: slateTex, color: 0xe0503d, roughness: 0.45, metalness: 0.05 });
const winMat = new THREE.MeshPhysicalMaterial({ color: 0x1a2430, metalness: 0.6, roughness: 0.08, envMapIntensity: 1.5 });
const trim = new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.7 });
const castle = new THREE.Group(); castle.position.set(NB.x + 22, 0, NB.z - 195); scene.add(castle);
function cbox(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; castle.add(m); return m; }
function crenels(w, d, y, mat) { const n = Math.round(w / 7); for (let i = 0; i < n; i += 2) { const x = -w / 2 + (i + .5) * w / n; cbox(w / n, 4, 3, mat, x, y, d / 2 - 1.5); } }
function ctower(x, z, r, h) { const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.06, h, 40), stoneMat(r / 6, h / 14)); t.position.set(x, h / 2, z); t.castShadow = t.receiveShadow = true; castle.add(t);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, r * 3.4, 40), slate); roof.position.set(x, h + r * 1.7, z); roof.castShadow = true; castle.add(roof);
  for (let i = 0; i < 3; i++) { const wy = h * (0.32 + i * 0.22), a = 0.5, w2 = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 5), winMat); w2.position.set(x + Math.sin(a) * (r + 0.1), wy, z + Math.cos(a) * (r + 0.1)); w2.rotation.y = a; castle.add(w2); }
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.5, 8, 2), new THREE.MeshStandardMaterial({ color: 0xc9961c, side: THREE.DoubleSide, roughness: 0.7 })); const fp = flag.geometry.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * 0.7) * 0.6); flag.geometry.computeVertexNormals(); flag.position.set(x + 4.6, h + r * 3.4 + 9, z); castle.add(flag);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 12, 6), new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: .8, roughness: .4 })); pole.position.set(x, h + r * 3.4 + 6, z); castle.add(pole); }
{ const kw = 120, kh = 46, kd = 50;
  cbox(kw, kh, kd, stoneMat(8, 3.2), 0, kh / 2, 0); cbox(kw + 4, 3, kd + 4, trim, 0, kh + 1.5, 0); crenels(kw, kd, kh + 5, stoneMat(1, 0.4));
  cbox(44, 66, 54, stoneMat(3, 4.5), 0, 33, 4); crenels(44, 54, 68, stoneMat(1, 0.4));
  const r4 = new THREE.Mesh(new THREE.ConeGeometry(30, 30, 4), slate); r4.rotation.y = Math.PI / 4; r4.position.set(0, 85, 4); r4.castShadow = true; castle.add(r4);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(16, 22), new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.8 })); door.position.set(0, 11, 31.1); castle.add(door);
  for (const sx of [-1, 1]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 28, 16), trim); col.position.set(sx * 14, 14, 33); col.castShadow = true; castle.add(col); }
  cbox(36, 2.5, 8, trim, 0, 29, 33);
  for (let row = 0; row < 2; row++) for (let i = 0; i < 6; i++) { if (Math.abs(i - 2.5) < 1) continue; const wnd = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), winMat); wnd.position.set(-50 + i * 20, 14 + row * 18, kd / 2 + 0.1); castle.add(wnd);
    cbox(8, 1.2, 1.5, trim, -50 + i * 20, 8.6 + row * 18, kd / 2 + 0.6); cbox(7.2, 1, 1.2, trim, -50 + i * 20, 19.6 + row * 18, kd / 2 + 0.5); }
  for (const sx of [-1, 1]) ctower(sx * 66, 22, 12, 70); for (const sx of [-1, 1]) ctower(sx * 22, 34, 7, 80);
  cbox(30, 1.6, 8, trim, 0, 0.8, 36);
  const hedgeMat = new THREE.MeshStandardMaterial({ map: grassTex, color: 0x6f8f4f, roughness: 1 }); for (const sx of [-1, 1]) cbox(42, 4.5, 4.5, hedgeMat, sx * 45, 2.2, 34); }
flat(2000, 2000, lawnMat, NB.x, NB.z - 400, 0.6);
flat(14, 220, new THREE.MeshStandardMaterial({ map: rep(paverTex, 1, 16), roughness: 0.85 }), NB.x + 22, NB.z - 90, 0.75);
const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }), 400);
const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.7, 1.3, 1, 10).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.8 }), 60);
canopy.castShadow = canopy.receiveShadow = trunks.castShadow = true; let li = 0, ti = 0;
function leafy(x, z, s) { const d = new THREE.Object3D(); d.position.set(x, 0, z); d.scale.set(s, s * 10, s); d.updateMatrix(); trunks.setMatrixAt(ti++, d.matrix);
  for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2, r = k ? 4.2 * s : 0, y = s * (14 + (k ? -1 + rnd() * 3 : 4));
    d.position.set(x + Math.cos(a) * r, y, z + Math.sin(a) * r); d.rotation.set(0, 0, 0); d.scale.setScalar(s * (k ? 4.2 + rnd() * 1.2 : 5.6)); d.updateMatrix(); canopy.setMatrixAt(li, d.matrix);
    canopy.setColorAt(li++, new THREE.Color().setHSL(0.27 + rnd() * 0.04, 0.62, 0.36 + rnd() * 0.08)); } }
leafy(NB.x - 34, NB.z - 70, 2.4); leafy(NB.x - 52, NB.z - 30, 3.0); leafy(NB.x - 22, NB.z - 120, 2.2); leafy(NB.x - 70, NB.z - 110, 2.8); leafy(NB.x + 120, NB.z - 210, 2.6); leafy(NB.x - 90, NB.z + 10, 3.3);
leafy(NB.x + 170, NB.z - 260, 3.0); leafy(NB.x - 140, NB.z - 230, 3.2);
trunks.count = ti; canopy.count = li; canopy.instanceColor.needsUpdate = true; scene.add(trunks, canopy);
{ const blade = new THREE.PlaneGeometry(0.12, 0.9, 1, 3); blade.translate(0, 0.45, 0); const bp = blade.attributes.position; for (let i = 0; i < bp.count; i++) bp.setZ(i, Math.pow(bp.getY(i) / 0.9, 2) * 0.18);
  const N = 60000, im = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.9 }), N), d = new THREE.Object3D();
  for (let i = 0; i < N; i++) { d.position.set(NB.x - 30 + rnd() * 60, 0.6, NB.z - 30 + rnd() * 48); d.rotation.set(0, rnd() * 6, (rnd() - .5) * 0.4); d.scale.setScalar(0.6 + rnd() * 0.9); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
    im.setColorAt(i, new THREE.Color().setHSL(0.25 + rnd() * 0.04, 0.5, 0.25 + rnd() * 0.14)); }
  im.instanceColor.needsUpdate = true; im.receiveShadow = true; scene.add(im); }
for (let i = 0; i < 40; i++) tower(NB.x - 3000 + rnd() * 6000, NB.z - 4500 - rnd() * 4000, 90 + rnd() * 120, 90 + rnd() * 120, 200 + rnd() * 600, STY[(rnd() * STY.length) | 0], rnd());

// ------------------------------------------------------------------ Pion billboard
const pionMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
const pion = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));   // shadow caster only
pion.castShadow = true; pion.layers.set(1); sun.shadow.camera.layers.enable(1);
pion.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
scene.add(pion);
const pionScene = new THREE.Scene(), pionShow = new THREE.Mesh(pion.geometry, pionMat); pionScene.add(pionShow);   // Pion keeps his own colours: drawn after tone mapping
let PION = null;
const texLoader = new THREE.TextureLoader();
let curTex = null;
async function pionFrame(url) {
  const t = await texLoader.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace;
  if (curTex) curTex.dispose(); curTex = t; pionMat.map = t; pion.customDepthMaterial.map = t; pionMat.needsUpdate = true; pion.customDepthMaterial.needsUpdate = true;
}
function placePion(anchor, height, mode) {
  const k = height / (4.65 * PION.ppu), pw = PION.w * k, ph = PION.h * k;
  pion.scale.set(pw, ph, 1);
  const off = V((PION.w / 2 - PION.base[0]) * k, (PION.base[1] - PION.h / 2) * k, 0);
  if (mode === "full") pion.quaternion.copy(camera.quaternion);
  else { const d = V(0, 0, 0).subVectors(camera.position, anchor); pion.rotation.set(0, Math.atan2(d.x, d.z), 0); }
  off.applyQuaternion(pion.quaternion); pion.position.copy(anchor).add(off);
}

// ------------------------------------------------------------------ timelines (same shots as the storyboard)
const ease = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const clamp01 = u => Math.max(0, Math.min(1, u));
function keyed(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const u = ease((t - a.t) / Math.max(1e-6, b.t - a.t)), o = {};
      for (const k in a) o[k] = a[k] && a[k].isVector3 ? a[k].clone().lerp(b[k], u) : typeof a[k] === "number" ? a[k] + (b[k] - a[k]) * u : a[k];
      return o; } }
  return keys[keys.length - 1];
}
const PA = V(-330, 0, 300);
const PNB = V(NB.x - 13, 0, NB.z);
const SHOTS = {
  w1: {
    cam: [
      { t: 0.00, pos: V(-330, 4.3, 312.5), tgt: V(-326.5, 5.9, 272.6), fov: 44 },
      { t: 0.76, pos: V(-330, 4.35, 312.0), tgt: V(-326.5, 6.0, 272.1), fov: 44 },
      { t: 1.55, pos: V(-430, 150, 1450), tgt: V(-60, 175, 0), fov: 46 },
      { t: 2.30, pos: V(-300, 200, 1640), tgt: V(-92, 176, 0), fov: 46 },
      { t: 5.80, pos: V(-296, 198, 1590), tgt: V(-92, 176, 0), fov: 46 },
    ],
    nbcam: [{ t: 5.80, pos: V(PNB.x + 0.7, 4.2, 14.5), tgt: V(PNB.x + 0.9, 6.4, -26), fov: 44 }, { t: 7.90, pos: V(PNB.x + 0.65, 4.2, 13.2), tgt: V(PNB.x + 0.85, 6.3, -26), fov: 44 }],
    cut: 5.80,
  },
  w2: {
    cam: [
      { t: 0.00, pos: V(-296, 198, 1590), tgt: V(-92, 176, 0), fov: 46 },
      { t: 2.50, pos: V(-290, 196, 1550), tgt: V(-92, 174, 0), fov: 46 },
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
function shake(t, hits) {
  let x = 0, y = 0;
  for (const h of hits) { const e = t - h; if (e < 0 || e > 0.55) continue; const a = Math.exp(-e * 7.5);
    x += a * (Math.sin(e * 91) * 0.6 + Math.sin(e * 57 + 1) * 0.4); y += a * (Math.sin(e * 73 + 2) * 0.6 + Math.sin(e * 131) * 0.4); }
  return [x, y];
}
const project = v => { const p = v.clone().project(camera); return [+((p.x + 1) / 2).toFixed(4), +((1 - p.y) / 2).toFixed(4), +p.z.toFixed(4)]; };

window.setup = async (pionInfo) => { PION = pionInfo; await envReady; return true; };
window.renderFrame = async (which, f, fps, pionUrl) => {
  const t = f / fps, S = SHOTS[which], pts = {}, WP = {};
  await pionFrame(pionUrl);
  let anchor = PA.clone(), height = 7, mode = "y";
  setMorph(0); fields.forEach(m => (m.visible = false)); puffs.flat().forEach(p => (p.visible = false));
  if (which === "w1") {
    const nb = t >= S.cut, C = keyed(nb ? S.nbcam : S.cam, t);
    camera.position.copy(C.pos); camera.lookAt(C.tgt); camera.fov = C.fov;
    if (nb) { anchor = PNB.clone(); height = 7.2; aimSun(V(NB.x, 0, NB.z - 80), 280); }
    else { const g = clamp01((t - 1.55) / 0.5); height = 7 + (t > 1.55 ? (290 - 7) * (g < 1 ? 1 - Math.pow(1 - g, 3) * Math.cos(g * 7.5) : 1) : 0);
      aimSun(t < 1.0 ? V(-330, 0, 300) : V(-150, 0, 100), t < 1.0 ? 160 : 1000); }
    Object.assign(WP, { top: V(0, 366, 0), base: V(0, 0, 0), left: V(-SR, SC, 0), right: V(SR, SC, 0), gl: V(-SR, 0, 60), gr: V(SR, 0, 60) }); pts.nb = nb ? 1 : 0;
  } else {
    const C = keyed(S.cam, t); camera.position.copy(C.pos); camera.fov = C.fov;
    const [sx, sy] = shake(t, S.drops); camera.position.x += sx * 7; camera.position.y += sy * 7; camera.lookAt(C.tgt);
    const Pk = keyed(S.pion, t); anchor = Pk.a; height = Pk.h; mode = t > 4.1 ? "full" : "y";
    setMorph(clamp01((t - S.morph[0]) / (S.morph[1] - S.morph[0])));
    S.drops.forEach((t0, i) => {
      const e = t - t0, m = fields[i]; if (e < -0.35) return; m.visible = true; m.castShadow = e > -0.04;
      const u = clamp01((e + 0.35) / 0.35), start = V(0, 520, -40), end = V(FIELD_X[i], 2.6, 0);
      m.position.lerpVectors(start, end, u); m.position.y = start.y + (end.y - start.y) * u * u;
      const sc = 0.35 + 0.65 * u; m.scale.set(sc, sc, sc); m.rotation.set(0, (1 - u) * 0.6 * (i - 1 || 1), (1 - u) * 0.15);
      if (e > 0) { const b = Math.exp(-e * 9) * Math.sin(e * 30) * 0.06; m.scale.set(1 + b, 1 - b * 2, 1 + b); m.rotation.set(0, 0, 0); m.position.copy(end); }
      if (e > 0 && e < 1.4) for (let k = 0; k < PUFFS; k++) { const s = puffs[i][k], [a, b, c] = puffSeeds[k], side = k % 2 ? 1 : -1, ang = a * Math.PI * 2;
        const px = end.x + (k < PUFFS / 2 ? side * 80 : (b - .5) * 160), pz = end.z + (k < PUFFS / 2 ? (b - .5) * 360 : side * 180), out = 1 - Math.exp(-e * 4);
        s.visible = true; s.position.set(px + Math.cos(ang) * out * 40, 6 + out * (10 + c * 30), pz + Math.sin(ang) * out * 40); s.scale.setScalar(30 + out * 70 * (0.6 + c));
        s.material.opacity = Math.min(1, e * 8) * Math.max(0, 1 - e / 1.4) * 0.85; }
      WP["field" + (i + 1)] = V(FIELD_X[i], 6, 0);
    });
    aimSun(V(-80, 0, 80), 1000);
    WP.sheet = V(0, 2, 0);
  }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  placePion(anchor, height, mode);
  for (const k in WP) pts[k] = project(WP[k]);
  pts.head = project(pion.localToWorld(V(0, 0.25, 0)));
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture; inkPass.uniforms.near.value = camera.near; inkPass.uniforms.far.value = camera.far;
  composer.render();
  pionShow.position.copy(pion.position); pionShow.quaternion.copy(pion.quaternion); pionShow.scale.copy(pion.scale);
  const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false;
  renderer.setRenderTarget(null); renderer.render(pionScene, camera); renderer.autoClear = true; renderer.toneMapping = tm;
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};
window.__ready = true;
