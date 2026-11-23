// "The Mysterious Like": three locations in one scene, same render chain as The Photograph (AgX, GTAO, ink lines, bokeh, bloom, grade)
// and the same character system (charlayer v2: grounding, depth-only push, two-tone form light, rim, contact + cast shadows).
//   apt     the influencer's apartment: dark, one warm spotlight on the victim and Pion
//   phones  four small worlds with the other victims' phones (same profile picture, different usernames)
//   house   the target's house: closed front door between two windows, moon beams, the pawn silhouette with a shotgun, lightning
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
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.shadowMap.autoUpdate = true;   // per light: static lights baked once per version (charlayer.bake), the sun follows Pion every frame in B
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b1024);
scene.fog = new THREE.FogExp2(0x1a2038, 0.05);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 60);

// ---------------------------------------------------------------- post chain (as office.js) + photo grade (sepia-blue, fade, scratches)
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
let seed = 9131; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canvasTex(w, h, draw, repeat) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(...repeat); return t; }
const mat = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.85, metalness: 0 }, o));
const add = (geo, m, x, y, z, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; if (o.ry) me.rotation.y = o.ry; if (o.rz) me.rotation.z = o.rz;
  me.castShadow = o.cast !== false; me.receiveShadow = true; (o.parent || scene).add(me); return me; };
const box = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
const hand = (g, txt, x, y, size, col = "#1d2a5a", rot = 0, font = "Caveat, 'Comic Neue', cursive") => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = col; g.font = `700 ${size}px ${font}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 0, 0); g.restore(); };
const group = (x, y, z, ry = 0) => { const G = new THREE.Group(); G.position.set(x, y, z); G.rotation.y = ry; scene.add(G); return G; };
const lerp = (a, b, k) => a + (b - a) * k;


// ================================================================ shared pieces
const DARK = mat({ color: 0x0a0b10, roughness: 0.9 });
function beamMat(col, op) {   // volumetric light shaft: brighter near the source, soft edges, additive
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { col: { value: new THREE.Color(col) }, op: { value: op }, k: { value: 1 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 col; uniform float op, k; varying vec2 vUv; varying vec3 vN, vV;
      void main(){ float e = pow(abs(dot(normalize(vN), normalize(vV))), 2.2); float a = op * k * e * pow(vUv.y, 1.1) * smoothstep(0.0, 0.25, vUv.y); gl_FragColor = vec4(col * a, a); }` }); }
function beam(from, to, r0, r1, col, op) {   // cone from the source (r0) to the floor (r1)
  const d = V(...to).sub(V(...from)), L = d.length(), g = new THREE.CylinderGeometry(r0, r1, L, 32, 1, true); g.translate(0, -L / 2, 0);
  const m = new THREE.Mesh(g, beamMat(col, op)); m.position.set(...from); m.quaternion.setFromUnitVectors(V(0, -1, 0), d.normalize()); m.renderOrder = 10; scene.add(m); return m; }
function wood(base, line, n = 8) { return canvasTex(512, 512, (g, w, h) => { g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) { g.strokeStyle = line; g.lineWidth = 3; g.beginPath(); g.moveTo(0, i * h / n); g.lineTo(w, i * h / n); g.stroke();
    for (let k = 0; k < 30; k++) { g.strokeStyle = `rgba(0,0,0,${rnd() * 0.12})`; g.lineWidth = 1; const y = i * h / n + rnd() * h / n; g.beginPath(); g.moveTo(rnd() * w, y); g.lineTo(rnd() * w, y + (rnd() - 0.5) * 4); g.stroke(); } } }, [3, 3]); }

// ---- the disturbing profile picture (identical on every account) + the phone screen UI (generic video app, no real brand logo)
function pfp(g, x, y, r) {
  g.save(); g.beginPath(); g.arc(x, y, r, 0, 7); g.clip();
  const gr = g.createRadialGradient(x, y - r * 0.2, r * 0.1, x, y, r); gr.addColorStop(0, "#2a1416"); gr.addColorStop(1, "#050303"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  g.fillStyle = "#0b0b0d"; g.beginPath(); g.arc(x, y - r * 0.12, r * 0.42, 0, 7); g.fill(); g.fillRect(x - r * 0.34, y + r * 0.2, r * 0.68, r);   // pawn head + body silhouette
  g.beginPath(); g.ellipse(x, y + r * 0.3, r * 0.5, r * 0.12, 0, 0, 7); g.fill();
  g.fillStyle = "#f4f1e8"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + s * r * 0.16, y - r * 0.18, r * 0.07, r * 0.1, s * 0.15, 0, 7); g.fill(); }   // hollow white eyes
  g.fillStyle = "#000"; for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * r * 0.15, y - r * 0.16, r * 0.025, 0, 7); g.fill(); }
  g.strokeStyle = "#f4f1e8"; g.lineWidth = r * 0.035; g.lineCap = "round"; g.beginPath(); g.moveTo(x - r * 0.26, y - r * 0.02); g.quadraticCurveTo(x, y + r * 0.22, x + r * 0.26, y - r * 0.02); g.stroke();   // wide thin smile
  g.restore(); g.strokeStyle = "#7a1418"; g.lineWidth = r * 0.07; g.beginPath(); g.arc(x, y, r * 0.96, 0, 7); g.stroke();
}
const PHONES = {};
function screenTex(user, title, thumb, ago) {
  return canvasTex(540, 1140, (g, w, h) => {
    g.fillStyle = "#0f0f12"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#e8e8ea"; g.font = "600 26px Montserrat, Arial"; g.fillText("11:42", 28, 44); g.fillText("●●● 23%", w - 150, 44);
    g.fillStyle = "#ff2b3a"; g.beginPath(); g.roundRect(28, 76, 64, 44, 12); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(52, 86); g.lineTo(52, 110); g.lineTo(72, 98); g.closePath(); g.fill();
    const tg = g.createLinearGradient(0, 150, w, 450); tg.addColorStop(0, thumb[0]); tg.addColorStop(1, thumb[1]); g.fillStyle = tg; g.fillRect(0, 150, w, 304);   // the video
    g.fillStyle = "rgba(255,255,255,.85)"; g.beginPath(); g.arc(w / 2, 302, 46, 0, 7); g.fill(); g.fillStyle = "#222"; g.beginPath(); g.moveTo(w / 2 - 14, 280); g.lineTo(w / 2 - 14, 324); g.lineTo(w / 2 + 22, 302); g.closePath(); g.fill();
    g.fillStyle = "#fff"; g.font = "700 34px Montserrat, Arial"; g.fillText(title, 28, 512);
    g.fillStyle = "#a9a9b0"; g.font = "500 24px Montserrat, Arial"; g.fillText("2.4M views  ·  " + ago, 28, 552);
    g.fillStyle = "#26262c"; for (let i = 0; i < 3; i++) { g.beginPath(); g.roundRect(28 + i * 168, 586, 152, 58, 29); g.fill(); }
    g.fillStyle = "#fff"; g.font = "600 24px Montserrat, Arial"; g.fillText("♥ 186K", 56, 624); g.fillText("Share", 228, 624); g.fillText("Save", 400, 624);
    g.fillStyle = "#1c1c22"; g.beginPath(); g.roundRect(20, 680, w - 40, 250, 22); g.fill(); g.strokeStyle = "#ff2b3a"; g.lineWidth = 4; g.stroke();   // the like card
    g.fillStyle = "#ff5a66"; g.font = "700 28px Montserrat, Arial"; g.fillText("♥ Liked by", 48, 726);
    pfp(g, 118, 830, 72); g.fillStyle = "#fff"; g.font = "800 34px Montserrat, Arial"; g.fillText(user, 212, 822); g.fillStyle = "#a9a9b0"; g.font = "500 24px Montserrat, Arial"; g.fillText("just now", 212, 862);
    g.fillStyle = "#26262c"; for (let i = 0; i < 3; i++) g.fillRect(28, 970 + i * 52, w - 56 - i * 90, 30);
  });
}
function phone(x, y, z, ry, rx, user, title, thumb, ago, rz = 0) {
  const G = new THREE.Group(); G.position.set(x, y, z); G.rotation.set(rx, ry, rz, "YXZ"); scene.add(G);
  const b = add(box(0.13, 0.012, 0.27, 0.012), mat({ color: 0x15151a, roughness: 0.35, metalness: 0.4 }), 0, 0.006, 0, { parent: G });
  const s = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.253), new THREE.MeshBasicMaterial({ map: screenTex(user, title, thumb, ago), toneMapped: false }));
  s.rotation.x = -Math.PI / 2; s.position.y = 0.0125; G.add(s);
  const glow = new THREE.PointLight(0xc8d4ff, 0.05, 0.45, 2); glow.position.set(0, 0.16, 0); G.add(glow);   // faint screen spill (close to the surface it burns a hot spot)
  return { G, screen: s, pfpAt: new THREE.Vector3(-0.0338, 0.013, 0.0577).applyEuler(G.rotation).add(G.position) };   // world point of the profile picture
}

