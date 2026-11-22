// "The Photograph": the street at dusk and Daniel Cross's apartment building (scene 5: "I tracked down the apartment ... Daniel Cross ... disappeared five years earlier").
// Same chain as office/apartment. Built to Pion's scale (a pawn ~1.03 m tall: doors 1.6 m, storeys 2.3 m). Dusk sky (violet -> peach) with cumulus,
// wet street, neon "APARTMENTS" (location colour: neon pink against violet), the boarded window of 7B, fire escape, wires with birds, rain,
// a MISSING poster of Daniel Cross on the lamp post next to Pion.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;   // static street: shadows baked once
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x9a86c8, 14, 60);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);

// ---------------------------------------------------------------- post chain
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.9;
gtao.updateGtaoMaterial({ radius: 0.5, distanceExponent: 1.6, thickness: 0.4, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
composer.addPass(gtao);
const inkPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2(W, H) }, near: { value: 0.05 }, far: { value: 200 }, ink: { value: new THREE.Color(0x1d1520) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tNormal, tDepth; uniform vec2 res; uniform float near, far; uniform vec3 ink; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float r0 = texture2D(tDepth, vUv).x; if (r0 > 0.99995) { gl_FragColor = c; return; }
      float d0 = lin(r0); vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0; float dm = 0.0, nm = 0.0;
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982; vec2 o = vec2(cos(a), sin(a)) * 1.5 / res;
        float r = texture2D(tDepth, vUv + o).x; float d = r > 0.99995 ? far : lin(r); dm = max(dm, (d - d0) / d0);
        vec3 n = texture2D(tNormal, vUv + o).xyz * 2.0 - 1.0; nm = max(nm, 1.0 - dot(n0, n)); }
      float e = max(smoothstep(0.03, 0.08, dm), smoothstep(0.25, 0.5, nm)) * smoothstep(60.0, 25.0, d0);
      gl_FragColor = vec4(mix(c.rgb, ink * c.rgb * 0.3 + ink * 0.7, e * 0.85), c.a); }`,
});
composer.addPass(inkPass);
const bokeh = new BokehPass(scene, camera, { focus: 6.0, aperture: 0.0008, maxblur: 0.006 }); composer.addPass(bokeh);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.5, 1.6));
composer.addPass(new OutputPass());
const pionRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType });
const pionComp = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tPion: { value: null } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tPion; varying vec2 vUv;
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
    void main(){ vec4 b = texture2D(tDiffuse, vUv), p = texture2D(tPion, vUv); vec3 pc = p.a > 1e-4 ? toSRGB(clamp(p.rgb / p.a, 0.0, 1.0)) : vec3(0.0); gl_FragColor = vec4(mix(b.rgb, pc, p.a), 1.0); }`,
});
pionComp.uniforms.tPion.value = pionRT.texture; composer.addPass(pionComp);
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.4 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.16); c = (c - 0.5) * 1.1 + 0.49; c += vec3(-0.005, -0.01, 0.035) * (1.0 - l);
      vec2 q = vUv - 0.5; c *= 1.0 - vig * smoothstep(0.3, 0.88, length(q * vec2(1.0, 0.72)));
      c += (h(vUv * 1000.0 + time) - 0.5) * 0.022; gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
});
composer.addPass(grade);

// ---------------------------------------------------------------- helpers
let seed = 1142; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canvasTex(w, h, draw, repeat) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); return t; }
const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
const add = (geo, m, x, y, z, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz;
  me.castShadow = o.cast !== false; me.receiveShadow = true; (o.parent || scene).add(me); return me; };
const box = (w, h, d, r = 0.02) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const hand = (g, txt, x, y, size, col = "#1d2a5a", rot = 0, font = "Caveat, cursive") => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.font = `700 ${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 0); g.restore(); };

// ---------------------------------------------------------------- sky + clouds
const skyTex = canvasTex(64, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#3a3f9a"); gr.addColorStop(0.45, "#707df0"); gr.addColorStop(0.78, "#d99ac0"); gr.addColorStop(1, "#ffb9ac"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
skyTex.wrapS = skyTex.wrapT = THREE.ClampToEdgeWrapping;
const sky = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })); scene.add(sky);
sky.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2) a[i] = Math.min(1, Math.max(0, (v - 0.48) / 0.52)); }); sky.geometry.attributes.uv.needsUpdate = true;
const cloudM = new THREE.ShaderMaterial({ fog: false, uniforms: { top: { value: new THREE.Color(0xf6dcea) }, bot: { value: new THREE.Color(0x8f7fc8) } },
  vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; uniform float y0; void main(){ vY = position.y; vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }`,
  fragmentShader: `uniform vec3 top, bot; varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float k = smoothstep(-1.2, 1.6, vY); vec3 c = mix(bot, top, k); c = mix(c, top * 1.08, pow(1.0 - abs(dot(vN, vV)), 2.0) * 0.35); gl_FragColor = vec4(c, 1.0); }` });
