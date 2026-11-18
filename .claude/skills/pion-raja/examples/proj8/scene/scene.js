// proj8 demo (Mona Lisa, 5.4 s): HD cartoon Paris. Units: metres.
// Pion stands next to the Mona Lisa (77 x 53 cm, gold frame, on a museum wall) in the Cour Napoleon of a cartoon Louvre:
// glass pyramid, palace wings with domed pavilions and mansard roofs, Haussmann blocks, Eiffel Tower and Sacre-Coeur in
// the haze, chestnut trees, Paris lamps, tourists. Same look as the castle renders: AgX + punchy grade, GTAO, ink lines
// from depth + normal, warm fog, golden-hour sun shadows, bump maps, bloom on lamps only, vignette.
// Pion is the engine's own render (transparent PNG per frame) on a billboard that casts a real shadow.
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
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 6000);
scene.fog = new THREE.FogExp2(0xe2c8a4, 0.00085);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H);
gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 1.0;
gtao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1.6, thickness: 0.6, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
composer.addPass(gtao);
const inkPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2(W, H) },
    near: { value: 0.05 }, far: { value: 6000 }, ink: { value: new THREE.Color(0x1a120d) }, fadeA: { value: 140 }, fadeB: { value: 900 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tNormal, tDepth; uniform vec2 res; uniform float near, far, fadeA, fadeB; uniform vec3 ink; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv); float r0 = texture2D(tDepth, vUv).x;
      if (r0 > 0.99995) { gl_FragColor = c; return; }
      float d0 = lin(r0); vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0; float dm = 0.0, nm = 0.0;
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982; vec2 o = vec2(cos(a), sin(a)) * 1.8 / res;
        float r = texture2D(tDepth, vUv + o).x; float d = r > 0.99995 ? far : lin(r);
        dm = max(dm, (d - d0) / d0); vec3 n = texture2D(tNormal, vUv + o).xyz * 2.0 - 1.0; nm = max(nm, 1.0 - dot(n0, n)); }
      float e = max(smoothstep(0.035, 0.09, dm), smoothstep(0.22, 0.45, nm));
      float fade = 1.0 - smoothstep(fadeA, fadeB, d0);
      gl_FragColor = vec4(mix(c.rgb, ink * c.rgb * 0.35 + ink * 0.65, e * 0.9 * fade), c.a); }`,
});
composer.addPass(inkPass);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.35, 1.6));   // high threshold: only the lamps glow
composer.addPass(new OutputPass());
const pionRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const pionComp = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tPion: { value: pionRT.texture } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tPion; varying vec2 vUv;
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){ vec4 b = texture2D(tDiffuse, vUv), p = texture2D(tPion, vUv);
      vec3 pc = p.a > 1e-4 ? toSRGB(clamp(p.rgb / p.a, 0.0, 1.0)) : vec3(0.0);
      gl_FragColor = vec4(mix(b.rgb, pc, p.a), 1.0); }`,
});
pionComp.uniforms.tPion.value = pionRT.texture;   // ShaderPass clones its uniforms: point at the live render target again
composer.addPass(pionComp);
composer.addPass(new ShaderPass({   // punchy grade + vignette (display space, after AgX); Pion is graded with the world
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.16); c = (c - 0.5) * 1.07 + 0.5;
      vec2 q = vUv - 0.5; c *= 1.0 - 0.32 * smoothstep(0.35, 0.85, length(q * vec2(1.0, 0.75)));
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
}));

const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(13579);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ------------------------------------------------------------------ sky, sun, environment (shared with the Pion `light` cue)
const SUN_DIR = V(-0.78, 0.42, 0.46).normalize();   // golden hour from the left: long shadows, warm key, cool fill
const sky = new Sky(); sky.scale.setScalar(4500); scene.add(sky);
sky.material.uniforms.turbidity.value = 2.6; sky.material.uniforms.rayleigh.value = 1.9;
sky.material.uniforms.mieCoefficient.value = 0.004; sky.material.uniforms.mieDirectionalG.value = 0.82;
sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
const sun = new THREE.DirectionalLight(0xffc888, 4.6);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
scene.add(sun, sun.target);
scene.add(new THREE.HemisphereLight(0x8fb8ff, 0x6a5440, 0.2));
function aimSun(center, radius) {
  sun.target.position.copy(center); sun.position.copy(center).addScaledVector(SUN_DIR, radius * 3);
  const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius; c.near = radius * 0.2; c.far = radius * 7; c.updateProjectionMatrix();
}
const envReady = (async () => {
  const hdr = await new EXRLoader().loadAsync(cityHdr);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; scene.environmentIntensity = 0.28;
})();

// ------------------------------------------------------------------ procedural textures
function canvasTex(w, h, draw, repeat, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]); return t;
}
const speckle = (g, w, h, n, cols, sz = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(rnd() * cols.length) | 0]; g.fillRect(rnd() * w, rnd() * h, sz * (0.5 + rnd()), sz * (0.5 + rnd())); } };
const rep = (tex, x, y) => { const t = tex.clone(); t.repeat.set(x, y); t.needsUpdate = true; return t; };
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };

// granite slabs of the Cour Napoleon (one tile = 4 x 4 m)
const slabTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#9d958a"; g.fillRect(0, 0, w, h);
  const s = 128; for (let y = 0; y < h; y += s) for (let x = 0; x < w; x += s * 2) { const off = (y / s) % 2 ? s : 0, v = 196 + rnd() * 26;
    g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; rr(g, x + off + 3, y + 3, s * 2 - 6, s - 6, 10); g.fill(); }
  speckle(g, w, h, 60000, ["rgba(90,80,70,.18)", "rgba(255,250,240,.2)", "rgba(60,55,50,.12)"], 2); }, [1, 1]);
const grassTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#5d8a33"; g.fillRect(0, 0, w, h); speckle(g, w, h, 40000, ["#507a2b", "#6a9a3c", "#47702a", "#76a744"], 2); }, [1, 1]);
const gravelTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#cdb990"; g.fillRect(0, 0, w, h); speckle(g, w, h, 50000, ["#bca77c", "#ddc9a0", "#a8946c", "#e6d5b0"], 2); }, [1, 1]);