// ================================================================ A: the influencer's apartment, built like The Photograph sets: painted textures with drawn lines,
// chunky bevelled furniture, dense storytelling props, ONE signature colour (blush pink + a pink neon), dark except one warm spot. Pion scale: ceiling 2.45.
const A = { XL: -2.2, XR: 2.2, BACK: -2.2, FRONT: 2.2, H: 2.45, WH: 0.72 };
const trimA = mat({ color: 0xf2ece6, roughness: 0.6 });
{ const wallT = canvasTex(1024, 1024, (g, w, h) => {   // blush wallpaper: drawn cream stripes, tiny gold hearts, soft hand-drawn variation
    g.fillStyle = "#d79bb2"; g.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 96) { g.fillStyle = "#e3afc2"; g.fillRect(x + 30, 0, 36, h); g.strokeStyle = "rgba(150,70,100,.35)"; g.lineWidth = 2; for (const dx of [30, 66]) { g.beginPath(); g.moveTo(x + dx, 0); g.lineTo(x + dx, h); g.stroke(); } }
    for (let y = 40; y < h; y += 96) for (let x = 0; x < w; x += 96) { const cx = x + 48 + ((y / 96) % 2) * 48, cy = y; g.fillStyle = "rgba(196,150,70,.7)"; g.beginPath(); g.moveTo(cx, cy + 6); g.bezierCurveTo(cx - 9, cy - 2, cx - 4, cy - 9, cx, cy - 3); g.bezierCurveTo(cx + 4, cy - 9, cx + 9, cy - 2, cx, cy + 6); g.fill(); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(120,50,80,${rnd() * .05})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [2.5, 1.4]);
  const wainT = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = "#f3ede8"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 48) { g.strokeStyle = "#b8a8a4"; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 30); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = "#fbf7f3"; g.fillRect(0, 0, w, 30); g.strokeStyle = "#a89894"; g.lineWidth = 5; g.strokeRect(-5, 0, w + 10, 30); }, [3, 1]);
  const floorT = canvasTex(1024, 1024, (g, w, h) => { for (let y = 0; y < h; y += 90) { let x = -(rnd() * 200); while (x < w) { const L = 260 + rnd() * 260, c = 168 + rnd() * 22; g.fillStyle = `rgb(${c},${c * .78},${c * .58})`; g.fillRect(x, y, L, 90);
      g.strokeStyle = "#5a3a22"; g.lineWidth = 4; g.strokeRect(x, y, L, 90); g.strokeStyle = "rgba(90,58,30,.28)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const yy = y + 18 + k * 26; g.beginPath(); g.moveTo(x + 10, yy); g.bezierCurveTo(x + L * .3, yy - 6, x + L * .6, yy + 6, x + L - 10, yy); g.stroke(); } x += L; } } }, [3, 3]);
  const wallM = mat({ map: wallT }), wainM = mat({ map: wainT });
  add(new THREE.PlaneGeometry(A.XR - A.XL, A.FRONT - A.BACK), mat({ map: floorT, roughness: 0.55 }), 0, 0, 0, { rx: -Math.PI / 2, cast: false }).userData.ground = true;
  add(new THREE.PlaneGeometry(A.XR - A.XL, A.FRONT - A.BACK), mat({ color: 0xe8dcd8 }), 0, A.H, 0, { rx: Math.PI / 2, cast: false });
  for (const [w, x, z, ry] of [[A.XR - A.XL, 0, A.BACK, 0], [A.FRONT - A.BACK, A.XL, 0, Math.PI / 2], [A.FRONT - A.BACK, A.XR, 0, -Math.PI / 2]]) {
    const up = new THREE.Mesh(new THREE.PlaneGeometry(w, A.H - A.WH), wallM); up.position.set(x, A.WH + (A.H - A.WH) / 2, z); up.rotation.y = ry; up.receiveShadow = true; scene.add(up);
    const lo = new THREE.Mesh(new THREE.PlaneGeometry(w, A.WH), wainM); lo.position.set(x, A.WH / 2, z); lo.rotation.y = ry; lo.receiveShadow = true; scene.add(lo); }
  add(box(A.XR - A.XL, 0.08, 0.05), trimA, 0, A.H - 0.04, A.BACK + 0.025); add(box(A.XR - A.XL, 0.1, 0.04), trimA, 0, 0.05, A.BACK + 0.02); add(box(A.XR - A.XL, 0.04, 0.04), trimA, 0, A.WH, A.BACK + 0.02);
  for (const sx of [-1, 1]) { add(box(0.04, 0.1, A.FRONT - A.BACK, 0.01), trimA, sx * (A.XR - 0.02), 0.05, 0); add(box(0.04, 0.04, A.FRONT - A.BACK, 0.01), trimA, sx * (A.XR - 0.02), A.WH, 0); }
  // window (left wall) with a night city behind, sheer curtains + heavy drapes
  const WZ = -0.6, WY = 1.4, WW = 1.1, WHh = 1.0;
  add(new THREE.PlaneGeometry(WW, WHh), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(512, 512, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1030"); gr.addColorStop(1, "#3a2a5a"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9; i++) { const bx = i * 60 - 10, bh = 120 + rnd() * 220; g.fillStyle = "#121630"; g.fillRect(bx, h - bh, 56, bh); for (let k = 0; k < 30; k++) if (rnd() < 0.45) { g.fillStyle = rnd() < 0.7 ? "#ffd890" : "#9fd8ff"; g.fillRect(bx + 6 + (k % 4) * 12, h - bh + 10 + Math.floor(k / 4) * 22, 6, 9); } } }) }), A.XL - 0.04, WY, WZ, { ry: Math.PI / 2, cast: false });
  for (const [w, h, y, z] of [[WW + 0.12, 0.06, WY + WHh / 2, WZ], [WW + 0.14, 0.08, WY - WHh / 2, WZ], [0.06, WHh, WY, WZ - WW / 2], [0.06, WHh, WY, WZ + WW / 2], [0.04, WHh, WY, WZ]]) add(box(0.06, h, w, 0.01), trimA, A.XL + 0.02, y, z);
  const drape = mat({ map: canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#b8607e"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, "rgba(60,10,30,.35)"); gr.addColorStop(0.5, "rgba(255,255,255,.12)"); gr.addColorStop(1, "rgba(60,10,30,.35)"); g.fillStyle = gr; g.fillRect(x, 0, 32, h); } g.strokeStyle = "#5a2038"; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }), side: THREE.DoubleSide });
  for (const s of [-1, 1]) { const gD = new THREE.PlaneGeometry(0.38, 1.6, 12, 1), p = gD.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 40) * 0.03); gD.computeVertexNormals();
    add(gD, drape, A.XL + 0.09, 1.3, WZ + s * (WW / 2 + 0.12), { ry: Math.PI / 2 }); }
  add(new THREE.CylinderGeometry(0.015, 0.015, WW + 0.9, 8), mat({ color: 0xc9a24a, metalness: 0.8, roughness: 0.3 }), A.XL + 0.1, 2.12, WZ, { rx: Math.PI / 2 });
  // pink neon sign on the back wall (the location colour)
  const neonT = canvasTex(1024, 256, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = "italic 900 150px 'Caveat', cursive"; g.textAlign = "center"; g.lineJoin = "round"; g.strokeStyle = "rgba(255,80,160,.5)"; g.lineWidth = 26; g.strokeText("stay pretty", w / 2, 170); g.strokeStyle = "#ffd0ec"; g.lineWidth = 9; g.strokeText("stay pretty", w / 2, 170); });
  add(new THREE.PlaneGeometry(1.3, 0.33), new THREE.MeshBasicMaterial({ map: neonT, transparent: true, toneMapped: false, color: 0xffffff, fog: false, depthWrite: false }), 0.45, 1.95, A.BACK + 0.012, { cast: false });
  // velvet sofa against the back wall, heart cushions, a throw blanket; coffee table with laptop, mugs, a fallen wine glass
  const vel = mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#e7b8c8"; g.fillRect(0, 0, w, h); for (let k = 0; k < w; k += 42) { g.strokeStyle = "rgba(150,70,100,.35)"; g.lineWidth = 4; g.beginPath(); g.moveTo(k, 0); g.lineTo(k, h); g.stroke(); } }, [2, 1]) }), velD = mat({ color: 0xc98aa2 });
  const SF = group(-0.55, 0, A.BACK + 0.42);
  add(box(1.75, 0.52, 0.22, 0.08), vel, 0, 0.62, -0.26, { parent: SF }); add(box(1.75, 0.2, 0.62, 0.07), velD, 0, 0.2, 0, { parent: SF });
  for (const sx of [-1, 1]) add(box(0.2, 0.44, 0.66, 0.1), vel, sx * 0.87, 0.42, 0, { parent: SF });
  for (const sx of [-1, 1]) add(box(0.78, 0.14, 0.54, 0.07), vel, sx * 0.4, 0.37, 0.04, { parent: SF });
  for (const [x, c] of [[-0.55, 0xff8ab0], [0.1, 0xffffff], [0.6, 0xb0d8ff]]) add(box(0.3, 0.28, 0.1, 0.06), mat({ color: c }), x, 0.6, -0.12, { rz: (rnd() - .5) * 0.3, parent: SF });
  add(box(0.6, 0.03, 0.5, 0.02), mat({ color: 0xf6f0e6 }), 0.5, 0.46, 0.08, { rz: -0.05, parent: SF });   // throw
  const CT = group(-0.5, 0, -0.95); const glassT = new THREE.MeshStandardMaterial({ color: 0xdff0ff, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 });
  add(box(0.95, 0.05, 0.5, 0.02), mat({ color: 0xf4f0ec, roughness: 0.3 }), 0, 0.36, 0, { parent: CT }); for (const [x, z] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) add(new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8), mat({ color: 0xc9a24a, metalness: 0.8, roughness: 0.3 }), x, 0.17, z, { parent: CT });
  add(box(0.34, 0.015, 0.24, 0.005), mat({ color: 0xd8d8de, metalness: 0.6, roughness: 0.3 }), -0.15, 0.395, 0.0, { ry: 0.2, parent: CT });
  add(box(0.33, 0.22, 0.012, 0.005), mat({ color: 0xd8d8de, metalness: 0.6, roughness: 0.3 }), -0.17, 0.5, -0.11, { ry: 0.2, rx: -0.25, parent: CT });
  add(new THREE.CylinderGeometry(0.035, 0.03, 0.08, 14), mat({ color: 0xffb6c8 }), 0.25, 0.43, 0.1, { parent: CT });
  add(new THREE.CylinderGeometry(0.04, 0.012, 0.09, 14, 1, true), glassT, 0.62, 0.05, 0.42, { rz: Math.PI / 2, ry: 0.5 });   // fallen wine glass on the floor
  add(new THREE.CircleGeometry(0.18, 24), mat({ color: 0x5a1020, roughness: 0.1 }), 0.75, 0.003, 0.46, { rx: -Math.PI / 2, cast: false });   // spill
  // vanity with bulb mirror + makeup clutter (right of the back wall)
  const VN = group(1.45, 0, A.BACK + 0.25);
  add(box(0.9, 0.05, 0.42, 0.02), mat({ color: 0xf8f2ee }), 0, 0.6, 0, { parent: VN }); add(box(0.9, 0.55, 0.38, 0.03), mat({ color: 0xf2e8e4 }), 0, 0.3, 0, { parent: VN });
  add(box(0.62, 0.72, 0.03, 0.02), mat({ color: 0xf4eee8 }), 0, 1.05, -0.17, { parent: VN }); add(new THREE.PlaneGeometry(0.52, 0.62), mat({ color: 0x8a90a8, roughness: 0.08, metalness: 0.7 }), 0, 1.05, -0.152, { parent: VN, cast: false });
  const bulbsV = []; for (let i = 0; i < 10; i++) { const a = i / 10; const [x, y] = i < 4 ? [-0.29, 0.75 + a * 1.5] : i < 7 ? [-0.29 + (i - 3.5) * 0.19, 1.39] : [0.29, 0.75 + (i - 7) * 0.2];
    bulbsV.push(add(new THREE.SphereGeometry(0.022, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffe8c8, toneMapped: false }), x, y, -0.14, { parent: VN, cast: false })); }
  for (let i = 0; i < 7; i++) add(new THREE.CylinderGeometry(0.015 + rnd() * 0.012, 0.015, 0.05 + rnd() * 0.08, 10), mat({ color: new THREE.Color().setHSL(0.9 + rnd() * 0.15, 0.5, 0.5 + rnd() * 0.2) }), -0.35 + i * 0.1, 0.66, 0.05 + rnd() * 0.08, { parent: VN });
  // ring light + tripod with a phone, clothes rail, monstera, frames, the 2M plaque, fairy lights
  add(new THREE.TorusGeometry(0.3, 0.028, 12, 48), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2e6, emissiveIntensity: 0.18 }), -1.45, 1.2, -1.35, { ry: 0.6 });
  for (const [dx, dz] of [[0.18, 0], [-0.1, 0.15], [-0.1, -0.15]]) add(new THREE.CylinderGeometry(0.01, 0.01, 1.25, 6), DARK, -1.45 + dx * 0.6, 0.6, -1.35 + dz * 0.6, { rx: dz * 0.25, rz: -dx * 0.25 });
  const RAIL = group(1.85, 0, 0.9, -Math.PI / 2); add(new THREE.CylinderGeometry(0.015, 0.015, 1.0, 8), mat({ color: 0xc9a24a, metalness: 0.8 }), 0, 1.25, 0, { rz: Math.PI / 2, parent: RAIL });
  for (const sx of [-1, 1]) add(new THREE.CylinderGeometry(0.015, 0.015, 1.25, 8), mat({ color: 0xc9a24a, metalness: 0.8 }), sx * 0.5, 0.62, 0, { parent: RAIL });
  for (let i = 0; i < 6; i++) add(box(0.14, 0.5 + rnd() * 0.25, 0.3, 0.05), mat({ color: [0xffffff, 0x1a1a1a, 0xff9ab8, 0xe8d0b0, 0x9ab8ff, 0xc02040][i] }), -0.38 + i * 0.15, 0.88, 0, { parent: RAIL });
  const leafM = mat({ color: 0x3e8a4e, side: THREE.DoubleSide }); add(new THREE.CylinderGeometry(0.16, 0.12, 0.34, 16), mat({ color: 0xf2efe9 }), -1.95, 0.17, -1.85);
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28; add(new THREE.CircleGeometry(0.15, 10), leafM, -1.95 + Math.cos(a) * 0.15, 0.55 + rnd() * 0.45, -1.85 + Math.sin(a) * 0.15, { rx: -0.8 + rnd() * 0.5, ry: a, cast: true }); }
  const plaque = canvasTex(256, 320, (g, w, h) => { g.fillStyle = "#cfd2d8"; g.fillRect(0, 0, w, h); g.strokeStyle = "#7a7e88"; g.lineWidth = 10; g.strokeRect(10, 10, w - 20, h - 20); g.fillStyle = "#3a3e48"; g.font = "800 66px Montserrat"; g.textAlign = "center"; g.fillText("2M", w / 2, 170); g.font = "700 24px Montserrat"; g.fillText("FOLLOWERS", w / 2, 212); });
  add(box(0.3, 0.38, 0.03), mat({ map: plaque, roughness: 0.3, metalness: 0.5 }), -1.15, 1.45, A.BACK + 0.03);
  for (const [x, y, c, r] of [[-0.45, 1.5, "#ffd1e0", 0.05], [-0.1, 1.35, "#cde8ff", -0.04], [0.95, 1.6, "#fff0b8", 0.03]]) { add(box(0.26, 0.32, 0.02), mat({ color: 0xf6f2ee }), x, y, A.BACK + 0.02, { rz: r });
    add(new THREE.PlaneGeometry(0.21, 0.27), mat({ map: canvasTex(128, 160, (g, w, h) => { g.fillStyle = c; g.fillRect(0, 0, w, h); g.fillStyle = "#e0a0b8"; g.beginPath(); g.arc(w / 2, h * 0.42, 26, 0, 7); g.fill(); g.fillStyle = "#6a3a2a"; g.beginPath(); g.arc(w / 2, h * 0.36, 28, Math.PI, 0); g.fill(); g.fillStyle = "#fff"; g.fillRect(0, h - 26, w, 26); }) }), x, y, A.BACK + 0.033, { rz: r, cast: false }); }
  const fairy = []; for (let i = 0; i <= 22; i++) { const u = i / 22; fairy.push(add(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd8a0, toneMapped: false }), -2.0 + u * 4.0, 2.25 - Math.sin(u * Math.PI * 3) * 0.08 - 0.04, A.BACK + 0.03, { cast: false })); }
  // fluffy round rug (the stage of the crime) + scattered things: a high heel, a ring-light remote, receipts
  const rugT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#f4ecee"; g.beginPath(); g.arc(256, 256, 250, 0, 7); g.fill(); for (let i = 0; i < 3000; i++) { const a = rnd() * 6.28, r = rnd() * 245; g.strokeStyle = `rgba(200,170,180,${rnd() * .35})`; g.lineWidth = 2; g.beginPath(); g.moveTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r); g.lineTo(256 + Math.cos(a) * (r + 8), 256 + Math.sin(a) * (r + 8)); g.stroke(); }
    g.strokeStyle = "#c8a8b0"; g.lineWidth = 6; g.beginPath(); g.arc(256, 256, 246, 0, 7); g.stroke(); });
  const rugA = add(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshStandardMaterial({ map: rugT, transparent: true, alphaTest: 0.5, roughness: 1 }), -0.2, 0.004, 0.25, { rx: -Math.PI / 2, cast: false }); rugA.userData.ground = true;
  add(box(0.06, 0.12, 0.2, 0.02), mat({ color: 0xc01838, roughness: 0.3 }), -1.05, 0.06, 0.95, { ry: 0.7, rz: 1.2 });   // high heel on its side
  for (let i = 0; i < 6; i++) add(box(0.08 + rnd() * 0.06, 0.003, 0.12 + rnd() * 0.06, 0.001), mat({ color: 0xf6f2ea }), -1.4 + rnd() * 2.6, 0.008, -0.4 + rnd() * 1.6, { ry: rnd() * 3 });
  // ---- more furniture (dense, storytelling): streaming desk (monitor, mic arm, keyboard, LED strip), TV console, arc floor lamp, pouf, armchair, wall shelf, tall plants, a spilled handbag
  const DK = group(1.88, 0, -0.95, -Math.PI / 2);
  add(box(1.0, 0.05, 0.5, 0.02), mat({ color: 0xf4f0ec }), 0, 0.62, 0, { parent: DK }); for (const sx of [-1, 1]) add(box(0.04, 0.6, 0.46, 0.01), mat({ color: 0xe8e2de }), sx * 0.47, 0.3, 0, { parent: DK });
  add(box(0.56, 0.33, 0.03, 0.01), DARK, 0, 0.98, -0.12, { parent: DK }); add(new THREE.PlaneGeometry(0.52, 0.29), new THREE.MeshBasicMaterial({ color: 0x3a2a5a, toneMapped: false }), 0, 0.98, -0.103, { parent: DK, cast: false });
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), DARK, 0, 0.8, -0.12, { parent: DK }); add(box(0.42, 0.02, 0.14, 0.005), mat({ color: 0xfafafa }), 0, 0.655, 0.08, { parent: DK });
  add(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 12), mat({ color: 0x1a1a1e, metalness: 0.5 }), -0.36, 0.86, 0.05, { rz: 0.5, parent: DK }); add(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 6), DARK, -0.42, 0.74, 0.02, { rz: -0.4, parent: DK });
  add(box(1.0, 0.012, 0.012, 0.004), new THREE.MeshBasicMaterial({ color: 0xff4aa8, toneMapped: false }), 0, 0.6, 0.25, { parent: DK, cast: false });   // LED strip
  add(box(0.48, 0.5, 0.48, 0.12), mat({ color: 0xffffff }), 0, 0.25, 0.42, { parent: DK }); add(box(0.48, 0.5, 0.1, 0.05), mat({ color: 0xffd0e0 }), 0, 0.72, 0.62, { parent: DK });   // gaming chair (cushioned)
  const TV = group(0.45, 0, A.BACK + 0.22); add(box(1.2, 0.42, 0.36, 0.02), mat({ color: 0xf2ece6 }), 0, 0.21, 0, { parent: TV });
  for (let i = 0; i < 3; i++) add(box(0.36, 0.3, 0.01, 0.004), mat({ color: 0xd8ccc4 }), -0.4 + i * 0.4, 0.21, 0.181, { parent: TV, cast: false });
  add(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 12), mat({ color: 0xffffff }), -0.45, 0.5, 0.0, { parent: TV }); for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(0.06, 8, 6), leafM, -0.45 + (rnd() - .5) * 0.1, 0.62 + rnd() * 0.1, (rnd() - .5) * 0.1, { parent: TV });
  for (let i = 0; i < 3; i++) add(new THREE.CylinderGeometry(0.03, 0.03, 0.06 + i * 0.03, 12), mat({ color: 0xf6e8d8 }), 0.25 + i * 0.09, 0.45 + i * 0.015, 0.05, { parent: TV });   // candles
  add(box(0.3, 0.22, 0.04, 0.01), mat({ color: 0xffffff }), 0.42, 0.53, -0.05, { rx: -0.15, parent: TV });   // photo stand
  const LP = group(-1.88, 0, -0.35); add(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 16), mat({ color: 0xc9a24a, metalness: 0.8, roughness: 0.3 }), 0, 0.015, 0, { parent: LP });
  const arc = new THREE.TorusGeometry(0.6, 0.012, 6, 24, Math.PI * 0.6); add(arc, mat({ color: 0xc9a24a, metalness: 0.8, roughness: 0.3 }), 0.6, 0.6, 0, { rz: Math.PI * 0.42, parent: LP });
  add(new THREE.SphereGeometry(0.13, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat({ color: 0xf4f0ea, side: THREE.DoubleSide }), 0.75, 1.15, 0, { rx: Math.PI, parent: LP });
  add(new THREE.CylinderGeometry(0.24, 0.26, 0.26, 20), mat({ color: 0xe8c0a0, roughness: 1 }), 1.25, 0.13, -1.25);   // pouf
  const AC = group(-1.55, 0, -1.25, 0.6); add(box(0.62, 0.22, 0.58, 0.08), mat({ color: 0xf2e6e8 }), 0, 0.3, 0, { parent: AC }); add(box(0.62, 0.5, 0.14, 0.07), mat({ color: 0xf2e6e8 }), 0, 0.6, -0.24, { parent: AC });
  for (const sx of [-1, 1]) add(box(0.12, 0.32, 0.56, 0.05), mat({ color: 0xeadcde }), sx * 0.31, 0.42, 0, { parent: AC });
  add(box(0.3, 0.3, 0.1, 0.05), mat({ color: 0xffc0d0 }), 0, 0.5, -0.12, { rz: 0.2, parent: AC });
  add(box(1.0, 0.03, 0.18, 0.005), trimA, -0.55, 1.62, A.BACK + 0.09); for (let i = 0; i < 6; i++) add(box(0.04, 0.16 + rnd() * 0.06, 0.13, 0.004), mat({ color: new THREE.Color().setHSL(0.85 + rnd() * 0.2, 0.35, 0.6) }), -0.95 + i * 0.05, 1.72, A.BACK + 0.09);   // wall shelf + books
  add(new THREE.SphereGeometry(0.08, 12, 8), mat({ color: 0xfff0f5 }), -0.3, 1.71, A.BACK + 0.09); add(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 10), mat({ color: 0xf6e8d8 }), -0.15, 1.69, A.BACK + 0.09);
  for (const [x, z, h] of [[1.95, -1.55, 1.1], [-2.0, 1.55, 0.9]]) { add(new THREE.CylinderGeometry(0.15, 0.12, 0.32, 16), mat({ color: 0xece6dc }), x, 0.16, z); for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; add(new THREE.CircleGeometry(0.13, 10), leafM, x + Math.cos(a) * 0.12, 0.45 + rnd() * h * 0.7, z + Math.sin(a) * 0.12, { rx: -0.9 + rnd() * 0.6, ry: a }); } }
  const BG = group(-0.95, 0, 1.1, 0.8); add(box(0.32, 0.22, 0.12, 0.05), mat({ color: 0xd8a8b8, roughness: 0.5 }), 0, 0.11, 0, { rz: 1.4, parent: BG });   // spilled handbag
  for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 10), mat({ color: [0xc02040, 0x1a1a1a, 0xffd0a0, 0xc9a24a, 0xffffff][i] }), 0.15 + rnd() * 0.4, 0.012, -0.1 + rnd() * 0.3, { rz: Math.PI / 2, ry: rnd() * 3, parent: BG });
  // ---- stains around the victim (dark red-brown, a bit wet): a pool by her head, drips beside her, a smear trail, drops on the rug
  const stainT = (seed, n) => canvasTex(512, 512, (g, w, h) => { let ss = seed; const R = () => (ss = (ss * 16807) % 2147483647) / 2147483647; g.clearRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { const x = w / 2 + (R() - .5) * w * (i ? 0.6 : 0), y = h / 2 + (R() - .5) * h * (i ? 0.6 : 0), r = (i ? 18 + R() * 40 : 150); g.fillStyle = i % 2 ? "rgba(70,14,18,.95)" : "rgba(92,20,24,.95)"; g.beginPath();
      for (let k = 0; k <= 26; k++) { const t = k / 26 * 6.283, rr = r * (.72 + .45 * R()); g.lineTo(x + Math.cos(t) * rr, y + Math.sin(t) * rr * .8); } g.closePath(); g.fill(); }
    g.strokeStyle = "rgba(40,6,8,.8)"; g.lineWidth = 6; g.beginPath(); g.arc(w / 2, h / 2, 120, 0.3, 1.4); g.stroke(); });
  const stM = (t) => new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 0.15, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const [x, z, sz, seed, n, ry] of [[0.8, -0.4, 0.66, 11, 9, 0.3], [1.1, 0.12, 0.3, 23, 6, 1.2], [0.42, 0.45, 0.28, 37, 5, 2.1], [1.0, 0.78, 0.22, 41, 4, 0.7], [0.25, -0.05, 0.22, 53, 4, 2.6], [1.42, -0.25, 0.16, 61, 3, 1.9], [0.55, 0.95, 0.14, 71, 3, 0.4]])
    add(new THREE.PlaneGeometry(sz, sz), stM(stainT(seed, n)), x, 0.007, z, { rx: -Math.PI / 2, rz: ry, cast: false });
  { const tr = new THREE.PlaneGeometry(0.85, 0.12); add(tr, stM(canvasTex(512, 64, (g, w, h) => { g.clearRect(0, 0, w, h); const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(80,16,20,.9)"); gr.addColorStop(1, "rgba(80,16,20,0)"); g.fillStyle = gr;
      for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(w * 0.1 + k * w * 0.18, h / 2 + (k % 2 ? 6 : -6), w * 0.12, h * 0.32, 0, 0, 7); g.fill(); } })), 0.3, 0.007, -0.52, { rx: -Math.PI / 2, rz: 2.6, cast: false }); }   // smear trail
  window.__aptGlow = [bulbsV, fairy];
}
const aptSpot = new THREE.SpotLight(0xffd8b0, 0, 6, 0.6, 0.38, 1.2); aptSpot.position.set(1.05, A.H - 0.06, 0.4); aptSpot.target.position.set(1.0, 0, 0.12);
aptSpot.castShadow = true; aptSpot.shadow.mapSize.set(2048, 2048); aptSpot.shadow.bias = -0.0005; aptSpot.shadow.radius = 2.5; aptSpot.shadow.camera.near = 0.2; scene.add(aptSpot, aptSpot.target);
add(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 16, 1, true), DARK, 1.05, A.H - 0.05, 0.4, { cast: false });   // the ceiling spot fixture
const aptMoon = new THREE.SpotLight(0x7f90e8, 0, 9, 0.5, 0.6, 1.2); aptMoon.position.set(-3.2, 1.9, -0.6); aptMoon.target.position.set(0.5, 0, -0.2); aptMoon.castShadow = true; aptMoon.shadow.mapSize.set(1024, 1024); scene.add(aptMoon, aptMoon.target);
const aptNeon = new THREE.PointLight(0xff5aa8, 0, 3.2, 1.6); aptNeon.position.set(0.45, 1.85, A.BACK + 0.35); scene.add(aptNeon);
const aptVanity = new THREE.PointLight(0xffd8b0, 0, 2.2, 1.8); aptVanity.position.set(1.45, 1.05, A.BACK + 0.6); scene.add(aptVanity);
const aptFill = new THREE.HemisphereLight(0x6a5a9a, 0x140c10, 0); scene.add(aptFill);
const aptBeam = beam([1.05, A.H - 0.06, 0.4], [0.98, 0, 0.1], 0.06, 1.2, 0xffd8b0, 0.12);