const clouds = [];
for (let i = 0; i < 9; i++) { const parts = []; const n = 5 + Math.floor(rnd() * 4); for (let k = 0; k < n; k++) { const s = new THREE.SphereGeometry(1.2 + rnd() * 1.4, 16, 12); s.translate((k - n / 2) * 1.5 + rnd(), rnd() * 0.9, rnd() * 1.2); parts.push(s); }
  const g = mergeGeometries(parts); g.scale(1, 0.7, 1); const c = new THREE.Mesh(g, cloudM); c.position.set(-60 + i * 15 + rnd() * 6, 28 + rnd() * 14, -70 - rnd() * 30); c.scale.setScalar(1.3 + rnd()); scene.add(c); clouds.push([c, c.position.x]); }

// ---------------------------------------------------------------- ground: wet street, sidewalks, curbs
const asphaltTex = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#3a3448"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const c = 40 + rnd() * 30; g.fillStyle = `rgba(${c},${c * .9},${c * 1.15},.5)`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
  g.fillStyle = "#e8d070"; for (let x = 0; x < w; x += 256) g.fillRect(x + 30, h / 2 - 10, 150, 20);   // centre dashes
  g.strokeStyle = "rgba(20,16,28,.6)"; g.lineWidth = 3; for (let i = 0; i < 12; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (rnd() - .5) * 60; y += (rnd() - .5) * 60; g.lineTo(x, y); } g.stroke(); }   // cracks
  for (let i = 0; i < 8; i++) { const x = rnd() * w, y = rnd() * h; g.fillStyle = "rgba(160,150,210,.25)"; g.beginPath(); g.ellipse(x, y, 40 + rnd() * 90, 14 + rnd() * 30, rnd(), 0, 7); g.fill(); }   // puddles
}, [4, 1]);
const SW = 2.4, ST = 5.0, FZ = -ST / 2 - SW;   // sidewalk width, street width, facade z
add(new THREE.PlaneGeometry(80, ST), mat({ map: asphaltTex, roughness: 0.28, metalness: 0.1 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false });
const paveTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#8c8296"; g.fillRect(0, 0, w, h); g.strokeStyle = "#4a4258"; g.lineWidth = 5; for (let x = 0; x <= w; x += 128) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(40,30,50,${rnd() * .12})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [40, 1.2]);
for (const sz of [-1, 1]) { add(box(80, 0.15, SW, 0.02), mat({ map: paveTex, roughness: 0.5 }), 0, 0.075, sz * (ST / 2 + SW / 2));
  add(box(80, 0.16, 0.12, 0.03), mat({ color: 0x9a92a6 }), 0, 0.08, sz * (ST / 2 + 0.06)); }

// ---------------------------------------------------------------- buildings
const brickTex = (base, mortar) => canvasTex(512, 512, (g, w, h) => { g.fillStyle = mortar; g.fillRect(0, 0, w, h);
  for (let y = 0, r = 0; y < h; y += 32, r++) for (let x = (r % 2) * -32; x < w; x += 64) { const c = new THREE.Color(base).offsetHSL((rnd() - .5) * 0.02, 0, (rnd() - .5) * 0.08); g.fillStyle = "#" + c.getHexString(); g.fillRect(x + 3, y + 3, 58, 26); }
  g.strokeStyle = "rgba(30,15,15,.35)"; g.lineWidth = 2; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y + 30); g.lineTo(w, y + 30); g.stroke(); } }, [3, 3]);
