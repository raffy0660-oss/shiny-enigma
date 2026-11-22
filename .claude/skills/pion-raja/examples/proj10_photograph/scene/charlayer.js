// charlayer.js: puts the engine characters (2D-style PNG frames) INSIDE the three.js world, instead of pasting them on top.
//  - occlusion: a depth-only pass of the whole set is drawn first, the character cards are depth-tested against it
//    (desk edges, door frames, police tape, calendars... all cover the character correctly; no clipping planes, no straight cuts)
//  - light: the cards are lit by the set's own lights (Lambert diffuse + a flat emissive base so the 2D drawing stays readable),
//    receive the set's shadows (god-ray stripes, blinds, lamp pools), strobes and fog
//  - shadow: an invisible proxy of each card, turned to face the main light, casts a real shadow (alpha-tested silhouette)
//    into the dynamic light's shadow map (static lights keep their baked maps)
//  - contact: a soft blob under each character that shrinks and fades while it is in the air; dust puffs on landings
// Cards render in linear light into pionRT (no AgX), so the 2D colours are kept; they are composited after the world (pionComp).
// v2 (grounding / lighting upgrade):
//  - ground anchor separate from the sprite: the base pixel of the drawing is pinned to the anchor whatever the facing / roll; ground surface
//    resolved per character (explicit, groundY, or a raycast onto meshes tagged userData.ground: floors, rugs, sidewalks, chair seats)
//  - push is a DEPTH-ONLY bias (vertex shader): the picture, position and size never change with the camera distance (pushMode "legacy" = old)
//  - facing modes yaw | full | fixed | faceCam (+ roll for lying characters), see charpresets.js
//  - light-side rim + soft glow drawn INSIDE the ink outline (screen-space edge from the sprite alpha, direction toward the key light,
//    stronger when the light is behind the character), tinted by the light colour; outlines stay dark; no bloom wash
//  - contact shadow at the true contact point: compact under the feet, wider + softer with lift, along the body when lying
import * as THREE from "three";
import { withPreset } from "./charpresets.js";

const L_CARD = 3;   // layer of the visible cards (and of every light, so the card pass is lit)

