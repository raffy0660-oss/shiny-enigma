// "The Photograph": Daniel Cross's abandoned apartment (Apt. 7B). Same render chain and drawn-world rules as office.js
// (AgX, GTAO, ink from depth + normal, bloom on practicals, grade + vignette, painted canvas textures with drawn lines, dense props,
// one signature colour = faded mustard wallpaper, shadows blue not black). Everything is built to Pion's scale (a pawn ~1.03 m tall).
// Three versions (F.ver):
//   A  the world inside the photograph: night, one bare bulb, moon through the boards, Daniel lying with the broken clock (11:42); faded sepia-blue
//   B  Pion searches it: daylight god rays through the boarded window, dust in the beams, empty floor (no body, no blood, no prints)
//   C  Friday crime scene: night, red/blue police strobes, lightning, police tape, the police rook, Daniel + the same clock
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { BokehPass } from "three/addons/postprocessing/BokehPass.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const W = 1080, H = 1920;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = false;   // the set never moves: shadows are baked once per version
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1024);
scene.fog = new THREE.FogExp2(0x1a2038, 0.05);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 60);

// ---------------------------------------------------------------- post chain (as office.js) + photo grade (sepia-blue, fade, scratches)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const gtao = new GTAOPass(scene, camera, W, H); gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 1.0;
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
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.45, 2.2); composer.addPass(bloom);
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
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, vig: { value: 0.45 }, tint: { value: new THREE.Vector3() }, sepia: { value: 0 }, flash: { value: 0 }, grain: { value: 0.025 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, vig, sepia, flash, grain; uniform vec3 tint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.14); c = (c - 0.5) * 1.12 + 0.48;
      c += vec3(-0.01, 0.0, 0.025) * (1.0 - l) + tint;
      // old photograph: highlights sepia, shadows faded blue, lifted blacks, softer contrast, scratches + dust
      vec3 sep = l * vec3(1.10, 0.95, 0.74); vec3 blu = vec3(0.13, 0.17, 0.27) + l * vec3(0.55, 0.6, 0.72);
      vec3 ph = mix(blu, sep * 1.12, smoothstep(0.05, 0.5, l)); ph = (ph - 0.45) * 1.18 + 0.47; ph = mix(vec3(0.4, 0.37, 0.32), ph, 0.92);
      float scr = step(0.9975, h(vec2(floor(vUv.x * 900.0), floor(time * 24.0)))) * 0.12 * step(h(vec2(floor(time * 24.0), 3.0)), 0.6);
      float spk = step(0.99985, h(floor(vUv * vec2(540.0, 960.0)) + floor(time * 24.0))) * 0.35;
      c = mix(c, ph + scr + spk, sepia);
      vec2 q = vUv - 0.5; c *= 1.0 - vig * smoothstep(0.28, 0.85, length(q * vec2(1.0, 0.72)));
      c += (h(vUv * 1000.0 + time) - 0.5) * grain;
      c = mix(c, vec3(1.0, 0.98, 0.95), flash);
      gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0); }`,
});
composer.addPass(grade);

// ---------------------------------------------------------------- helpers
let seed = 7742; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canvasTex(w, h, draw, repeat) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); return t; }
const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
const add = (geo, m, x, y, z, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz;
  me.castShadow = o.cast !== false; me.receiveShadow = true; (o.parent || scene).add(me); return me; };
const box = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const hand = (g, txt, x, y, size, col = "#1d2a5a", rot = 0, font = "Caveat, 'Comic Neue', cursive") => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.font = `700 ${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 0); g.restore(); };
const group = (x, y, z, ry = 0) => { const G = new THREE.Group(); G.position.set(x, y, z); G.rotation.y = ry; scene.add(G); return G; };