// ================================================================ B: the phones of the other victims (four small worlds, far apart)
const PB = [
  { x: 30, surf: () => { const m = add(new THREE.PlaneGeometry(3.4, 2.6), mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#6e6a84"; g.fillRect(0, 0, w, h); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * .06})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, [6, 5]), roughness: 1 }), 30, 0, -0.05, { rx: -Math.PI / 2, cast: false }); m.userData.ground = true; },
    light: [0x7f9cff, 4], ph: ["@quiet.hollow", "study with me (6 hours)", ["#2b3a6a", "#7a8ad8"], "2 days ago", -0.35] },
  { x: 33, surf: () => { add(box(1.6, 0.06, 0.9, 0.01), mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#d8d8dc"; g.fillRect(0, 0, w, h); g.strokeStyle = "rgba(90,90,100,.35)"; g.lineWidth = 2; for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(rnd() * w, 0); g.bezierCurveTo(rnd() * w, h * .3, rnd() * w, h * .6, rnd() * w, h); g.stroke(); } }), roughness: 0.25 }), 33, -0.03, 0); add(new THREE.CylinderGeometry(0.05, 0.045, 0.11, 16), mat({ color: 0x9a2a2a }), 33.28, 0.055, -0.18); },
    light: [0xd8f0ff, 2.6], ph: ["@lantern_k", "what I eat in a day", ["#e8a040", "#f8e0a0"], "5 hours ago", 0.5] },
  { x: 36, surf: () => { const g = new THREE.PlaneGeometry(2, 2, 40, 40); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 7 + p.getY(i) * 3) * 0.012 + Math.sin(p.getY(i) * 11) * 0.008); g.computeVertexNormals();
      add(g, mat({ color: 0xe8e4f0, roughness: 0.95 }), 36, 0, 0, { rx: -Math.PI / 2, cast: false }); },
    light: [0xffc79a, 2.4], ph: ["@noah.sleeps", "goodnight vlog #212", ["#402060", "#c070b0"], "1 day ago", 0.2] },
  { x: 39, surf: () => { add(new THREE.PlaneGeometry(2, 2), mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#1a1a1e"; g.fillRect(0, 0, w, h); for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(200,200,210,${rnd() * .1})`; g.fillRect(rnd() * w, rnd() * h, 2, 2); } }, [3, 3]), roughness: 0.18, metalness: 0.3 }), 39, 0, 0, { rx: -Math.PI / 2, cast: false });
      add(new THREE.CircleGeometry(0.35, 32), new THREE.MeshStandardMaterial({ color: 0x050608, roughness: 0.02, metalness: 0.9 }), 39.15, 0.002, 0.1, { rx: -Math.PI / 2, cast: false }); },
    light: [0xff9a40, 9], ph: ["@m0rn1ngdew_", "last stream before I sleep", ["#601820", "#e05050"], "just now", -0.8] },
];
// ---- victim 2's bedroom around phone m0 (x = 30): back + side wall, bed, nightstand with a blue night lamp, window (scene 3A: no void behind Pion)
const BED = { X: 30, Z: -1.3 };
{ const wallT = canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#3a4560"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 64) { g.fillStyle = "rgba(255,255,255,.035)"; g.fillRect(x, 0, 30, h); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [3, 2]);
  const wm = mat({ map: wallT, roughness: 0.95 });
  add(box(3.6, 2.4, 0.08, 0.01), wm, BED.X, 1.2, BED.Z - 0.04);                                   // back wall
  add(box(0.08, 2.4, 2.6, 0.01), wm, BED.X + 1.72, 1.2, BED.Z + 1.25);                             // right wall
  add(box(3.6, 0.1, 0.03, 0.01), mat({ color: 0x1c2234 }), BED.X, 0.05, BED.Z + 0.015, { cast: false });   // skirting
  // bed (unmade): frame, mattress, crumpled duvet, pillows
  const wood = mat({ color: 0x3a2a22, roughness: 0.7 }), duvet = mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#c9cbe0"; g.fillRect(0, 0, w, h); for (let i = 0; i < 10; i++) { g.strokeStyle = "rgba(70,74,110,.35)"; g.lineWidth = 5; g.beginPath(); const x = rnd() * w; g.moveTo(x, 0); g.quadraticCurveTo(x + 40, h / 2, x - 20, h); g.stroke(); } }), roughness: 1 });
  add(box(1.05, 0.22, 1.7, 0.03), wood, 29.15, 0.11, BED.Z + 0.85);
  add(box(1.1, 0.75, 0.07, 0.03), wood, 29.15, 0.38, BED.Z + 0.04);                                   // headboard
  add(box(0.98, 0.14, 1.6, 0.05), mat({ color: 0xe8e8f0, roughness: 1 }), 29.15, 0.29, BED.Z + 0.87);
  const dg = new THREE.PlaneGeometry(1.06, 1.1, 24, 24), dp = dg.attributes.position; for (let i = 0; i < dp.count; i++) dp.setZ(i, 0.04 * Math.sin(dp.getX(i) * 9 + dp.getY(i) * 4) + 0.03 * Math.sin(dp.getY(i) * 13) + (Math.abs(dp.getX(i)) > 0.48 ? -0.08 : 0)); dg.computeVertexNormals();
  add(dg, duvet, 29.15, 0.39, BED.Z + 1.15, { rx: -Math.PI / 2, cast: true });
  for (const dx of [-0.24, 0.22]) add(box(0.4, 0.1, 0.26, 0.05), mat({ color: 0xdfe2f2, roughness: 1 }), 29.15 + dx, 0.41, BED.Z + 0.24, { rz: dx * 0.3 });
  // nightstand + blue night lamp
  add(box(0.42, 0.46, 0.36, 0.02), wood, 30.55, 0.23, BED.Z + 0.22); add(box(0.3, 0.03, 0.02, 0.01), mat({ color: 0xb08850, metalness: 0.6 }), 30.55, 0.33, BED.Z + 0.41, { cast: false });
  add(new THREE.CylinderGeometry(0.05, 0.07, 0.16, 16), mat({ color: 0x20253a }), 30.5, 0.54, BED.Z + 0.2);
  add(new THREE.CylinderGeometry(0.09, 0.14, 0.16, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x8fa8ff, emissive: 0x6f8cff, emissiveIntensity: 1.6, side: THREE.DoubleSide }), 30.5, 0.7, BED.Z + 0.2, { cast: false });
  add(box(0.14, 0.04, 0.2, 0.01), mat({ color: 0x5a4a8a }), 30.64, 0.48, BED.Z + 0.26, { ry: 0.3 });   // a book
  // window with the night outside + frame, posters
  add(new THREE.PlaneGeometry(0.8, 0.95), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(256, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1230"); gr.addColorStop(1, "#2a3a70"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#070a14"; for (let i = 0; i < 9; i++) { const x = i * 30, th = 40 + rnd() * 90; g.fillRect(x, h - th, 26, th); g.fillStyle = "rgba(255,210,120,.6)"; if (rnd() < .6) g.fillRect(x + 8, h - th + 14, 5, 6); g.fillStyle = "#070a14"; }
    g.fillStyle = "rgba(225,232,255,.95)"; g.beginPath(); g.arc(w * 0.72, h * 0.25, 13, 0, 7); g.fill(); }) }), 31.0, 1.35, BED.Z + 0.005, { cast: false });
  const fr = mat({ color: 0xd8dae6 }); add(box(0.9, 0.05, 0.06, 0.01), fr, 31.0, 1.85, BED.Z + 0.03); add(box(0.9, 0.05, 0.12, 0.01), fr, 31.0, 0.86, BED.Z + 0.06); for (const dx of [-0.43, 0, 0.43]) add(box(0.04, 1.0, 0.06, 0.01), fr, 31.0 + dx, 1.35, BED.Z + 0.03, { cast: false });
  for (const [x, y, c1, c2] of [[29.0, 1.35, "#7a5ad0", "#f0a0c0"], [29.55, 1.5, "#2a8a9a", "#f0e090"]]) add(new THREE.PlaneGeometry(0.34, 0.46), mat({ map: canvasTex(128, 170, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.strokeStyle = "#f4f4f8"; g.lineWidth = 10; g.strokeRect(0, 0, w, h); }) }), x, y, BED.Z + 0.01, { cast: false });
  add(box(0.7, 0.012, 0.5, 0.005), mat({ color: 0x5a6a9a, roughness: 1 }), 30.0, 0.006, BED.Z + 0.95, { cast: false });   // small rug
}
const bedLamp = new THREE.PointLight(0x7f9cff, 1.8, 2.6, 1.6); bedLamp.position.set(30.5, 0.72, BED.Z + 0.3); scene.add(bedLamp);
const bedMoon = new THREE.SpotLight(0x6f86d8, 4, 4, 0.5, 0.7, 1.4); bedMoon.position.set(31.0, 1.4, BED.Z - 0.6); bedMoon.target.position.set(30.6, 0, BED.Z + 1.2); scene.add(bedMoon, bedMoon.target);   // moonlight from the window: a pale pool on the floor
const phoneSpots = [];
PB.forEach((b, i) => { b.surf(); const [col, int] = b.light, L = new THREE.SpotLight(col, 0, 3.5, 0.45, 0.8, 1.3); L.position.set(b.x - 0.7, 1.6, 0.9);   // higher + farther: a soft pool, no blown hot spot L.target.position.set(b.x, 0, 0); scene.add(L, L.target); phoneSpots.push([L, int]);
  const [u, t, th, ago, ry] = b.ph; PHONES["m" + i] = phone(b.x, 0.0, 0, ry, 0, u, t, th, ago); });

