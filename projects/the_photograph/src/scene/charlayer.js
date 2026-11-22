// charlayer.js: puts the engine characters (2D-style PNG frames) INSIDE the three.js world, instead of pasting them on top.
//  - occlusion: a depth-only pass of the whole set is drawn first, the character cards are depth-tested against it
//    (desk edges, door frames, police tape, calendars... all cover the character correctly; no clipping planes, no straight cuts)
//  - light: the cards are lit by the set's own lights (Lambert diffuse + a flat emissive base so the 2D drawing stays readable),
//    receive the set's shadows (god-ray stripes, blinds, lamp pools), strobes and fog
//  - shadow: an invisible proxy of each card, turned to face the main light, casts a real shadow (alpha-tested silhouette)
//    into the dynamic light's shadow map (static lights keep their baked maps)
//  - contact: a soft blob under each character that shrinks and fades while it is in the air; dust puffs on landings
// Cards render in linear light into pionRT (no AgX), so the 2D colours are kept; they are composited after the world (pionComp).
import * as THREE from "three";

const L_CARD = 3;   // layer of the visible cards (and of every light, so the card pass is lit)

export function createChars(scene, camera, renderer, o = {}) {
  const N = o.n || 4, TL = new THREE.TextureLoader(), cache = new Map();
  const cards = [], proxies = [], blobs = [];
  const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(10,12,40,.8)"); gr.addColorStop(0.55, "rgba(10,12,40,.38)"); gr.addColorStop(1, "rgba(10,12,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, depthWrite: true, fog: true }));
    m.material.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <lights_lambert_pars_fragment>',
      THREE.ShaderChunk.lights_lambert_pars_fragment.replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );', 'float dotNL = 0.25 + 0.75 * abs( dot( geometryNormal, directLight.direction ) );')); };   // two-sided "paper cut-out" light: a light behind him still lights him
    m.material.customProgramCacheKey = () => "card2s";
    m.layers.set(L_CARD); m.receiveShadow = true; m.castShadow = false; m.visible = false; m.renderOrder = 20; scene.add(m); cards.push(m);
    const px = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false, alphaTest: 0.5, side: THREE.DoubleSide }));   // the shadow pass copies map/alphaTest from this material
    px.castShadow = true; px.receiveShadow = false; px.visible = false; px.frustumCulled = false;
    px.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, alphaTest: 0.5, side: THREE.DoubleSide });
    px.customDistanceMaterial = new THREE.MeshDistanceMaterial({ alphaTest: 0.5, side: THREE.DoubleSide });
    scene.add(px); proxies.push(px);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false }));
    b.rotation.x = -Math.PI / 2; b.visible = false; b.renderOrder = 4; scene.add(b); blobs.push(b);
  }
  // dust puffs (landings): small expanding, fading sprites
  const dotTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(220,210,190,.9)"); gr.addColorStop(1, "rgba(220,210,190,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const PN = 9, puffGeo = new THREE.BufferGeometry(), puffP = new Float32Array(8 * PN * 3); puffGeo.setAttribute("position", new THREE.BufferAttribute(puffP, 3));
  const puffM = new THREE.PointsMaterial({ map: dotTex, size: 0.22, transparent: true, depthWrite: false, opacity: 0.0, color: o.dustCol ?? 0xd8ccb0, fog: true });
  const puffs = new THREE.Points(puffGeo, puffM); puffs.frustumCulled = false; puffs.renderOrder = 12; scene.add(puffs);
  // every light also lights the card layer
  scene.traverse(x => { if (x.isLight) x.layers.enable(L_CARD); });
  const occM = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }), tinyRT = new THREE.WebGLRenderTarget(1, 1);
  const hide = o.hide || [];   // transparent volumes / particles that must not occlude (cone, beams, dust, webs, rain, spill...)
  async function tex(url) { if (cache.has(url)) return cache.get(url); const t = await TL.loadAsync(url); t.colorSpace = THREE.SRGBColorSpace; cache.set(url, t);
    if (cache.size > 14) { const k = cache.keys().next().value; cache.get(k).dispose(); cache.delete(k); } return t; }
  const V = () => new THREE.Vector3();
  const st = { light: null };
  // P: { url, base, ppu, w, h, anchor:[x,y,z], height, tint:[r,g,b], roll, face, shadow:[w,d,dx,dz] | false, lift (m above ground), E, D, cast:false }
  async function place(list, opts = {}) {
    const keyL = opts.light || o.light || null;   // the dynamic shadow light
    for (let i = 0; i < N; i++) {
      const P = list[i], C = cards[i], X = proxies[i], B = blobs[i];
      if (!P || !P.url) { C.visible = X.visible = B.visible = false; continue; }
      const t = await tex(P.url), M = C.material, tint = P.tint || [1, 1, 1], E = P.E ?? o.E ?? 0.6, D = P.D ?? o.D ?? 0.5;
      M.map = t; M.emissiveMap = t; M.emissive.setRGB(tint[0] * E, tint[1] * E, tint[2] * E); M.color.setRGB(D, D, D); M.needsUpdate = true;
      const k = P.height / (4.65 * P.ppu), sq = P.squash || 1, kx = k / Math.sqrt(sq), ky = k * sq, A = new THREE.Vector3(...P.anchor), off = new THREE.Vector3((P.w / 2 - P.base[0]) * kx, (P.base[1] - P.h / 2) * ky, 0);   // squash & stretch keeps the base on the ground
      if (P.face || P.faceCam) C.quaternion.copy(camera.quaternion); else { const d = V().subVectors(camera.position, A); C.rotation.set(0, Math.atan2(d.x, d.z), 0); }   // faceCam: the engine drew him from this camera's angle (--view), so the card faces the lens fully
      if (P.roll) C.rotateZ(P.roll);
      C.scale.set(P.w * kx, P.h * ky, 1); off.applyQuaternion(C.quaternion); C.position.copy(A).add(off);
      const push = P.push ?? (P.face ? 0 : (o.push ?? 0.2));   // the 2D drawing's base lip sits a little below the contact point: lift it off the floor along the view ray
      if (push) { const d = V().subVectors(C.position, camera.position), L = d.length(), s = (L - push) / L; C.position.copy(camera.position).addScaledVector(d, s); C.scale.multiplyScalar(s); }   // slide toward the lens: same picture, lifted off the floor
      C.visible = true;
      // shadow proxy: same silhouette, upright, turned toward the light (horizontally), set a little behind the card so it never shadows the card itself
      if (keyL && P.cast !== false && !P.face) {
        const lp = V(); keyL.getWorldPosition(lp); if (keyL.isDirectionalLight) { const tp = V(); keyL.target.getWorldPosition(tp); lp.copy(A).add(V().subVectors(lp, tp).normalize().multiplyScalar(20)); }
        const toL = V().subVectors(lp, A); toL.y = 0; if (toL.lengthSq() < 1e-6) toL.set(0, 0, 1); toL.normalize();
        X.material.map = t; X.material.needsUpdate = true; X.customDepthMaterial.map = t; X.customDistanceMaterial.map = t; X.customDepthMaterial.needsUpdate = X.customDistanceMaterial.needsUpdate = true;
        X.rotation.set(0, Math.atan2(toL.x, toL.z), 0); if (P.roll) X.rotateZ(P.roll); X.scale.set(P.w * kx, P.h * ky, 1);
        const off2 = new THREE.Vector3((P.w / 2 - P.base[0]) * kx, (P.base[1] - P.h / 2) * ky, 0).applyQuaternion(X.quaternion);
        X.position.copy(A).add(off2).addScaledVector(toL, -(P.proxyBack ?? 0.14)); X.visible = true;
      } else X.visible = false;
      // contact blob: shrinks / fades with height above the ground
      const sw = P.shadow; if (sw === false) B.visible = false; else { const s = sw || [0.95, 0.5], h = Math.max(0, P.lift || 0), f = Math.max(0.25, 1 - h * 2.2);
        B.visible = true; B.scale.set(s[0] * f, s[1] * f, 1); B.position.set(A.x + (s[2] || 0), (P.ground ?? (A.y - h)) + 0.006, A.z + (s[3] || 0)); B.material.opacity = (P.shOp ?? 1) * f; }
    }
    // dust puffs: opts.puffs = [{ p:[x,y,z], age (s) }]
    const PF = (opts.puffs || []).filter(q => q.age >= 0 && q.age < 0.7).slice(0, 8); puffP.fill(0); let maxA = 0;
    PF.forEach((q, j) => { const u = q.age / 0.7; maxA = Math.max(maxA, 1 - u); for (let n = 0; n < PN; n++) { const a = n / PN * Math.PI * 2 + j, r = 0.12 + 0.45 * Math.sqrt(u) * (0.7 + 0.3 * Math.sin(n * 7.1));
      puffP.set([q.p[0] + Math.cos(a) * r * 0.8, q.p[1] + 0.05 + 0.16 * u * (0.5 + 0.5 * Math.sin(n * 3.3)), q.p[2] + Math.sin(a) * r * 0.6], (j * PN + n) * 3); } });
    puffGeo.attributes.position.needsUpdate = true; puffM.opacity = 0.32 * maxA; puffM.size = 0.16 + 0.22 * (1 - maxA); puffs.visible = PF.length > 0;
    if (keyL && keyL.shadow) { keyL.shadow.autoUpdate = false; keyL.shadow.needsUpdate = true; }
  }
  // character pass into pionRT: depth of the whole world first, then the lit cards (layer 3), depth-tested
  let ground = null;   // meshes tagged userData.ground (floors, rugs, sidewalks, seats): a character standing on them is never hidden by them
  function render(pionRT) {
    renderer.setRenderTarget(pionRT); renderer.setClearColor(0x000000, 0); renderer.clear();
    if (cards.some(c => c.visible)) {
      const bg = scene.background, ac = renderer.autoClear, hv = hide.map(h => h.visible), pv = proxies.map(p => p.visible), bv = blobs.map(b => b.visible), puv = puffs.visible;
      if (!ground) { ground = []; scene.traverse(x => { if (x.userData && x.userData.ground) ground.push(x); }); } const gv = ground.map(g => g.visible); ground.forEach(g => g.visible = false);
      scene.background = null; renderer.autoClear = false; hide.forEach(h => h.visible = false); proxies.forEach(p => p.visible = false); blobs.forEach(b => b.visible = false); puffs.visible = false;
      scene.overrideMaterial = occM; camera.layers.set(0); renderer.render(scene, camera); scene.overrideMaterial = null;
      camera.layers.set(L_CARD); renderer.render(scene, camera); camera.layers.set(0);
      ground.forEach((g, i) => g.visible = gv[i]);
      scene.background = bg; renderer.autoClear = ac; hide.forEach((h, i) => h.visible = hv[i]); proxies.forEach((p, i) => p.visible = pv[i]); blobs.forEach((b, i) => b.visible = bv[i]); puffs.visible = puv;
    }
    renderer.setRenderTarget(null);
  }
  // a composer pass that draws the characters after the world's shadow maps were updated (RenderPass ran first) and before pionComp
  function pass(pionRT) { return { enabled: true, needsSwap: false, clear: false, renderToScreen: false, setSize() {}, dispose() {}, render() { render(pionRT); } }; }
  // keep proxies out of override-material passes (GTAO normal/depth, Bokeh depth)
  function guard(p) { const orig = p.render.bind(p); p.render = (...a) => { const pv = proxies.map(x => x.visible), uv = puffs.visible; proxies.forEach(x => x.visible = false); puffs.visible = false; orig(...a); proxies.forEach((x, i) => x.visible = pv[i]); puffs.visible = uv; }; }
  // re-bake static lights' shadow maps WITHOUT the character proxies (they would freeze a ghost shadow); the dynamic light updates every frame
  function bake(lights) { const L = lights.filter(l => l && l.castShadow); if (!L.length) return; scene.updateMatrixWorld();
    const pv = proxies.map(x => x.visible); proxies.forEach(x => x.visible = false);
    L.forEach(l => { l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; });
    const prev = renderer.getRenderTarget(), bg = scene.background; scene.background = null; scene.overrideMaterial = occM; renderer.setRenderTarget(tinyRT); renderer.render(scene, camera);   // a 1x1 depth-only render: only the shadow maps matter
    scene.overrideMaterial = null; scene.background = bg; renderer.setRenderTarget(prev); L.forEach(l => l.shadow.needsUpdate = false);
    proxies.forEach((x, i) => x.visible = pv[i]); }
  return { cards, proxies, blobs, puffs, place, render, pass, guard, bake };
}