// Louvre facade: cream stone, rustication, arched windows, pilasters (texture = 4 bays x 2 storeys = 16 x 14 m)
const louvreTex = canvasTex(1024, 896, (g, w, h) => {
  g.fillStyle = "#efdcb8"; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ["rgba(160,130,90,.10)", "rgba(255,255,255,.12)"], 3);
  g.fillStyle = "rgba(120,90,55,.18)"; for (let y = h * 0.55; y < h; y += 26) g.fillRect(0, y, w, 3);     // rusticated ground floor
  g.fillStyle = "#f8ead0"; g.fillRect(0, h * 0.52, w, 18); g.fillStyle = "rgba(110,80,50,.35)"; g.fillRect(0, h * 0.52 + 18, w, 6);   // string course
  g.fillStyle = "#fbf0da"; g.fillRect(0, 0, w, 26); g.fillStyle = "rgba(110,80,50,.35)"; g.fillRect(0, 26, w, 8);   // cornice
  const bw = w / 4;
  for (let k = 0; k < 4; k++) {
    const cx = k * bw + bw / 2;
    g.fillStyle = "#f6e6c6"; g.fillRect(k * bw - 14, 34, 28, h * 0.48); g.fillStyle = "rgba(120,90,55,.22)"; g.fillRect(k * bw + 10, 34, 6, h * 0.48);   // pilaster
    for (const [y0, wh, ht] of [[h * 0.12, 120, 250], [h * 0.62, 120, 230]]) {
      const x0 = cx - wh / 2;
      g.fillStyle = "#fbf3e2"; g.beginPath(); g.moveTo(x0 - 14, y0 + ht + 12); g.lineTo(x0 - 14, y0 + wh / 2); g.arc(cx, y0 + wh / 2, wh / 2 + 14, Math.PI, 0); g.lineTo(x0 + wh + 14, y0 + ht + 12); g.closePath(); g.fill();
      const gr = g.createLinearGradient(x0, y0, x0 + wh, y0 + ht); gr.addColorStop(0, "#8fc6e6"); gr.addColorStop(1, "#2f5f8c");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x0, y0 + ht); g.lineTo(x0, y0 + wh / 2); g.arc(cx, y0 + wh / 2, wh / 2, Math.PI, 0); g.lineTo(x0 + wh, y0 + ht); g.closePath(); g.fill();
      g.strokeStyle = "#fbf3e2"; g.lineWidth = 7; g.beginPath(); g.moveTo(cx, y0 + 6); g.lineTo(cx, y0 + ht); g.moveTo(x0, y0 + ht * 0.5); g.lineTo(x0 + wh, y0 + ht * 0.5); g.stroke();
      g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.moveTo(x0 + 12, y0 + wh * 0.4); g.lineTo(x0 + 34, y0 + wh * 0.25); g.lineTo(x0 + 12, y0 + ht * 0.45); g.closePath(); g.fill();
      g.fillStyle = "#f3dfb6"; g.beginPath(); g.moveTo(cx - 20, y0 - 18); g.lineTo(cx, y0 - 34); g.lineTo(cx + 20, y0 - 18); g.closePath(); g.fill();   // keystone
      if (y0 < h * 0.5) { g.fillStyle = "#3a3f46"; g.fillRect(x0 - 10, y0 + ht - 4, wh + 20, 10); for (let b = 0; b < 8; b++) g.fillRect(x0 - 6 + b * (wh + 12) / 7, y0 + ht - 40, 4, 38); }   // iron balconette
    }
  }
}, [1, 1]);
// Haussmann facade (texture = 3 bays x 3 floors = 12 x 10 m): stone + wrought-iron balconies; tinted per block
const haussTex = canvasTex(768, 640, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); speckle(g, w, h, 5000, ["rgba(0,0,0,.05)", "rgba(255,255,255,.2)"], 3);
  const bw = w / 3, fh = h / 3;
  for (let r = 0; r < 3; r++) { g.fillStyle = "rgba(0,0,0,.10)"; g.fillRect(0, r * fh + fh - 8, w, 8);
    for (let k = 0; k < 3; k++) { const x = k * bw + 52, y = r * fh + 34, ww = bw - 104, hh = fh - 74;
      g.fillStyle = "#fffaf0"; rr(g, x - 9, y - 9, ww + 18, hh + 18, 14); g.fill();
      const gr = g.createLinearGradient(x, y, x + ww, y + hh); const lit = rnd() < 0.12;
      gr.addColorStop(0, lit ? "#ffe6a0" : "#9ed2ee"); gr.addColorStop(1, lit ? "#f2b84e" : "#35679a"); g.fillStyle = gr; rr(g, x, y, ww, hh, 12); g.fill();
      g.fillStyle = "rgba(255,255,255,.5)"; g.beginPath(); g.moveTo(x + 8, y + 10); g.lineTo(x + 26, y + 10); g.lineTo(x + 8, y + hh * 0.5); g.closePath(); g.fill();
      g.fillStyle = "#2d3238"; g.fillRect(x - 16, y + hh - 6, ww + 32, 9); for (let b = 0; b < 9; b++) g.fillRect(x - 12 + b * (ww + 24) / 8, y + hh - 40, 4, 36); g.fillRect(x - 16, y + hh - 42, ww + 32, 5);
    } }
}, [1, 1]);
const slateTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#6f7f93"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) for (let x = -((y / 16) % 2) * 12; x < w; x += 24) { const v = 105 + rnd() * 30; g.fillStyle = `rgb(${v - 8},${v + 6},${v + 26})`; rr(g, x + 1, y + 1, 22, 14, 3); g.fill(); }
  for (let k = 0; k < 4; k++) { const x = k * w / 4 + 34, y = h * 0.42;                    // dormer windows (oeil-de-boeuf style)
    g.fillStyle = "#f4ead6"; g.beginPath(); g.arc(x + 30, y + 30, 40, 0, 7); g.fill(); g.fillStyle = "#2f5f8c"; g.beginPath(); g.arc(x + 30, y + 30, 28, 0, 7); g.fill();
    g.fillStyle = "rgba(255,255,255,.45)"; g.beginPath(); g.arc(x + 22, y + 22, 9, 0, 7); g.fill(); } }, [1, 1]);
const noiseTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#808080"; g.fillRect(0, 0, w, h); speckle(g, w, h, 9000, ["#6a6a6a", "#9a9a9a", "#555", "#aaa"], 3);
  g.strokeStyle = "#5a5a5a"; g.lineWidth = 3; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 8 + rnd() * 20, 0, Math.PI * (1 + rnd())); g.stroke(); } }, [3, 3], false);

const louvreMat = (len, ht) => { const t = rep(louvreTex, len / 16, ht / 14); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.2, roughness: 0.75, envMapIntensity: 0.5 }); };
const slateMat = (len, ht) => { const t = rep(slateTex, len / 16, Math.max(1, ht / 8)); return new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.5, roughness: 0.45, metalness: 0.15 }); };
const gold = new THREE.MeshStandardMaterial({ color: 0xe8b23c, metalness: 1.0, roughness: 0.28, bumpMap: noiseTex, bumpScale: 0.6, envMapIntensity: 1.2 });
const ironGreen = new THREE.MeshStandardMaterial({ color: 0x2f4a3a, metalness: 0.6, roughness: 0.45 });