// ================================================================ C: the target's house: closed front door between two windows, almost dark
const C = { X: 60, BACK: -2.0, H: 2.45, W: 4.6, WH: 0.72 };
{ const wt = canvasTex(1024, 1024, (g, w, h) => {   // faded navy damask (the location colour): drawn ornaments, damp stains
    g.fillStyle = "#33405e"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 160) for (let x = 0; x < w; x += 128) { const cx = x + 64 + ((y / 160) % 2) * 64, cy = y + 80; g.strokeStyle = "rgba(130,150,190,.35)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(cx, cy - 48); g.bezierCurveTo(cx + 34, cy - 30, cx + 30, cy + 10, cx, cy + 48); g.bezierCurveTo(cx - 30, cy + 10, cx - 34, cy - 30, cx, cy - 48); g.stroke();
      g.beginPath(); g.arc(cx, cy, 10, 0, 7); g.stroke(); for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx, cy + 20); g.quadraticCurveTo(cx + s * 28, cy + 28, cx + s * 18, cy + 44); g.stroke(); } }
    for (let i = 0; i < 6; i++) { const x = rnd() * w, y = rnd() * h * 0.6, r = 70 + rnd() * 120, gr = g.createRadialGradient(x, y, 0, x, y + r * 0.5, r * 1.3); gr.addColorStop(0, "rgba(10,14,24,.45)"); gr.addColorStop(1, "rgba(10,14,24,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .1})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [2.2, 1.3]);
  const wainT = canvasTex(1024, 512, (g, w, h) => { g.fillStyle = "#262a34"; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 128) { g.strokeStyle = "#12141a"; g.lineWidth = 6; g.strokeRect(x + 14, 50, 100, h - 80); }
    g.fillStyle = "#30343e"; g.fillRect(0, 0, w, 34); g.strokeStyle = "#0e1014"; g.lineWidth = 5; g.strokeRect(-5, 0, w + 10, 34); for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(rnd() * w, 40 + rnd() * (h - 40), 10 + rnd() * 50, 3 + rnd() * 6); } }, [3, 1]);
  const floorT = canvasTex(1024, 1024, (g, w, h) => { for (let y = 0; y < h; y += 90) { let x = -(rnd() * 200); while (x < w) { const L = 240 + rnd() * 280, c = 58 + rnd() * 14; g.fillStyle = `rgb(${c},${c * .8},${c * .66})`; g.fillRect(x, y, L, 90);
      g.strokeStyle = "#140e0a"; g.lineWidth = 4; g.strokeRect(x, y, L, 90); g.strokeStyle = "rgba(20,14,10,.35)"; g.lineWidth = 2; for (let k = 0; k < 3; k++) { const yy = y + 18 + k * 26; g.beginPath(); g.moveTo(x + 10, yy); g.bezierCurveTo(x + L * .3, yy - 6, x + L * .6, yy + 6, x + L - 10, yy); g.stroke(); }
      g.fillStyle = "#0e0a08"; g.beginPath(); g.arc(x + 12, y + 20, 3, 0, 7); g.arc(x + 12, y + 70, 3, 0, 7); g.fill(); x += L; } }
    for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, r = 40 + rnd() * 120, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, "rgba(160,160,170,.12)"); gr.addColorStop(1, "rgba(160,160,170,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }, [3, 3]);
  const wm = mat({ map: wt, roughness: 0.95 }), wainM = mat({ map: wainT }), trimC = mat({ color: 0x1c1a1e, roughness: 0.7 });
  const DW = 0.78, DH = 1.62, WX = 1.12, WY = 1.25, WW = 0.62, WHh = 0.92;
  const piece = (x0, x1, y0, y1) => { const yA = Math.max(y0, C.WH), m = []; if (y1 > yA) m.push([yA, y1, wm]); if (y0 < C.WH) m.push([y0, Math.min(y1, C.WH), wainM]);
    for (const [a, b, M] of m) add(box(x1 - x0, b - a, 0.12, 0.004), M, C.X + (x0 + x1) / 2, (a + b) / 2, C.BACK, { cast: true }); };
  const xs = [-C.W / 2, -WX - WW / 2, -WX + WW / 2, -DW / 2, DW / 2, WX - WW / 2, WX + WW / 2, C.W / 2];
  piece(xs[0], xs[1], 0, C.H); piece(xs[2], xs[3], 0, C.H); piece(xs[4], xs[5], 0, C.H); piece(xs[6], xs[7], 0, C.H);
  for (const [a, b] of [[1, 2], [5, 6]]) { piece(xs[a], xs[b], 0, WY - WHh / 2); piece(xs[a], xs[b], WY + WHh / 2, C.H); }
  piece(xs[3], xs[4], DH, C.H);
  for (const s of [-1, 1]) { const cx = C.X + s * WX; for (const [w, h, x, y] of [[WW + 0.1, 0.06, 0, WY - WHh / 2], [WW + 0.1, 0.06, 0, WY + WHh / 2], [0.06, WHh, -WW / 2, WY], [0.06, WHh, WW / 2, WY], [0.03, WHh, 0, WY], [WW, 0.03, 0, WY]]) add(box(w, h, 0.1), trimC, cx + x, y, C.BACK);
    add(box(WW + 0.2, 0.04, 0.16, 0.01), trimC, cx, WY - WHh / 2 - 0.04, C.BACK + 0.06);   // sill
    const tor = new THREE.PlaneGeometry(0.22, 1.25, 8, 1), tp = tor.attributes.position; for (let i = 0; i < tp.count; i++) tp.setZ(i, Math.sin(tp.getX(i) * 50) * 0.02); tor.computeVertexNormals();
    for (const k of [-1, 1]) add(tor, mat({ color: 0x8a90a0, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), cx + k * (WW / 2 + 0.1), 1.2, C.BACK + 0.08, { cast: false }); }   // torn sheer curtains
  for (const [w, h, x, y] of [[0.08, DH + 0.08, -DW / 2 - 0.04, DH / 2], [0.08, DH + 0.08, DW / 2 + 0.04, DH / 2], [DW + 0.16, 0.08, 0, DH + 0.04]]) add(box(w, h, 0.14, 0.01), trimC, C.X + x, y, C.BACK);   // door casing
  add(box(C.W, 0.1, 0.05), trimC, C.X, 0.05, C.BACK + 0.06); add(box(C.W, 0.04, 0.05), trimC, C.X, C.WH, C.BACK + 0.07); add(box(C.W, 0.08, 0.05), trimC, C.X, C.H - 0.04, C.BACK + 0.06);
  add(new THREE.PlaneGeometry(C.W, 3.5), mat({ color: 0x141826 }), C.X, C.H / 2, 2.9, { ry: Math.PI, cast: false });
  for (const s of [-1, 1]) { add(box(0.1, C.H - C.WH, 5.2, 0.004), wm, C.X + s * (C.W / 2 + 0.05), C.WH + (C.H - C.WH) / 2, 0.5); add(box(0.1, C.WH, 5.2, 0.004), wainM, C.X + s * (C.W / 2 + 0.05), C.WH / 2, 0.5); }
  add(box(C.W + 0.4, 0.1, 5.2, 0.005), mat({ color: 0x0c0e16 }), C.X, C.H + 0.05, 0.5);
  add(new THREE.PlaneGeometry(C.W, 5), mat({ map: floorT, roughness: 0.6 }), C.X, 0, 0.5, { rx: -Math.PI / 2, cast: false }).userData.ground = true;
  add(new THREE.PlaneGeometry(14, 8), new THREE.MeshBasicMaterial({ map: canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#0a1230"); gr.addColorStop(1, "#2a3c78"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = "#070a14"; for (let i = 0; i < 14; i++) { const x = i * 40, th = 40 + rnd() * 70; g.beginPath(); g.moveTo(x, h); g.lineTo(x + 20, h - th); g.lineTo(x + 40, h); g.fill(); } g.fillStyle = "rgba(220,230,255,.9)"; g.beginPath(); g.arc(w * 0.7, h * 0.3, 14, 0, 7); g.fill(); }), fog: false }), C.X, 2.5, C.BACK - 3.5, { cast: false });
  add(new THREE.PlaneGeometry(14, 6), mat({ color: 0x0e1420 }), C.X, 0, C.BACK - 3, { rx: -Math.PI / 2, cast: false });
  // furniture under dust sheets (ghostly shapes), a coat rack with a hat, a tall clock, crooked frames, a runner rug
  const sheet = mat({ map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#c8c8cc"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9; i++) { g.strokeStyle = "rgba(90,90,100,.35)"; g.lineWidth = 4; g.beginPath(); const x = rnd() * w; g.moveTo(x, 0); g.quadraticCurveTo(x + 30, h / 2, x - 10, h); g.stroke(); } }), roughness: 1 });
  add(box(0.9, 0.7, 0.55, 0.12), sheet, C.X - 1.65, 0.35, -1.45); add(box(0.5, 0.95, 0.5, 0.1), sheet, C.X + 1.75, 0.47, -0.6); add(box(0.6, 0.45, 0.6, 0.12), sheet, C.X - 1.85, 0.22, 0.3);
  const clk = mat({ color: 0x2a1c14, roughness: 0.6 }); add(box(0.36, 1.7, 0.26, 0.02), clk, C.X + 1.95, 0.85, -1.62); add(new THREE.CircleGeometry(0.11, 24), mat({ color: 0xd8d0b8 }), C.X + 1.95, 1.45, -1.48, { cast: false });
  add(new THREE.CylinderGeometry(0.018, 0.018, 1.55, 8), trimC, C.X - 0.95, 0.78, -1.75); add(new THREE.CylinderGeometry(0.18, 0.2, 0.03, 14), trimC, C.X - 0.95, 0.02, -1.75);
  add(box(0.3, 0.55, 0.12, 0.05), mat({ color: 0x24242c }), C.X - 0.95, 1.12, -1.68); add(new THREE.CylinderGeometry(0.12, 0.13, 0.08, 16), mat({ color: 0x3a2c22 }), C.X - 0.95, 1.6, -1.75);
  for (const [x, y, r] of [[-1.7, 1.55, 0.08], [1.65, 1.6, -0.12], [-0.6, 1.9, 0.05]]) { add(box(0.28, 0.34, 0.02), trimC, C.X + x, y, C.BACK + 0.08, { rz: r }); add(new THREE.PlaneGeometry(0.22, 0.28), mat({ color: 0x4a4e58 }), C.X + x, y, C.BACK + 0.092, { rz: r, cast: false }); }
  add(new THREE.PlaneGeometry(1.0, 3.0), mat({ map: canvasTex(256, 768, (g, w, h) => { g.fillStyle = "#3a1e20"; g.fillRect(0, 0, w, h); g.strokeStyle = "#a07a4a"; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28); for (let y = 60; y < h; y += 90) { g.strokeStyle = "rgba(160,122,74,.5)"; g.lineWidth = 4; g.beginPath(); g.moveTo(40, y); g.lineTo(w / 2, y + 40); g.lineTo(w - 40, y); g.stroke(); } }), roughness: 1 }), C.X, 0.004, 0.0, { rx: -Math.PI / 2, cast: false }).userData.ground = true;
}
const DOOR = new THREE.Group(); DOOR.position.set(C.X - 0.39, 0, C.BACK + 0.03); scene.add(DOOR);
{ const dt = canvasTex(256, 512, (g, w, h) => { g.fillStyle = "#4a3426"; g.fillRect(0, 0, w, h); g.strokeStyle = "#2a1c14"; g.lineWidth = 8; g.strokeRect(30, 40, w - 60, h * 0.4); g.strokeRect(30, h * 0.52, w - 60, h * 0.42); });
  add(box(0.78, 1.62, 0.05, 0.01), mat({ map: dt, roughness: 0.7 }), 0.39, 0.81, 0, { parent: DOOR }); add(new THREE.SphereGeometry(0.03, 12, 10), mat({ color: 0xb08a40, metalness: 0.8, roughness: 0.3 }), 0.7, 0.82, 0.04, { parent: DOOR }); }
const winLight = [], winBeams = [], winGlass = [];
for (const s of [-1, 1]) { const L = new THREE.SpotLight(0xa8c0ff, 0, 12, 0.24, 0.35, 1.0); L.position.set(C.X + s * 2.4, 4.5, C.BACK - 1.2); L.target.position.set(C.X + s * 0.6, 0, -1.5);   // high + outside: the window shapes land right in front of the door
  L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.0006; L.shadow.camera.near = 0.5; scene.add(L, L.target); winLight.push(L);
  winBeams.push(beam([C.X + s * 1.12, 1.25, C.BACK], [C.X + s * 0.6, 0, -1.52], 0.34, 0.42, 0x9fb8ff, 0.24));
  winGlass.push(add(new THREE.PlaneGeometry(0.6, 0.9), new THREE.MeshBasicMaterial({ color: 0x5a70b0, transparent: true, opacity: 0.35, fog: false }), C.X + s * 1.12, 1.25, C.BACK + 0.01, { cast: false })); }
const houseHemi = new THREE.HemisphereLight(0x3a4a8a, 0x0a0a12, 0);
const flashL = new THREE.DirectionalLight(0xf0f4ff, 0); flashL.position.set(C.X + 0.3, 3, 3); flashL.target.position.set(C.X, 0.6, -1.3); scene.add(houseHemi, flashL, flashL.target);
const pionKey = new THREE.SpotLight(0x9ab0ff, 0, 6, 0.45, 0.6, 1.2); pionKey.position.set(C.X + 1.4, 2.3, 1.2); pionKey.target.position.set(C.X, 0.4, -0.35); pionKey.castShadow = true; pionKey.shadow.mapSize.set(1024, 1024); scene.add(pionKey, pionKey.target);
const flashBack = new THREE.PointLight(0xe8eeff, 0, 8, 1.2); flashBack.position.set(C.X, 1.4, C.BACK - 1.0); scene.add(flashBack);
// the figure: a chess-pawn silhouette holding a shotgun; only faint eyes + a thin smile
const FIG = new THREE.Group(); FIG.position.set(C.X, 0, -1.45); scene.add(FIG);
{ const fm = mat({ color: 0x030304, roughness: 1.0 });
  const prof = [[0, 0], [0.3, 0], [0.3, 0.03], [0.26, 0.05], [0.26, 0.08], [0.2, 0.12], [0.14, 0.25], [0.105, 0.38], [0.1, 0.45], [0.16, 0.47], [0.1, 0.5], [0, 0.5]].map(([r, y]) => new THREE.Vector2(r, y * 1.0));
  const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 40), fm); body.castShadow = true; FIG.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 32, 24), fm); head.position.y = 0.72; head.castShadow = true; FIG.add(head);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.2), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, map: canvasTex(256, 170, (g, w, h) => {
    g.fillStyle = "rgba(225,228,235,.95)"; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w / 2 + s * 40, 62, 15, 4.5, s * -0.28, 0, 7); g.fill(); }   // narrow, slightly slanted eyes
    g.strokeStyle = "rgba(225,228,235,.7)"; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(w / 2 - 78, 100); g.bezierCurveTo(w / 2 - 30, 128, w / 2 + 30, 128, w / 2 + 78, 100); g.stroke(); }) }));   // thin, too-wide smile
  face.position.set(0, 0.72, 0.232); FIG.add(face); FIG.userData.face = face;
  const gm = mat({ color: 0x15161a, roughness: 0.4, metalness: 0.6 }), wd = mat({ color: 0x2a1a12, roughness: 0.7 });
  const gun = new THREE.Group(); gun.position.set(0.02, 0.42, 0.2); gun.rotation.set(0, 0, 0.85); FIG.add(gun);
  for (const dx of [-0.012, 0.012]) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.55, 10), gm); b.position.set(dx, 0.22, 0); gun.add(b); }
  const stock = new THREE.Mesh(box(0.06, 0.26, 0.04, 0.01), wd); stock.position.set(0, -0.14, 0); gun.add(stock);
  const pump = new THREE.Mesh(box(0.045, 0.1, 0.045, 0.01), wd); pump.position.set(0, 0.12, 0.012); gun.add(pump);
  for (const [x, y] of [[-0.05, 0.02], [0.07, 0.2]]) { const h = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), mat({ color: 0x101114, roughness: 0.6 })); h.position.set(x, y + 0.42, 0.24); FIG.add(h); }   // dark gloves
  FIG.traverse(o => { if (o.isMesh) o.castShadow = true; }); }


