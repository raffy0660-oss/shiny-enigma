// proj10: Pion's detective office at night (mystery). Units: metres. Same render chain as the proj9 world
// (AgX, GTAO, ink lines from depth + normal, bloom on lamps, grade + vignette) plus the PANDUAN_SINEMATIK rules:
// one warm practical pool (green pendant lamp over the desk), deep blue night ambient, moonlight through blinds,
// volumetric cone with dust, painted textures with drawn lines, dense storytelling props, shadows blue not black.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { createChars } from "./charlayer.js";
import { LIGHT_PRESETS } from "./charpresets.js";

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.localClippingEnabled = true; renderer.shadowMap.autoUpdate = true;   // per light: the moon is baked (re-baked when a prop moves), the pendant key updates every frame (Pion's shadow)
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1024);
scene.fog = new THREE.FogExp2(0x101a3a, 0.035);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 60);

// ---------------------------------------------------------------- post chain
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.75;   // v2 lighting: less muddy AO
gtao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.6, thickness: 0.3, scale: 1.0, samples: 12, distanceFallOff: 1.0 });
gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
composer.addPass(gtao);
const inkPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, tNormal: { value: null }, tDepth: { value: null }, res: { value: new THREE.Vector2(W, H) }, near: { value: 0.05 }, far: { value: 60 }, ink: { value: new THREE.Color(0x150e0b) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse, tNormal, tDepth; uniform vec2 res; uniform float near, far; uniform vec3 ink; varying vec2 vUv;
    float lin(float d){ float z = d * 2.0 - 1.0; return 2.0 * near * far / (far + near - z * (far - near)); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float r0 = texture2D(tDepth, vUv).x; if (r0 > 0.99995) { gl_FragColor = c; return; }
      float d0 = lin(r0); vec3 n0 = texture2D(tNormal, vUv).xyz * 2.0 - 1.0; float dm = 0.0, nm = 0.0;
      for (int i = 0; i < 8; i++) { float a = float(i) * 0.7853982; vec2 o = vec2(cos(a), sin(a)) * 1.6 / res;
        float r = texture2D(tDepth, vUv + o).x; float d = r > 0.99995 ? far : lin(r); dm = max(dm, (d - d0) / d0);
        vec3 n = texture2D(tNormal, vUv + o).xyz * 2.0 - 1.0; nm = max(nm, 1.0 - dot(n0, n)); }
      float e = max(smoothstep(0.03, 0.08, dm), smoothstep(0.25, 0.5, nm));
      gl_FragColor = vec4(mix(c.rgb, ink * c.rgb * 0.3 + ink * 0.7, e * 0.88), c.a); }`,
});
composer.addPass(inkPass);
const bokeh = new BokehPass(scene, camera, { focus: 3.0, aperture: 0.0016, maxblur: 0.006 }); composer.addPass(bokeh);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.45, 2.2));
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
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.14); c = (c - 0.5) * 1.12 + 0.48;
      c += vec3(-0.01, 0.0, 0.025) * (1.0 - l);                                   // shadows lean blue
      vec2 q = vUv - 0.5; c *= 1.0 - 0.42 * smoothstep(0.28, 0.85, length(q * vec2(1.0, 0.72)));
      c += (h(vUv * 1000.0 + time) - 0.5) * 0.025;                                // fine film grain
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
});
composer.addPass(grade);

// ---------------------------------------------------------------- helpers
let seed = 24601; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canvasTex(w, h, draw, repeat) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); return t; }
const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
const add = (geo, m, x, y, z, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz;
  me.castShadow = o.cast !== false; me.receiveShadow = true; (o.parent || scene).add(me); return me; };
const box = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
const hand = (g, txt, x, y, size, col = "#1d2a5a", rot = 0, font = "Caveat, 'Comic Neue', cursive") => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.font = `700 ${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 0); g.restore(); };