const winTex = (lit, boarded) => canvasTex(256, 320, (g, w, h) => {
  if (boarded) { g.fillStyle = "#14101c"; g.fillRect(0, 0, w, h); for (let k = 0; k < 4; k++) { g.save(); g.translate(w / 2, 50 + k * 72); g.rotate((rnd() - .5) * 0.25); g.fillStyle = "#7a5a3a"; g.fillRect(-w / 2 - 10, -24, w + 20, 48); g.strokeStyle = "#2a1a0e"; g.lineWidth = 6; g.strokeRect(-w / 2 - 10, -24, w + 20, 48); g.restore(); } return; }
  const gr = g.createLinearGradient(0, 0, 0, h); if (lit) { gr.addColorStop(0, "#ffd88a"); gr.addColorStop(1, "#ff9f5a"); } else { gr.addColorStop(0, "#2a2a5a"); gr.addColorStop(1, "#4a4a8a"); } g.fillStyle = gr; g.fillRect(0, 0, w, h);
  if (lit && rnd() < 0.6) { g.fillStyle = "rgba(90,40,30,.55)"; g.beginPath(); g.arc(w * (0.3 + rnd() * 0.4), h * 0.62, 34, 0, 7); g.fill(); g.fillRect(w * 0.2, h * 0.7, w * 0.6, h * 0.3); }   // a pawn silhouette inside
  g.fillStyle = lit ? "rgba(200,60,60,.55)" : "rgba(30,30,60,.6)"; g.fillRect(0, 0, w * 0.22, h); g.fillRect(w * 0.78, 0, w * 0.22, h);   // curtains
  g.strokeStyle = "#e8e0f0"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke(); });
const WTX = { lit: [winTex(true), winTex(true), winTex(true)], dark: [winTex(false), winTex(false)], boarded: winTex(false, true) };
const SH = 2.3;   // storey height (Pion scale)
function building(x0, w, floors, base, mortar, o = {}) {
  const G = new THREE.Group(); G.position.set(x0, 0, FZ - 0.4); scene.add(G); const Hh = floors * SH + 0.6;
  const bt = brickTex(base, mortar); bt.repeat.set(w / 1.6, Hh / 1.6); add(box(w, Hh, 0.8, 0.04), mat({ map: bt }), 0, Hh / 2, -0.4, { parent: G });
  add(box(w + 0.3, 0.3, 1.0, 0.05), mat({ color: 0x4a3a50 }), 0, Hh + 0.15, -0.3, { parent: G });   // cornice
  for (let f = 0; f < floors; f++) { add(box(w + 0.1, 0.12, 0.95, 0.02), mat({ color: 0x6a5a6a }), 0, f * SH + 0.06 + (f ? 0 : 0), -0.35, { parent: G });
    const n = Math.max(1, Math.floor(w / 1.5)); for (let i = 0; i < n; i++) { const wx = -w / 2 + (i + 0.5) * w / n; if (f === 0 && o.door != null && Math.abs(wx - o.door) < 0.9) continue;
      const key = o.boarded && o.boarded[0] === f && o.boarded[1] === i ? "boarded" : (rnd() < 0.55 ? "lit" : "dark");
      const t = key === "boarded" ? WTX.boarded : WTX[key][Math.floor(rnd() * WTX[key].length)];
      const m = key === "lit" ? new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.2, roughness: 0.3 }) : mat({ map: t, roughness: 0.3 });
      add(new THREE.PlaneGeometry(0.75, 0.95), m, wx, f * SH + 1.15, 0.005, { parent: G, cast: false });
      add(box(0.92, 0.08, 0.16, 0.02), mat({ color: 0xd8d0dc }), wx, f * SH + 0.62, 0.05, { parent: G });   // sill
      add(box(0.9, 0.1, 0.1, 0.02), mat({ color: 0xb8aac0 }), wx, f * SH + 1.68, 0.03, { parent: G });
      if (key === "lit") { const L = new THREE.PointLight(0xffb070, 0.35, 2.5, 2); L.position.set(x0 + wx, f * SH + 1.1, FZ + 0.3); scene.add(L); } } }
  return G; }
