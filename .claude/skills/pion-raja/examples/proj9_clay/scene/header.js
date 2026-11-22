// proj9 (clay statue story): plane over the sea -> Bangkok street -> clay shop -> punch -> shelf at home. Units: metres.
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
renderer.localClippingEnabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 6000);
scene.fog = new THREE.Fog(0xd8dde6, 12, 1500);   // depth haze: clear around Pion, soft on the palace, strong on the far city

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
composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.35, 6.0));   // high threshold: only the lamps glow
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
const SUN_DIR = V(-0.62, 0.42, -0.66).normalize();   // golden-hour backlight from the left: shadows fall toward the camera, rim light on Pion   // golden hour from the left: long shadows, warm key, cool fill
const sky = new Sky(); sky.scale.setScalar(4500); scene.add(sky);
sky.material.uniforms.turbidity.value = 2.0; sky.material.uniforms.cloudCoverage.value = 0.0; sky.material.uniforms.rayleigh.value = 1.9;
sky.material.uniforms.mieCoefficient.value = 0.0012; sky.material.uniforms.mieDirectionalG.value = 0.6;
sky.material.uniforms.sunPosition.value.copy(SUN_DIR);
const sun = new THREE.DirectionalLight(0xffc888, 5.4);
sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096); sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.02; sun.shadow.radius = 1.6;
scene.add(sun, sun.target);
const hemi = new THREE.HemisphereLight(0x9cc2ff, 0x7a6248, 0.62); scene.add(hemi);   // blue sky fill in the shadows, warm bounce from the plaza
function aimSun(center, radius) {
  sun.target.position.copy(center); sun.position.copy(center).addScaledVector(SUN_DIR, radius * 3);
  const c = sun.shadow.camera; c.left = c.bottom = -radius; c.right = c.top = radius; c.near = radius * 0.2; c.far = radius * 7; c.updateProjectionMatrix();
}
const envReady = (async () => {
  const hdr = await new EXRLoader().loadAsync(cityHdr);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdr; scene.environmentIntensity = 0.04;   // the city HDRI has its own sun: keep it out of the diffuse light (it erased the shadows)
  scene.traverse(o => { const m = o.material; if (!m || Array.isArray(m) || !m.isMeshStandardMaterial) return;      // ...but metals and glass still reflect the city
    if (m.metalness >= 0.5 || m.isMeshPhysicalMaterial) { m.envMap = hdr; m.envMapIntensity = m.metalness >= 0.9 ? 0.9 : 0.7; m.needsUpdate = true; } });
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