// ---------------------------------------------------------------- room
const RW = 4.6, RD = 4.4, RH = 2.45, WH = 0.72, BACK = -2.6, FRONT = BACK + RD;   // sized for Pion (1.03 m to the hat top): ceiling, wainscot, door and furniture are his scale
const wallTex = canvasTex(1024, 1024, (g, w, h) => {   // dark teal wallpaper: soft vertical stripes + drawn damask diamonds
  g.fillStyle = "#1f4a4f"; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 128) { g.fillStyle = "#24555a"; g.fillRect(x, 0, 64, h); }
  g.strokeStyle = "rgba(10,30,32,.55)"; g.lineWidth = 3;
  for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { const cx = x + 64 + ((y / 128) % 2) * 0, cy = y + 64; g.beginPath(); g.moveTo(cx, cy - 26); g.quadraticCurveTo(cx + 18, cy, cx, cy + 26); g.quadraticCurveTo(cx - 18, cy, cx, cy - 26); g.stroke(); g.beginPath(); g.arc(cx, cy, 4, 0, 7); g.stroke(); }
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .06})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
}, [3, 1.6]);
const panelTex = canvasTex(1024, 512, (g, w, h) => {   // wood wainscot: planks + drawn seams + rail
  g.fillStyle = "#4a2c1d"; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 128) { g.fillStyle = x % 256 ? "#523222" : "#47291b"; g.fillRect(x, 40, 128, h - 40); g.strokeStyle = "#24140c"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 40); g.lineTo(x, h); g.stroke();
    g.strokeStyle = "rgba(30,15,8,.35)"; g.lineWidth = 2; for (let k = 0; k < 5; k++) { const xx = x + 18 + k * 22 + rnd() * 6; g.beginPath(); g.moveTo(xx, 60); g.bezierCurveTo(xx + 6, 200, xx - 6, 330, xx + 3, h); g.stroke(); } }
  g.fillStyle = "#5e3a26"; g.fillRect(0, 0, w, 40); g.strokeStyle = "#24140c"; g.lineWidth = 5; g.strokeRect(-5, 0, w + 10, 40);
}, [3, 1]);
const floorTex = canvasTex(1024, 1024, (g, w, h) => {   // dark plank floor with drawn seams
  for (let y = 0; y < h; y += 96) { let x = -(rnd() * 200); while (x < w) { const L = 260 + rnd() * 260; const c = 52 + rnd() * 16; g.fillStyle = `rgb(${c},${c * .62},${c * .42})`; g.fillRect(x, y, L, 96);
    g.strokeStyle = "#1b0f08"; g.lineWidth = 4; g.strokeRect(x, y, L, 96); g.strokeStyle = "rgba(20,10,5,.3)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const yy = y + 20 + k * 26; g.beginPath(); g.moveTo(x + 10, yy); g.bezierCurveTo(x + L * .3, yy + 6, x + L * .7, yy - 6, x + L - 10, yy); g.stroke(); } x += L; } }
}, [3, 3]);
const wallM = mat({ map: wallTex }), panelM = mat({ map: panelTex });
add(new THREE.PlaneGeometry(RW, RD), mat({ map: floorTex, roughness: 0.6 }), 0, 0, BACK + RD / 2, { rx: -Math.PI / 2, cast: false }).userData.ground = true;   // ground: never occludes a character standing on it
add(new THREE.PlaneGeometry(RW, RD), mat({ color: 0x1a1f2e }), 0, RH, BACK + RD / 2, { rx: Math.PI / 2, cast: false });
for (const [w, x, z, ry] of [[RW, 0, BACK, 0], [RD, -RW / 2, BACK + RD / 2, Math.PI / 2], [RD, RW / 2, BACK + RD / 2, -Math.PI / 2]]) {
  const up = new THREE.Mesh(new THREE.PlaneGeometry(w, RH - WH), wallM); up.position.set(x, WH + (RH - WH) / 2, z); up.rotation.y = ry; up.receiveShadow = true; scene.add(up);
  const lo = new THREE.Mesh(new THREE.PlaneGeometry(w, WH), panelM); lo.position.set(x, WH / 2, z); lo.rotation.y = ry; lo.receiveShadow = true; scene.add(lo);
}
// crown moulding + skirting
const trimM = mat({ color: 0x3a2216 });
add(box(RW, 0.1, 0.06), trimM, 0, RH - 0.05, BACK + 0.03); add(box(RW, 0.12, 0.05), trimM, 0, 0.06, BACK + 0.025); add(box(RW, 0.05, 0.05), trimM, 0, WH, BACK + 0.03);

// ---------------------------------------------------------------- rug + desk + chair
const rugTex = canvasTex(1024, 640, (g, w, h) => { g.fillStyle = "#5a1a22"; g.fillRect(0, 0, w, h); g.strokeStyle = "#c79a4a"; g.lineWidth = 10; g.strokeRect(30, 30, w - 60, h - 60); g.strokeStyle = "#2a0c12"; g.lineWidth = 6; g.strokeRect(60, 60, w - 120, h - 120);
  g.fillStyle = "#7a2630"; for (let i = 0; i < 5; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(i * Math.PI / 5); g.fillRect(-260, -14, 520, 28); g.restore(); } g.fillStyle = "#c79a4a"; g.beginPath(); g.arc(w / 2, h / 2, 60, 0, 7); g.fill(); });
add(new THREE.PlaneGeometry(2.8, 1.75), mat({ map: rugTex }), 0, 0.004, -0.75, { rx: -Math.PI / 2, cast: false }).userData.ground = true;
const woodTex = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = "#5b3420"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(30,14,6,.45)"; g.lineWidth = 3;
  for (let k = 0; k < 22; k++) { const y = k * 24 + rnd() * 8; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 10 * (rnd() - .5) * 2, w * .6, y - 12, w, y + 6); g.stroke(); } g.strokeStyle = "#24110a"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
const deskM = mat({ map: woodTex, roughness: 0.55 }), deskDark = mat({ color: 0x3a1f12, roughness: 0.6 });
const DESK = { x: 0, z: -0.95, w: 2.1, d: 1.0, h: 0.78 };   // top at Pion's chest: his gloves rest on it
add(box(DESK.w, 0.06, DESK.d, 0.015), deskM, DESK.x, DESK.h - 0.03, DESK.z);
for (const sx of [-1, 1]) { add(box(0.5, DESK.h - 0.06, DESK.d - 0.06, 0.01), deskDark, sx * (DESK.w / 2 - 0.28), (DESK.h - 0.06) / 2, DESK.z);
  for (let k = 0; k < 3; k++) { add(box(0.44, 0.19, 0.02, 0.01), deskM, sx * (DESK.w / 2 - 0.28), 0.14 + k * 0.23, DESK.z + DESK.d / 2 - 0.02); add(box(0.1, 0.02, 0.03, 0.008), mat({ color: 0xc9a050, metalness: .8, roughness: .35 }), sx * (DESK.w / 2 - 0.28), 0.16 + k * 0.23, DESK.z + DESK.d / 2 + 0.005); } }
add(box(DESK.w - 1.1, 0.5, 0.03, 0.01), deskDark, DESK.x, 0.45, DESK.z + DESK.d / 2 - 0.12);   // modesty panel
// tufted bottle-green wingback chair sized for Pion (his base 0.86 m wide sits on the seat; the back and wings frame his head)
const PZ = DESK.z - 0.42, chairM = mat({ color: 0x1d4a39, roughness: 0.5 }), chairD = mat({ color: 0x14352a, roughness: 0.55 }), nailM = mat({ color: 0xd2a650, metalness: 0.85, roughness: 0.3 });
const CH = new THREE.Group(); CH.position.set(0, 0, PZ); scene.add(CH);
add(box(1.12, 1.3, 0.2, 0.08), chairM, 0, 1.08, -0.46, { parent: CH });                    // back: 0.43 .. 1.73 (above his hat)
add(new THREE.CapsuleGeometry(0.09, 1.0, 6, 16), chairM, 0, 1.74, -0.44, { rz: Math.PI / 2, parent: CH });   // top roll
for (const sx of [-1, 1]) { add(box(0.17, 0.85, 0.5, 0.07), chairM, sx * 0.6, 1.25, -0.24, { ry: sx * 0.18, parent: CH });   // wings
  add(box(0.2, 0.34, 0.86, 0.08), chairM, sx * 0.64, 0.62, -0.05, { parent: CH });                                        // arms
  add(new THREE.CapsuleGeometry(0.1, 0.7, 6, 14), chairM, sx * 0.64, 0.8, -0.05, { rx: Math.PI / 2, parent: CH }); }
add(box(1.12, 0.2, 0.86, 0.06), chairM, 0, 0.36, -0.05, { parent: CH }).userData.ground = true;   // the seat Pion sits on add(box(1.0, 0.24, 0.8, 0.03), chairD, 0, 0.13, -0.05, { parent: CH });
for (let r = 0; r < 4; r++) for (let c = 0; c < 5 - (r % 2); c++) add(new THREE.SphereGeometry(0.022, 10, 8), chairD, -0.4 + c * 0.2 + (r % 2) * 0.1, 0.72 + r * 0.24, -0.355, { parent: CH, cast: false });   // tufting buttons
for (let k = 0; k < 15; k++) { const u = k / 14; add(new THREE.SphereGeometry(0.012, 8, 6), nailM, -0.55 + u * 1.1, 0.46, -0.355, { parent: CH, cast: false }); }   // brass nail trim
for (const sx of [-0.45, 0.45]) for (const sz of [-0.4, 0.3]) add(new THREE.CylinderGeometry(0.035, 0.025, 0.06, 10), deskDark, sx, 0.03, sz, { parent: CH });

const PROPS0 = scene.children.length;   // everything from here to PROPS1 lies on the desk and is scaled to Pion's hands below
// desk mat (green leather)
add(box(0.95, 0.008, 0.55, 0.004), mat({ color: 0x1f4a33, roughness: 0.7 }), 0, DESK.h + 0.004, DESK.z + 0.02, { cast: false });
// ---------------------------------------------------------------- the stuff on the desk (dense, storytelling)
const paperTex = (kind, i) => canvasTex(512, 680, (g, w, h) => {
  g.fillStyle = ["#f1e9d6", "#efe4c8", "#f4efe2"][i % 3]; g.fillRect(0, 0, w, h);
  g.strokeStyle = "#3a2e22"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  if (kind === "typed") { g.fillStyle = "#2c2a33"; g.font = "700 30px Courier New, monospace"; g.fillText(["CASE FILE #1142", "MISSING PERSON", "WITNESS REPORT"][i % 3], 40, 70);
    for (let k = 0; k < 15; k++) { g.fillStyle = "rgba(40,40,50,.75)"; g.fillRect(40, 120 + k * 34, 300 + rnd() * 130, 10); }
    g.strokeStyle = "#b3262a"; g.lineWidth = 5; g.beginPath(); g.ellipse(250, 300 + (i % 4) * 60, 150, 26, -0.05, 0, 7); g.stroke(); }
  if (kind === "photo") { g.fillStyle = "#fbf8f0"; g.fillRect(0, 0, w, h); g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = ["#2c3b5a", "#3b2f2a", "#24343a"][i % 3]; g.fillRect(36, 36, w - 72, w - 72);
    g.fillStyle = "#d8c7a0"; g.fillRect(90, 260, 150, 120); g.fillStyle = "#1b1b22"; g.beginPath(); g.arc(330, 200, 70, 0, 7); g.fill(); g.strokeStyle = "#f4efe2"; g.lineWidth = 6; g.beginPath(); g.arc(330, 200, 70, 0, 7); g.stroke(); g.beginPath(); g.moveTo(330, 200); g.lineTo(330, 150); g.moveTo(330, 200); g.lineTo(360, 214); g.stroke();
    hand(g, ["11:42", "apt. 7B", "?"][i % 3], w / 2, h - 80, 54, "#2a2a6a"); }
  if (kind === "note") { g.fillStyle = "#f3e7a8"; g.fillRect(0, 0, w, h); for (let k = 0; k < 12; k++) { g.strokeStyle = "rgba(60,90,160,.35)"; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 90 + k * 46); g.lineTo(w, 90 + k * 46); g.stroke(); }
    hand(g, ["Find him", "FRIDAY?", "5 years..."][i % 3], w / 2, 180, 62); hand(g, ["before Friday", "who sent it?", "Daniel Cross"][i % 3], w / 2, 300, 50); }
});
const papers = [];
function paper(kind, i, x, z, ry, s = 0.21, lift = 0) { const t = paperTex(kind, i); const m = mat({ map: t, roughness: 0.9 });
  const p = add(box(s, 0.003, s * 1.33, 0.001), m, x, DESK.h + 0.009 + lift, z, { ry }); p.castShadow = true; papers.push(p); return p; }
paper("typed", 0, -0.32, DESK.z + 0.08, 0.25); paper("typed", 1, -0.18, DESK.z + 0.16, -0.18, 0.21, 0.004); paper("photo", 0, 0.34, DESK.z - 0.12, 0.32, 0.17, 0.008);
paper("note", 0, 0.28, DESK.z + 0.14, -0.35, 0.16, 0.002); paper("typed", 2, 0.45, DESK.z - 0.12, 0.5); paper("photo", 1, -0.55, DESK.z - 0.18, -0.4, 0.15);
paper("note", 1, 0.62, DESK.z + 0.2, 0.2, 0.15); paper("photo", 2, -0.12, DESK.z - 0.3, 0.9, 0.15, 0.003); paper("note", 2, -0.68, DESK.z + 0.22, -0.15, 0.14);
// manila folders (open + stacked)
const manilaM = mat({ color: 0xd2a35a, roughness: 0.85 }), manilaD = mat({ color: 0xb98a43 });
for (let k = 0; k < 4; k++) add(box(0.32, 0.012, 0.24, 0.004), k % 2 ? manilaD : manilaM, -0.62 + (rnd() - .5) * 0.03, DESK.h + 0.008 + k * 0.014, DESK.z - 0.05 + (rnd() - .5) * 0.04, { ry: 0.1 + (rnd() - .5) * 0.2 });
const tab = add(box(0.08, 0.012, 0.03, 0.004), manilaM, -0.66, DESK.h + 0.063, DESK.z - 0.18);
// rotary phone
const phoneM = mat({ color: 0x15151a, roughness: 0.35 });
add(box(0.2, 0.08, 0.16, 0.03), phoneM, 0.62, DESK.h + 0.04, DESK.z - 0.2, { ry: -0.4 }); add(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 24), mat({ color: 0xe8e2d0 }), 0.62, DESK.h + 0.086, DESK.z - 0.19, { ry: -0.4 });
const handset = add(new THREE.CapsuleGeometry(0.025, 0.17, 6, 12), phoneM, 0.62, DESK.h + 0.12, DESK.z - 0.22, { rz: Math.PI / 2, ry: -0.4 });
// mug + magnifier + pen + envelope
add(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 20), mat({ color: 0xe7e2d6 }), 0.32, DESK.h + 0.05, DESK.z - 0.25); add(new THREE.TorusGeometry(0.025, 0.007, 8, 16), mat({ color: 0xe7e2d6 }), 0.365, DESK.h + 0.055, DESK.z - 0.25, { ry: Math.PI / 2 });
add(new THREE.CylinderGeometry(0.036, 0.036, 0.004, 20), mat({ color: 0x2a140a }), 0.32, DESK.h + 0.098, DESK.z - 0.25, { cast: false });
const magR = add(new THREE.TorusGeometry(0.06, 0.009, 10, 32), mat({ color: 0xd9b040, metalness: .85, roughness: .3 }), 0.31, DESK.h + 0.012, DESK.z + 0.3, { rx: -Math.PI / 2 });
add(new THREE.CylinderGeometry(0.058, 0.058, 0.004, 32), new THREE.MeshPhysicalMaterial({ color: 0xbfe4ff, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.35 }), 0.31, DESK.h + 0.012, DESK.z + 0.3, { cast: false });
add(new THREE.CylinderGeometry(0.012, 0.014, 0.13, 10), mat({ color: 0x4a2412 }), 0.415, DESK.h + 0.012, DESK.z + 0.36, { rz: Math.PI / 2, ry: -0.5 });
add(new THREE.CylinderGeometry(0.006, 0.006, 0.15, 8), mat({ color: 0x1a1a40 }), -0.3, DESK.h + 0.02, DESK.z + 0.12, { rz: Math.PI / 2, ry: 0.7 });
const envTex = canvasTex(512, 340, (g, w, h) => { g.fillStyle = "#e9dcbc"; g.fillRect(0, 0, w, h); g.strokeStyle = "#3a2e22"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.beginPath(); g.moveTo(0, 0); g.lineTo(w / 2, h * .55); g.lineTo(w, 0); g.stroke(); g.fillStyle = "#8a1d1d"; g.beginPath(); g.arc(w / 2, h * .55, 26, 0, 7); g.fill(); hand(g, "NO SENDER", w / 2, h * .82, 34, "#2a2a2a"); });
// papers that slid onto the floor
for (let k = 0; k < 6; k++) { const p = add(box(0.3, 0.003, 0.4, 0.001), mat({ map: paperTex(["typed", "note", "photo"][k % 3], k + 3) }), -0.9 + k * 0.36 + (rnd() - .5) * 0.1, 0.006 + k * 0.001, -0.1 + (rnd() - .5) * 0.5, { ry: rnd() * 3 }); }