const MAIN = building(0, 6.0, 4, 0x8a4a3a, "#5a4a52", { door: -0.6, boarded: [2, 2] });   // 7B: third floor, third window (boarded)
building(-6.4, 6.2, 3, 0x6a6a8a, "#4a4a5a"); building(6.6, 6.6, 5, 0x9a7a5a, "#5a4a42"); building(-12.8, 6.0, 4, 0x7a5a7a, "#4a3a4a"); building(13.2, 6.0, 3, 0x5a7a7a, "#3a4a4a");
// opposite side of the street (behind the camera most of the time): simple dark blocks with lit windows
for (let i = 0; i < 6; i++) { const b = building(-15 + i * 6, 5.6, 3 + (i % 3), 0x5a4a6a, "#3a3048"); b.rotation.y = Math.PI; b.position.z = -FZ + 0.4; }
// entrance: steps, door with a little awning, the number, the neon sign
const DX = -0.6;
for (let k = 0; k < 3; k++) add(box(1.6 - k * 0.15, 0.12, 0.5 - k * 0.12, 0.02), mat({ color: 0x9a92a6 }), DX, 0.15 + k * 0.12, FZ + 0.25 - k * 0.06);
const doorTex = canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#2c3a5a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#141c30"; g.lineWidth = 10; g.strokeRect(30, 40, w - 60, 180); g.strokeRect(30, 260, w - 60, 210);
  g.fillStyle = "#ffd88a"; g.fillRect(48, 58, w - 96, 144); g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(w - 50, 300, 12, 0, 7); g.fill(); });