// ---------------------------------------------------------------- room (Pion scale: ceiling 2.45, door 1.62)
const RW = 4.4, RD = 4.2, RH = 2.45, WH = 0.7, BACK = -2.4, FRONT = BACK + RD, XL = -RW / 2, XR = RW / 2;
const wallTex = canvasTex(1024, 1024, (g, w, h) => {   // faded mustard floral wallpaper (the location colour), water stains, torn patches showing plaster
  g.fillStyle = "#b8923e"; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 128) { g.fillStyle = "#c29b45"; g.fillRect(x + 40, 0, 48, h); }
  for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { const cx = x + 64 + ((y / 128) % 2) * 64, cy = y + 64;
    g.strokeStyle = "rgba(90,58,20,.55)"; g.lineWidth = 3; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; g.beginPath(); g.ellipse(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 11, 6, a, 0, 7); g.stroke(); }
    g.fillStyle = "rgba(150,60,40,.45)"; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill(); g.strokeStyle = "rgba(70,90,40,.45)"; g.beginPath(); g.moveTo(cx, cy + 14); g.quadraticCurveTo(cx + 14, cy + 34, cx + 4, cy + 48); g.stroke(); }
  for (let i = 0; i < 7; i++) { const x = rnd() * w, y = rnd() * h * 0.5, r = 60 + rnd() * 120; const gr = g.createRadialGradient(x, y, 0, x, y + r * 0.6, r * 1.3); gr.addColorStop(0, "rgba(90,60,20,.35)"); gr.addColorStop(1, "rgba(90,60,20,0)"); g.fillStyle = gr; g.fillRect(x - r * 1.5, y - r, r * 3, r * 3.5);
    g.strokeStyle = "rgba(80,50,15,.4)"; g.lineWidth = 2; g.beginPath(); g.ellipse(x, y + r * 0.4, r * 0.8, r * 0.9, 0, 0, 7); g.stroke(); }   // water stains with a drawn tide line
  for (let i = 0; i < 3; i++) { const x = rnd() * w, y = rnd() * h, pw = 30 + rnd() * 40, phh = 24 + rnd() * 40; g.fillStyle = "#a89a7a"; g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; g.lineTo(x + Math.cos(a) * pw * (0.6 + rnd() * 0.5), y + Math.sin(a) * phh * (0.6 + rnd() * 0.5)); } g.closePath(); g.fill(); g.strokeStyle = "#5a3e1a"; g.lineWidth = 4; g.stroke(); }   // torn patches
  for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(40,25,10,${rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); }
}, [2.5, 1.4]);
const wainTex = canvasTex(1024, 512, (g, w, h) => {   // scuffed painted beadboard
  g.fillStyle = "#6c6a52"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 48) { g.strokeStyle = "#3a3a2a"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 30); g.lineTo(x, h); g.stroke(); }
  g.fillStyle = "#7c7a60"; g.fillRect(0, 0, w, 30); g.strokeStyle = "#2c2c20"; g.lineWidth = 5; g.strokeRect(-5, 0, w + 10, 30);
  for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(40,36,28,.35)"; g.fillRect(rnd() * w, 40 + rnd() * (h - 40), 10 + rnd() * 50, 3 + rnd() * 6); }   // scuffs
}, [3, 1]);
const floorTex = canvasTex(1024, 1024, (g, w, h) => {   // grey-brown planks, dust, drawn seams and nail heads
  for (let y = 0; y < h; y += 90) { let x = -(rnd() * 200); while (x < w) { const L = 240 + rnd() * 280, c = 70 + rnd() * 18; g.fillStyle = `rgb(${c},${c * .82},${c * .66})`; g.fillRect(x, y, L, 90);
    g.strokeStyle = "#241a12"; g.lineWidth = 4; g.strokeRect(x, y, L, 90); g.strokeStyle = "rgba(30,20,12,.3)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const yy = y + 18 + k * 26; g.beginPath(); g.moveTo(x + 10, yy); g.bezierCurveTo(x + L * .3, yy + 6, x + L * .7, yy - 6, x + L - 10, yy); g.stroke(); }
    g.fillStyle = "#1c140e"; g.beginPath(); g.arc(x + 12, y + 20, 3, 0, 7); g.arc(x + 12, y + 70, 3, 0, 7); g.fill(); x += L; } }
  for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 120; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(190,180,160,.18)"); gr.addColorStop(1, "rgba(190,180,160,0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }   // dust drifts
}, [3, 3]);
const wallM = mat({ map: wallTex }), wainM = mat({ map: wainTex }), trimM = mat({ color: 0x3e3020 });
add(new THREE.PlaneGeometry(RW, RD), mat({ map: floorTex, roughness: 0.75 }), 0, 0, BACK + RD / 2, { rx: -Math.PI / 2, cast: false });
const ceilTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#8a8070"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(40,30,20,.6)"; g.lineWidth = 3; for (let i = 0; i < 6; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (rnd() - .5) * 70; y += (rnd() - .5) * 70; g.lineTo(x, y); } g.stroke(); }
  const gr = g.createRadialGradient(w * .3, h * .4, 0, w * .3, h * .4, 160); gr.addColorStop(0, "rgba(90,70,30,.45)"); gr.addColorStop(1, "rgba(90,70,30,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, [2, 2]);
add(new THREE.PlaneGeometry(RW, RD), mat({ map: ceilTex }), 0, RH, BACK + RD / 2, { rx: Math.PI / 2, cast: false });
for (const [w, x, z, ry] of [[RW, 0, BACK, 0], [RD, XL, BACK + RD / 2, Math.PI / 2], [RD, XR, BACK + RD / 2, -Math.PI / 2], [RW, 0, FRONT, Math.PI]]) {
  const up = new THREE.Mesh(new THREE.PlaneGeometry(w, RH - WH), wallM); up.position.set(x, WH + (RH - WH) / 2, z); up.rotation.y = ry; up.receiveShadow = true; scene.add(up);
  const lo = new THREE.Mesh(new THREE.PlaneGeometry(w, WH), wainM); lo.position.set(x, WH / 2, z); lo.rotation.y = ry; lo.receiveShadow = true; scene.add(lo);
}
add(box(RW, 0.08, 0.05), trimM, 0, RH - 0.04, BACK + 0.025); add(box(RW, 0.1, 0.04), trimM, 0, 0.05, BACK + 0.02); add(box(RW, 0.04, 0.04), trimM, 0, WH, BACK + 0.02);
for (const sx of [-1, 1]) { add(box(0.04, 0.1, RD, 0.01), trimM, sx * (RW / 2 - 0.02), 0.05, BACK + RD / 2); add(box(0.04, 0.04, RD, 0.01), trimM, sx * (RW / 2 - 0.02), WH, BACK + RD / 2); }
// a strip of wallpaper peeling off the back wall (curled sheet)
{ const g = new THREE.PlaneGeometry(0.34, 0.8, 1, 12), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), u = (0.4 - y) / 0.8; p.setZ(i, u * u * 0.22); } g.computeVertexNormals();
  add(g, mat({ map: wallTex, side: THREE.DoubleSide }), 1.55, 1.85, BACK + 0.02, { rz: 0.05 }); }

// ---------------------------------------------------------------- boarded window (left wall): planks with gaps, sky behind changes per version
const WIN = { z: -0.95, y: 1.35, w: 1.05, h: 1.0 };
const skyM = new THREE.MeshBasicMaterial({ color: 0xffffff }); const sky = add(new THREE.PlaneGeometry(WIN.w, WIN.h), skyM, XL - 0.05, WIN.y, WIN.z, { ry: Math.PI / 2, cast: false }); sky.receiveShadow = false;
const skyTex = { A: null, B: null, C: null };
skyTex.A = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0d1530"); gr.addColorStop(1, "#2a3a70"); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = "#e8ecff"; g.beginPath(); g.arc(170, 70, 26, 0, 7); g.fill(); });
skyTex.B = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#fff4d8"); gr.addColorStop(1, "#ffd9a0"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
skyTex.C = canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#060a1c"); gr.addColorStop(1, "#141e44"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const winFrame = mat({ color: 0x3a2c1c });
for (const [w, h, y, z] of [[WIN.w + 0.12, 0.07, WIN.y + WIN.h / 2, WIN.z], [WIN.w + 0.14, 0.09, WIN.y - WIN.h / 2, WIN.z], [0.07, WIN.h, WIN.y, WIN.z - WIN.w / 2], [0.07, WIN.h, WIN.y, WIN.z + WIN.w / 2]]) add(box(0.07, h, w, 0.01), winFrame, XL + 0.035, y, z);
add(box(0.2, 0.04, WIN.w + 0.24, 0.01), winFrame, XL + 0.1, WIN.y - WIN.h / 2 - 0.05, WIN.z);
const plankTex = canvasTex(512, 96, (g, w, h) => { g.fillStyle = "#7a5a3a"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(40,24,12,.5)"; g.lineWidth = 3; for (let k = 0; k < 5; k++) { const y = 12 + k * 18; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + 5, w * .6, y - 5, w, y); g.stroke(); }
  g.strokeStyle = "#2a1a0e"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = "#c8c0b0"; for (const x of [30, w - 30]) { g.beginPath(); g.arc(x, h / 2, 6, 0, 7); g.fill(); } });