// ---------------------------------------------------------------- the case data on the desk (scene 1: the camera visits these instead of the wall)
const anonTex = await new THREE.TextureLoader().loadAsync("./tex/photo_front.jpg"); anonTex.colorSpace = THREE.SRGBColorSpace; anonTex.anisotropy = 8;   // the anonymous photograph = a still of apartment A (tools/make_photo.py)
const anon = add(box(0.22, 0.004, 0.275, 0.002), mat({ map: anonTex, roughness: 0.6 }), 0.0, DESK.h + 0.032, DESK.z + 0.22);
const calTex = canvasTex(512, 600, (g, w, h) => { g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, w, h); g.fillStyle = "#b3262a"; g.fillRect(0, 0, w, 150); g.strokeStyle = "#2b2018"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = "#fff"; g.font = "900 92px Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("FRIDAY", w / 2, 112); g.fillStyle = "#222"; g.font = "900 260px Georgia, serif"; g.fillText("14", w / 2, 420);
  g.strokeStyle = "#a01d22"; g.lineWidth = 16; g.beginPath(); g.ellipse(w / 2, 335, 190, 140, -0.06, 0, 7); g.stroke(); hand(g, "3 days", w / 2, 545, 64, "#a01d22"); });
const cal = new THREE.Group(); cal.position.set(0.47, DESK.h + 0.005, DESK.z + 0.2); cal.rotation.y = -0.35; scene.add(cal);
add(box(0.15, 0.17, 0.006, 0.002), mat({ map: calTex }), 0, 0.08, 0.02, { rx: -0.32, parent: cal });
add(box(0.15, 0.17, 0.006, 0.002), mat({ color: 0x2a2a2a }), 0, 0.08, -0.03, { rx: 0.32, parent: cal });
for (const x of [-0.05, 0, 0.05]) add(new THREE.TorusGeometry(0.008, 0.002, 6, 12), mat({ color: 0xbfc4c8, metalness: .9 }), x, 0.165, 0.0, { ry: Math.PI / 2, parent: cal });

const PROPS1 = scene.children.length, PIV = V(DESK.x, DESK.h, DESK.z), PS = 1.5, SPREAD = V(1.3, PS, 1.0);
for (const o of scene.children.slice(PROPS0, PROPS1)) { if (o.position.y < DESK.h - 0.05) continue; o.position.sub(PIV).multiply(SPREAD).add(PIV); o.scale.multiplyScalar(PS); }
const ANON0 = { p: anon.position.clone(), r: anon.rotation.clone() };
window.PROPS = { anon: anon.position.toArray(), cal: cal.position.toArray(), mag: magR.position.toArray() };

// ---------------------------------------------------------------- the pendant lamp + its light (the hero of the shot)
const LAMP = V(0, 2.04, DESK.z + 0.02);
const shadeM = mat({ color: 0x1f6b45, roughness: 0.35, metalness: 0.2, side: THREE.DoubleSide });
const shade = new THREE.Mesh(new THREE.LatheGeometry([V(0.03, 0.17, 0), V(0.06, 0.15, 0), V(0.12, 0.09, 0), V(0.22, 0.0, 0), V(0.235, -0.01, 0)].map(p => new THREE.Vector2(p.x, p.y)), 40), shadeM);
shade.position.copy(LAMP); shade.castShadow = true; scene.add(shade);
const inner = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.028, 0.165), new THREE.Vector2(0.115, 0.088), new THREE.Vector2(0.226, -0.004)], 40), mat({ color: 0xfff1c8, emissive: 0xffd88a, emissiveIntensity: 0.8, side: THREE.BackSide }));
inner.position.copy(LAMP); scene.add(inner);
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.86, 0.58).multiplyScalar(9) })); bulb.position.copy(LAMP).add(V(0, 0.06, 0)); scene.add(bulb);
add(new THREE.CylinderGeometry(0.004, 0.004, RH - LAMP.y - 0.17, 6), mat({ color: 0x111111 }), LAMP.x, (RH + LAMP.y + 0.17) / 2, LAMP.z, { cast: false });
add(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), mat({ color: 0x1b1b1b, metalness: .5 }), LAMP.x, RH - 0.015, LAMP.z);
const key = new THREE.SpotLight(0xffd59a, 7.5, 6, 0.6, 0.6, 1.5);
key.position.copy(LAMP).add(V(0, 0.05, 0)); key.target.position.set(0, DESK.h, DESK.z + 0.05); key.castShadow = true;
key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.radius = 4; key.shadow.camera.near = 0.1; key.shadow.camera.far = 6; scene.add(key, key.target);
const lampFill = new THREE.PointLight(0xffc27a, 0.6, 3.2, 2); lampFill.position.copy(LAMP).add(V(0, 0.12, 0)); scene.add(lampFill);
const deskBounce = new THREE.PointLight(0xff9a5a, 0.5, 2.6, 2); deskBounce.position.set(0, DESK.h + 0.25, DESK.z + 0.75); scene.add(deskBounce);   // warm bounce off the papers lifts the desk front + floor a little   // bounce up onto the shade / ceiling
// volumetric cone + dust motes inside it
const coneH = LAMP.y - DESK.h - 0.02;
const coneM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { col: { value: new THREE.Color(1.0, 0.82, 0.52) }, k: { value: 0.24 } },
  vertexShader: `varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); vY = uv.y; gl_Position = projectionMatrix * w; }`,
  fragmentShader: `uniform vec3 col; uniform float k; varying vec3 vN; varying vec3 vV; varying float vY;
    void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 3.0); float a = k * edge * (0.2 + 0.8 * vY * vY); gl_FragColor = vec4(col * a, a); }` });
const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.95, coneH, 48, 1, true), coneM); cone.position.set(LAMP.x, LAMP.y - coneH / 2 - 0.01, LAMP.z); cone.renderOrder = 10; scene.add(cone);
const dustN = 120, dustGeo = new THREE.BufferGeometry(), dustP = new Float32Array(dustN * 3), dustS = [];
for (let i = 0; i < dustN; i++) { const y = rnd(), r = (0.2 + 0.7 * (1 - y)) * Math.sqrt(rnd()) * 0.9, a = rnd() * 6.283; dustS.push([r, a, y, 0.2 + rnd() * 0.8]); }
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustP, 3));
const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,240,210,1)"); gr.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.007, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2b0, opacity: 0.75 })); dust.renderOrder = 11; scene.add(dust);
function placeDust(t) { for (let i = 0; i < dustN; i++) { const [r, a, y0, sp] = dustS[i]; const y = (y0 + t * 0.012 * sp) % 1, aa = a + t * 0.05 * sp;
  dustP[i * 3] = LAMP.x + Math.cos(aa) * r * (0.25 + 0.75 * (1 - y)); dustP[i * 3 + 1] = DESK.h + 0.05 + y * (coneH - 0.1); dustP[i * 3 + 2] = LAMP.z + Math.sin(aa) * r * (0.25 + 0.75 * (1 - y)); } dustGeo.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- night: blue ambient + moonlight through the blinds (left wall window)
scene.add(new THREE.HemisphereLight(0x3e5cc0, 0x2a1a14, 0.62));
const nightFill = new THREE.PointLight(0x5a78ff, 1.1, 7, 1.5); nightFill.position.set(-1.6, 1.9, -0.6); scene.add(nightFill);
const WIN = { z: -1.2, y: 1.42, w: 1.1, h: 1.05 };
const blindsTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; for (let y = 0; y < h; y += 40) g.fillRect(0, y + 14, w, 22); });
const moon = new THREE.SpotLight(0x7d9cff, 24, 9, 0.42, 0.25, 1.2);
moon.position.set(-RW / 2 - 2.0, WIN.y + 1.0, WIN.z + 0.4); moon.target.position.set(0.6, 0.9, -1.5); moon.map = blindsTex; moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024); moon.shadow.bias = -0.0005; scene.add(moon, moon.target);
// window: frame, rainy night city behind, half-closed blinds
const cityTex = canvasTex(512, 640, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0c1430"); gr.addColorStop(1, "#24356a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { const bw = 40 + rnd() * 70, bh = 150 + rnd() * 330, x = i * 58 - 20; g.fillStyle = "#0a0f22"; g.fillRect(x, h - bh, bw, bh); for (let yy = h - bh + 14; yy < h - 10; yy += 22) for (let xx = x + 8; xx < x + bw - 8; xx += 16) if (rnd() < .35) { g.fillStyle = rnd() < .8 ? "#ffcf6e" : "#8fd4ff"; g.fillRect(xx, yy, 7, 10); } }
  g.fillStyle = "#ff4a6a"; g.font = "700 46px Arial Black, sans-serif"; g.fillText("HOTEL", 300, 230);
  g.strokeStyle = "rgba(200,220,255,.35)"; g.lineWidth = 2; for (let i = 0; i < 160; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + 30); g.stroke(); } });