// ================================================================ film additions: screen modes, the victim's phone, held-phone inserts, the table of phones,
// the house facade (exterior), the falling lamp (lightning) — all driven by F fields
const UI = {};
function uiTex(mode, o = {}) {   // generic video app (no real brand logo); modes: video | profile | history | notif
  const key = mode + JSON.stringify(o); if (UI[key]) return UI[key];
  if (mode === "video") return (UI[key] = screenTex(o.user, o.title, o.thumb, o.ago));
  return (UI[key] = canvasTex(540, 1140, (g, w, h) => {
    g.fillStyle = "#0f0f12"; g.fillRect(0, 0, w, h); g.fillStyle = "#e8e8ea"; g.font = "600 26px Montserrat, Arial"; g.fillText("11:42", 28, 44); g.fillText("●●● 23%", w - 150, 44);
    if (mode === "profile") {
      const bg = g.createLinearGradient(0, 70, w, 300); bg.addColorStop(0, "#ff9ab8"); bg.addColorStop(1, "#b080ff"); g.fillStyle = bg; g.fillRect(0, 70, w, 220);
      g.fillStyle = "#f6e8ee"; g.beginPath(); g.arc(110, 300, 74, 0, 7); g.fill(); g.strokeStyle = "#0f0f12"; g.lineWidth = 8; g.stroke();
      g.fillStyle = "#4a2a20"; g.beginPath(); g.arc(110, 286, 56, Math.PI * 1.05, Math.PI * 1.95); g.fill(); g.fillStyle = "#3a2a2a"; for (const s of [-1, 1]) { g.beginPath(); g.arc(110 + s * 18, 300, 5, 0, 7); g.fill(); }
      g.strokeStyle = "#c04060"; g.lineWidth = 4; g.beginPath(); g.arc(110, 312, 14, 0.2, Math.PI - 0.2); g.stroke();
      g.fillStyle = "#fff"; g.font = "800 40px Montserrat, Arial"; g.fillText("Mira Vale", 30, 430); g.fillStyle = "#3ea6ff"; g.beginPath(); g.arc(250, 418, 13, 0, 7); g.fill();
      g.fillStyle = "#a9a9b0"; g.font = "600 26px Montserrat, Arial"; g.fillText("@mira.vale  ·  2.4M subscribers", 30, 474); g.fillText("142 videos", 30, 512);
      g.fillStyle = "#26262c"; g.beginPath(); g.roundRect(30, 540, 220, 58, 29); g.fill(); g.fillStyle = "#fff"; g.font = "700 26px Montserrat, Arial"; g.fillText("Subscribed", 66, 578);
      const cols = [["#ffb0c8", "#ff7aa0"], ["#ffd8a0", "#ffa860"], ["#c8b0ff", "#9070e0"], ["#a0e0ff", "#60a8e0"], ["#ffc0e0", "#e070b0"], ["#e0ffd0", "#90d070"]];
      cols.forEach((c, i) => { const x = 20 + (i % 2) * 255, y = 630 + Math.floor(i / 2) * 165, gr = g.createLinearGradient(x, y, x + 240, y + 135); gr.addColorStop(0, c[0]); gr.addColorStop(1, c[1]); g.fillStyle = gr; g.fillRect(x, y, 240, 135);
        if (i === 0) { g.fillStyle = "#ff2b3a"; g.fillRect(x, y + 4, 70, 30); g.fillStyle = "#fff"; g.font = "800 20px Montserrat"; g.fillText("NEW", x + 10, y + 26); } });
    } else if (mode === "history") {
      g.fillStyle = "#fff"; g.font = "800 40px Montserrat, Arial"; g.fillText("History", 30, 128);
      const rows = [["last stream before I sleep", "#601820", "#e05050"], ["study with me (6 hours)", "#2b3a6a", "#7a8ad8"], ["ASMR rain sounds", "#204030", "#60a080"], ["5 min abs", "#503010", "#e0a050"], ["room tour 2026", "#402060", "#c070b0"]];
      rows.forEach(([tt, a, b], i) => { const y = 170 + i * 180, gr = g.createLinearGradient(30, y, 250, y + 124); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(30, y, 220, 124);
        if (i === (o.hi ?? 1)) { g.strokeStyle = "#ff2b3a"; g.lineWidth = 6; g.strokeRect(24, y - 6, w - 48, 136); }
        g.fillStyle = "#fff"; g.font = "700 26px Montserrat, Arial"; g.fillText(tt.slice(0, 18), 270, y + 40); g.fillStyle = "#a9a9b0"; g.font = "500 22px Montserrat, Arial"; g.fillText("watched " + (i + 1) + "h ago", 270, y + 80); });
    } else if (mode === "notif") {
      const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, "#141a30"); bg.addColorStop(1, "#05060c"); g.fillStyle = bg; g.fillRect(0, 60, w, h - 60);
      g.fillStyle = "#e8ecff"; g.font = "300 150px Montserrat, Arial"; g.textAlign = "center"; g.fillText("11:42", w / 2, 300); g.font = "500 30px Montserrat, Arial"; g.fillText("Friday, 14 November", w / 2, 350); g.textAlign = "left";
      g.fillStyle = "rgba(40,44,60,.92)"; g.beginPath(); g.roundRect(24, 430, w - 48, 230, 30); g.fill(); g.strokeStyle = "#ff2b3a"; g.lineWidth = 4; g.stroke();
      g.fillStyle = "#ff2b3a"; g.beginPath(); g.roundRect(48, 456, 52, 40, 10); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.moveTo(66, 464); g.lineTo(66, 488); g.lineTo(86, 476); g.closePath(); g.fill();
      g.fillStyle = "#cfd4e8"; g.font = "600 24px Montserrat, Arial"; g.fillText("VIDEO  ·  now", 116, 484);
      pfp(g, 110, 580, 58); g.fillStyle = "#fff"; g.font = "800 30px Montserrat, Arial"; g.fillText("@m0rn1ngdew_", 190, 566); g.font = "500 26px Montserrat, Arial"; g.fillStyle = "#e0e4f4"; g.fillText("liked your video", 190, 606);
      g.fillStyle = "#a9a9b0"; g.font = "500 22px Montserrat, Arial"; g.fillText("\"how I solved case #3\"", 190, 642);
    }
  }));
}
function setScreen(P, mode, o) { P.screen.material.map = uiTex(mode, o); P.screen.material.needsUpdate = true; }
// the victim's phone, lit on the floor by her hand (visible from the very first frame)
PHONES.vic = phone(0.47, 0.0, 0.14, 0.75, 0, "@m0rn1ngdew_", "my morning routine (real)", ["#ff9ab8", "#ffd0e0"], "just now"); setScreen(PHONES.vic, "profile");
PHONES.vic.G.children.find(c => c.isPointLight).intensity = 0.04;
// held-phone inserts (upright, screen to the lens): in the apartment (scene 1) and in the house (Pion's own phone, scene 7)
function heldPhone(x, y, z, ry) { const P = phone(x, y, z, ry, 1.32, "@m0rn1ngdew_", "my morning routine (real)", ["#ff9ab8", "#ffd0e0"], "just now"); P.G.children.find(c => c.isPointLight).intensity = 0.0; P.G.visible = false; return P; }
PHONES.held = heldPhone(1.05, 0.55, 0.05, -0.35); PHONES.pion = heldPhone(60.35, 0.62, -0.05, 0.0);
// second crime scene: the B1 phone switches History -> video
setScreen(PHONES.m0, "history", { hi: 1 });
// ---- the table of phones in the target's house (scene 6), under one narrow spot
const TBL = group(C.X + 0.95, 0, -0.2, -0.25);
add(box(0.9, 0.04, 0.55, 0.01), mat({ color: 0x2a2018, roughness: 0.6 }), 0, 0.56, 0, { parent: TBL }); for (const [x, z] of [[-0.4, -0.23], [0.4, -0.23], [-0.4, 0.23], [0.4, 0.23]]) add(new THREE.CylinderGeometry(0.02, 0.018, 0.54, 8), mat({ color: 0x1e1610 }), x, 0.27, z, { parent: TBL });
const TUSERS = [["@m0rn1ngdew_", "last stream before I sleep", ["#601820", "#e05050"]], ["@quiet.hollow", "study with me (6 hours)", ["#2b3a6a", "#7a8ad8"]], ["@lantern_k", "what I eat in a day", ["#e8a040", "#f8e0a0"]],
  ["@noah.sleeps", "goodnight vlog #212", ["#402060", "#c070b0"]], ["@mira.vale", "my morning routine (real)", ["#ff9ab8", "#ffd0e0"]], ["@ivy_after", "pov: you can't sleep", ["#103040", "#40a0c0"]]];