const PLANKS = [[WIN.y + 0.34, 0.16, 0.06], [WIN.y + 0.08, 0.18, -0.1], [WIN.y - 0.2, 0.16, 0.12], [WIN.y - 0.42, 0.12, -0.04]];   // [y, height, tilt]
for (const [y, h, rz] of PLANKS) add(box(0.03, h, WIN.w + 0.3, 0.008), mat({ map: plankTex }), XL + 0.08, y, WIN.z, { rx: rz });
// radiator under the window
const radM = mat({ color: 0x8a8a7a, roughness: 0.5, metalness: 0.3 });
for (let k = 0; k < 9; k++) add(box(0.08, 0.45, 0.06, 0.025), radM, XL + 0.12, 0.33, WIN.z - 0.32 + k * 0.08);
add(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8), radM, XL + 0.12, 0.12, WIN.z, { rx: Math.PI / 2 });

// ---------------------------------------------------------------- the apartment door (right wall), ajar, brass "7B"
const DOOR = { x: XR, z: -0.25, w: 0.95, h: 1.62 };
const hallM = new THREE.MeshBasicMaterial({ color: 0x0a0a12 }); add(new THREE.PlaneGeometry(DOOR.w, DOOR.h), hallM, XR + 0.06, DOOR.h / 2, DOOR.z, { ry: -Math.PI / 2, cast: false });   // dark hallway behind
const doorTex = canvasTex(512, 1024, (g, w, h) => { g.fillStyle = "#5e6b5a"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2a3028"; g.lineWidth = 10;
  g.strokeRect(60, 70, w - 120, 380); g.strokeRect(60, 520, w - 120, 430); g.strokeStyle = "rgba(20,24,20,.4)"; g.lineWidth = 3; for (let i = 0; i < 30; i++) { const x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - .5) * 40, y + rnd() * 30); g.stroke(); }   // chipped paint
  g.fillStyle = "#c9a24a"; g.font = "900 120px Georgia, serif"; g.textAlign = "center"; g.fillText("7B", w / 2, 300); g.strokeStyle = "#5a4012"; g.lineWidth = 4; g.strokeText("7B", w / 2, 300); });
const hinge = group(DOOR.x - 0.04, 0, DOOR.z - DOOR.w / 2, -1.25);   // hinged on the back side, swung wide open into the room: the doorway stays clear from the front
add(box(0.05, DOOR.h - 0.02, DOOR.w, 0.01), [mat({ map: doorTex }), mat({ map: doorTex }), mat({ color: 0x4a5548 }), mat({ color: 0x4a5548 }), mat({ color: 0x4a5548 }), mat({ color: 0x4a5548 })], 0, DOOR.h / 2, DOOR.w / 2, { parent: hinge });
add(new THREE.SphereGeometry(0.035, 14, 10), mat({ color: 0xc9a24a, metalness: 0.8, roughness: 0.35 }), -0.05, 0.72, DOOR.w - 0.1, { parent: hinge });
add(box(0.03, 0.03, 0.18, 0.01), mat({ color: 0x9a9aa0, metalness: 0.8 }), -0.04, 1.05, DOOR.w - 0.1, { parent: hinge });   // broken chain latch hanging
for (const [w, h, y, z] of [[0.08, DOOR.h + 0.08, DOOR.h / 2 + 0.04, DOOR.z - DOOR.w / 2 - 0.04], [0.08, DOOR.h + 0.08, DOOR.h / 2 + 0.04, DOOR.z + DOOR.w / 2 + 0.04], [DOOR.w + 0.16, 0.08, DOOR.h + 0.04, DOOR.z]]) add(box(0.06, h, w, 0.01), trimM, XR - 0.03, y, z);

// ---------------------------------------------------------------- furniture (Pion scale) and storytelling clutter
const fabric = (base, line) => canvasTex(256, 256, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.lineWidth = 3; for (let k = 0; k < w; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 4, 4); } }, [2, 1]);
// sagging sofa against the back wall, one cushion torn with stuffing
const sofaM = mat({ map: fabric("#5a6e7a", "rgba(30,40,50,.35)") }), sofaD = mat({ color: 0x3e4c56 });
const SF = group(-0.35, 0, BACK + 0.42);
add(box(1.7, 0.5, 0.22, 0.06), sofaM, 0, 0.62, -0.26, { parent: SF }); add(box(1.7, 0.2, 0.62, 0.06), sofaD, 0, 0.2, 0, { parent: SF });
for (const sx of [-1, 1]) add(box(0.2, 0.42, 0.66, 0.08), sofaM, sx * 0.84, 0.42, 0, { parent: SF });
add(box(0.72, 0.13, 0.52, 0.06), sofaM, -0.38, 0.36, 0.04, { rz: 0.04, parent: SF }); add(box(0.72, 0.11, 0.52, 0.06), sofaM, 0.4, 0.33, 0.06, { rz: -0.12, rx: 0.08, parent: SF });
for (let i = 0; i < 6; i++) add(new THREE.SphereGeometry(0.04 + rnd() * 0.03, 8, 6), mat({ color: 0xe8e2d2 }), 0.3 + rnd() * 0.25, 0.42 + rnd() * 0.04, 0.0 + rnd() * 0.2, { parent: SF });   // stuffing
// framed picture above the sofa, hanging crooked (a lighthouse) + a pale rectangle where another one used to hang
const picTex = canvasTex(400, 300, (g, w, h) => { g.fillStyle = "#6a8aa8"; g.fillRect(0, 0, w, h); g.fillStyle = "#2c4a66"; g.fillRect(0, h * 0.6, w, h * 0.4); g.fillStyle = "#e8e0d0"; g.fillRect(250, 80, 40, 120); g.fillStyle = "#b03030"; g.fillRect(250, 110, 40, 22); g.fillRect(250, 160, 40, 22);
  g.fillStyle = "#3a3020"; g.fillRect(230, 195, 80, 20); g.fillStyle = "rgba(255,240,180,.6)"; g.beginPath(); g.moveTo(270, 85); g.lineTo(60, 40); g.lineTo(60, 120); g.closePath(); g.fill(); g.strokeStyle = "#2a1a10"; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); });