// ------------------------------------------------------------------ ground: granite plaza, lawns, gravel garden
slabTex.repeat.set(150, 150);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshStandardMaterial({ map: slabTex, bumpMap: slabTex, bumpScale: 0.8, roughness: 0.78 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const far = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshStandardMaterial({ color: 0x8c8274, roughness: 0.95 }));
far.rotation.x = -Math.PI / 2; far.position.y = -1.5; far.receiveShadow = true; scene.add(far);
function flat(w, d, mat, x, z, y = 0.02, rot = 0) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, y, z); m.receiveShadow = true; scene.add(m); return m; }
for (const sx of [-1, 1]) flat(70, 120, new THREE.MeshStandardMaterial({ map: rep(gravelTex, 14, 24), roughness: 0.95 }), sx * 95, -40, 0.02);

// ------------------------------------------------------------------ the glass pyramid + pyramidions + triangular fountains
const glassTex = canvasTex(1024, 1024, (g, w, h) => {   // diamond lattice of the glass skin
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#a9d8f0"); gr.addColorStop(0.5, "#5f9cc8"); gr.addColorStop(1, "#2c5b86"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#e9eef2"; g.lineWidth = 5; const n = 18;
  for (let i = -n; i <= 2 * n; i++) { g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n + h, h); g.stroke(); g.beginPath(); g.moveTo(i * w / n, 0); g.lineTo(i * w / n - h, h); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.12})`; const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 50, y + 50); g.lineTo(x, y + 100); g.lineTo(x - 50, y + 50); g.closePath(); g.fill(); }
}, null);
function pyramid(x, z, base, ht, tex) {
  const g = new THREE.ConeGeometry(base / Math.SQRT2, ht, 4, 1); g.rotateY(Math.PI / 4); g.translate(0, ht / 2, 0);
  const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: tex, emissive: 0x2a4e70, emissiveIntensity: 0.15, metalness: 0.35, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.4 }));
  m.position.set(x, 0, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(ht * 0.012, 12, 8), gold); tip.position.set(x, ht, z); scene.add(tip);
  return m;
}
const PYR = V(0, 0, -95);
pyramid(PYR.x, PYR.z, 35, 21.6, glassTex);
pyramid(-30, -72, 5, 3.2, glassTex); pyramid(30, -72, 5, 3.2, glassTex); pyramid(0, -120, 5, 3.2, glassTex);
{ const water = new THREE.MeshPhysicalMaterial({ color: 0x2f7fa8, roughness: 0.04, metalness: 0.1, clearcoat: 1, envMapIntensity: 1.6 });
  const rim = new THREE.MeshStandardMaterial({ color: 0x5b5f66, roughness: 0.5 });
  for (const [x, z, r] of [[-26, -80, 0], [26, -80, 0], [0, -62, 0]]) {
    const sh = new THREE.Shape(); sh.moveTo(-9, 0); sh.lineTo(9, 0); sh.lineTo(0, 9); sh.closePath();
    const b = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: true, bevelSize: 0.3, bevelThickness: 0.15, bevelSegments: 3 }), rim);
    b.rotation.x = -Math.PI / 2; b.position.set(x, 0, z + 3); b.rotation.z = x < 0 ? -0.6 : x > 0 ? 0.6 : Math.PI; b.receiveShadow = b.castShadow = true; scene.add(b);
    const wm = new THREE.Mesh(new THREE.ShapeGeometry(sh), water); wm.scale.setScalar(0.9); wm.rotation.copy(b.rotation); wm.position.set(x, 0.62, z + 3); scene.add(wm);
  } }

// ------------------------------------------------------------------ the Louvre palace: wings, domed pavilions, mansard roofs
function taperZ(g, h, k) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const u = (p.getY(i) + h / 2) / h; p.setZ(i, p.getZ(i) * (1 - k * u)); } g.computeVertexNormals(); }
function wing(x, z, len, rotY, ht = 16, dep = 18) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY; scene.add(grp);
  const body = new THREE.Mesh(new RoundedBoxGeometry(len, ht, dep, 3, 0.8).translate(0, ht / 2, 0), louvreMat(len, ht)); body.castShadow = body.receiveShadow = true; grp.add(body);
  const rh = 7.5, rg = new RoundedBoxGeometry(len - 1, rh, dep, 3, 1.6); taperZ(rg, rh, 0.55); rg.translate(0, ht + rh / 2, 0);
  const roof = new THREE.Mesh(rg, slateMat(len, rh)); roof.castShadow = roof.receiveShadow = true; grp.add(roof);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(len - 2, 0.35, 0.35), gold); crest.position.y = ht + rh + 0.1; grp.add(crest);
  for (let s = -len / 2 + 6; s < len / 2 - 4; s += 9) { const ch = new THREE.Mesh(new RoundedBoxGeometry(1.4, 3.2, 2.4, 2, 0.4), louvreMat(4, 3)); ch.position.set(s, ht + rh + 1.2, (rnd() - .5) * 3); ch.castShadow = true; grp.add(ch); }
  return grp;
}
function pavilion(x, z, w, d, ht, domeCol) {
  const body = new THREE.Mesh(new RoundedBoxGeometry(w, ht, d, 3, 1.0).translate(0, ht / 2, 0), louvreMat(w, ht)); body.position.set(x, 0, z); body.castShadow = body.receiveShadow = true; scene.add(body);
  const prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24, a = u * Math.PI / 2; prof.push(new THREE.Vector2(Math.max(0.001, Math.cos(a) * (1 + 0.12 * Math.sin(u * Math.PI))), Math.sin(a) * 1.25)); }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshStandardMaterial({ color: domeCol, roughness: 0.35, metalness: 0.2, bumpMap: noiseTex, bumpScale: 0.3 }));
  const R = Math.min(w, d) * 0.48; dome.scale.set(R, R, R); dome.position.set(x, ht, z); dome.castShadow = true; scene.add(dome);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, 1.6, 48), louvreMat(10, 2)); drum.position.set(x, ht + 0.3, z); scene.add(drum);
  const lan = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.16, R * 0.2, R * 0.35, 16), gold); lan.position.set(x, ht + R * 1.25 + R * 0.12, z); lan.castShadow = true; scene.add(lan);
  const fin = new THREE.Mesh(new THREE.SphereGeometry(R * 0.1, 16, 12), gold); fin.position.set(x, ht + R * 1.25 + R * 0.42, z); scene.add(fin);
}
wing(-62, -150, 92, 0); wing(62, -150, 92, 0);
pavilion(0, -150, 30, 26, 24, 0x5f7896);                // Pavillon de l'Horloge style centre
pavilion(-112, -150, 22, 26, 21, 0x6c8aa8); pavilion(112, -150, 22, 26, 21, 0x6c8aa8);
wing(-112, -80, 120, Math.PI / 2); wing(112, -80, 120, Math.PI / 2);
pavilion(-112, -12, 24, 24, 21, 0x5f7896); pavilion(112, -12, 24, 24, 21, 0x5f7896);

// ------------------------------------------------------------------ Haussmann city behind the palace (tinted cartoon facades, zinc mansards)
const TINTS = [0xf4e2c0, 0xf7d9b5, 0xf4e2c0, 0xefb8a0, 0xbfe3cf, 0xd2c4ee, 0xf6d77a, 0xf4e2c0, 0xa8d8ea, 0xf4cfc2];
const haussMats = TINTS.map(c => { const t = rep(haussTex, 1, 1); return new THREE.MeshStandardMaterial({ map: t, color: c, bumpMap: t, bumpScale: 1.0, roughness: 0.7 }); });
const zinc = new THREE.MeshStandardMaterial({ map: rep(slateTex, 2, 1), bumpMap: rep(slateTex, 2, 1), bumpScale: 1.2, color: 0xc9d4e2, roughness: 0.4, metalness: 0.25 });
const terracotta = new THREE.MeshStandardMaterial({ color: 0xd2694a, roughness: 0.6 });
const ROOFCOLS = [0xe4572e, 0x2e86ab, 0xf2c14e, 0x7b5ea7, 0x3fa34d].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.45 }));
function block(x, z, w, d, ht, rotY) {
  const m = haussMats[(rnd() * haussMats.length) | 0].clone(); m.map = rep(haussTex, w / 12, ht / 10); m.bumpMap = m.map;
  const b = new THREE.Mesh(new RoundedBoxGeometry(w, ht, d, 3, 1.2).translate(0, ht / 2, 0), m); b.position.set(x, 0, z); b.rotation.y = rotY; b.castShadow = b.receiveShadow = true; scene.add(b);
  const rh = 5 + rnd() * 2, rg = new RoundedBoxGeometry(w - 0.6, rh, d - 0.6, 3, 1.2); taperZ(rg, rh, 0.45); rg.translate(0, ht + rh / 2, 0);
  const r = new THREE.Mesh(rg, zinc); r.position.set(x, 0, z); r.rotation.y = rotY; r.castShadow = true; scene.add(r);
  const k = rnd();
  if (k < 0.22) { const dm = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.3, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), ROOFCOLS[(rnd() * ROOFCOLS.length) | 0]); dm.position.set(x, ht + rh, z); dm.castShadow = true; scene.add(dm); }
  else if (k < 0.4) { const c = new THREE.Mesh(new THREE.ConeGeometry(Math.min(w, d) * 0.28, Math.min(w, d) * 0.55, 24), ROOFCOLS[(rnd() * ROOFCOLS.length) | 0]); c.position.set(x + w * 0.3, ht + rh + Math.min(w, d) * 0.27, z); c.castShadow = true; scene.add(c); }
  for (let i = 0; i < 3; i++) { const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 2.4, 10), terracotta); ch.position.set(x + (rnd() - .5) * w * 0.7, ht + rh + 0.6, z + (rnd() - .5) * d * 0.4); scene.add(ch); }
}
for (let i = 0; i < 150; i++) {
  const x = -460 + rnd() * 920, z = -200 - rnd() * 650;
  if (Math.abs(x) < 30 && z > -320) continue;
  block(x, z, 22 + rnd() * 26, 16 + rnd() * 10, 17 + rnd() * 9, (rnd() - .5) * 0.25);
}

// ------------------------------------------------------------------ landmarks in the haze: Eiffel Tower, Sacre-Coeur
{ const grp = new THREE.Group(), iron = new THREE.MeshStandardMaterial({ color: 0xb4774a, metalness: 0.45, roughness: 0.45 });
  const TH = 300, prof = y => y < 58 ? 62 - y * 0.62 : y < 116 ? 26 - (y - 58) * 0.2 : Math.max(2, 14.4 * Math.pow(1 - (y - 116) / 190, 1.35));
  const beam = (a, b, r) => { const len = a.distanceTo(b); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 6), iron); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize()); m.castShadow = true; grp.add(m); };
  const N = 18, ys = Array.from({ length: N + 1 }, (_, i) => TH * Math.pow(i / N, 1.15));
  for (let i = 0; i < N; i++) { const y0 = ys[i], y1 = ys[i + 1], r0 = prof(y0), r1 = prof(y1);
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) beam(V(sx * r0, y0, sz * r0), V(sx * r1, y1, sz * r1), 2.6 - i * 0.12);
    for (const [ax, az, bx, bz] of [[1, 1, 1, -1], [1, -1, -1, -1], [-1, -1, -1, 1], [-1, 1, 1, 1]]) { beam(V(ax * r0, y0, az * r0), V(bx * r1, y1, bz * r1), 0.9); beam(V(bx * r0, y0, bz * r0), V(ax * r1, y1, az * r1), 0.9); } }
  for (const y of [58, 116, 276]) { const r = prof(y) + 3; const p = new THREE.Mesh(new RoundedBoxGeometry(r * 2, 5, r * 2, 2, 1), iron); p.position.y = y; p.castShadow = true; grp.add(p); }
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) { const arch = new THREE.Mesh(new THREE.TorusGeometry(26, 2.2, 8, 32, Math.PI), iron); arch.position.set(Math.sin(a) * 40, 16, Math.cos(a) * 40); arch.rotation.y = a + Math.PI / 2; grp.add(arch); }
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 2, 26, 8), iron); tip.position.y = TH + 10; grp.add(tip);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 10), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd27a, emissiveIntensity: 6 })); beacon.position.y = TH - 6; grp.add(beacon);
  grp.position.set(165, 0, -1150); grp.rotation.y = 0.35; scene.add(grp); }
{ const white = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.55, bumpMap: noiseTex, bumpScale: 0.3 });
  const hill = new THREE.Mesh(new THREE.SphereGeometry(260, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ map: rep(grassTex, 30, 30), color: 0x9fc28a, roughness: 0.95 }));
  hill.scale.set(1, 0.22, 1); hill.position.set(-210, 0, -1500); scene.add(hill);
  const B = V(-210, 57, -1500);
  const domeAt = (x, y, z, r, h) => { const d = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white); d.scale.y = h; d.position.set(B.x + x, B.y + y, B.z + z); d.castShadow = true; scene.add(d);
    const dr = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.9, 32), white); dr.position.set(B.x + x, B.y + y - r * 0.45, B.z + z); scene.add(dr);
    const sp = new THREE.Mesh(new THREE.ConeGeometry(r * 0.12, r * 0.6, 12), white); sp.position.set(B.x + x, B.y + y + r * h + r * 0.28, B.z + z); scene.add(sp); };
  const nave = new THREE.Mesh(new RoundedBoxGeometry(70, 30, 40, 3, 4).translate(0, 15, 0), white); nave.position.copy(B); nave.castShadow = true; scene.add(nave);
  domeAt(0, 50, 0, 17, 1.5); domeAt(-24, 36, 12, 7, 1.4); domeAt(24, 36, 12, 7, 1.4); domeAt(0, 50, -26, 9, 1.4);
  const bell = new THREE.Mesh(new RoundedBoxGeometry(10, 70, 10, 2, 2).translate(0, 35, 0), white); bell.position.set(B.x + 6, B.y, B.z - 34); scene.add(bell); }

// ------------------------------------------------------------------ chestnut trees, Paris lamps, tourists
{ const canopy = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, bumpMap: noiseTex, bumpScale: 0.5 }), 700);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.35, 1, 10).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: 0x7a5236, roughness: 0.85 }), 100);
  canopy.castShadow = canopy.receiveShadow = trunks.castShadow = true; let li = 0, ti = 0; const d = new THREE.Object3D();
  const tree = (x, z, s) => { d.position.set(x, 0, z); d.rotation.set(0, 0, 0); d.scale.set(s, s * 3.2, s); d.updateMatrix(); trunks.setMatrixAt(ti++, d.matrix);
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, r = k ? 1.3 * s : 0; d.position.set(x + Math.cos(a) * r, s * (k ? 4.0 + rnd() : 5.0), z + Math.sin(a) * r);
      d.scale.setScalar(s * (k ? 1.5 + rnd() * 0.4 : 2.0)); d.updateMatrix(); canopy.setMatrixAt(li, d.matrix); canopy.setColorAt(li++, new THREE.Color().setHSL(0.26 + rnd() * 0.05, 0.58, 0.34 + rnd() * 0.1)); } };
  for (let z = -10; z > -140; z -= 11) for (const x of [-72, -64, 64, 72]) tree(x + (rnd() - .5), z, 1.3 + rnd() * 0.3);
  for (let i = 0; i < 14; i++) tree(-40 - rnd() * 20, 10 - i * 8, 1.2 + rnd() * 0.3);
  trunks.count = ti; canopy.count = li; canopy.instanceColor.needsUpdate = true; scene.add(trunks, canopy); }
const lampGlow = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 5.0 });
function lamp(x, z) {
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 3.6, 12).translate(0, 1.8, 0), ironGreen); post.position.set(x, 0, z); post.castShadow = true; scene.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 12), ironGreen); base.position.set(x, 0.25, z); scene.add(base);
  const lan = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), lampGlow); lan.scale.y = 1.3; lan.position.set(x, 3.95, z); scene.add(lan);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.32, 12), ironGreen); cap.position.set(x, 4.38, z); scene.add(cap);
}
for (const [x, z] of [[-4.2, -7], [4.6, -9], [-7, -24], [7.5, -26], [-10, -44], [10, -46], [-14, -64], [14, -66]]) lamp(x, z);
{ const N = 180, body = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.21, 0.62, 4, 12).translate(0, 0.52, 0), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), N);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }), N);
  body.castShadow = head.castShadow = true; const d = new THREE.Object3D(); let n = 0;
  const cols = [0xff5a5f, 0x2ec4b6, 0xffbf3f, 0x5b8def, 0xa06cd5, 0xf7f7f2, 0x7bd389, 0xff8fab, 0x3d405b, 0xf28c28], skin = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];
  while (n < N) { const x = (rnd() - .5) * 60, z = -9 - rnd() * 75; if (Math.abs(x) < 3 && z > -14) continue; if (Math.hypot(x - PYR.x, z - PYR.z) < 27) continue;
    const s = 0.9 + rnd() * 0.25; d.position.set(x, 0, z); d.rotation.set(0, rnd() * 6, 0); d.scale.setScalar(s); d.updateMatrix(); body.setMatrixAt(n, d.matrix); body.setColorAt(n, new THREE.Color(cols[(rnd() * cols.length) | 0]));
    d.position.set(x, 1.34 * s, z); d.updateMatrix(); head.setMatrixAt(n, d.matrix); head.setColorAt(n, new THREE.Color(skin[(rnd() * skin.length) | 0])); n++; }
  body.instanceColor.needsUpdate = head.instanceColor.needsUpdate = true; scene.add(body, head); }

// ------------------------------------------------------------------ the Mona Lisa: 77 x 53 cm, gold frame, blue museum wall, rope barrier
const PW = 0.53, PH = 0.77, PC = V(-0.35, 1.45, 0.155);   // painting centre (its face plane)
const monaTex = canvasTex(1060, 1540, (g, w, h) => {
  const X = u => u * w, Y = v => v * h;
  const poly = (pts, fill) => { g.beginPath(); g.moveTo(X(pts[0][0]), Y(pts[0][1])); for (let i = 1; i < pts.length; i++) g.lineTo(X(pts[i][0]), Y(pts[i][1])); g.closePath(); g.fillStyle = fill; g.fill(); };
  const curve = (cmds, fill, stroke, lw) => { g.beginPath(); for (const c of cmds) { if (c[0] === "M") g.moveTo(X(c[1]), Y(c[2])); else if (c[0] === "L") g.lineTo(X(c[1]), Y(c[2])); else if (c[0] === "Q") g.quadraticCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4])); else if (c[0] === "C") g.bezierCurveTo(X(c[1]), Y(c[2]), X(c[3]), Y(c[4]), X(c[5]), Y(c[6])); }
    if (fill) { g.closePath(); g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
  // hazy sky + landscape
  let gr = g.createLinearGradient(0, 0, 0, h * 0.5); gr.addColorStop(0, "#c9d2ae"); gr.addColorStop(1, "#9db08e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  poly([[0, .38], [.05, .27], [.11, .31], [.17, .21], [.24, .29], [.3, .24], [.36, .33], [.36, .5], [0, .5]], "#86a08f");
  poly([[.62, .32], [.68, .22], [.74, .27], [.8, .19], [.87, .26], [.93, .22], [1, .3], [1, .5], [.62, .5]], "#86a08f");
  poly([[0, .44], [.08, .37], [.18, .41], [.3, .38], [.36, .42], [.36, .55], [0, .55]], "#9aa679");
  poly([[.62, .43], [.72, .38], [.84, .42], [.94, .37], [1, .4], [1, .55], [.62, .55]], "#9aa679");
  gr = g.createLinearGradient(0, h * 0.15, 0, h * 0.42); gr.addColorStop(0, "rgba(230,235,210,.0)"); gr.addColorStop(1, "rgba(230,235,210,.45)"); g.fillStyle = gr; g.fillRect(0, h * 0.15, w, h * 0.3);
  curve([["M", .04, .5], ["C", .14, .46, .1, .42, .24, .41], ["C", .3, .4, .28, .38, .35, .37]], null, "#d6c08a", 12);   // winding road
  curve([["M", .66, .46], ["Q", .8, .44, .98, .47]], null, "#7aa6a2", 10);                                            // river
  g.fillStyle = "#8a7550"; g.fillRect(X(.74), Y(.455), X(.16), Y(.012)); for (let i = 0; i < 4; i++) { g.fillStyle = "#4d4030"; g.beginPath(); g.arc(X(.765 + i * .04), Y(.475), X(.014), Math.PI, 0); g.fill(); }   // bridge
  gr = g.createLinearGradient(0, h * 0.5, 0, h * 0.66); gr.addColorStop(0, "#857244"); gr.addColorStop(1, "#5a4a2a"); g.fillStyle = gr; g.fillRect(0, h * 0.5, w, h * 0.16);
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(60,70,40,${0.25 + rnd() * 0.3})`; g.beginPath(); g.ellipse(X(rnd() < .5 ? rnd() * .3 : .7 + rnd() * .3), Y(.5 + rnd() * .1), X(.02 + rnd() * .03), Y(.01 + rnd() * .012), 0, 0, 7); g.fill(); }
  g.fillStyle = "#6a5430"; g.fillRect(0, Y(.6), w, Y(.06)); g.fillStyle = "rgba(255,230,170,.25)"; g.fillRect(0, Y(.6), w, Y(.006));                    // loggia parapet
  // body: dark dress, light from the upper left
  gr = g.createLinearGradient(X(.1), 0, X(.95), 0); gr.addColorStop(0, "#4a3a22"); gr.addColorStop(0.5, "#2e2416"); gr.addColorStop(1, "#1d170e");
  curve([["M", .04, 1.01], ["C", .04, .8, .06, .6, .16, .52], ["C", .24, .46, .33, .44, .41, .43], ["L", .57, .43], ["C", .67, .44, .76, .47, .83, .53], ["C", .93, .62, .96, .82, .98, 1.01]], gr);
  // sleeves (mustard folds) + hands
  gr = g.createLinearGradient(0, Y(.68), 0, Y(.95)); gr.addColorStop(0, "#9a7836"); gr.addColorStop(1, "#5d4520");
  curve([["M", .06, .93], ["C", .12, .78, .22, .72, .36, .74], ["C", .46, .76, .5, .82, .48, .88], ["C", .36, .9, .2, .95, .08, .99]], gr);
  curve([["M", .94, .95], ["C", .9, .8, .8, .72, .66, .73], ["C", .56, .74, .52, .8, .55, .86], ["C", .66, .88, .8, .93, .92, .99]], gr);
  g.strokeStyle = "rgba(50,35,15,.55)"; g.lineWidth = 5; for (let i = 0; i < 9; i++) { const u = .12 + i * .04; curve([["M", u, .78 + i * .006], ["Q", u + .03, .84, u + .01, .92]], null, "rgba(50,35,15,.5)", 4); curve([["M", 1 - u, .78 + i * .006], ["Q", 1 - u - .03, .84, 1 - u - .01, .92]], null, "rgba(50,35,15,.5)", 4); }
  const skinG = (x0, y0, x1, y1) => { const q = g.createLinearGradient(X(x0), Y(y0), X(x1), Y(y1)); q.addColorStop(0, "#efc68c"); q.addColorStop(1, "#b07c48"); return q; };
  curve([["M", .3, .82], ["C", .34, .76, .46, .76, .5, .8], ["C", .52, .84, .46, .88, .38, .88], ["C", .32, .88, .28, .86, .3, .82]], skinG(.3, .76, .5, .88));     // left hand (under)
  curve([["M", .4, .79], ["C", .48, .74, .62, .75, .66, .79], ["C", .68, .83, .6, .87, .5, .86], ["C", .42, .85, .38, .83, .4, .79]], skinG(.4, .74, .66, .87));   // right hand (over)
  for (let i = 0; i < 4; i++) curve([["M", .43 + i * .045, .795], ["Q", .45 + i * .045, .83, .44 + i * .045, .855]], null, "rgba(120,70,35,.55)", 3);
  // chest + neckline with embroidery
  curve([["M", .31, .475], ["C", .4, .465, .58, .465, .66, .475], ["C", .65, .53, .6, .575, .48, .58], ["C", .37, .575, .32, .53, .31, .475]], skinG(.33, .48, .64, .6));
  curve([["M", .31, .475], ["C", .32, .53, .37, .575, .48, .58], ["C", .6, .575, .65, .53, .66, .475]], null, "#8a6a2c", 7);
  for (let i = 0; i < 16; i++) { const u = i / 15, x = .315 + u * .34, y = .478 + Math.sin(u * Math.PI) * .1; g.fillStyle = "#b38a3e"; g.beginPath(); g.arc(X(x), Y(y), 4, 0, 7); g.fill(); }
  curve([["M", .43, .37], ["L", .55, .37], ["L", .56, .48], ["L", .42, .48]], skinG(.43, .37, .58, .48));                                                          // neck
  g.fillStyle = "rgba(110,70,35,.35)"; g.fillRect(X(.52), Y(.37), X(.04), Y(.1));
  // hair falling to the shoulders, thin veil
  gr = g.createLinearGradient(X(.3), 0, X(.7), 0); gr.addColorStop(0, "#3d2814"); gr.addColorStop(1, "#1f140a");
  curve([["M", .485, .11], ["C", .36, .11, .33, .2, .34, .3], ["C", .34, .38, .3, .44, .26, .5], ["C", .32, .5, .38, .46, .4, .4], ["C", .38, .3, .4, .18, .485, .13]], gr);
  curve([["M", .485, .11], ["C", .61, .11, .64, .2, .63, .3], ["C", .63, .38, .67, .45, .71, .5], ["C", .65, .5, .59, .46, .57, .4], ["C", .59, .3, .57, .18, .485, .13]], gr);
  for (let i = 0; i < 10; i++) { const sd = i % 2 ? 1 : -1, x = .485 + sd * (.1 + rnd() * .04); curve([["M", x, .16 + rnd() * .05], ["Q", x + sd * .03, .3, x + sd * .01, .44]], null, "rgba(110,75,40,.35)", 3); }
  // face: high forehead, no eyebrows, the soft smile
  gr = g.createRadialGradient(X(.45), Y(.22), X(.02), X(.49), Y(.27), X(.15)); gr.addColorStop(0, "#f4d29c"); gr.addColorStop(0.7, "#d9a86c"); gr.addColorStop(1, "#a9763f");
  g.fillStyle = gr; g.beginPath(); g.ellipse(X(.487), Y(.262), X(.108), Y(.142), 0, 0, 7); g.fill();
  curve([["M", .38, .15], ["Q", .487, .125, .595, .15]], null, "rgba(30,20,10,.45)", 3);                                                                          // veil edge
  for (const ex of [.44, .536]) { g.fillStyle = "rgba(120,80,40,.28)"; g.beginPath(); g.ellipse(X(ex), Y(.243), X(.036), Y(.016), 0, 0, 7); g.fill();
    g.fillStyle = "#eadbbd"; g.beginPath(); g.ellipse(X(ex), Y(.246), X(.026), Y(.009), 0, 0, 7); g.fill();
    g.fillStyle = "#3a2412"; g.beginPath(); g.arc(X(ex + .006), Y(.246), X(.011), 0, 7); g.fill(); g.fillStyle = "rgba(255,255,255,.7)"; g.beginPath(); g.arc(X(ex + .002), Y(.243), X(.003), 0, 7); g.fill();
    curve([["M", ex - .028, .244], ["Q", ex, .233, ex + .028, .244]], null, "#3b2412", 4); }
  curve([["M", .49, .25], ["Q", .487, .285, .5, .3]], null, "rgba(120,75,40,.5)", 4); g.fillStyle = "rgba(120,75,40,.35)"; g.beginPath(); g.ellipse(X(.495), Y(.303), X(.016), Y(.005), 0, 0, 7); g.fill();
  curve([["M", .452, .336], ["Q", .465, .343, .49, .341], ["Q", .512, .342, .526, .331]], null, "#7a3f2a", 5);                                                  // the smile
  curve([["M", .449, .333], ["Q", .446, .34, .452, .343]], null, "rgba(120,70,40,.4)", 3); curve([["M", .529, .328], ["Q", .533, .335, .527, .339]], null, "rgba(120,70,40,.4)", 3);
  g.fillStyle = "rgba(150,90,50,.25)"; g.beginPath(); g.ellipse(X(.49), Y(.355), X(.02), Y(.005), 0, 0, 7); g.fill();
  g.fillStyle = "rgba(230,140,110,.16)"; for (const cx of [.43, .55]) { g.beginPath(); g.ellipse(X(cx), Y(.295), X(.03), Y(.016), 0, 0, 7); g.fill(); }
  // old varnish: warm green-gold film, vignette, craquelure
  g.globalCompositeOperation = "multiply"; g.fillStyle = "rgba(220,205,140,1)"; g.fillRect(0, 0, w, h);
  gr = g.createRadialGradient(w / 2, h * 0.42, w * 0.25, w / 2, h / 2, h * 0.7); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(120,100,70,1)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = "source-over"; g.strokeStyle = "rgba(40,30,15,.12)"; g.lineWidth = 1;
  for (let i = 0; i < 260; i++) { g.beginPath(); let x = rnd() * w, y = rnd() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rnd() - .5) * 40; y += (rnd() - .5) * 40; g.lineTo(x, y); } g.stroke(); }
}, null);
monaTex.wrapS = monaTex.wrapT = THREE.ClampToEdgeWrapping;
const display = new THREE.Group(); scene.add(display);
{ const damask = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#2e4f78"; g.fillRect(0, 0, w, h); speckle(g, w, h, 8000, ["rgba(255,255,255,.04)", "rgba(0,0,0,.06)"], 2);
    g.strokeStyle = "rgba(160,190,230,.16)"; g.lineWidth = 6; for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { const cx = x * w / 2 + w / 4, cy = y * h / 2 + h / 4; g.beginPath(); g.ellipse(cx, cy, 60, 95, 0, 0, 7); g.stroke(); g.beginPath(); g.moveTo(cx, cy - 95); g.quadraticCurveTo(cx + 50, cy, cx, cy + 95); g.quadraticCurveTo(cx - 50, cy, cx, cy - 95); g.stroke(); } }, [2, 3]);
  const wallMat = new THREE.MeshStandardMaterial({ map: damask, bumpMap: damask, bumpScale: 0.4, roughness: 0.85 });
  const wall = new THREE.Mesh(new RoundedBoxGeometry(1.08, 2.15, 0.24, 4, 0.06).translate(0, 1.075, 0), wallMat); wall.position.set(PC.x, 0, 0); wall.castShadow = wall.receiveShadow = true; display.add(wall);
  const marble = new THREE.MeshStandardMaterial({ color: 0xece4d6, roughness: 0.35, bumpMap: noiseTex, bumpScale: 0.2 });
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.22, 0.34, 3, 0.04).translate(0, 0.11, 0), marble); plinth.position.set(PC.x, 0, 0); plinth.castShadow = plinth.receiveShadow = true; display.add(plinth);
  const cornice = new THREE.Mesh(new RoundedBoxGeometry(1.2, 0.1, 0.32, 3, 0.03), gold); cornice.position.set(PC.x, 2.17, 0); cornice.castShadow = true; display.add(cornice);
  const fw = 0.085, fd = 0.07, oW = PW + fw * 2, oH = PH + fw * 2;   // gold frame bars + corner rosettes
  for (const [w, h, x, y] of [[oW, fw, 0, (PH + fw) / 2], [oW, fw, 0, -(PH + fw) / 2], [fw, oH, -(PW + fw) / 2, 0], [fw, oH, (PW + fw) / 2, 0]]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(w, h, fd, 3, 0.025), gold); b.position.set(PC.x + x, PC.y + y, 0.12 + fd / 2 - 0.005); b.castShadow = b.receiveShadow = true; display.add(b);
    const lip = new THREE.Mesh(new RoundedBoxGeometry(w > h ? PW + 0.024 : 0.014, w > h ? 0.014 : PH + 0.024, 0.016, 2, 0.005), new THREE.MeshStandardMaterial({ color: 0x5a3c18, roughness: 0.5, metalness: 0.4 }));
    lip.position.set(PC.x + Math.sign(x) * (x ? PW / 2 + 0.006 : 0), PC.y + Math.sign(y) * (y ? PH / 2 + 0.006 : 0), 0.163); display.add(lip); }
  for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.035, 20, 14), gold); r.scale.z = 0.6; r.position.set(PC.x + sx * (PW + fw) / 2, PC.y + sy * (PH + fw) / 2, 0.19); display.add(r); }
  const canvas = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), new THREE.MeshStandardMaterial({ map: monaTex, roughness: 0.42, envMapIntensity: 0.35, bumpMap: noiseTex, bumpScale: 0.05 }));
  canvas.position.copy(PC); canvas.receiveShadow = true; display.add(canvas);
  const plaque = new THREE.Mesh(new RoundedBoxGeometry(0.34, 0.08, 0.012, 2, 0.004), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.3,
    map: canvasTex(512, 128, (g, w, h) => { g.fillStyle = "#d4a645"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a2810"; g.font = "800 40px Georgia, serif"; g.textAlign = "center"; g.fillText("LEONARDO DA VINCI", w / 2, 54); g.font = "italic 34px Georgia, serif"; g.fillText("Mona Lisa", w / 2, 100); }, null) }));
  plaque.position.set(PC.x, PC.y - PH / 2 - fw - 0.12, 0.128); display.add(plaque);
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8a948, metalness: 1, roughness: 0.25 });
  const posts = [V(-1.05, 0, 0.8), V(-0.35, 0, 0.9), V(0.3, 0, 0.8)];
  for (const p of posts) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.95, 16).translate(0, 0.475, 0), brass); po.position.copy(p); po.castShadow = true; display.add(po);
    const ba = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.04, 24), brass); ba.position.set(p.x, 0.02, p.z); ba.castShadow = true; display.add(ba);
    const tp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), brass); tp.position.set(p.x, 0.97, p.z); display.add(tp); }
  const velvet = new THREE.MeshStandardMaterial({ color: 0xb3122e, roughness: 0.55 });
  for (let i = 0; i < 2; i++) { const a = posts[i], b = posts[i + 1], pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push(V(a.x + (b.x - a.x) * u, 0.92 - Math.sin(u * Math.PI) * 0.16, a.z + (b.z - a.z) * u)); }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 32, 0.022, 10), velvet); rope.castShadow = true; display.add(rope); } }