export function createChars(scene, camera, renderer, o = {}) {
  const N = o.n || 4, TL = new THREE.TextureLoader(), cache = new Map();
  const cards = [], proxies = [], blobs = [];
  const blobTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(10,12,30,.72)"); gr.addColorStop(0.22, "rgba(10,12,30,.55)"); gr.addColorStop(0.55, "rgba(10,12,30,.22)"); gr.addColorStop(1, "rgba(10,12,30,0)");   // tight core + long soft falloff (not a hard dark disc) g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (let i = 0; i < N; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ transparent: true, alphaTest: 0.04, side: THREE.DoubleSide, depthWrite: true, fog: true }));
    const U = { uPush: { value: 0 }, uRimDir: { value: new THREE.Vector2(0, 1) }, uRimPx: { value: new THREE.Vector2(0.004, 0.002) }, uRimCol: { value: new THREE.Color(0, 0, 0) }, uRim: { value: 0 }, uGlow: { value: 0 } };
    m.userData.U = U;
    m.material.onBeforeCompile = (sh) => { Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPush;').replace('#include <project_vertex>', `#include <project_vertex>
        if (uPush > 0.0) { float Lp = length(mvPosition.xyz); vec4 cp = projectionMatrix * vec4(mvPosition.xyz * max(0.05, (Lp - uPush) / Lp), 1.0); gl_Position.z = cp.z / cp.w * gl_Position.w; }   // depth-only push`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <lights_lambert_pars_fragment>',
        THREE.ShaderChunk.lights_lambert_pars_fragment.replace('float dotNL = saturate( dot( geometryNormal, directLight.direction ) );', 'float dotNL = 0.25 + 0.75 * abs( dot( geometryNormal, directLight.direction ) );'))   // two-sided "paper cut-out" light: a light behind him still lights him
        .replace('#include <common>', '#include <common>\nuniform vec2 uRimDir; uniform vec2 uRimPx; uniform vec3 uRimCol; uniform float uRim; uniform float uGlow;')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        #ifdef USE_MAP
        if (uRim + uGlow > 0.0) {   // light-side rim inside the ink line + a soft gradient: distance to the lit edge from a few alpha taps
          vec4 c0 = texture2D(map, vMapUv); float a0 = step(0.5, c0.a), lum = dot(c0.rgb, vec3(0.3, 0.59, 0.11)), ink = 1.0 - smoothstep(0.07, 0.2, lum);
          vec2 d = uRimDir * uRimPx; float rim = 0.0, glw = 0.0;
          for (int k = 1; k <= 3; k++) rim += 1.0 - step(0.5, texture2D(map, vMapUv + d * float(k)).a);
          for (int k = 2; k <= 5; k++) glw += 1.0 - step(0.5, texture2D(map, vMapUv + d * float(k) * 2.2).a);
          rim = a0 * min(1.0, rim / 2.0) * (1.0 - 0.9 * ink); glw = a0 * (glw / 4.0) * (1.0 - 0.85 * ink);
          totalEmissiveRadiance += uRimCol * (0.55 * c0.rgb + 0.45) * (uRim * rim + uGlow * glw);
        }
        #endif`); };
    m.material.customProgramCacheKey = () => "card2s_v2";
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
  // P: { url, base, ppu, w, h, anchor:[x,y,z] | groundAnchor:[x,y,z], height, tint:[r,g,b], roll, facing, face, faceCam, yaw, shadow:[w,d,dx,dz] | false,
  //      lift (m above the ground; with `anchor` the anchor already includes it, as in the old plans), ground / groundY / groundMode / groundOffset,
  //      contact "feet" | "body" | "seat", push, pushMode, E, D, rim, glow, rimCol, cast:false, preset }  (presets: charpresets.js)
  const ray = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0);
  let grounds = null; const groundList = () => grounds || (grounds = (() => { const g = []; scene.traverse(x => { if (x.isMesh && x.userData && x.userData.ground) g.push(x); }); return g; })());
  function groundAt(x, y, z) { ray.set(new THREE.Vector3(x, y + 0.6, z), DOWN); ray.far = 4; const h = ray.intersectObjects(groundList(), false).find(q => q.point.y <= y + 0.6); return h ? h.point.y : null; }
  const lightPos = (L, A) => { const lp = V(); L.getWorldPosition(lp); if (L.isDirectionalLight) { const tp = V(); L.target.getWorldPosition(tp); lp.copy(A).add(V().subVectors(lp, tp).normalize().multiplyScalar(20)); } return lp; };
  async function place(list, opts = {}) {
    const keyL = opts.light || o.light || null;   // the dynamic shadow light (also the rim light direction)
    for (let i = 0; i < N; i++) {
      const P = withPreset(list[i]), C = cards[i], X = proxies[i], B = blobs[i];
      if (!P || !P.url) { C.visible = X.visible = B.visible = false; continue; }
      const t = await tex(P.url), M = C.material, U = C.userData.U, tint = P.tint || [1, 1, 1], E = P.E ?? o.E ?? 0.6, D = P.D ?? o.D ?? 0.5;
      M.map = t; M.emissiveMap = t; M.emissive.setRGB(tint[0] * E, tint[1] * E, tint[2] * E); M.color.setRGB(D, D, D); M.needsUpdate = true;
      // ---- ground anchor (world) vs visual position: the base pixel of the drawing is pinned to A
      const lift = Math.max(0, P.lift || 0), mode = P.groundMode || "explicit";
      let A, ground;
      if (P.groundAnchor) { const g = P.groundAnchor; ground = (mode === "raycast" ? groundAt(g[0], g[1], g[2]) : null) ?? (P.groundY ?? g[1]); ground += P.groundOffset || 0; A = new THREE.Vector3(g[0], ground + lift, g[2]); }
      else { A = new THREE.Vector3(...P.anchor); ground = P.ground ?? P.groundY ?? (mode === "raycast" ? groundAt(A.x, A.y - lift, A.z) : null) ?? (A.y - lift); if (P.groundOffset) { ground += P.groundOffset; A.y += P.groundOffset; } }
      const k = P.height / (4.65 * P.ppu), sq = P.squash || 1, kx = k / Math.sqrt(sq), ky = k * sq;   // size from the drawing only (height, ppu): never from the camera distance
      const off = new THREE.Vector3((P.w / 2 - P.base[0]) * kx, (P.base[1] - P.h / 2) * ky, 0);    // squash & stretch keeps the base on the ground
      const facing = P.facing || (P.face || P.faceCam ? "full" : "yaw");
      if (facing === "full" || facing === "faceCam") C.quaternion.copy(camera.quaternion);          // drawn from this camera's angle (--view): faces the lens fully
      else if (facing === "floor") { C.rotation.set(-Math.PI / 2, 0, 0); C.rotateZ(P.yaw || 0); }   // lying: the (front-view) drawing lies flat on the floor, head toward yaw
      else if (facing === "fixed") C.rotation.set(0, P.yaw || 0, 0);
      else { const d = V().subVectors(camera.position, A); C.rotation.set(0, Math.atan2(d.x, d.z), 0); }   // yaw: upright, no tilt
      if (P.roll && facing !== "floor") C.rotateZ(P.roll);
      C.scale.set(P.w * kx, P.h * ky, 1); off.applyQuaternion(C.quaternion); C.position.copy(A).add(off);   // rotation / roll pivot = the base pixel
      if (facing === "floor") C.position.y = ground + 0.012;
      const push = facing === "floor" ? 0 : P.push ?? (P.face ? 0 : (o.push ?? 0.2));   // the 2D base lip sits a little below the contact point
      if (P.pushMode === "legacy" && push) { const d = V().subVectors(C.position, camera.position), L = d.length(), s = (L - push) / L; C.position.copy(camera.position).addScaledVector(d, s); C.scale.multiplyScalar(s); U.uPush.value = 0; }
      else U.uPush.value = push;                                                                     // depth-only: same picture, same size, same contact point
      // ---- rim + glow toward the key light (screen space), stronger when the light is behind the character
      const rim = (P.rim ?? o.rim ?? 0) * (opts.rimK ?? o.rimK ?? 1), glow = (P.glow ?? o.glow ?? 0) * (opts.rimK ?? o.rimK ?? 1);
      const rimL = opts.rimLight || keyL;   // rim direction: the key light of the shot (may differ from the shadow light)
      if (rimL && rim + glow > 0) {
        const mid = V().copy(A).addScaledVector(V(0, 1, 0).applyQuaternion(C.quaternion), P.height * 0.45), lp = lightPos(rimL, mid);
        const a = mid.clone().project(camera), b = lp.clone().project(camera), behind = V().subVectors(lp, mid).normalize().dot(V().subVectors(mid, camera.position).normalize());
        let dx = b.x - a.x, dy = b.y - a.y; const dirToCam = V().subVectors(lp, camera.position).dot(V(0, 0, -1).applyQuaternion(camera.quaternion)) < 0;
        if (dirToCam) { dx = -dx; dy = -dy; }                                                         // light behind the lens: projection flips
        const ln = Math.hypot(dx, dy) || 1, r = -(P.roll || 0); dx /= ln; dy /= ln; const rx = dx * Math.cos(r) - dy * Math.sin(r), ry = dx * Math.sin(r) + dy * Math.cos(r);
        U.uRimDir.value.set(rx, ry); U.uRimPx.value.set(0.09 * P.ppu / P.w, 0.09 * P.ppu / P.h);   // tap step relative to the drawing scale (ink line ~0.12 model units)
        const lc = opts.rimCol || P.rimCol || o.rimCol || [rimL.color.r, rimL.color.g, rimL.color.b], lk = 0.35 + 0.65 * Math.max(0, behind);
        U.uRimCol.value.setRGB(lc[0] * lk, lc[1] * lk, lc[2] * lk); U.uRim.value = rim; U.uGlow.value = glow;
      } else { U.uRim.value = 0; U.uGlow.value = 0; }
      C.visible = true;
      // ---- cast shadow: proxy with the same silhouette, upright, turned toward the light (horizontally), a little behind the card
      if (keyL && P.cast !== false && !P.face && P.contact !== "body" && facing !== "floor") {
        const lp = lightPos(keyL, A);
        const toL = V().subVectors(lp, A); toL.y = 0; if (toL.lengthSq() < 1e-6) toL.set(0, 0, 1); toL.normalize();
        X.material.map = t; X.material.needsUpdate = true; X.customDepthMaterial.map = t; X.customDistanceMaterial.map = t; X.customDepthMaterial.needsUpdate = X.customDistanceMaterial.needsUpdate = true;
        X.rotation.set(0, Math.atan2(toL.x, toL.z), 0); X.scale.set(P.w * kx, P.h * ky, 1);
        const off2 = new THREE.Vector3((P.w / 2 - P.base[0]) * kx, (P.base[1] - P.h / 2) * ky, 0).applyQuaternion(X.quaternion);
        X.position.copy(A).add(off2).addScaledVector(toL, -(P.proxyBack ?? 0.14)); X.visible = true;
      } else X.visible = false;
      // ---- contact shadow at the true contact point (on the resolved ground surface)
      const sw = P.shadow; if (sw === false) B.visible = false; else {
        const h = Math.max(0, A.y - ground), wide = 1 + Math.min(h, 1) * 0.9, fade = Math.max(0.18, 1 - h * 1.5);   // lifted: wider + softer + fainter
        let sx, sz, ox = 0, oz = 0, rotY = 0;
        if (Array.isArray(sw)) { sx = sw[0]; sz = sw[1]; ox = sw[2] || 0; oz = sw[3] || 0; }                    // explicit (old plans)
        else if (P.contact === "body") { const up = V(0, 1, 0).applyQuaternion(C.quaternion); up.y = 0; const L = P.height * 0.95;   // lying: along the body axis
          if (up.lengthSq() < 1e-4) up.set(1, 0, 0); up.normalize(); sx = L; sz = P.height * 0.32; rotY = Math.atan2(-up.z, up.x); ox = up.x * L * 0.45; oz = up.z * L * 0.45; }
        else { sx = P.height * 0.62; sz = P.height * 0.3; if (P.contact === "seat") { sx *= 0.8; sz *= 0.8; } }   // compact, under the feet
        B.visible = true; B.rotation.set(-Math.PI / 2, 0, rotY); B.scale.set(sx * wide, sz * wide, 1);
        B.position.set(A.x + ox, ground + 0.006, A.z + oz); B.material.opacity = (P.shOp ?? 1) * fade; }
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