add(box(0.56, 0.44, 0.03, 0.01), mat({ color: 0x5a3a1a }), -0.55, 1.45, BACK + 0.03, { rz: 0.09 }); add(new THREE.PlaneGeometry(0.48, 0.36), mat({ map: picTex }), -0.55, 1.45, BACK + 0.047, { rz: 0.09, cast: false });
add(new THREE.PlaneGeometry(0.4, 0.5), mat({ color: 0xd2ad58 }), 0.35, 1.5, BACK + 0.005, { cast: false });
add(new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6), trimM, 0.35, 1.78, BACK + 0.01, { rx: Math.PI / 2 });
// side table + toppled lamp (shade on the floor)
const woodM = mat({ color: 0x5a3a22, roughness: 0.6 });
add(box(0.42, 0.04, 0.42, 0.01), woodM, -1.62, 0.5, BACK + 0.38); for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) add(new THREE.CylinderGeometry(0.018, 0.015, 0.48, 8), woodM, -1.62 + x, 0.24, BACK + 0.38 + z);
add(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 16), mat({ color: 0x8a7a5a, metalness: 0.4 }), -1.6, 0.54, BACK + 0.36); add(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), mat({ color: 0x8a7a5a, metalness: 0.4 }), -1.55, 0.7, BACK + 0.36, { rz: -0.35 });
add(new THREE.CylinderGeometry(0.1, 0.18, 0.2, 18, 1, true), mat({ color: 0xd8c8a0, side: THREE.DoubleSide }), -1.25, 0.1, BACK + 0.62, { rz: 1.35, ry: 0.4 });
// bookshelf (right of the sofa), half empty, books fallen
add(box(0.75, 1.3, 0.3, 0.015), mat({ color: 0x4a3020 }), 1.2, 0.65, BACK + 0.16);
for (let s = 0; s < 3; s++) { add(box(0.7, 0.025, 0.27, 0.005), mat({ color: 0x5a3a26 }), 1.2, 0.28 + s * 0.38, BACK + 0.17); let x = 0.9; const n = 3 + Math.floor(rnd() * 5);
  for (let i = 0; i < n; i++) { const bw = 0.04 + rnd() * 0.04, bh = 0.2 + rnd() * 0.1, c = new THREE.Color().setHSL(rnd(), 0.35, 0.28 + rnd() * 0.15); add(box(bw, bh, 0.2, 0.004), mat({ color: c }), x + bw / 2, 0.29 + s * 0.38 + bh / 2, BACK + 0.17, { rz: i === n - 1 ? 0.45 : 0 }); x += bw + 0.006; } }
for (let i = 0; i < 4; i++) { const c = new THREE.Color().setHSL(rnd(), 0.35, 0.3); add(box(0.22, 0.04, 0.16, 0.005), mat({ color: c }), 0.95 + rnd() * 0.5, 0.02 + i * 0.005, BACK + 0.5 + rnd() * 0.3, { ry: rnd() * 3 }); }
// stacks of old newspapers tied with string (right back corner) + the headline that started the case
const newsTex = canvasTex(512, 360, (g, w, h) => { g.fillStyle = "#d8cfb4"; g.fillRect(0, 0, w, h); g.fillStyle = "#1e1e1e"; g.font = "900 54px Georgia, serif"; g.textAlign = "center"; g.fillText("THE DAILY", w / 2, 64);
  g.font = "800 34px Georgia, serif"; g.fillText("LOCAL MAN MISSING", w / 2, 120); for (let k = 0; k < 8; k++) { g.fillStyle = "rgba(30,30,30,.6)"; g.fillRect(30, 150 + k * 24, 210, 9); g.fillRect(272, 150 + k * 24, 210, 9); } g.strokeStyle = "#3a2e22"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); });
for (let k = 0; k < 5; k++) add(box(0.42, 0.07, 0.3, 0.01), mat({ color: k % 2 ? 0xcfc6aa : 0xd8cfb4 }), 1.75, 0.035 + k * 0.072, BACK + 0.85, { ry: (rnd() - .5) * 0.2 });
add(box(0.42, 0.006, 0.3, 0.002), mat({ map: newsTex }), 1.75, 0.37, BACK + 0.85, { ry: 0.05 });
add(box(0.43, 0.36, 0.008, 0.002), mat({ color: 0xb08a5a }), 1.75, 0.18, BACK + 1.0, { cast: false });   // string
// overturned wooden chair
const CHR = group(0.95, 0, -1.25, 0.7); CHR.rotation.z = Math.PI / 2 - 0.1; CHR.position.y = 0.22;
add(box(0.42, 0.04, 0.42, 0.01), woodM, 0, 0, 0, { parent: CHR }); add(box(0.42, 0.42, 0.04, 0.01), woodM, 0, 0.23, -0.19, { parent: CHR });
for (const [x, z] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) add(new THREE.CylinderGeometry(0.02, 0.018, 0.42, 8), woodM, x, -0.22, z, { parent: CHR });
// worn oval rug under the middle of the room
const rugTex = canvasTex(1024, 640, (g, w, h) => { g.fillStyle = "#6e3a32"; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 6, h / 2 - 6, 0, 0, 7); g.fill(); g.strokeStyle = "#c8a060"; g.lineWidth = 14; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 50, h / 2 - 50, 0, 0, 7); g.stroke();
  g.strokeStyle = "#3a1a14"; g.lineWidth = 8; g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 8, h / 2 - 8, 0, 0, 7); g.stroke(); g.fillStyle = "rgba(200,190,170,.18)"; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(rnd() * w, rnd() * h, 20 + rnd() * 60, 0, 7); g.fill(); } });