const city = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w, WIN.h), new THREE.MeshBasicMaterial({ map: cityTex, color: new THREE.Color(1.6, 1.6, 1.8) }));
city.position.set(-RW / 2 - 0.02, WIN.y, WIN.z); city.rotation.y = Math.PI / 2; scene.add(city);
const frameM = mat({ color: 0x2a1a12 });
for (const [w, h, y, z] of [[WIN.w + 0.12, 0.07, WIN.y + WIN.h / 2, WIN.z], [WIN.w + 0.12, 0.09, WIN.y - WIN.h / 2, WIN.z], [0.06, WIN.h, WIN.y, WIN.z - WIN.w / 2], [0.06, WIN.h, WIN.y, WIN.z + WIN.w / 2], [0.04, WIN.h, WIN.y, WIN.z]])
  add(box(0.06, h, w, 0.01), frameM, -RW / 2 + 0.03, y, z);
add(box(0.2, 0.04, WIN.w + 0.2, 0.01), frameM, -RW / 2 + 0.1, WIN.y - WIN.h / 2 - 0.05, WIN.z);   // sill
const slatM = mat({ color: 0xcfc6a8, roughness: 0.6 });
for (let k = 0; k < 12; k++) add(box(0.06, 0.008, WIN.w - 0.04, 0.003), slatM, -RW / 2 + 0.08, WIN.y + WIN.h / 2 - 0.06 - k * 0.055, WIN.z, { rz: 0.9 });
// ---------------------------------------------------------------- the case board on the back wall (the "case journey")
const boardTex = canvasTex(2048, 1260, (g, w, h) => {
  g.fillStyle = "#b8865a"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${90 + rnd() * 60},${55 + rnd() * 40},${30 + rnd() * 20},${.35 + rnd() * .4})`; g.fillRect(rnd() * w, rnd() * h, 3 + rnd() * 4, 3 + rnd() * 4); }
  const card = (x, y, cw, chh, rot, draw, bg = "#fbf8f0") => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(-cw / 2 + 12, -chh / 2 + 14, cw, chh); g.fillStyle = bg; g.fillRect(-cw / 2, -chh / 2, cw, chh); g.strokeStyle = "#2b2018"; g.lineWidth = 5; g.strokeRect(-cw / 2, -chh / 2, cw, chh); draw(cw, chh); g.restore(); };
  const pins = [];
  const pin = (x, y) => { pins.push([x, y]); };
  // 1 the anonymous photo (dead man + clock)
  card(300, 300, 300, 340, -0.06, (cw, ch) => { g.fillStyle = "#28324a"; g.fillRect(-cw / 2 + 20, -ch / 2 + 20, cw - 40, cw - 70); g.fillStyle = "#d9d2bf"; g.beginPath(); g.ellipse(-30, 30, 70, 22, 0.2, 0, 7); g.fill(); g.beginPath(); g.arc(-110, 18, 24, 0, 7); g.fill();
    g.fillStyle = "#151520"; g.beginPath(); g.arc(70, -50, 38, 0, 7); g.fill(); g.strokeStyle = "#f2ecdc"; g.lineWidth = 5; g.beginPath(); g.arc(70, -50, 38, 0, 7); g.moveTo(70, -50); g.lineTo(70, -78); g.moveTo(70, -50); g.lineTo(92, -40); g.stroke();
    hand(g, "the photo", 0, ch / 2 - 38, 40); }); pin(300, 150);
  // 2 sticky: Find him before Friday
  card(640, 220, 250, 230, 0.07, () => { hand(g, "Find him", 0, -40, 46); hand(g, "before", 0, 10, 46); hand(g, "Friday...", 0, 60, 46, "#a01d22"); }, "#f6e58d"); pin(640, 120);
  // 3 broken clock close-up 11:42
  card(960, 330, 260, 280, -0.04, (cw, ch) => { g.fillStyle = "#efe6cf"; g.beginPath(); g.arc(0, -20, 95, 0, 7); g.fill(); g.strokeStyle = "#2b2018"; g.lineWidth = 8; g.stroke(); g.lineWidth = 7; g.beginPath(); g.moveTo(0, -20); g.lineTo(-12, -78); g.moveTo(0, -20); g.lineTo(58, 10); g.stroke();
    g.strokeStyle = "#555"; g.lineWidth = 3; g.beginPath(); g.moveTo(-60, -90); g.lineTo(-10, -30); g.lineTo(-40, 30); g.moveTo(-10, -30); g.lineTo(50, -70); g.stroke(); hand(g, "11:42", 0, ch / 2 - 30, 46, "#a01d22"); }); pin(960, 190);
  // 4 the apartment
  card(1300, 250, 300, 300, 0.05, (cw, ch) => { g.fillStyle = "#3b3346"; g.fillRect(-cw / 2 + 20, -ch / 2 + 20, cw - 40, ch - 80); g.fillStyle = "#6a5a4a"; g.fillRect(-60, -80, 120, 160); for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) { g.fillStyle = r === 1 && c === 0 ? "#ffd27a" : "#1c1a24"; g.fillRect(-46 + c * 52, -66 + r * 50, 36, 34); }
    hand(g, "Apt. 7B", 0, ch / 2 - 32, 40); }); pin(1300, 110);
  // 5 missing poster: Daniel Cross (pawn silhouette)
  card(1680, 340, 300, 400, -0.06, (cw, ch) => { g.fillStyle = "#1d1d1d"; g.font = "900 54px Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("MISSING", 0, -ch / 2 + 70);
    g.fillStyle = "#e9e2cf"; g.fillRect(-90, -100, 180, 170); g.fillStyle = "#3a3a3a"; g.beginPath(); g.arc(0, -40, 40, 0, 7); g.fill(); g.beginPath(); g.moveTo(-28, -8); g.lineTo(28, -8); g.lineTo(52, 66); g.lineTo(-52, 66); g.closePath(); g.fill();
    g.font = "800 34px Arial, sans-serif"; g.fillText("DANIEL CROSS", 0, 120); g.font = "600 26px Arial, sans-serif"; g.fillText("5 years ago", 0, 160); }, "#f2ead3"); pin(1680, 150);
  // 6 calendar FRIDAY circled
  card(420, 820, 300, 300, 0.05, (cw, ch) => { g.fillStyle = "#b3262a"; g.fillRect(-cw / 2, -ch / 2, cw, 60); g.fillStyle = "#fff"; g.font = "800 34px Arial, sans-serif"; g.textAlign = "center"; g.fillText("WEEK", 0, -ch / 2 + 42);
    const d = ["M", "T", "W", "T", "F", "S", "S"]; for (let i = 0; i < 7; i++) { g.fillStyle = "#222"; g.font = "700 30px Arial"; g.fillText(d[i], -120 + i * 40, -40); g.fillText(String(10 + i), -120 + i * 40, 10); }
    g.strokeStyle = "#a01d22"; g.lineWidth = 6; g.beginPath(); g.arc(40, 0, 26, 0, 7); g.stroke(); hand(g, "FRIDAY!", 0, 90, 46, "#a01d22"); }); pin(420, 680);
  // 7 fingerprint card: NO PRINTS
  card(800, 860, 260, 240, -0.08, (cw, ch) => { g.strokeStyle = "#6a6a6a"; g.lineWidth = 4; for (let r = 10; r < 80; r += 10) { g.beginPath(); g.ellipse(0, -20, r, r * 1.3, 0, 0.3, 5.9); g.stroke(); } g.strokeStyle = "#a01d22"; g.lineWidth = 10; g.beginPath(); g.moveTo(-80, -100); g.lineTo(80, 60); g.stroke(); hand(g, "NO PRINTS", 0, ch / 2 - 30, 38, "#a01d22"); }); pin(800, 750);
  // 8 newspaper clipping
  card(1200, 830, 380, 300, 0.03, (cw, ch) => { g.fillStyle = "#1e1e1e"; g.font = "900 40px Georgia, serif"; g.textAlign = "center"; g.fillText("THE DAILY", 0, -ch / 2 + 50); g.font = "800 28px Georgia, serif"; g.fillText("MAN VANISHES WITHOUT", 0, -ch / 2 + 100); g.fillText("A TRACE", 0, -ch / 2 + 134);
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(30,30,30,.7)"; g.fillRect(-160, -10 + k * 22, 150, 8); g.fillRect(10, -10 + k * 22, 150, 8); } }, "#e8e0c8"); pin(1200, 700);
  // 9 big question mark: who sent it?
  card(1640, 860, 280, 280, -0.04, () => { g.fillStyle = "#a01d22"; g.font = "900 190px Arial Black, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("?", 0, -20); hand(g, "who sent it?", 0, 100, 40); }, "#f6e58d"); pin(1640, 740);
  // red string: the case journey
  const path = [[300, 150], [640, 120], [960, 190], [1300, 110], [1680, 150], [1640, 740], [1200, 700], [800, 750], [420, 680], [300, 150]];
  g.strokeStyle = "#c21f26"; g.lineWidth = 7; g.lineCap = "round"; g.shadowColor = "rgba(0,0,0,.45)"; g.shadowOffsetY = 6; g.shadowBlur = 4;
  for (let i = 0; i < path.length - 1; i++) { const [a, b] = [path[i], path[i + 1]]; g.beginPath(); g.moveTo(a[0], a[1]); g.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 40, b[0], b[1]); g.stroke(); }
  g.beginPath(); g.moveTo(960, 190); g.quadraticCurveTo(900, 500, 800, 750); g.stroke(); g.beginPath(); g.moveTo(1680, 150); g.quadraticCurveTo(1450, 450, 1200, 700); g.stroke();
  g.shadowColor = "transparent";
  for (const [x, y] of pins.concat([[960, 190]])) { g.fillStyle = "rgba(0,0,0,.4)"; g.beginPath(); g.arc(x + 5, y + 8, 18, 0, 7); g.fill(); g.fillStyle = "#d9262d"; g.beginPath(); g.arc(x, y, 17, 0, 7); g.fill(); g.strokeStyle = "#5a0c10"; g.lineWidth = 4; g.stroke(); g.fillStyle = "#ffb3b3"; g.beginPath(); g.arc(x - 5, y - 6, 5, 0, 7); g.fill(); }
  g.strokeStyle = "#3a2214"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
});
const BOARD = { w: 1.95, h: 1.2, y: 1.52 };
add(box(BOARD.w + 0.12, BOARD.h + 0.12, 0.05, 0.015), mat({ color: 0x3a2214 }), 0, BOARD.y, BACK + 0.03);
add(new THREE.PlaneGeometry(BOARD.w, BOARD.h), mat({ map: boardTex, roughness: 0.95 }), 0, BOARD.y, BACK + 0.058, { cast: false });
// brass picture lamp over the board: a soft warm wash so the case board reads in the dark
const brass = mat({ color: 0xc9a050, metalness: 0.85, roughness: 0.3 });
add(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 16), brass, 0, BOARD.y + BOARD.h / 2 + 0.16, BACK + 0.14, { rz: Math.PI / 2 });
add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), brass, 0, BOARD.y + BOARD.h / 2 + 0.11, BACK + 0.08, { rx: 0.9 });
const boardLight = new THREE.SpotLight(0xffc98a, 3.2, 3.5, 0.75, 0.85, 1.4); boardLight.position.set(0, BOARD.y + BOARD.h / 2 + 0.12, BACK + 0.3);
boardLight.target.position.set(0, BOARD.y - 0.2, BACK); scene.add(boardLight, boardLight.target);
// ---------------------------------------------------------------- right side: filing cabinet, coat rack, wall clock, frosted door sign
const CAB0 = scene.children.length;
const cabM = mat({ color: 0x55606a, roughness: 0.45, metalness: 0.35 });
add(box(0.55, 1.3, 0.6, 0.02), cabM, 1.85, 0.65, -1.9);
for (let k = 0; k < 4; k++) { add(box(0.5, 0.27, 0.02, 0.01), mat({ color: 0x66727c, roughness: .4, metalness: .35 }), 1.85, 0.2 + k * 0.31, -1.59); add(box(0.12, 0.025, 0.03, 0.01), mat({ color: 0xbfc4c8, metalness: .9, roughness: .3 }), 1.85, 0.27 + k * 0.31, -1.575); }
const drawerOut = add(box(0.5, 0.27, 0.45, 0.01), mat({ color: 0x66727c, roughness: .4, metalness: .35 }), 1.85, 1.13, -1.42);   // top drawer pulled out, files sticking up
for (let k = 0; k < 6; k++) add(box(0.4, 0.2, 0.01, 0.003), k % 2 ? manilaM : manilaD, 1.85, 1.25, -1.6 + k * 0.06, { rx: (rnd() - .5) * 0.3 });
add(box(0.32, 0.36, 0.04, 0.01), mat({ color: 0x2c2c2c }), 1.85, 1.52, -1.95, { rz: 0.05 });   // radio on top
add(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 24), mat({ color: 0xd9b040, metalness: .8, roughness: .35 }), 1.78, 1.55, -1.925, { rx: Math.PI / 2 });
{ const P0 = V(1.85, 0, -1.9); for (const o of scene.children.slice(CAB0)) { o.position.sub(P0).multiplyScalar(0.78).add(P0); o.scale.multiplyScalar(0.78); } }
// coat rack by the door, Pion height: his spare plaid cape and deerstalker hang on it
const plaidTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#8a5a32"; g.fillRect(0, 0, w, h); g.fillStyle = "rgba(60,34,18,.55)"; for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 22, h); for (let y = 0; y < h; y += 64) g.fillRect(0, y, w, 22);
  g.strokeStyle = "rgba(230,190,120,.55)"; g.lineWidth = 3; for (let x = 40; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); g.beginPath(); g.moveTo(0, x); g.lineTo(w, x); g.stroke(); } }, [3, 2]);
const rackM = mat({ color: 0x2c1a10 }), RX = 2.0, RZ = -0.12;
add(new THREE.CylinderGeometry(0.022, 0.026, 1.5, 10), rackM, RX, 0.75, RZ); add(new THREE.CylinderGeometry(0.2, 0.23, 0.04, 16), rackM, RX, 0.02, RZ);
for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; add(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), rackM, RX + Math.sin(a) * 0.06, 1.42, RZ + Math.cos(a) * 0.06, { rx: Math.cos(a) * 0.8, rz: -Math.sin(a) * 0.8 }); }
const capeM = mat({ map: plaidTex, side: THREE.DoubleSide, roughness: 0.9 });
add(new THREE.CylinderGeometry(0.13, 0.36, 0.78, 18, 1, true), capeM, RX, 1.0, RZ + 0.02); add(new THREE.TorusGeometry(0.13, 0.05, 10, 20), capeM, RX, 1.38, RZ + 0.02, { rx: Math.PI / 2 });
add(new THREE.SphereGeometry(0.25, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), capeM, RX - 0.02, 1.5, RZ + 0.05, { rz: 0.25 });   // deerstalker dome
add(new THREE.CylinderGeometry(0.27, 0.27, 0.02, 24), capeM, RX - 0.02, 1.5, RZ + 0.05, { rz: 0.25 });
// door on the right wall (front), Pion-size: frosted glass with his name (mirrored: read from inside), warm hallway light leaking under it
const DOOR = { x: RW / 2, z: 0.62, w: 0.95, h: 1.62, gap: 0.03 };
const doorWood = canvasTex(512, 1024, (g, w, h) => { g.fillStyle = "#7a4a2a"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(40,18,8,.45)"; g.lineWidth = 3;
  for (let k = 0; k < 26; k++) { const x = k * 20 + rnd() * 8; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 12 * (rnd() - .5), h * .3, x - 10, h * .6, x + 5, h); g.stroke(); } });
const doorM = mat({ map: doorWood, roughness: 0.6 }), doorD = mat({ color: 0x5a3219, roughness: 0.6 });
add(box(0.05, DOOR.h - DOOR.gap, DOOR.w, 0.01), doorM, DOOR.x - 0.035, DOOR.gap + (DOOR.h - DOOR.gap) / 2, DOOR.z);
add(box(0.035, 0.5, DOOR.w - 0.26, 0.012), doorD, DOOR.x - 0.07, 0.36, DOOR.z);                                          // raised lower panel
for (const [h, y] of [[0.05, 0.64], [0.05, 0.08]]) add(box(0.03, h, DOOR.w - 0.12, 0.01), doorD, DOOR.x - 0.07, y, DOOR.z);   // rails
for (const [w, h, y] of [[DOOR.w - 0.18, 0.05, 1.46], [DOOR.w - 0.18, 0.05, 0.78], [0.05, 0.73, 1.12]]) if (w > 0.1) add(box(0.03, h, w, 0.01), doorD, DOOR.x - 0.07, y, DOOR.z);
for (const sz of [-1, 1]) add(box(0.03, 0.73, 0.05, 0.01), doorD, DOOR.x - 0.07, 1.12, DOOR.z + sz * (DOOR.w - 0.23) / 2);   // glass frame sides
for (const [w, h, y, z] of [[0.08, DOOR.h + 0.08, DOOR.h / 2 + 0.04, DOOR.z - DOOR.w / 2 - 0.04], [0.08, DOOR.h + 0.08, DOOR.h / 2 + 0.04, DOOR.z + DOOR.w / 2 + 0.04], [DOOR.w + 0.16, 0.08, DOOR.h + 0.04, DOOR.z]])
  add(box(0.06, h, w, 0.01), trimM, DOOR.x - 0.03, y, z);
const glassTex = canvasTex(512, 420, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.7); gr.addColorStop(0, "#f6deaa"); gr.addColorStop(1, "#b98e5a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * 0.08})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
  g.save(); g.translate(w, 0); g.scale(-1, 1); g.fillStyle = "rgba(40,22,12,.85)"; g.textAlign = "center"; g.font = "900 64px Georgia, serif"; g.fillText("SUCCIFY", w / 2, 170); g.font = "700 34px Georgia, serif"; g.fillText("PRIVATE DETECTIVE", w / 2, 230);
  g.font = "italic 28px Georgia, serif"; g.fillText("knock first", w / 2, 300); g.restore(); g.strokeStyle = "#24140c"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); });
const glassM = mat({ map: glassTex, emissive: 0xffffff, emissiveMap: glassTex, emissiveIntensity: 0.32, roughness: 0.3 });
add(new THREE.PlaneGeometry(DOOR.w - 0.25, 0.62), glassM, DOOR.x - 0.062, 1.12, DOOR.z, { ry: -Math.PI / 2, cast: false });
add(new THREE.SphereGeometry(0.035, 16, 12), nailM, DOOR.x - 0.09, 0.72, DOOR.z - DOOR.w / 2 + 0.1);                       // brass knob
add(box(0.02, 0.12, 0.05, 0.005), nailM, DOOR.x - 0.065, 0.72, DOOR.z - DOOR.w / 2 + 0.1);
const spillTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(w, 0, 0, 0); gr.addColorStop(0, "rgba(255,200,130,1)"); gr.addColorStop(0.25, "rgba(255,180,110,.45)"); gr.addColorStop(1, "rgba(255,170,100,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const gz = g.createLinearGradient(0, 0, 0, h); gz.addColorStop(0, "rgba(0,0,0,1)"); gz.addColorStop(0.12, "rgba(0,0,0,0)"); gz.addColorStop(0.88, "rgba(0,0,0,0)"); gz.addColorStop(1, "rgba(0,0,0,1)"); g.globalCompositeOperation = "destination-out"; g.fillStyle = gz; g.fillRect(0, 0, w, h); });
const spill = add(new THREE.PlaneGeometry(0.75, DOOR.w * 1.05), new THREE.MeshBasicMaterial({ map: spillTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55 }), DOOR.x - 0.375, 0.003, DOOR.z, { rx: -Math.PI / 2, cast: false });
spill.renderOrder = 5;
const hallLight = new THREE.PointLight(0xffb06a, 0.35, 1.1, 2); hallLight.position.set(DOOR.x - 0.08, 0.05, DOOR.z);
const doorFill = new THREE.SpotLight(0xc8b4d8, 1.6, 4, 0.5, 0.8, 1.2); doorFill.position.set(0.6, 1.9, 0.9); doorFill.target.position.set(DOOR.x, 0.8, DOOR.z); scene.add(doorFill, doorFill.target);   // cool night fill so the door reads scene.add(hallLight);
add(new THREE.PlaneGeometry(DOOR.w - 0.02, DOOR.gap), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.75, 0.45).multiplyScalar(2.5) }), DOOR.x - 0.012, DOOR.gap / 2, DOOR.z, { ry: -Math.PI / 2, cast: false });
// the envelope: a movable prop (slides under the door in scene 2, then lies open on the desk). F.env = { p:[x,y,z], ry, flap 0..1, vis }
const envTex2 = canvasTex(640, 420, (g, w, h) => { g.fillStyle = "#ead9b2"; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(120,90,50,${rnd() * 0.07})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
  g.strokeStyle = "#3a2e22"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); g.lineWidth = 3; g.strokeStyle = "rgba(58,46,34,.5)"; g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.42, h * 0.52); g.moveTo(w, h); g.lineTo(w * 0.58, h * 0.52); g.stroke();
  hand(g, "NO SENDER", w / 2, h * 0.7, 66, "#2a2a2a", -0.03); g.strokeStyle = "#a01d22"; g.lineWidth = 5; g.beginPath(); g.moveTo(w * 0.22, h * 0.83); g.lineTo(w * 0.78, h * 0.81); g.stroke(); });
const flapTex = canvasTex(640, 300, (g, w, h) => { g.fillStyle = "#e3cfa4"; g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w / 2, h); g.closePath(); g.fill(); g.strokeStyle = "#3a2e22"; g.lineWidth = 8; g.stroke();
  g.fillStyle = "#8a1d1d"; g.beginPath(); g.arc(w / 2, h - 46, 34, 0, 7); g.fill(); g.fillStyle = "#b8343a"; g.beginPath(); g.arc(w / 2 - 8, h - 54, 12, 0, 7); g.fill(); });
const ENV = new THREE.Group(); scene.add(ENV); const EW = 0.36, ED = 0.24;
const envBody = add(box(EW, 0.008, ED, 0.002), [mat({ color: 0xd9c49a }), mat({ color: 0xd9c49a }), mat({ map: envTex2, roughness: 0.85, emissive: 0xffffff, emissiveMap: envTex2, emissiveIntensity: 0.22 }), mat({ color: 0xcdb789 }), mat({ color: 0xd9c49a }), mat({ color: 0xd9c49a })], 0, 0.004, 0, { parent: ENV });
const flapPivot = new THREE.Group(); flapPivot.position.set(0, 0.009, -ED / 2); ENV.add(flapPivot);
const flapGeo = new THREE.BufferGeometry(); flapGeo.setAttribute("position", new THREE.Float32BufferAttribute([-EW / 2, 0, 0, EW / 2, 0, 0, 0, 0, ED * 0.55], 3)); flapGeo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 0.5, 0], 2)); flapGeo.computeVertexNormals();
const flap = new THREE.Mesh(flapGeo, mat({ map: flapTex, side: THREE.DoubleSide, roughness: 0.85 })); flap.castShadow = true; flapPivot.add(flap);
const ENV_DESK = { p: [-0.36, DESK.h + 0.055, DESK.z + 0.24], ry: 0.32, flap: 1 };   // where it rests, opened, on the desk
function placeEnv(E) { E = Object.assign({}, ENV_DESK, E || {}); ENV.visible = E.vis !== false; ENV.position.set(...E.p); ENV.rotation.set(E.rx || 0, E.ry || 0, E.rz || 0); flapPivot.rotation.x = -E.flap * 2.6; }
window.PROPS.door = [DOOR.x, 0, DOOR.z]; window.PROPS.envDesk = ENV_DESK.p;
// wall clock (frozen soon at 11:42) on the right wall
const clockTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#efe6cf"; g.beginPath(); g.arc(256, 256, 240, 0, 7); g.fill(); g.strokeStyle = "#2b2018"; g.lineWidth = 16; g.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = i % 3 ? 6 : 12; g.beginPath(); g.moveTo(256 + Math.sin(a) * 200, 256 - Math.cos(a) * 200); g.lineTo(256 + Math.sin(a) * 222, 256 - Math.cos(a) * 222); g.stroke(); } });
const clock = add(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 40), mat({ map: clockTex }), RW / 2 - 0.03, 1.9, -0.9, { rz: Math.PI / 2 }); clock.rotation.set(0, 0, Math.PI / 2); clock.rotation.y = 0; clock.material.map.rotation = -Math.PI / 2; clock.material.map.center.set(.5, .5);
const handM = mat({ color: 0x1b1210 });
const hourH = add(box(0.012, 0.11, 0.008, 0.003), handM, RW / 2 - 0.065, 1.9, -0.9), minH = add(box(0.008, 0.17, 0.008, 0.003), handM, RW / 2 - 0.07, 1.9, -0.9);
const clockSpot = new THREE.SpotLight(0xbfd4ff, 0, 3, 0.35, 0.6, 1.2); clockSpot.position.set(RW / 2 - 1.1, 2.15, -0.75); clockSpot.target.position.set(RW / 2, 1.9, -0.9); scene.add(clockSpot, clockSpot.target);   // the final shot: a cold pin light on the wall clock
function setClock(hh, mm) { for (const [m, len, a] of [[hourH, 0.11, ((hh % 12) + mm / 60) / 12], [minH, 0.17, mm / 60]]) { const ang = a * Math.PI * 2; m.rotation.set(ang, 0, 0); m.position.set(m.position.x, 1.9 + Math.cos(ang) * len / 2, -0.9 + Math.sin(ang) * len / 2); } }
setClock(11, 41);
// bookshelf on the left back corner
const SH0 = scene.children.length;
add(box(0.9, 1.9, 0.32, 0.02), mat({ color: 0x3a2214 }), -1.75, 0.95, -2.42);
for (let s = 0; s < 4; s++) { add(box(0.84, 0.03, 0.3, 0.005), mat({ color: 0x4a2c1c }), -1.75, 0.25 + s * 0.45, -2.4); let x = -2.12; while (x < -1.42) { const bw = 0.04 + rnd() * 0.05, bh = 0.25 + rnd() * 0.13; const c = new THREE.Color().setHSL(rnd(), 0.45, 0.25 + rnd() * 0.2);
  add(box(bw, bh, 0.22, 0.004), mat({ color: c }), x + bw / 2, 0.265 + s * 0.45 + bh / 2, -2.4, { rz: rnd() < .12 ? 0.2 : 0 }); x += bw + 0.005; } }
{ const P0 = V(-1.75, 0, -2.42); for (const o of scene.children.slice(SH0)) { o.position.sub(P0).multiplyScalar(0.84).add(P0); o.scale.multiplyScalar(0.84); } }
// framed licence on the wall + door (front-right, frosted glass with lettering seen from inside)
const licTex = canvasTex(512, 380, (g, w, h) => { g.fillStyle = "#f1e8cf"; g.fillRect(0, 0, w, h); g.strokeStyle = "#b08a3a"; g.lineWidth = 14; g.strokeRect(20, 20, w - 40, h - 40); g.fillStyle = "#2a2a2a"; g.font = "700 40px Georgia, serif"; g.textAlign = "center"; g.fillText("PRIVATE", w / 2, 130); g.fillText("INVESTIGATOR", w / 2, 180); g.font = "italic 30px Georgia, serif"; g.fillText("licence no. 7", w / 2, 250); });
add(box(0.5, 0.38, 0.03, 0.01), mat({ color: 0x2b1a10 }), -1.42, 1.62, BACK + 0.03); add(new THREE.PlaneGeometry(0.44, 0.32), mat({ map: licTex }), -1.42, 1.62, BACK + 0.047, { cast: false });



// ---------------------------------------------------------------- scene 7: the THURSDAY page on the desk calendar (tears off on "Then Friday"); scenes 12-13: the laptop
const thuTex = canvasTex(512, 600, (g, w, h) => { g.fillStyle = "#f6f1e4"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a5a8a"; g.fillRect(0, 0, w, 150); g.strokeStyle = "#2b2018"; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10);
  g.fillStyle = "#fff"; g.font = "900 78px Arial Black, sans-serif"; g.textAlign = "center"; g.fillText("THURSDAY", w / 2, 108); g.fillStyle = "#222"; g.font = "900 260px Georgia, serif"; g.fillText("13", w / 2, 420); hand(g, "1 day", w / 2, 545, 64, "#a01d22"); });
const calPivot = new THREE.Group(); calPivot.position.set(0, 0.165, 0.004); cal.add(calPivot);
const thuPage = add(box(0.15, 0.17, 0.004, 0.002), mat({ map: thuTex }), 0, -0.085, 0.03, { rx: -0.32, parent: calPivot }); calPivot.visible = false;
function placeCalPage(T) {   // T: seconds since the tear (negative = still attached, undefined = no THURSDAY page). Ballistic flight with gravity + tumble, lands on the desk, slides to rest
  if (T === undefined || T === null) { calPivot.visible = false; return; } calPivot.visible = true;
  const g = 9.8 / 1.5, P0 = [0, 0.165, 0.004];   // calendar group is scaled x1.5: local units
  if (T < 0) { calPivot.position.set(...P0); calPivot.rotation.set(0, 0, 0); return; }
  if (T < 0.08) { const u = T / 0.08; calPivot.position.set(...P0); calPivot.rotation.set(-1.1 * u * u, 0, 0); return; }   // ripped up off the rings
  const t = T - 0.08, v = [0.35, 0.95, 0.6], tl = (v[1] + Math.sqrt(v[1] * v[1] + 2 * g * (P0[1] - 0.012))) / g;   // time to reach the desk top
  if (t < tl) { calPivot.position.set(P0[0] + v[0] * t, P0[1] + v[1] * t - 0.5 * g * t * t, P0[2] + v[2] * t); calPivot.rotation.set(-1.1 - 7.5 * t, 0.6 * t, 2.4 * t); return; }
  const s = t - tl, fr = (1 - Math.exp(-6 * s)) / 6;   // sliding with friction on the leather mat
  calPivot.position.set(P0[0] + v[0] * (tl + fr), 0.012, P0[2] + v[2] * (tl + fr)); calPivot.rotation.set(-(Math.PI / 2 - 0.32), 0.6 * tl + 0.3 * fr, 0.4);
}
const photoImg = await new Promise(r => { const im = new Image(); im.onload = () => r(im); im.src = "./tex/photo_front.jpg"; });
const scrCanvas = document.createElement("canvas"); scrCanvas.width = 1024; scrCanvas.height = 680; const scrTex = new THREE.CanvasTexture(scrCanvas); scrTex.colorSpace = THREE.SRGBColorSpace; scrTex.anisotropy = 8;
function drawScreen(S, t) { const g = scrCanvas.getContext("2d"), w = 1024, h = 680, k = S.k || 0;
  g.fillStyle = "#0e1424"; g.fillRect(0, 0, w, h); g.fillStyle = "#1c2640"; g.fillRect(0, 0, w, 56); g.fillStyle = "#e05a5a"; g.beginPath(); g.arc(30, 28, 10, 0, 7); g.fill(); g.fillStyle = "#e0b05a"; g.beginPath(); g.arc(60, 28, 10, 0, 7); g.fill(); g.fillStyle = "#5ae07a"; g.beginPath(); g.arc(90, 28, 10, 0, 7); g.fill();
  g.font = "700 30px Arial, sans-serif"; g.fillStyle = "#cfd8f0"; g.textBaseline = "middle";
  if (S.mode === "meta") {
    g.fillText("Photo Info  -  IMG_1142.JPG", 130, 28); g.drawImage(photoImg, 40, 90, 330, 412); g.strokeStyle = "#cfd8f0"; g.lineWidth = 3; g.strokeRect(40, 90, 330, 412);
    const rows = [["File", "IMG_1142.JPG"], ["Date taken", null], ["Time", "11:42 PM"], ["Place", "Apt. 7B"], ["Sent by", "unknown"]];
    rows.forEach(([a, b], i) => { const y = 130 + i * 92; g.fillStyle = "#7f8cb0"; g.font = "700 28px Arial, sans-serif"; g.fillText(a, 410, y); g.fillStyle = "#e8eefc"; g.font = "800 40px Arial, sans-serif";
      if (b) g.fillText(b, 410, y + 40); else { const old = k < 0.5; g.fillStyle = old ? "#e8eefc" : "#ff4a4a"; g.fillText(old ? "3 DAYS AGO" : "5 YEARS AGO", 410, y + 40); if (!old) { g.fillRect(410, y + 66, 300, 5); } } });
    const gl = Math.max(0, 1 - Math.abs(k - 0.5) * 6);   // glitch around the switch
    if (gl > 0) { for (let i = 0; i < 14; i++) { const y = ((Math.sin(t * 91 + i * 7.3) * 0.5 + 0.5) * h) | 0, hh = 6 + ((i * 13) % 30), dx = Math.sin(t * 57 + i) * 60 * gl; const d = g.getImageData(0, y, w, hh); g.putImageData(d, dx, y); }
      g.fillStyle = `rgba(255,40,60,${0.25 * gl})`; g.fillRect(0, 0, w, h); }
  } else if (S.mode === "mail") {
    g.fillText("Mail  -  Inbox", 130, 28); g.fillStyle = "#141c32"; g.fillRect(0, 56, 300, h - 56);
    for (let i = 0; i < 6; i++) { g.fillStyle = i === 0 ? "#2a3a66" : "#141c32"; g.fillRect(10, 70 + i * 92, 280, 82); g.fillStyle = "#cfd8f0"; g.font = "700 24px Arial, sans-serif"; g.fillText(i === 0 ? "(no subject)" : "...", 26, 100 + i * 92); g.fillStyle = "#7f8cb0"; g.font = "600 20px Arial, sans-serif"; g.fillText(i === 0 ? "5 years ago" : "", 26, 132 + i * 92); }
    const L = (lab, val, y, hi) => { g.fillStyle = "#7f8cb0"; g.font = "700 28px Arial, sans-serif"; g.fillText(lab, 330, y); g.fillStyle = hi ? "#ff5a5a" : "#e8eefc"; g.font = "800 34px Arial, sans-serif"; g.fillText(val, 450, y); };
    L("From:", "succify@succify.mail", 110, k > 0.3); L("To:", "succify@succify.mail", 160, false); L("Sent:", "5 years ago, 11:42 PM", 210, k > 0.65);
    if (k > 0.3) { g.fillStyle = "#ff5a5a"; g.fillRect(450, 132, Math.min(1, (k - 0.3) * 5) * 360, 4); }
    g.fillStyle = "#26304e"; g.fillRect(330, 250, 660, 2); g.drawImage(photoImg, 340, 280, 260, 325); g.strokeStyle = "#cfd8f0"; g.lineWidth = 3; g.strokeRect(340, 280, 260, 325);
    g.fillStyle = "#cfd8f0"; g.font = "700 26px Arial, sans-serif"; g.fillText("IMG_1142.JPG", 630, 300); g.fillStyle = "#7f8cb0"; g.font = "600 24px Arial, sans-serif"; g.fillText("1 attachment", 630, 340);
  }
  scrTex.needsUpdate = true; }
const LAP = new THREE.Group(); LAP.position.set(0.8, DESK.h + 0.006, DESK.z + 0.08); LAP.rotation.y = 0.35; scene.add(LAP); LAP.visible = false;
const lapM = mat({ color: 0x2a2c34, roughness: 0.4, metalness: 0.5 });
add(box(0.46, 0.022, 0.32, 0.012), lapM, 0, 0.011, 0, { parent: LAP });
const keysTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = "#1a1c22"; g.fillRect(0, 0, w, h); g.fillStyle = "#3a3d48"; for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) g.fillRect(8 + c * 20, 8 + r * 22, 16, 16); g.fillRect(70, 118, 110, 16); });
add(new THREE.PlaneGeometry(0.4, 0.2), mat({ map: keysTex }), 0, 0.0225, 0.03, { rx: -Math.PI / 2, parent: LAP, cast: false });
const lid = new THREE.Group(); lid.position.set(0, 0.022, -0.16); lid.rotation.x = -0.28; LAP.add(lid);
add(box(0.46, 0.3, 0.014, 0.012), lapM, 0, 0.15, 0, { parent: lid });
const scrM = new THREE.MeshBasicMaterial({ map: scrTex, color: new THREE.Color(1.25, 1.25, 1.25) });
add(new THREE.PlaneGeometry(0.42, 0.27), scrM, 0, 0.152, 0.0075, { parent: lid, cast: false });
const scrLight = new THREE.SpotLight(0x9ab8ff, 0, 2.5, 0.9, 0.8, 1.4); scene.add(scrLight, scrLight.target);
function placeLaptop(Lp, t) { LAP.visible = !!Lp; cal.visible = !Lp; if (!Lp) { scrLight.intensity = 0; return; } drawScreen(Lp, t);
  LAP.updateMatrixWorld(); const c = V(0, 0.15, 0.05).applyMatrix4(lid.matrixWorld); scrLight.position.copy(c); scrLight.target.position.set(0, 1.2, PZ); scrLight.intensity = Lp.light ?? 3.0; }


// scene 9: a magnifying glass hovering over the photo (Pion holds it just out of frame); the camera dives through its lens. F.mag = { p, rx }
const MAG = new THREE.Group(); scene.add(MAG); MAG.visible = false;
add(new THREE.TorusGeometry(0.09, 0.013, 12, 40), mat({ color: 0xd9b040, metalness: .85, roughness: .3 }), 0, 0, 0, { rx: -Math.PI / 2, parent: MAG });
add(new THREE.CylinderGeometry(0.088, 0.088, 0.004, 40), new THREE.MeshPhysicalMaterial({ color: 0xdff0ff, roughness: 0.05, transmission: 0.7, transparent: true, opacity: 0.22 }), 0, 0, 0, { parent: MAG, cast: false });
add(new THREE.CylinderGeometry(0.016, 0.02, 0.2, 10), mat({ color: 0x4a2412 }), 0.19, 0, 0.0, { rz: Math.PI / 2, parent: MAG });
function placeMag(M) { MAG.visible = !!M; magR.visible = !M; if (M) { MAG.position.set(...M.p); MAG.rotation.set(M.rx || 0, M.ry || 0, M.rz || 0); } }
// ---------------------------------------------------------------- moods: the light tells the story (PANDUAN_SINEMATIK §3)
// normal  : warm pool + blue night (setup / investigation)
// tension : lamp dims and stutters, the blue takes over, heavier vignette, denser haze (doubt, "found nothing")
// conflict: lamp nearly dead, deep blue, red/blue police strobe through the blinds, lightning flashes ("Then Friday arrived")
// reveal  : the room goes black, a cold sickly under-light from the desk hits the face, red edge tint ("It was me")
const MOODS = {
  normal:   { key: 7.5, keyCol: 0xffd59a, hemi: 0.62, hemiCol: 0x3e5cc0, moon: 24, fill: 1.1, board: 3.2, cone: 0.24, fog: 0.035, vig: 0.32, tint: [0, 0, 0], under: 0, strobe: 0, flicker: 0.015 },
  tension:  { key: 4.2, keyCol: 0xffc98a, hemi: 0.5, hemiCol: 0x3550c8, moon: 34, fill: 1.5, board: 1.6, cone: 0.2, fog: 0.05, vig: 0.45, tint: [-0.02, 0.0, 0.05], under: 0, strobe: 0, flicker: 0.12 },
  conflict: { key: 0.9, keyCol: 0xffb070, hemi: 0.42, hemiCol: 0x2a46c8, moon: 40, fill: 1.9, board: 0.4, cone: 0.06, fog: 0.06, vig: 0.54, tint: [-0.03, 0.0, 0.08], under: 0, strobe: 1, flicker: 0.3 },
  reveal:   { key: 0.0, keyCol: 0xffb070, hemi: 0.12, hemiCol: 0x203070, moon: 6, fill: 0.2, board: 0.0, cone: 0.0, fog: 0.07, vig: 0.66, tint: [0.05, -0.01, 0.0], under: 1, strobe: 0, flicker: 0 },
};
const hemiL = scene.children.find(o => o.isHemisphereLight);
const strobeR = new THREE.PointLight(0xff2a3a, 0, 6, 1.4), strobeB = new THREE.PointLight(0x2a5aff, 0, 6, 1.4);
strobeR.position.set(-RW / 2 + 0.3, WIN.y, WIN.z - 0.3); strobeB.position.set(-RW / 2 + 0.3, WIN.y, WIN.z + 0.3); scene.add(strobeR, strobeB);
const under = new THREE.SpotLight(0x8affc8, 0, 3, 0.9, 0.7, 1.2); under.position.set(0, DESK.h + 0.05, DESK.z + 0.35); under.target.position.set(0, 1.6, DESK.z - 0.6); scene.add(under, under.target);
grade.material.fragmentShader = grade.material.fragmentShader.replace("uniform float time;", "uniform float time; uniform float vig; uniform vec3 tint;")
  .replace("c += vec3(-0.01, 0.0, 0.025) * (1.0 - l);", "c += vec3(-0.01, 0.0, 0.025) * (1.0 - l) + tint;").replace("c *= 1.0 - 0.42 * smoothstep", "c *= 1.0 - vig * smoothstep");
grade.uniforms.vig = { value: 0.42 }; grade.uniforms.tint = { value: new THREE.Vector3() }; grade.material.uniforms = grade.uniforms; grade.material.needsUpdate = true;
const lerpN = (a, b, k) => a + (b - a) * k, cA = new THREE.Color(), cB = new THREE.Color();
function applyMood(a, b, k, t) {   // blend mood a -> b by k (0..1); t drives flicker / strobe / lightning
  const A = MOODS[a] || MOODS.normal, B = MOODS[b] || A, m = {}; for (const q in A) m[q] = Array.isArray(A[q]) ? A[q].map((v, i) => lerpN(v, B[q][i], k)) : typeof A[q] === "number" && A[q] > 1000 ? null : lerpN(A[q], B[q], k);
  const fl = m.flicker, stutter = 1 - fl * (0.5 + 0.5 * Math.sin(t * 13) * Math.sin(t * 3.7)) - (fl > 0.1 && (Math.sin(t * 7.3) > 0.93) ? 0.7 : 0);
  key.intensity = m.key * Math.max(0, stutter); key.color.copy(cA.set(A.keyCol).lerp(cB.set(B.keyCol), k));
  bulb.material.color.setRGB(1, 0.86, 0.58).multiplyScalar(9 * Math.max(0.03, m.key / 7.5 * stutter)); inner.material.emissiveIntensity = 0.8 * Math.max(0.03, m.key / 7.5 * stutter);
  hemiL.intensity = m.hemi; hemiL.color.copy(cA.set(A.hemiCol).lerp(cB.set(B.hemiCol), k)); moon.intensity = m.moon; nightFill.intensity = m.fill; boardLight.intensity = m.board;
  coneM.uniforms.k.value = m.cone * Math.max(0, stutter); scene.fog.density = m.fog; grade.uniforms.vig.value = m.vig; grade.uniforms.tint.value.set(...m.tint);
  const st = m.strobe, ph = Math.floor(t * 4) % 2; strobeR.intensity = st * (ph ? 6 : 0.3); strobeB.intensity = st * (ph ? 0.3 : 6);
  const bolt = st > 0.5 && ((t % 3.1) < 0.08 || ((t % 3.1) > 0.16 && (t % 3.1) < 0.21)); moon.intensity += bolt ? 140 : 0;
  under.intensity = m.under * 5; deskBounce.intensity = 0.5 * Math.max(0, m.key / 7.5);
}
window.MOODS = MOODS;

// ---------------------------------------------------------------- camera shots + render
const SHOTS = {
  wide: { pos: V(0.18, 1.28, 1.55), tgt: V(0, 1.47, -1.6), fov: 46, focus: 2.5 },
  desk: { pos: V(0.05, 1.75, 0.15), tgt: V(0, DESK.h, DESK.z + 0.02), fov: 40, focus: 1.35 },
  board: { pos: V(0.25, 1.6, 0.4), tgt: V(0, 1.75, BACK), fov: 44, focus: 3.0 },
  low: { pos: V(-0.55, 0.95, 0.75), tgt: V(0.1, 1.5, -1.4), fov: 44, focus: 2.0 },
  establish: { pos: V(1.45, 1.7, 1.6), tgt: V(-0.45, 1.25, -1.5), fov: 58, focus: 3.2 },
};
window.renderShot = async (name, t = 0, over) => {
  placeEnv(null); renderer.shadowMap.needsUpdate = true;
  const S = Object.assign({}, SHOTS[name] || SHOTS.wide, over || {});
  camera.position.copy(S.pos); camera.fov = S.fov; camera.updateProjectionMatrix(); camera.lookAt(S.tgt);
  bokeh.uniforms.focus.value = S.focus; placeDust(t); grade.uniforms.time.value = t;
  applyMood(S.mood || 'normal', S.mood2 || S.mood || 'normal', S.moodK || 0, t);
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  await CHR.place([]); CHR.bake([moon]);
  composer.render();
  return renderer.domElement.toDataURL("image/jpeg", 0.93);
};

// ---------------------------------------------------------------- Pion INSIDE the world (charlayer.js): depth occlusion, set lights + shadows on him, his shadow from the pendant lamp
const CHR = createChars(scene, camera, renderer, { n: 1, E: 0.62, D: 0.1, light: key, hide: [cone, dust, spill], rim: 0.5, glow: 0.2 });
const RIMP = { normal: "interior_warm_lamp", tension: "interior_night", conflict: "interior_night", reveal: "crime_scene" };   // character rim matches the mood light
composer.insertPass(CHR.pass(pionRT), composer.passes.indexOf(pionComp)); CHR.guard(gtao); CHR.guard(bokeh);
moon.shadow.autoUpdate = false; key.shadow.autoUpdate = false;
let lastSig = null;
window.__dbg = { scene, renderer, camera };
window.renderFrame = async (F) => {   // F: { t, cam:{pos,tgt,fov,focus}, mood, mood2, moodK, lampK, pion }
  camera.position.set(...F.cam.pos); camera.fov = F.cam.fov; camera.updateProjectionMatrix(); camera.lookAt(...F.cam.tgt); camera.updateMatrixWorld();
  if (F.cam.roll) camera.rotateZ(F.cam.roll);
  bokeh.uniforms.focus.value = F.cam.focus; placeDust(F.t); grade.uniforms.time.value = F.t;
  applyMood(F.mood || "normal", F.mood2 || F.mood || "normal", F.moodK || 0, F.t); if (F.strike) moon.intensity += 140;
  const L = F.lampK ?? 1; key.intensity *= L; coneM.uniforms.k.value *= L; deskBounce.intensity *= L; lampFill.intensity = 0.6 * L;
  bulb.material.color.multiplyScalar(Math.max(0.02, L)); inner.material.emissiveIntensity *= Math.max(0.03, L); const dk = 0.25 + 0.75 * L; boardLight.intensity *= dk; hemiL.intensity *= 0.55 + 0.45 * L; nightFill.intensity *= 0.6 + 0.4 * L;
  placeEnv(F.env); anon.visible = F.anonVis !== false; if (F.anon) { anon.position.set(...F.anon.p); anon.rotation.set(F.anon.rx || 0, F.anon.ry || 0, F.anon.rz || 0); } else { anon.position.copy(ANON0.p); anon.rotation.copy(ANON0.r); } if (F.clock) setClock(...F.clock); else setClock(11, 41); placeCalPage(F.calTear); placeLaptop(F.laptop, F.t); placeMag(F.mag); clockSpot.intensity = F.clockLight || 0;
  { const LP = LIGHT_PRESETS[RIMP[F.mood2 && F.moodK > 0.5 ? F.mood2 : (F.mood || "normal")]] || LIGHT_PRESETS.interior_warm_lamp;
    await CHR.place(F.pion ? [Object.assign(F.pion.preset ? { cast: true } : { shadow: [1.0, 0.55], cast: true }, F.pion)] : [], { light: key, puffs: F.puffs, rimCol: LP.rimCol, rimK: LP.rimK }); }
  { const sig = JSON.stringify([F.env, F.anon, F.calTear, F.mag, !!F.laptop, F.anonVis]); if (sig !== lastSig) { CHR.bake([moon]); lastSig = sig; } }
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  composer.render();
  const pr = (x, y, z) => { const q = V(x, y, z).project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2, q.z]; };
  const pts = { head: F.pion ? pr(F.pion.anchor[0], F.pion.anchor[1] + F.pion.height * 0.8, F.pion.anchor[2]) : null }; for (const [k, p] of Object.entries(F.pts || {})) pts[k] = pr(...p);
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};

{ const orig = gtao.render.bind(gtao); gtao.render = (...a) => { const H = [cone, dust, spill].filter(Boolean), v = H.map(o => o.visible); H.forEach(o => o.visible = false); orig(...a); H.forEach((o, i) => o.visible = v[i]); }; }   // volumes/particles stay out of the AO + ink depth
window.SHOTS = SHOTS; window.__ready = true;