const tablePhones = TUSERS.map(([u, tt, th], i) => { const P = phone(0, 0, 0, (i % 2 ? 0.25 : -0.2) + (i - 2.5) * 0.05, 0, u, tt, th, "just now"); TBL.add(P.G); P.G.position.set(-0.3 + (i % 3) * 0.3, 0.582, -0.12 + Math.floor(i / 3) * 0.25); P.G.children.find(c => c.isPointLight).intensity = 0.02; return P; });
const tableSpot = new THREE.SpotLight(0xbfd0ff, 0, 4, 0.32, 0.6, 1.2); tableSpot.position.set(C.X + 0.95, C.H - 0.05, -0.2); tableSpot.target.position.set(C.X + 0.95, 0.56, -0.2); tableSpot.castShadow = true; tableSpot.shadow.mapSize.set(1024, 1024); scene.add(tableSpot, tableSpot.target);
add(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 14, 1, true), DARK, C.X + 0.95, C.H - 0.05, -0.2, { cast: false });
// ---- the house facade (the outside of the back wall) + porch, roof edge, bushes, mailbox, a fence; exterior night light
const sideT = canvasTex(1024, 1024, (g, w, h) => { g.fillStyle = "#4a5470"; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 48) { g.fillStyle = "rgba(255,255,255,.06)"; g.fillRect(0, y, w, 6); g.strokeStyle = "#252a3a"; g.lineWidth = 4; g.beginPath(); g.moveTo(0, y + 46); g.lineTo(w, y + 46); g.stroke(); }
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rnd() * .1})`; g.fillRect(rnd() * w, rnd() * h, 3, 3); } }, [3, 2]);
{ const sm = mat({ map: sideT, roughness: 0.9 }), trimE = mat({ color: 0xd8d8d0, roughness: 0.6 }), ZF = C.BACK - 0.065, DW = 0.78, DH = 1.62, WX = 1.12, WY = 1.25, WW = 0.62, WHh = 0.92;
  const pieceE = (x0, x1, y0, y1) => add(new THREE.PlaneGeometry(x1 - x0, y1 - y0), sm, C.X + (x0 + x1) / 2, (y0 + y1) / 2, ZF, { ry: Math.PI, cast: false });
  const xs = [-C.W / 2 - 0.4, -WX - WW / 2, -WX + WW / 2, -DW / 2, DW / 2, WX - WW / 2, WX + WW / 2, C.W / 2 + 0.4];
  pieceE(xs[0], xs[1], 0, 2.7); pieceE(xs[2], xs[3], 0, 2.7); pieceE(xs[4], xs[5], 0, 2.7); pieceE(xs[6], xs[7], 0, 2.7);
  for (const [a, b] of [[1, 2], [5, 6]]) { pieceE(xs[a], xs[b], 0, WY - WHh / 2); pieceE(xs[a], xs[b], WY + WHh / 2, 2.7); } pieceE(xs[3], xs[4], DH, 2.7);
  for (const s of [-1, 1]) { const cx = C.X + s * WX; for (const [w2, h2, x, y] of [[WW + 0.14, 0.07, 0, WY - WHh / 2], [WW + 0.14, 0.07, 0, WY + WHh / 2], [0.07, WHh, -WW / 2, WY], [0.07, WHh, WW / 2, WY]]) add(box(w2, h2, 0.06), trimE, cx + x, y, ZF - 0.03);
    for (const k of [-1, 1]) add(box(0.26, WHh + 0.1, 0.03), mat({ color: 0x2a3450 }), cx + k * (WW / 2 + 0.17), WY, ZF - 0.04); }   // shutters
  for (const [w2, h2, x, y] of [[0.09, DH + 0.1, -DW / 2 - 0.05, DH / 2], [0.09, DH + 0.1, DW / 2 + 0.05, DH / 2], [DW + 0.2, 0.09, 0, DH + 0.05]]) add(box(w2, h2, 0.07), trimE, C.X + x, y, ZF - 0.03);
  add(box(C.W + 1.2, 0.12, 1.5, 0.01), mat({ map: wood("#5a4a3c", "#2a2018", 8), roughness: 0.7 }), C.X, 0.06, C.BACK - 0.8).userData.ground = true;   // porch
  for (const k of [0, 1]) add(box(1.3, 0.1, 0.32, 0.01), mat({ color: 0x5a4a3c }), C.X, 0.02 - k * 0.0 - 0.0 + (k ? -0.04 : 0), C.BACK - 1.7 - k * 0.3);   // steps
  for (const s of [-1, 1]) add(box(0.1, 2.4, 0.1, 0.01), trimE, C.X + s * 1.9, 1.2, C.BACK - 1.45);
  add(box(C.W + 1.4, 0.12, 1.7, 0.01), mat({ color: 0x1e2232 }), C.X, 2.46, C.BACK - 0.75, { rx: -0.08 });   // porch roof
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 3.4, 1.6, 4, 1), mat({ color: 0x1a1e2c, roughness: 0.9 })); roof.rotation.y = Math.PI / 4; roof.scale.set(1.0, 1, 0.75); roof.position.set(C.X, 3.4, 0.5); roof.castShadow = true; scene.add(roof);
  add(box(C.W + 0.6, 0.3, 5.6, 0.01), mat({ color: 0x1a1e2c }), C.X, 2.62, 0.5);
  const bush = mat({ color: 0x1e3a2c, roughness: 1 }); for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.28 + rnd() * 0.15, 12, 10), bush, C.X + (i < 5 ? -1 : 1) * (1.3 + rnd() * 1.1), 0.25, C.BACK - 0.35 - rnd() * 0.3, { cast: true });
  add(box(0.18, 0.14, 0.3, 0.03), mat({ color: 0x2a2a30 }), C.X + 2.3, 1.0, C.BACK - 3.0); add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 8), DARK, C.X + 2.3, 0.5, C.BACK - 3.0);   // mailbox
  for (let i = 0; i < 18; i++) { const x = C.X - 3.4 + i * 0.4; if (Math.abs(x - C.X) < 0.7) continue; add(box(0.08, 0.7, 0.03, 0.01), mat({ color: 0x8a8e98 }), x, 0.35, C.BACK - 3.6); }
  for (const s of [-1, 1]) add(box(2.7, 0.05, 0.03), mat({ color: 0x8a8e98 }), C.X + s * 2.05, 0.55, C.BACK - 3.6);   // picket fence, open gate in the middle (the camera walks through)
  for (const s of [-1, 1]) { const tr = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.6, 10), mat({ color: 0x0c1610 })); tr.position.set(C.X + s * 3.6, 1.8, C.BACK - 1.0); scene.add(tr); }
  add(new THREE.PlaneGeometry(30, 14), new THREE.MeshBasicMaterial({ fog: false, map: canvasTex(512, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#050a20"); gr.addColorStop(1, "#22305e"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${rnd() * .7})`; g.fillRect(rnd() * w, rnd() * h * 0.7, 1.5, 1.5); } g.fillStyle = "rgba(225,232,255,.95)"; g.beginPath(); g.arc(w * 0.75, h * 0.25, 13, 0, 7); g.fill(); }) }), C.X, 5, 9, { ry: Math.PI, cast: false });
}
const extMoon = new THREE.DirectionalLight(0x9ab0ff, 0); extMoon.position.set(C.X + 4, 7, C.BACK - 6); extMoon.target.position.set(C.X, 0, C.BACK); extMoon.castShadow = true; extMoon.shadow.mapSize.set(2048, 2048);
Object.assign(extMoon.shadow.camera, { left: -6, right: 6, top: 6, bottom: -2, near: 1, far: 20 }); extMoon.shadow.camera.updateProjectionMatrix(); scene.add(extMoon, extMoon.target);
const extHemi = new THREE.HemisphereLight(0x3a4a8a, 0x0a0c14, 0); scene.add(extHemi);
const extDoorSpot = new THREE.SpotLight(0xa8bcff, 0, 6, 0.5, 0.6, 1.2); extDoorSpot.position.set(C.X + 1.2, 3.2, C.BACK - 3.2); extDoorSpot.target.position.set(C.X, 0.6, C.BACK); extDoorSpot.castShadow = true; scene.add(extDoorSpot, extDoorSpot.target);
// ---- the falling lamp (lightning): a little lamp on a wall shelf at the left, tumbles down into the light pool in front of the door. F.fall = seconds since it slipped
const SHELF = add(box(0.5, 0.04, 0.22, 0.01), mat({ color: 0x2a2018 }), C.X + 1.0, 1.52, C.BACK + 0.17);
const FALL = new THREE.Group(); FALL.scale.setScalar(1.7); scene.add(FALL);
add(new THREE.CylinderGeometry(0.07, 0.08, 0.04, 14), mat({ color: 0x6a5030, metalness: 0.5, roughness: 0.4 }), 0, 0.02, 0, { parent: FALL });
add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), mat({ color: 0x6a5030, metalness: 0.5 }), 0, 0.13, 0, { parent: FALL });
add(new THREE.CylinderGeometry(0.06, 0.11, 0.12, 16, 1, true), mat({ color: 0xf0e2c0, emissive: 0x3a2e1c, side: THREE.DoubleSide }), 0, 0.27, 0, { parent: FALL });
const fallBulb = add(new THREE.SphereGeometry(0.03, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffd8a0, toneMapped: false }), 0, 0.25, 0, { parent: FALL, cast: false });
const fallLight = new THREE.PointLight(0xffb870, 0, 1.4, 1.6); fallLight.position.set(0, 0.25, 0); FALL.add(fallLight);   // the bulb survives the fall: a dim warm flicker on the floor
const FALL0 = new THREE.Vector3(C.X + 1.0, 1.54, C.BACK + 0.17), FALL1 = new THREE.Vector3(C.X + 0.42, 0.0, -0.95);   // from the right edge to the floor in front-right of the silhouette
function placeFall(s) { const fk = s == null || s < 0 ? 0.25 : s < 0.5 ? 0.8 : (0.35 + 0.65 * (Math.sin(s * 37) * Math.sin(s * 11.3) > -0.2 ? 1 : 0.15)) * Math.max(0.35, Math.exp(-(s - 0.5) * 0.4));
  fallLight.intensity = fk * 0.9; fallBulb.material.color.setRGB(fk, fk * 0.85, fk * 0.62);
  if (s == null || s < 0) { FALL.position.copy(FALL0); FALL.rotation.set(0, 0, 0); return; }
  const T = 0.5, tt = Math.min(s, T), u = tt / T, g = 9.81;
  if (s <= T) { const vy = (FALL1.y - FALL0.y + 0.5 * g * T * T) / T; FALL.position.set(lerp(FALL0.x, FALL1.x, u), FALL0.y + vy * tt - 0.5 * g * tt * tt, lerp(FALL0.z, FALL1.z, u)); FALL.rotation.set(1.3 * u * 3.2, 0.4 * u, 2.2 * u * 3.0); return; }
  const r = s - T, b = Math.max(0, Math.sin(Math.min(r, 0.3) / 0.3 * Math.PI)) * 0.06 * Math.exp(-r * 4), roll = (1 - Math.exp(-r * 5)) * 0.22;   // small bounce, rolls a little, rests on its side
  FALL.position.set(FALL1.x - roll * 0.5, 0.12 + b, FALL1.z + roll * 0.3); FALL.rotation.set(Math.PI / 2, 0.4 - roll * 2, 0.2 - roll * 6); }