add(new THREE.PlaneGeometry(1.0, 1.65), new THREE.MeshStandardMaterial({ map: doorTex, emissive: 0xffffff, emissiveMap: doorTex, emissiveIntensity: 0.35 }), DX, 0.51 + 0.825, FZ + 0.01, { cast: false });
add(box(1.3, 0.1, 0.12, 0.02), mat({ color: 0x3a2a3a }), DX, 2.2, FZ + 0.06); for (const s of [-1, 1]) add(box(0.1, 1.75, 0.12, 0.02), mat({ color: 0x3a2a3a }), DX + s * 0.6, 1.35, FZ + 0.06);
const awnTex = canvasTex(512, 128, (g, w, h) => { for (let x = 0; x < w; x += 64) { g.fillStyle = (x / 64) % 2 ? "#e8e0d8" : "#2a5a8a"; g.fillRect(x, 0, 64, h); } g.strokeStyle = "#1a1a2a"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
add(box(1.6, 0.06, 0.7, 0.02), mat({ map: awnTex }), DX, 2.45, FZ + 0.35, { rx: 0.35 });
const numTex = canvasTex(256, 128, (g, w, h) => { g.fillStyle = "#e8e0d0"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2a1a1a"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.fillStyle = "#2a1a1a"; g.font = "900 72px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("No. 77", w / 2, h / 2 + 4); });
add(new THREE.PlaneGeometry(0.5, 0.25), mat({ map: numTex }), DX + 0.95, 1.9, FZ + 0.01, { cast: false });
const neonTex = canvasTex(160, 900, (g, w, h) => { g.fillStyle = "#1a1020"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2a1a30"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = "#ff4fa0"; g.font = "900 84px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; "APARTMENTS".split("").forEach((c, i) => g.fillText(c, w / 2, 60 + i * 84)); });
const neonM = new THREE.MeshStandardMaterial({ map: neonTex, emissive: 0xffffff, emissiveMap: neonTex, emissiveIntensity: 2.2, roughness: 0.4 });
const NEON = V(DX - 1.25, 3.4, FZ + 0.45);
add(box(0.42, 2.3, 0.14, 0.03), mat({ color: 0x1a1020 }), NEON.x, NEON.y, NEON.z); const neon = add(new THREE.PlaneGeometry(0.36, 2.1), neonM, NEON.x, NEON.y, NEON.z + 0.075, { cast: false });
for (const y of [-0.8, 0.8]) add(box(0.5, 0.05, 0.05, 0.01), mat({ color: 0x2a2a2a, metalness: 0.6 }), NEON.x, NEON.y + y, FZ + 0.2);
const neonL = new THREE.PointLight(0xff4fa0, 3.5, 6, 1.6); neonL.position.set(NEON.x, NEON.y - 0.5, NEON.z + 0.6); scene.add(neonL);
// fire escape on the main building (right half): platforms + zigzag ladders
const ironM = mat({ color: 0x2a2632, roughness: 0.5, metalness: 0.5 });
for (let f = 1; f < 4; f++) { const y = f * SH + 0.5; add(box(2.0, 0.05, 0.8, 0.01), ironM, 1.6, y, FZ + 0.45);
  for (let i = 0; i <= 10; i++) add(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), ironM, 0.6 + i * 0.2, y + 0.35, FZ + 0.84);
  add(box(2.0, 0.03, 0.03, 0.01), ironM, 1.6, y + 0.7, FZ + 0.84);
  if (f < 3) { const L = new THREE.Group(); L.position.set(1.6, y, FZ + 0.6); L.rotation.z = (f % 2 ? 1 : -1) * 0.78; scene.add(L); for (const s of [-0.18, 0.18]) add(box(0.03, 3.1, 0.03, 0.01), ironM, 0, 1.55, s, { parent: L }); for (let r = 0; r < 12; r++) add(box(0.03, 0.02, 0.36, 0.005), ironM, 0, 0.15 + r * 0.25, 0, { parent: L }); } }
// street lamps, the MISSING poster, wires with birds
const lampM = mat({ color: 0x2a2632, roughness: 0.45, metalness: 0.5 }), lamps = [];
for (const [x, z] of [[2.0, FZ + 0.9], [-6.0, FZ + 0.9], [9.0, FZ + 0.9], [-3.0, -FZ - 0.9], [6.0, -FZ - 0.9]]) {
  add(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 10), lampM, x, 1.85, z); add(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), lampM, x, 3.5, z + (z < 0 ? 0.3 : -0.3), { rx: Math.PI / 2 });
  const hd = add(new THREE.CylinderGeometry(0.12, 0.22, 0.22, 14), lampM, x, 3.45, z + (z < 0 ? 0.62 : -0.62));
  add(new THREE.SphereGeometry(0.1, 14, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.85, 0.6).multiplyScalar(6) }), x, 3.36, z + (z < 0 ? 0.62 : -0.62), { cast: false });
  const L = new THREE.SpotLight(0xffc98a, 18, 9, 0.75, 0.6, 1.4); L.position.set(x, 3.3, z + (z < 0 ? 0.62 : -0.62)); L.target.position.set(x, 0, z + (z < 0 ? 1.2 : -1.2)); scene.add(L, L.target); lamps.push(L); }
const posterTex = canvasTex(512, 720, (g, w, h) => { g.fillStyle = "#f2ead3"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(120,90,50,${rnd() * .07})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
  g.fillStyle = "#1d1d1d"; g.font = "900 96px Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("MISSING", w / 2, 110);
  g.fillStyle = "#e9e2cf"; g.fillRect(96, 150, 320, 300); g.strokeStyle = "#1d1d1d"; g.lineWidth = 6; g.strokeRect(96, 150, 320, 300);
  g.fillStyle = "#efe8d8"; g.beginPath(); g.arc(256, 260, 62, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#e3a536"; g.beginPath(); g.moveTo(200, 330); g.lineTo(312, 330); g.lineTo(350, 450); g.lineTo(162, 450); g.closePath(); g.fill(); g.stroke();   // Daniel: ivory pawn, mustard vest
  g.fillStyle = "#a8161c"; g.fillRect(250, 330, 12, 70); g.fillStyle = "#1d1d1d"; g.fillRect(222, 248, 18, 8); g.fillRect(272, 248, 18, 8); g.fillRect(238, 290, 36, 6);
  g.font = "800 58px Arial, sans-serif"; g.fillText("DANIEL CROSS", w / 2, 530); g.font = "600 36px Arial, sans-serif"; g.fillText("last seen 5 years ago", w / 2, 590);
  g.fillStyle = "#a01d22"; g.font = "700 34px Arial, sans-serif"; g.fillText("Apt. 7B  - please call", w / 2, 650); g.strokeStyle = "#3a2e22"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); });
const POSTER = V(2.0, 1.25, FZ + 0.9 + 0.075);
add(new THREE.PlaneGeometry(0.45, 0.63), mat({ map: posterTex, roughness: 0.9 }), POSTER.x, POSTER.y, POSTER.z, { rz: 0.04, cast: false });
for (const y of [0.86, 1.64]) add(new THREE.TorusGeometry(0.075, 0.008, 6, 20), mat({ color: 0x9a9aa0, metalness: 0.7 }), 2.0, y, FZ + 0.9, { rx: Math.PI / 2 });   // tape bands
// wires across the street + birds
const wireM = new THREE.MeshBasicMaterial({ color: 0x1a1420 });
function wire(a, b, sag) { const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, p = V(...a).lerp(V(...b), u); p.y -= Math.sin(u * Math.PI) * sag; pts.push(p); } const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.012, 4); scene.add(new THREE.Mesh(g, wireM)); return pts; }
const w1 = wire([-8, 6.5, FZ + 0.2], [8, 6.2, -FZ - 0.2], 0.8); wire([-8, 6.0, FZ + 0.2], [8, 5.6, -FZ - 0.2], 0.7); wire([-3, 7.0, FZ + 0.2], [4, 6.6, -FZ - 0.2], 0.9);
const birdM = new THREE.MeshBasicMaterial({ color: 0x1a1420 });
for (const u of [0.32, 0.38, 0.41, 0.6]) { const p = w1[Math.round(u * 24)]; add(new THREE.SphereGeometry(0.09, 10, 8), birdM, p.x, p.y + 0.1, p.z, { cast: false }); add(new THREE.SphereGeometry(0.055, 8, 6), birdM, p.x + 0.07, p.y + 0.2, p.z, { cast: false }); }
// parked car, mailbox, trash cans, hydrant
const carM = mat({ color: 0x3a6a8a, roughness: 0.35, metalness: 0.2 });
const CAR = new THREE.Group(); CAR.position.set(-3.6, 0, -1.4); scene.add(CAR);
add(box(2.6, 0.55, 1.2, 0.18), carM, 0, 0.5, 0, { parent: CAR }); add(box(1.4, 0.5, 1.1, 0.16), carM, -0.15, 0.98, 0, { parent: CAR });
add(box(1.3, 0.38, 1.12, 0.1), new THREE.MeshStandardMaterial({ color: 0x2a3050, roughness: 0.1, metalness: 0.5 }), -0.15, 1.0, 0, { parent: CAR });
for (const [x, z] of [[-0.85, -0.6], [0.85, -0.6], [-0.85, 0.6], [0.85, 0.6]]) add(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 18), mat({ color: 0x18141c }), x, 0.26, z, { rx: Math.PI / 2, parent: CAR });
add(box(0.12, 0.12, 0.22, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.3, 0.3).multiplyScalar(3) }), 1.31, 0.6, 0.4, { parent: CAR, cast: false });
add(box(0.42, 0.7, 0.42, 0.06), mat({ color: 0x2a4a8a }), -2.6, 0.5, FZ + 0.9); add(new THREE.CylinderGeometry(0.21, 0.21, 0.42, 16, 1, false, 0, Math.PI), mat({ color: 0x2a4a8a }), -2.6, 0.85, FZ + 0.9, { rz: Math.PI / 2, ry: Math.PI / 2 });
for (const x of [3.4, 3.9]) add(new THREE.CylinderGeometry(0.22, 0.2, 0.6, 14), mat({ color: 0x5a6a5a, metalness: 0.4, roughness: 0.5 }), x, 0.45, FZ + 0.5);
add(new THREE.CylinderGeometry(0.1, 0.12, 0.45, 12), mat({ color: 0xc03030 }), 4.6, 0.37, FZ + 1.9);
// rain: thin streaks
const rainN = 900, rainGeo = new THREE.BufferGeometry(), rainP = new Float32Array(rainN * 6), rainS = [];
for (let i = 0; i < rainN; i++) rainS.push([rnd() * 24 - 12, rnd() * 9, rnd() * 18 - 9, 0.6 + rnd() * 0.4]); rainGeo.setAttribute("position", new THREE.BufferAttribute(rainP, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xc8c0f0, transparent: true, opacity: 0.35, fog: true })); scene.add(rain);
function placeRain(t) { for (let i = 0; i < rainN; i++) { const [x, y0, z, s] = rainS[i]; const y = ((y0 - t * 9 * s) % 9 + 9) % 9; rainP.set([x + camera.position.x * 0.5, y, z + camera.position.z * 0.3, x + camera.position.x * 0.5 - 0.02, y + 0.22, z + camera.position.z * 0.3], i * 6); } rainGeo.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- lights
scene.add(new THREE.HemisphereLight(0xb0a0ff, 0x4a3050, 0.9));
const dusk = new THREE.DirectionalLight(0xffa080, 1.6); dusk.position.set(-14, 9, 12); dusk.target.position.set(0, 0, FZ); dusk.castShadow = true;
Object.assign(dusk.shadow.camera, { left: -14, right: 14, top: 14, bottom: -4, near: 1, far: 50 }); dusk.shadow.mapSize.set(2048, 2048); dusk.shadow.bias = -0.0005; scene.add(dusk, dusk.target);
const rim = new THREE.DirectionalLight(0x8a7aff, 0.8); rim.position.set(8, 6, -10); scene.add(rim);

// ---------------------------------------------------------------- characters on cards (as apartment.js)
const TL = new THREE.TextureLoader(), cardScene = new THREE.Scene(), cards = [], shadows = [];
const shTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(20,10,40,.75)"); gr.addColorStop(0.6, "rgba(20,10,40,.35)"); gr.addColorStop(1, "rgba(20,10,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
shTex.wrapS = shTex.wrapT = THREE.ClampToEdgeWrapping;
for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  m.visible = false; cardScene.add(m); cards.push(m);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, fog: false })); s.rotation.x = -Math.PI / 2; s.visible = false; s.renderOrder = 4; scene.add(s); shadows.push(s); }
const texCache = new Map();
async function loadTex(url) { if (texCache.has(url)) return texCache.get(url); const t = await TL.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; texCache.set(url, t);
  if (texCache.size > 8) { const k = texCache.keys().next().value; texCache.get(k).dispose(); texCache.delete(k); } return t; }