// ------------------------------------------------------------------ Pion billboard (engine frames), shadow + contact shadow
const pionMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: false, depthTest: false, toneMapped: false, fog: false });
const pion = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }));   // shadow caster only
pion.castShadow = true; pion.layers.set(1); sun.shadow.camera.layers.enable(1);
pion.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5 });
scene.add(pion);
const pionScene = new THREE.Scene(), pionShow = new THREE.Mesh(pion.geometry, pionMat); pionShow.renderOrder = 2; pionScene.add(pionShow);
const contactTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(0,0,0,.75)"); gr.addColorStop(0.45, "rgba(0,0,0,.42)"); gr.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, null);
contactTex.colorSpace = THREE.NoColorSpace;
const contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthTest: true, depthWrite: false, color: 0x1a120a }));
contact.rotation.x = -Math.PI / 2; contact.renderOrder = 1; pionScene.add(contact);
let PION = null;
const texLoader = new THREE.TextureLoader();
let curTex = null;
async function pionFrame(url) {
  const t = await texLoader.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace;
  if (curTex) curTex.dispose(); curTex = t; pionMat.map = t; pion.customDepthMaterial.map = t; pionMat.needsUpdate = true; pion.customDepthMaterial.needsUpdate = true;
}
function placePion(anchor, height) {
  const k = height / (4.65 * PION.ppu), pw = PION.w * k, ph = PION.h * k;
  pion.scale.set(pw, ph, 1);
  const off = V((PION.w / 2 - PION.base[0]) * k, (PION.base[1] - PION.h / 2) * k, 0);
  const d = V(0, 0, 0).subVectors(camera.position, anchor); pion.rotation.set(0, Math.atan2(d.x, d.z), 0);   // upright, turned to the camera
  off.applyQuaternion(pion.quaternion); pion.position.copy(anchor).add(off);
}