// ================================================================ characters INSIDE the world (charlayer v2)
const CHARS = createChars(scene, camera, renderer, { n: 2, E: 0.6, D: 0.22, hide: [aptBeam, ...winBeams, ...winGlass, FIG.userData.face], rim: 1.0, glow: 0.35, shade: 0.8 });
composer.insertPass(CHARS.pass(pionRT), composer.passes.indexOf(pionComp)); CHARS.guard(gtao); CHARS.guard(bokeh);
const LOCS = {
  apt: { dyn: aptSpot, rim: aptSpot, LP: LIGHT_PRESETS.interior_warm_lamp, bg: 0x08080c, fog: 0.05, vig: 0.42 },
  phones: { dyn: null, rim: null, LP: LIGHT_PRESETS.interior_night, bg: 0x040406, fog: 0.04, vig: 0.5 },
  house: { dyn: pionKey, rim: winLight[1], LP: LIGHT_PRESETS.crime_scene, bg: 0x03040a, fog: 0.07, vig: 0.55 },
  ext: { dyn: extDoorSpot, rim: extMoon, LP: LIGHT_PRESETS.crime_scene, bg: 0x050a20, fog: 0.035, vig: 0.5 },
};
let bakedLoc = null;
const LIGHTSET = [[aptSpot, "apt"], [aptMoon, "apt"], [aptNeon, "apt"], [aptVanity, "apt"], [aptFill, "apt"], ...phoneSpots.map(([L]) => [L, "phones"]),
  ...Object.values(PHONES).map(p => [p.G.children.find(c => c.isPointLight), "phones"]), ...winLight.map(L => [L, "house"]), [houseHemi, "house"], [flashL, "house"], [flashBack, "house"], [pionKey, "house"], [tableSpot, "house"], ...tablePhones.map(p => [p.G.children.find(c => c.isPointLight), "house"]),
  [bedLamp, "phones"], [bedMoon, "phones"], [extMoon, "ext"], [extHemi, "ext"], [extDoorSpot, "ext"], [fallLight, "house"], [PHONES.vic.G.children.find(c => c.isPointLight), "apt"]];