const rug = add(new THREE.PlaneGeometry(2.3, 1.45), new THREE.MeshStandardMaterial({ map: rugTex, transparent: true, alphaTest: 0.5, roughness: 0.95 }), -0.1, 0.004, -0.55, { rx: -Math.PI / 2, cast: false });
rugTex.wrapS = rugTex.wrapT = THREE.ClampToEdgeWrapping; { const c = document.createElement("canvas"); }
// scattered paper scraps + a broken frame on the floor
const scrapM = [0xe8e0cc, 0xd8cfb4, 0xf0ead8].map(c => mat({ color: c }));
for (let i = 0; i < 14; i++) add(box(0.12 + rnd() * 0.12, 0.003, 0.1 + rnd() * 0.12, 0.001), scrapM[i % 3], -1.8 + rnd() * 3.5, 0.008 + rnd() * 0.002, BACK + 0.6 + rnd() * 2.6, { ry: rnd() * 3 });
add(box(0.32, 0.02, 0.26, 0.005), mat({ color: 0x4a3018 }), 1.45, 0.012, -0.05, { ry: 0.6 });
// cobwebs in the ceiling corners (drawn web texture on quarter planes, no outline needed)
const webTex = canvasTex(256, 256, (g, w, h) => { g.strokeStyle = "rgba(235,235,245,.75)"; g.lineWidth = 2; for (let k = 0; k < 7; k++) { const a = k / 6 * Math.PI / 2; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * w, Math.sin(a) * h); g.stroke(); }
  for (let r = 40; r < w; r += 40) { g.beginPath(); for (let k = 0; k <= 6; k++) { const a = k / 6 * Math.PI / 2, rr = r * (0.92 + 0.08 * Math.sin(k * 2)); k ? g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.stroke(); } });
const webM = new THREE.MeshBasicMaterial({ map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.6, fog: true });
for (const [x, z, ry] of [[XL, BACK, Math.PI / 4], [XR, BACK, -Math.PI / 4], [XL, WIN.z + WIN.w / 2 + 0.05, Math.PI / 2]]) { const m = add(new THREE.PlaneGeometry(0.6, 0.6), webM, x + Math.sign(-x) * 0.2, RH - 0.2, z + 0.2, { ry, cast: false }); m.rotation.z = Math.PI; }
// bare bulb on a cord, centre of the room (on only in the photo world)
const BULB = V(-0.15, 2.0, -0.55);
add(new THREE.CylinderGeometry(0.005, 0.005, RH - BULB.y - 0.05, 6), mat({ color: 0x111111 }), BULB.x, (RH + BULB.y + 0.05) / 2, BULB.z, { cast: false });
add(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 10), mat({ color: 0x2a2a2a, metalness: 0.5 }), BULB.x, BULB.y + 0.07, BULB.z);
const bulbM = new THREE.MeshBasicMaterial({ color: 0xffffff }); const bulb = add(new THREE.SphereGeometry(0.04, 16, 12), bulbM, BULB.x, BULB.y, BULB.z, { cast: false });

// ---------------------------------------------------------------- the broken mantel clock (beside the body in A and C): 11:42, cracked glass
const CLOCK = { p: V(0.62, 0.0, -0.32) };
const faceTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#efe6cf"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); g.strokeStyle = "#2b2018"; g.lineWidth = 14; g.stroke();
  g.fillStyle = "#2b2018"; g.font = "700 54px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle"; for (let i = 1; i <= 12; i++) { const a = i / 12 * Math.PI * 2; g.fillText(["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][i - 1], 256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190); }
  const hand2 = (a, L, wd) => { g.lineWidth = wd; g.lineCap = "round"; g.beginPath(); g.moveTo(256, 256); g.lineTo(256 + Math.sin(a) * L, 256 - Math.cos(a) * L); g.stroke(); };
  g.strokeStyle = "#1b1410"; hand2((11 + 42 / 60) / 12 * Math.PI * 2, 120, 18); hand2(42 / 60 * Math.PI * 2, 175, 11); g.fillStyle = "#1b1410"; g.beginPath(); g.arc(256, 256, 16, 0, 7); g.fill(); });
const crackTex = canvasTex(512, 512, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = 4; const c = [210, 200];
  for (let k = 0; k < 9; k++) { let [x, y] = c, a = k / 9 * Math.PI * 2 + rnd() * 0.4; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { a += (rnd() - .5) * 0.6; x += Math.cos(a) * 45; y += Math.sin(a) * 45; g.lineTo(x, y); } g.stroke(); }
  g.lineWidth = 2; for (let r = 40; r < 160; r += 55) { g.beginPath(); for (let k = 0; k <= 9; k++) { const a = k / 9 * Math.PI * 2, rr = r * (0.8 + rnd() * 0.4); k ? g.lineTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr) : g.moveTo(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr); } g.stroke(); } });
const CLK = new THREE.Group(); CLK.position.copy(CLOCK.p); CLK.position.y = 0.1; CLK.rotation.set(-0.95, -0.4, 0.18); scene.add(CLK);   // round twin-bell alarm clock, fallen on its back, face tipped up toward the room
const clkBody = mat({ color: 0x8a2a22, roughness: 0.45, metalness: 0.2 }), brassM = mat({ color: 0xd2a650, metalness: 0.85, roughness: 0.3 });
add(new THREE.CylinderGeometry(0.17, 0.17, 0.11, 40), clkBody, 0, 0, 0, { rx: Math.PI / 2, parent: CLK });
add(new THREE.TorusGeometry(0.165, 0.02, 10, 40), brassM, 0, 0, 0.056, { parent: CLK });
for (const sx of [-1, 1]) { add(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), brassM, sx * 0.1, 0.17, 0, { rz: -sx * 0.5, parent: CLK });   // bells
  add(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 8), brassM, sx * 0.11, -0.17, 0.0, { rz: sx * 0.4, parent: CLK }); }                                       // feet