// ------------------------------------------------------------------ shot: close on the painting -> whoosh out -> Pion beside it
const easeIO = u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
const easeOut = u => 1 - Math.pow(1 - u, 4);
const clamp01 = u => Math.max(0, Math.min(1, u));
function keyed(keys, t) {
  if (t <= keys[0].t) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const raw = (t - a.t) / Math.max(1e-6, b.t - a.t), u = (b.ease === "out" ? easeOut : easeIO)(raw), o = {};
      for (const k in a) o[k] = a[k] && a[k].isVector3 ? a[k].clone().lerp(b[k], u) : typeof a[k] === "number" ? a[k] + (b[k] - a[k]) * u : a[k];
      return o; } }
  return keys[keys.length - 1];
}
const PANCHOR = V(0.62, 0, 0.42);
const SHOTS = {
  mona: {
    cam: [
      { t: 0.00, pos: V(-0.35, 1.45, 1.62), tgt: V(-0.35, 1.45, 0), fov: 40, roll: 0 },
      { t: 1.36, pos: V(-0.35, 1.46, 1.40), tgt: V(-0.35, 1.46, 0), fov: 40, roll: 0 },
      { t: 2.05, pos: V(0.30, 1.30, 7.4), tgt: V(0.30, 1.62, 0), fov: 40, roll: -1.6, ease: "out" },
      { t: 5.40, pos: V(0.62, 1.34, 6.9), tgt: V(0.32, 1.60, 0), fov: 40, roll: -2.2 },
    ],
    hits: [2.05],
  },
};
function shake(t, hits) {
  let x = 0, y = 0;
  for (const h of hits) { const e = t - h; if (e < 0 || e > 0.5) continue; const a = Math.exp(-e * 8);
    x += a * (Math.sin(e * 91) * 0.6 + Math.sin(e * 57 + 1) * 0.4); y += a * (Math.sin(e * 73 + 2) * 0.6 + Math.sin(e * 131) * 0.4); }
  return [x, y];
}
const project = v => { const p = v.clone().project(camera); return [+((p.x + 1) / 2).toFixed(4), +((1 - p.y) / 2).toFixed(4), +p.z.toFixed(4)]; };