const PTS = {};
window.renderFrame = async (F) => {   // F: { t, loc, cam, pions, flash, door (rad, 0 = shut), figure, spotK, phonePfp (key) }
  const Lc = LOCS[F.loc || "apt"];
  camera.position.set(...F.cam.pos); camera.fov = F.cam.fov; camera.updateProjectionMatrix(); camera.lookAt(...F.cam.tgt); if (F.cam.roll) camera.rotateZ(F.cam.roll); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = F.cam.focus; bokeh.uniforms.aperture.value = F.cam.aperture ?? 0.0016; grade.uniforms.time.value = F.t;
  scene.background.setHex(Lc.bg); scene.fog.color.setHex(Lc.bg); scene.fog.density = Lc.fog; grade.uniforms.vig.value = Lc.vig; grade.uniforms.sepia.value = 0; grade.uniforms.grain.value = 0.03;
  const at = F.loc || "apt", sk = F.spotK ?? 1;
  aptSpot.intensity = at === "apt" ? 30 * sk : 0; aptMoon.intensity = at === "apt" ? 9 : 0; aptFill.intensity = at === "apt" ? 0.22 : 0; aptNeon.intensity = at === "apt" ? 2.2 : 0; aptVanity.intensity = at === "apt" ? 0.9 : 0; aptBeam.visible = at === "apt";
  phoneSpots.forEach(([L, i]) => L.intensity = at === "phones" ? i : 0);
  for (const [L, where] of LIGHTSET) L.visible = where === at;   // lights of the other locations OFF (not just 0): swiftshader shades every visible light (and its shadow map) per pixel
  const fl = F.flash || 0;
  winLight.forEach(L => L.intensity = at === "house" ? 36 + fl * 110 : 0); winBeams.forEach(b => { b.visible = at === "house"; b.material.uniforms.k.value = 1 + fl * 3; });
  winGlass.forEach(g => g.material.color.setRGB(0.35 + fl * 0.65, 0.44 + fl * 0.56, 0.69 + fl * 0.31));
  houseHemi.intensity = at === "house" ? 0.03 + (F.hemiK || 0) * 0.35 + fl * 0.45 : 0; flashL.intensity = at === "house" ? fl * 2.0 : 0; flashBack.intensity = at === "house" ? fl * 12 : 0; pionKey.intensity = at === "house" ? (F.pkey ?? 0) * 7 : 0;
  extMoon.intensity = at === "ext" ? 4.5 : 0; extHemi.intensity = at === "ext" ? 0.7 : 0; extDoorSpot.intensity = at === "ext" ? 26 : 0; tableSpot.intensity = at === "house" ? (F.tableK ?? 0) * 32 : 0;
  PHONES.vic.G.visible = F.vicPhone !== false; if (F.vicMode) setScreen(PHONES.vic, F.vicMode.mode, F.vicMode.o);
  for (const k of ["held", "pion"]) { const P = PHONES[k], hp = F[k + "Phone"]; P.G.visible = !!hp; if (hp) setScreen(P, hp.mode, hp.o); }
  if (F.m0Mode) setScreen(PHONES.m0, F.m0Mode.mode, F.m0Mode.o);
  placeFall(F.fall);
  DOOR.rotation.y = F.door ?? 0; FIG.visible = !!F.figure; FIG.userData.face.material.opacity = F.figure ? (F.faceK ?? 0.55) + fl * 0.4 : 0;
  grade.uniforms.flash.value = fl * 0.14;
  if (bakedLoc !== at) { CHARS.bake([aptMoon, ...winLight, extMoon].filter(l => l !== Lc.dyn)); bakedLoc = at; }
  const list = (F.pions || []);
  await CHARS.place(list, { light: Lc.dyn, rimLight: Lc.rim, ...Lc.LP });
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  composer.render();
  const pr = (p) => { const q = V(...p).project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2, q.z]; };
  const pts = {}; list.forEach((P, i) => { if (P && P.anchor) pts["pion" + i] = pr([P.anchor[0], P.anchor[1] + P.height * 0.75, P.anchor[2]]); });
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};
window.ML = { phones: Object.fromEntries(Object.entries(PHONES).map(([k, v]) => [k, { pos: v.G.position.toArray(), pfp: v.pfpAt.toArray() }])) };
window.__ready = true;