async function placeCards(list) {
  for (let i = 0; i < cards.length; i++) { const P = list[i], C = cards[i], S = shadows[i];
    if (!P || !P.url) { C.visible = false; S.visible = false; continue; }
    const t = await loadTex(P.url); C.material.map = t; C.material.needsUpdate = true; C.material.color.setRGB(...(P.tint || [1, 1, 1]));
    const k = P.height / (4.65 * P.ppu), A = V(...P.anchor), off = V((P.w / 2 - P.base[0]) * k, (P.base[1] - P.h / 2) * k, 0);
    if (P.face) C.quaternion.copy(camera.quaternion); else { const d = V().subVectors(camera.position, A); C.rotation.set(0, Math.atan2(d.x, d.z), 0); }
    if (P.roll) C.rotateZ(P.roll);
    C.scale.set(P.w * k, P.h * k, 1); off.applyQuaternion(C.quaternion); C.position.copy(A).add(off); C.visible = true;
    const sw = P.shadow || [0.95, 0.5]; S.visible = P.shadow !== false; S.scale.set(sw[0], sw[1], 1); S.position.set(A.x, A.y + 0.006, A.z); }
}

// ---------------------------------------------------------------- render
window.EX = { FZ, DX, POSTER: POSTER.toArray(), NEON: NEON.toArray(), WIN7B: [0.75, 2 * SH + 1.15, FZ] };
window.renderFrame = async (F) => {   // F: { t, cam, pions:[...] }
  camera.position.set(...F.cam.pos); camera.fov = F.cam.fov; camera.updateProjectionMatrix(); camera.lookAt(...F.cam.tgt); if (F.cam.roll) camera.rotateZ(F.cam.roll); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = F.cam.focus; bokeh.uniforms.aperture.value = F.cam.aperture ?? 0.0008; grade.uniforms.time.value = F.t; placeRain(F.t);
  const t = F.t, fl = (Math.sin(t * 23) > 0.85 || (t % 2.7) < 0.09) ? 0.15 : 1; neonM.emissiveIntensity = 2.2 * fl; neonL.intensity = 3.5 * fl;   // neon flicker
  for (const [c, x0] of clouds) c.position.x = x0 + t * 0.4;
  const list = (F.pions || (F.pion ? [F.pion] : [])); await placeCards(list);
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  renderer.setRenderTarget(pionRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(cardScene, camera); renderer.setRenderTarget(null);
  composer.render();
  const pr = (p) => { const q = V(...p).project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2, q.z]; };
  const pts = { poster: pr(POSTER.toArray()), neon: pr(NEON.toArray()) }; list.forEach((P, i) => { if (P && P.anchor) pts["pion" + i] = pr([P.anchor[0], P.anchor[1] + P.height * 0.75, P.anchor[2]]); });
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};

{ const orig = gtao.render.bind(gtao); gtao.render = (...a) => { const H = [rain].filter(Boolean), v = H.map(o => o.visible); H.forEach(o => o.visible = false); orig(...a); H.forEach((o, i) => o.visible = v[i]); }; }   // volumes/particles stay out of the AO + ink depth
window.__ready = true;