window.setup = async (pionInfo) => { PION = pionInfo; await envReady; return true; };
window.renderFrame = async (which, f, fps, pionUrl) => {
  const t = f / fps, S = SHOTS[which], pts = {};
  await pionFrame(pionUrl);
  const C = keyed(S.cam, t), [sx, sy] = shake(t, S.hits);
  camera.position.copy(C.pos); camera.position.x += sx * 0.035; camera.position.y += sy * 0.03; camera.fov = C.fov;
  camera.lookAt(C.tgt); camera.rotateZ(C.roll * Math.PI / 180);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  const dist = camera.position.distanceTo(PC);
  aimSun(dist < 2.5 ? V(PC.x, 1.2, 0) : V(0, 0, -12), dist < 2.5 ? 2.5 : 40);                       // crisp shadows close up, wider once out
  gtao.updateGtaoMaterial({ radius: Math.min(1.2, 0.12 + dist * 0.12), thickness: Math.min(0.8, 0.08 + dist * 0.1) });
  const height = 1.75, anchor = PANCHOR.clone();
  placePion(anchor, height);
  const WP = { ptl: V(PC.x - PW / 2, PC.y + PH / 2, PC.z), ptr: V(PC.x + PW / 2, PC.y + PH / 2, PC.z), pbl: V(PC.x - PW / 2, PC.y - PH / 2, PC.z), pbr: V(PC.x + PW / 2, PC.y - PH / 2, PC.z),
    pc: PC.clone(), pcorner: V(PC.x + PW / 2 + 0.05, PC.y + PH / 2 + 0.05, PC.z), pyr: V(PYR.x, 21.6, PYR.z), feet: anchor.clone() };
  for (const k in WP) pts[k] = project(WP[k]);
  pts.head = project(pion.localToWorld(V(0, 0.25, 0)));
  pionShow.position.copy(pion.position); pionShow.quaternion.copy(pion.quaternion); pionShow.scale.copy(pion.scale);
  const cw = height * 0.55; contact.scale.set(cw, cw * 0.5, 1); contact.position.set(anchor.x, 0.012, anchor.z); contact.material.opacity = 1;
  renderer.setRenderTarget(pionRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.autoClear = false;
  renderer.render(pionScene, camera); renderer.autoClear = true; renderer.setRenderTarget(null);
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture; inkPass.uniforms.near.value = camera.near; inkPass.uniforms.far.value = camera.far;
  composer.render();
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};

window.__ready = true;