add(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), brassM, 0, 0.2, 0, { rz: Math.PI / 2, parent: CLK });                                                   // hammer bar
add(new THREE.TorusGeometry(0.05, 0.008, 6, 16, Math.PI), brassM, 0, 0.22, -0.02, { parent: CLK });                                                         // handle
const clockFace = add(new THREE.CircleGeometry(0.15, 40), mat({ map: faceTex, emissive: 0xffe2a8, emissiveMap: faceTex, emissiveIntensity: 0 }), 0, 0, 0.056, { parent: CLK, cast: false });
const crack = add(new THREE.CircleGeometry(0.15, 40), new THREE.MeshBasicMaterial({ map: crackTex, transparent: true, depthWrite: false, opacity: 0.85 }), 0, 0, 0.064, { parent: CLK, cast: false });
for (let i = 0; i < 5; i++) add(new THREE.TetrahedronGeometry(0.018 + rnd() * 0.015), new THREE.MeshStandardMaterial({ color: 0xdfefff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.6 }), CLOCK.p.x - 0.25 + rnd() * 0.5, 0.012, CLOCK.p.z + 0.1 + rnd() * 0.3, { cast: false });   // glass shards
const reflM = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, fog: false }); const refl = add(new THREE.PlaneGeometry(0.17, 0.24), reflM, 0.02, 0.0, 0.066, { parent: CLK, cast: false }); refl.visible = false;   // the reflection in the glass (scenes 9-10)
const clockGlow = new THREE.PointLight(0xffd59a, 0, 1.4, 2); clockGlow.position.set(CLOCK.p.x, 0.35, CLOCK.p.z + 0.25); scene.add(clockGlow);
const clockStuff = [CLK]; scene.children.slice(-6, -1).forEach(o => { if (o.geometry && o.geometry.type === "TetrahedronGeometry") clockStuff.push(o); });

// ---------------------------------------------------------------- lights (base); applyVer() sets them per version
const hemi = new THREE.HemisphereLight(0x5a6aa0, 0x2a2018, 0.5); scene.add(hemi);
const bulbL = new THREE.PointLight(0xffc27a, 0, 5, 1.6); bulbL.position.copy(BULB).add(V(0, -0.05, 0)); bulbL.castShadow = true; bulbL.shadow.mapSize.set(1024, 1024); bulbL.shadow.bias = -0.002; scene.add(bulbL);
const gapTex = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#000"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; for (const [y0, y1] of [[60, 92], [190, 222], [330, 352], [438, 470]]) g.fillRect(0, y0, w, y1 - y0); });
const sun = new THREE.SpotLight(0xffe2b0, 0, 12, 0.32, 0.18, 1.0); sun.map = gapTex; sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006;
const SUNDIR = V(1.0, -0.62, 0.32).normalize(); sun.position.copy(V(XL, WIN.y, WIN.z).addScaledVector(SUNDIR, -3.2)); sun.target.position.copy(V(XL, WIN.y, WIN.z).addScaledVector(SUNDIR, 2.0)); scene.add(sun, sun.target);
const moonL = new THREE.SpotLight(0x7d9cff, 0, 10, 0.34, 0.3, 1.1); moonL.map = gapTex; moonL.castShadow = true; moonL.shadow.mapSize.set(1024, 1024);
moonL.position.copy(V(XL, WIN.y, WIN.z).addScaledVector(V(1.0, -0.45, -0.2).normalize(), -3.0)); moonL.target.position.set(0.2, 0.2, -0.8); scene.add(moonL, moonL.target);
const fillL = new THREE.PointLight(0x6a80d8, 0.6, 7, 1.5); fillL.position.set(0.5, 1.9, 1.0); scene.add(fillL);
const strobeR = new THREE.PointLight(0xff2a3a, 0, 6, 1.3), strobeB = new THREE.PointLight(0x2a5aff, 0, 6, 1.3);
strobeR.position.set(XL + 0.35, WIN.y, WIN.z - 0.3); strobeB.position.set(XL + 0.35, WIN.y, WIN.z + 0.3); scene.add(strobeR, strobeB);
const hallStrobe = new THREE.PointLight(0xff3a48, 0, 4, 1.4); hallStrobe.position.set(XR - 0.2, 1.2, DOOR.z); scene.add(hallStrobe);
const torch = new THREE.SpotLight(0xfff0d0, 0, 6, 0.28, 0.5, 1.2); torch.castShadow = true; scene.add(torch, torch.target);   // police torch (C)
// volumetric beams from the window gaps (B: sunlight, C: faint moon/strobe) + dust inside them
const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  uniforms: { col: { value: new THREE.Color(1.0, 0.86, 0.6) }, k: { value: 0 } },
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 w = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-w.xyz); gl_Position = projectionMatrix * w; }`,
  fragmentShader: `uniform vec3 col; uniform float k; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
    void main(){ float along = 1.0 - vUv.y; float a = k * pow(abs(dot(vN, vV)), 1.5) * smoothstep(0.0, 0.08, 1.0 - along) * (0.35 + 0.65 * (1.0 - along)) * smoothstep(0.0, 0.25, along + 0.05); gl_FragColor = vec4(col * a, a); }` });
const beams = [];
for (const [y0, y1] of [[60, 92], [190, 222], [330, 352], [438, 470]]) {   // gap rows of gapTex mapped onto the window height
  const yc = WIN.y + WIN.h / 2 - ((y0 + y1) / 2) / 512 * WIN.h, hh = (y1 - y0) / 512 * WIN.h * 1.3, L = 3.4;
  const g = new THREE.CylinderGeometry(1, 1, L, 4, 1, true); g.rotateY(Math.PI / 4); g.scale(1, 1, 1); g.translate(0, -L / 2, 0);
  const m = new THREE.Mesh(g, beamM); m.scale.set(hh * 0.7, 1, WIN.w * 0.62); m.position.set(XL + 0.02, yc, WIN.z);
  m.quaternion.setFromUnitVectors(V(0, -1, 0), SUNDIR); m.renderOrder = 10; scene.add(m); beams.push(m); }
const dustN = 260, dustGeo = new THREE.BufferGeometry(), dustP = new Float32Array(dustN * 3), dustS = [];
for (let i = 0; i < dustN; i++) dustS.push([rnd(), rnd() - 0.5, rnd() - 0.5, 0.2 + rnd() * 0.8]); dustGeo.setAttribute("position", new THREE.BufferAttribute(dustP, 3));
const dotTex = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,240,210,1)"); gr.addColorStop(1, "rgba(255,240,210,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
const dustM = new THREE.PointsMaterial({ map: dotTex, size: 0.012, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe2b0, opacity: 0 });
const dust = new THREE.Points(dustGeo, dustM); dust.renderOrder = 11; scene.add(dust);
function placeDust(t) { const O = V(XL + 0.05, WIN.y, WIN.z); for (let i = 0; i < dustN; i++) { const [u, a, b, sp] = dustS[i]; const L = ((u + t * 0.01 * sp) % 1) * 3.0;
  const p = O.clone().addScaledVector(SUNDIR, L).add(V(0, a * (0.55 + L * 0.2) + Math.sin(t * 0.7 * sp + i) * 0.03, b * (0.7 + L * 0.25))); dustP.set([p.x, p.y, p.z], i * 3); } dustGeo.attributes.position.needsUpdate = true; }

// ---------------------------------------------------------------- versions (light + dressing)
const VERS = {
  A: { hemi: 0.5, hemiCol: 0x6a6f9a, bulb: 3.2, sun: 0, moon: 9, fill: 0.35, beam: 0.05, beamCol: [0.7, 0.8, 1.0], dust: 0.25, fog: 0.06, fogCol: 0x2a2a34, sky: "A", vig: 0.55, sepia: 0.9, grain: 0.05, tint: [0, 0, 0], strobe: 0, body: true, bg: 0x101420 },
  B: { hemi: 1.7, hemiCol: 0x9aa8d8, bulb: 0, sun: 120, moon: 0, fill: 2.2, beam: 0.42, beamCol: [1.0, 0.86, 0.6], dust: 0.85, fog: 0.035, fogCol: 0x6a6a80, sky: "B", vig: 0.48, sepia: 0, grain: 0.025, tint: [-0.01, 0, 0.03], strobe: 0, body: false, bg: 0x1a1a24 },
  C: { hemi: 0.3, hemiCol: 0x2a46c8, bulb: 0, sun: 0, moon: 16, fill: 0.9, beam: 0.08, beamCol: [0.5, 0.6, 1.0], dust: 0.2, fog: 0.065, fogCol: 0x101a3a, sky: "C", vig: 0.62, sepia: 0, grain: 0.03, tint: [-0.03, 0, 0.08], strobe: 1, body: true, bg: 0x060a1c },
};
function lightsOff() { for (const L of [bulbL, sun, moonL, fillL, strobeR, strobeB, hallStrobe, clockGlow, torch]) L.visible = L.intensity > 0 || L === moonL || L === sun; }   // zero lights cost per pixel too (sun/moon keep their baked shadow maps)
function applyVer(ver, t, o = {}) {
  const S = VERS[ver] || VERS.A, flick = ver === "A" ? 1 - 0.08 * Math.sin(t * 17) * Math.sin(t * 5.3) : 1;
  hemi.intensity = S.hemi * (o.hemiK ?? 1); hemi.color.set(S.hemiCol).lerp(new THREE.Color(0x2a46c8), o.blueK || 0); bulbL.intensity = S.bulb * flick * (o.bulbK ?? 1); bulbM.color.setRGB(1, 0.85, 0.6).multiplyScalar(S.bulb > 0 ? 9 * flick * (o.bulbK ?? 1) : 0.15);
  sun.intensity = S.sun * (o.sunK ?? 1); moonL.intensity = S.moon; fillL.intensity = S.fill; beamM.uniforms.k.value = S.beam * (o.beamK ?? 1); beamM.uniforms.col.value.setRGB(...S.beamCol); dustM.opacity = S.dust;
  scene.fog.color.set(S.fogCol); scene.fog.density = S.fog; scene.background.set(S.bg); skyM.map = skyTex[S.sky]; skyM.needsUpdate = true;
  grade.uniforms.vig.value = S.vig; grade.uniforms.sepia.value = o.sepia ?? S.sepia; grade.uniforms.grain.value = S.grain; grade.uniforms.tint.value.set(...(o.tint || S.tint)); if (o.vig != null) grade.uniforms.vig.value = o.vig;
  const ph = Math.floor(t * 4) % 2, st = S.strobe; strobeR.intensity = st * (ph ? 7 : 0.3); strobeB.intensity = st * (ph ? 0.3 : 7); hallStrobe.intensity = st * (ph ? 0.4 : 3.5);
  const bolt = st > 0.5 && ((t % 3.3) < 0.07 || ((t % 3.3) > 0.15 && (t % 3.3) < 0.2)); moonL.intensity += bolt ? 120 : 0;
  hallM.color.set(st ? (ph ? 0x1a1030 : 0x401018) : 0x0a0a12);
  const showBody = o.body ?? S.body; for (const c of clockStuff) c.visible = showBody; tapeG.visible = ver === "C" && o.tape !== false;
  clockGlow.intensity = (o.clockGlow || 0) * 0.9; clockFace.material.emissiveIntensity = (o.clockGlow || 0) * 0.22;
  for (const L of [bulbL, sun, moonL, strobeR, strobeB, hallStrobe, clockGlow, torch]) L.visible = true;
  torch.intensity = o.torch ? 22 : 0; if (o.torch) { torch.position.set(...o.torch[0]); torch.target.position.set(...o.torch[1]); }
}

// ---------------------------------------------------------------- characters: engine renders on cards (composited over the world like office.js), with contact shadows
const TL = new THREE.TextureLoader(), cardScene = new THREE.Scene(), cards = [], shadows = [];
const shTex = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, "rgba(10,12,40,.75)"); gr.addColorStop(0.6, "rgba(10,12,40,.35)"); gr.addColorStop(1, "rgba(10,12,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
shTex.wrapS = shTex.wrapT = THREE.ClampToEdgeWrapping;
for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.04, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
  m.visible = false; cardScene.add(m); cards.push(m);
  const s = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, fog: false })); s.rotation.x = -Math.PI / 2; s.visible = false; s.renderOrder = 4; scene.add(s); shadows.push(s); }
const texCache = new Map();
async function loadTex(url) { if (texCache.has(url)) return texCache.get(url); const t = await TL.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; texCache.set(url, t);
  if (texCache.size > 12) { const k = texCache.keys().next().value; texCache.get(k).dispose(); texCache.delete(k); } return t; }
async function placeCards(list) {
  for (let i = 0; i < cards.length; i++) { const P = list[i], C = cards[i], S = shadows[i];
    if (!P || !P.url) { C.visible = false; S.visible = false; continue; }
    const t = await loadTex(P.url); C.material.map = t; C.material.needsUpdate = true; C.material.color.setRGB(...(P.tint || [1, 1, 1])); C.material.opacity = P.alpha ?? 1; C.material.transparent = true;
    const k = P.height / (4.65 * P.ppu), pw = P.w * k, ph = P.h * k, A = V(...P.anchor);
    const off = V((P.w / 2 - P.base[0]) * k, (P.base[1] - P.h / 2) * k, 0);
    if (P.face) C.quaternion.copy(camera.quaternion); else { const d = V().subVectors(camera.position, A); C.rotation.set(0, Math.atan2(d.x, d.z), 0); }
    if (P.roll) C.rotateZ(P.roll);
    C.scale.set(pw, ph, 1); off.applyQuaternion(C.quaternion); C.position.copy(A).add(off); C.visible = true;
    const sw = P.shadow || [0.95, 0.55]; S.visible = P.shadow !== false; S.scale.set(sw[0], sw[1], 1); S.position.set(A.x + (sw[2] || 0), 0.006, A.z + (sw[3] || 0)); S.material.opacity = P.shOp ?? 1; }
}
// police tape (C): drawn over the cards so it reads in front of whoever stands behind it (the doorway)
const tapeTex = canvasTex(1024, 96, (g, w, h) => { g.fillStyle = "#f5c518"; g.fillRect(0, 0, w, h); g.fillStyle = "#151515"; g.fillRect(0, 0, w, 8); g.fillRect(0, h - 8, w, 8);
  g.font = "900 46px Arial Black, sans-serif"; g.textBaseline = "middle"; for (let x = 10; x < w; x += 512) g.fillText("POLICE LINE  DO NOT CROSS", x, h / 2 + 2); }, [2, 1]);
const tapeG = new THREE.Group(); cardScene.add(tapeG);
const tapeM = new THREE.MeshBasicMaterial({ map: tapeTex, side: THREE.DoubleSide, toneMapped: false, fog: false, depthTest: false, color: 0xbfbfbf });
function tape(a, b, wd = 0.07, sag = 0.06) { const A = V(...a), B = V(...b), N = 16, pos = [], uv = [], idx = [], L = A.distanceTo(B);
  for (let i = 0; i <= N; i++) { const u = i / N, p = A.clone().lerp(B, u); p.y -= Math.sin(u * Math.PI) * sag; const tw = Math.sin(u * 9) * 0.25;
    pos.push(p.x, p.y + wd / 2 * Math.cos(tw), p.z + wd / 2 * Math.sin(tw), p.x, p.y - wd / 2 * Math.cos(tw), p.z - wd / 2 * Math.sin(tw)); uv.push(u * L * 1.2, 1, u * L * 1.2, 0); if (i < N) { const j = i * 2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); } }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); tapeG.add(new THREE.Mesh(g, tapeM)); }
tape([XR - 0.06, 1.25, DOOR.z - DOOR.w / 2 - 0.05], [XR - 0.06, 0.85, DOOR.z + DOOR.w / 2 + 0.05], 0.08, 0.03);
tape([XR - 0.06, 0.7, DOOR.z - DOOR.w / 2 - 0.05], [XR - 0.06, 1.05, DOOR.z + DOOR.w / 2 + 0.05], 0.08, 0.02);
tapeG.visible = false;
const tapeMul = new THREE.Color();   // tape picks up the strobe colour a little

// ---------------------------------------------------------------- render
const PTS = { clock: [CLOCK.p.x, 0.25, CLOCK.p.z + 0.1], clockFace: [0, 0, 0], body: [-0.35, 0.2, -0.55], door: [XR, 1.0, DOOR.z], window: [XL, WIN.y, WIN.z] };
let lastVer = null;
window.AP = { CLOCK: CLOCK.p.toArray(), BULB: BULB.toArray(), DOOR: [XR, 0, DOOR.z], WIN: [XL, WIN.y, WIN.z], SUNDIR: SUNDIR.toArray() };
window.renderFrame = async (F) => {   // F: { t, ver, cam:{pos,tgt,fov,focus,roll}, pions:[{url,base,ppu,w,h,anchor,height,tint,roll,face,shadow}], sepia, flash, clockGlow, body, torch, bulbK, beamK, pts:{name:[x,y,z]} }
  camera.position.set(...F.cam.pos); camera.fov = F.cam.fov; camera.updateProjectionMatrix(); camera.lookAt(...F.cam.tgt); if (F.cam.roll) camera.rotateZ(F.cam.roll); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = F.cam.focus; bokeh.uniforms.aperture.value = F.cam.aperture ?? 0.0016; placeDust(F.t); grade.uniforms.time.value = F.t;
  applyVer(F.ver || "A", F.t, F); lightsOff(); grade.uniforms.flash.value = F.flash || 0; if (lastVer !== F.ver) { renderer.shadowMap.needsUpdate = true; lastVer = F.ver; }
  const ph = Math.floor(F.t * 4) % 2; tapeM.color.copy(F.ver === "C" ? tapeMul.setRGB(ph ? 0.8 : 0.55, 0.55, ph ? 0.6 : 0.85) : tapeMul.setRGB(0.75, 0.75, 0.75));
  if (F.refl) { reflM.map = await loadTex(F.refl.url); reflM.opacity = F.refl.k; reflM.needsUpdate = true; refl.visible = true; } else refl.visible = false;
  const list = (F.pions || (F.pion ? [F.pion] : [])); await placeCards(list);
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  renderer.setRenderTarget(pionRT); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(cardScene, camera); renderer.setRenderTarget(null);
  composer.render();
  const pr = (p) => { const q = V(...p).project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2, q.z]; };
  CLK.updateMatrixWorld(); const cf = V(0, 0, 0.07).applyMatrix4(CLK.matrixWorld).toArray(); PTS.clockFace = cf;
  const pts = {}; for (const [k, p] of Object.entries(Object.assign({}, PTS, F.pts || {}))) pts[k] = pr(p);
  list.forEach((P, i) => { if (P && P.anchor) pts["pion" + i] = pr([P.anchor[0], P.anchor[1] + P.height * 0.75, P.anchor[2]]); });
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};

{ const orig = gtao.render.bind(gtao); gtao.render = (...a) => { const H = [...beams, dust, ...scene.children.filter(o => o.material === webM)].filter(Boolean), v = H.map(o => o.visible); H.forEach(o => o.visible = false); orig(...a); H.forEach((o, i) => o.visible = v[i]); }; }   // volumes/particles stay out of the AO + ink depth
window.__ready = true;
