// ================================================================ characters + per-frame state
const CHARS = createChars(scene, camera, renderer, { n: 3, E: 0.6, D: 0.22, hide: [monaBeam, thiefBeam, moonBeam, hatchBeam, thiefPool, moonPool, dust], rim: 1.0, glow: 0.35, shade: 0.8 });
composer.insertPass(CHARS.pass(pionRT), composer.passes.indexOf(pionComp)); CHARS.guard(gtao); CHARS.guard(bokeh);
const NOINK = [monaBeam, thiefBeam, moonBeam, hatchBeam, thiefPool, moonPool, dust, ...GALLERY.washes];
{ const L = NOINK, r0 = gtao.render.bind(gtao);   // volumes + glows: no ink outline, no AO
  gtao.render = (...a) => { const v = L.map(o => o.visible); L.forEach(o => o.visible = false); r0(...a); L.forEach((o, i) => o.visible = v[i]); }; }
const charKey = new THREE.SpotLight(0xffffff, 0, 7, 0.42, 0.75, 1.3); scene.add(charKey, charKey.target); charKey.visible = false;   // F.key = { at, from, col, k }
charKey.castShadow = true; charKey.shadow.mapSize.set(1024, 1024); charKey.shadow.bias = -0.0005; charKey.shadow.normalBias = 0.02;   // the key that follows him also throws his shadow
// flashlight (gest senter): a spot from his hand to what he looks at + its visible cone + the bright spot where it lands. F.flash = { from, to, k, col }
const flashSpot = new THREE.SpotLight(0xfff4dc, 0, 6, 0.2, 0.35, 1.2); scene.add(flashSpot, flashSpot.target); flashSpot.castShadow = true; flashSpot.shadow.mapSize.set(1024, 1024); flashSpot.shadow.bias = -0.0005;
const flashBeam = (() => { const g = new THREE.CylinderGeometry(0.02, 1, 1, 40, 1, true); g.translate(0, -0.5, 0); const m = new THREE.Mesh(g, beamMat(0xfff0d0, 0.32)); m.renderOrder = 10; scene.add(m); return m; })();
const flashPoolM = pool(0, 0.004, 0, 0.3, 0.3, 0xfff0d0, 0.5); NOINK.push(flashBeam, flashPoolM);
function placeFlash(Fl) { const on = !!Fl; flashSpot.visible = flashBeam.visible = flashPoolM.visible = on; if (!on) return;
  const a = V(...Fl.from), b = V(...Fl.to), d = b.clone().sub(a), L = d.length(), k = Fl.k ?? 1, ang = Fl.angle ?? 0.2;
  flashSpot.position.copy(a); flashSpot.target.position.copy(b); flashSpot.target.updateMatrixWorld(); flashSpot.intensity = 26 * k; flashSpot.angle = ang; flashSpot.color.setHex(Fl.col ?? 0xfff4dc);
  flashBeam.position.copy(a); flashBeam.quaternion.setFromUnitVectors(V(0, -1, 0), d.clone().normalize()); const r = Math.tan(ang) * L; flashBeam.scale.set(r, L, r); flashBeam.material.uniforms.k.value = k; flashBeam.material.uniforms.col.value.setHex(Fl.col ?? 0xfff0d0);
  flashPoolM.position.copy(b).addScaledVector(d.clone().normalize(), -0.01); flashPoolM.quaternion.setFromUnitVectors(V(0, 0, 1), d.clone().normalize().negate()); flashPoolM.scale.setScalar(r * 2.2); flashPoolM.material.opacity = 0.55 * k; }
// the one who waited below (a second unrevealed shadow pawn): F.waiter = { pos, yaw, eyes }
const WAITER = new THREE.Group(); scene.add(WAITER); { const B = THIEF.children[0].clone(true); B.position.y = 0; WAITER.add(B); WAITER.userData.face = B.children.find(c => c.material && c.material.map && c.material.isMeshBasicMaterial); } WAITER.visible = false;
function placeWaiter(W) { WAITER.visible = !!W; if (!W) return; WAITER.position.set(...W.pos); WAITER.rotation.set(0, W.yaw || 0, 0); WAITER.scale.setScalar(W.scale || 1.06); if (WAITER.userData.face) WAITER.userData.face.visible = W.eyes !== false; }
const LOCS = {
  gallery: { dyn: monaSpot, rim: monaSpot, LP: LIGHT_PRESETS.interior_warm_lamp, bg: 0x0c0a08, fog: 0.035, vig: 0.42 },
  corridor: { dyn: corKey, rim: corKey, LP: LIGHT_PRESETS.crime_scene, bg: 0x08090a, fog: 0.05, vig: 0.5 },
  security: { dyn: secTop, rim: secGlow, LP: LIGHT_PRESETS.interior_night, bg: 0x05060a, fog: 0.04, vig: 0.5 },
};
const LIGHTSET = [[monaSpot, "gallery"], [thiefSpot, "gallery"], [hookSpot, "gallery"], [skyLight, "gallery"], [galHemi, "gallery"], ...galWash.map(L => [L, "gallery"]), ...GALLERY.chandLights.map(L => [L, "gallery"]), [GALLERY.hallLight, "gallery"],
  ...corTubes.map(L => [L, "corridor"]), [corHemi, "corridor"], [corKey, "corridor"], [secGlow, "security"], [secTop, "security"], [secHemi, "security"]];
// gallery moods. heist: the museum closed for the night, chandeliers off; a hard top light on the thief and the painting's spot, the rest falls into the dark.
// night: the same hall at night without the theft light. day: the investigation, skylight + chandeliers + warm picture lights.
const MOODS = {
  heistWarm: { mona: 30, thief: 44, thiefCol: 0xffd6a0, sky: 0.25, skyCol: 0x8fb0ff, hemi: [0x5a3a22, 0x0a0604, 0.07], wash: 0.6, washOp: 0.16, bulbs: 0.12, chand: 0, hall: 1.2, beams: [1, 1, 0.12], env: 0.08, skyTex: "skyNight", bg: 0x050302, fog: 0.065, vig: 0.6 },   // brief: the opening is warm, golden
  heist: { mona: 34, thief: 46, sky: 0.45, skyCol: 0x8fb0ff, hemi: [0x3a4a70, 0x0a0806, 0.06], wash: 0, washOp: 0.1, bulbs: 0.08, chand: 0, hall: 0.6, beams: [1, 1, 0.35], env: 0.07, skyTex: "skyNight", bg: 0x030406, fog: 0.07, vig: 0.62 },
  night: { mona: 34, thief: 0, sky: 1.2, skyCol: 0x8fb0ff, hemi: [0x5a6a90, 0x120c08, 0.16], wash: 1.4, washOp: 0.3, bulbs: 0.15, chand: 0, hall: 1.5, beams: [0.8, 0, 1], env: 0.1, skyTex: "skyNight", bg: 0x05070c, fog: 0.045, vig: 0.5 },
  investigate: { mona: 26, monaCol: 0xfff4e6, thief: 0, sky: 0.5, skyCol: 0xdfe6ff, hemi: [0xb8c4dc, 0x1a1614, 0.1], wash: 0.6, washOp: 0.14, bulbs: 0.25, chand: 0.5, hall: 0.8, beams: [0.75, 0, 0.12], env: 0.1, skyTex: "skyNight", bg: 0x07080c, fog: 0.05, vig: 0.58 },   // neutral white: only the frame and Pion are lit
  investigateCool: { mona: 26, monaCol: 0xe4ecff, thief: 0, sky: 0.45, skyCol: 0x9fb6ff, hemi: [0x5a6e9a, 0x0c0e16, 0.1], wash: 0.25, washOp: 0.08, bulbs: 0.12, chand: 0, hall: 0.4, beams: [0.85, 0, 0.18], env: 0.08, skyTex: "skyNight", bg: 0x05070d, fog: 0.06, vig: 0.62, sunCol: 0x9ab8ff },   // the clues: blue creeps into the shadows
  reconstruct: { mona: 22, monaCol: 0xc8d8ff, thief: 30, thiefCol: 0xb8ccff, sky: 0.3, skyCol: 0x8fa8ff, hemi: [0x34446a, 0x05060a, 0.06], wash: 0, washOp: 0.04, bulbs: 0.05, chand: 0, hall: 0.2, beams: [0.8, 1, 0.1], env: 0.06, skyTex: "skyNight", bg: 0x030409, fog: 0.07, vig: 0.66 },   // the thief's descent, re-imagined in cold light
  dayNeutral: { mona: 22, thief: 0, sky: 2.6, skyCol: 0xf2f5ff, hemi: [0xe6ecf6, 0x2a2622, 0.42], wash: 3.6, washOp: 0.42, bulbs: 0.8, chand: 3.8, hall: 4.5, beams: [0.3, 0, 0.45], env: 0.24, skyTex: "skyDay", bg: 0x10131a, fog: 0.024, vig: 0.42, sunCol: 0xeef2ff },   // brief: early investigation = neutral white, slightly cooler shadows
  day: { mona: 24, thief: 0, sky: 3.0, skyCol: 0xfff0d6, hemi: [0xffe6c4, 0x3a2614, 0.45], wash: 4.5, washOp: 0.55, bulbs: 1, chand: 5, hall: 6, beams: [0.35, 0, 0.55], env: 0.28, skyTex: "skyDay", bg: 0x1a140e, fog: 0.022, vig: 0.4, sunCol: 0xffe2b0 },
};
const bulbCol = new THREE.Color(0xffd28a);
let bakedLoc = null;
window.renderFrame = async (F) => {   // F: { t, loc, mood, cam, pions, key, lp, painting, glass ('ok'|'broken'|'none'), shatter (s since smash), fabric, camsOn, ropeDown, tape, hookLight, thief, dark,
  //        hatch (0..1 open), hatchBeam, prints (0 | 1 | 2 = lit up), printsA/printsB, cardLed ('red'|'green'), cctv ('live'|'off'|[9]), stamp, logHi, sepia }
  const at = F.loc || "gallery", Lc = LOCS[at], t = F.t || 0;
  camera.position.set(...F.cam.pos); camera.fov = F.cam.fov; camera.updateProjectionMatrix(); camera.lookAt(...F.cam.tgt); if (F.cam.roll) camera.rotateZ(F.cam.roll); camera.updateMatrixWorld();
  bokeh.uniforms.focus.value = F.cam.focus; bokeh.uniforms.aperture.value = F.cam.aperture ?? 0.0016; grade.uniforms.time.value = t;
  const Md = MOODS[F.mood || "night"], gal = at === "gallery", dk = 1 - (F.dark || 0);
  const bg = gal ? Md.bg : Lc.bg; scene.background.setHex(bg); scene.fog.color.setHex(bg); scene.fog.density = gal ? Md.fog : Lc.fog; grade.uniforms.vig.value = gal ? Md.vig : Lc.vig; grade.uniforms.sepia.value = F.sepia || 0; grade.uniforms.bw.value = F.bw || 0; grade.uniforms.grain.value = 0.03;
  for (const [L, where] of LIGHTSET) L.visible = where === at;
  scene.environmentIntensity = gal ? Md.env * (0.4 + 0.6 * dk) : 0.1;
  // ---- gallery
  monaSpot.intensity = Md.mona * (F.spotK ?? 1); monaSpot.color.setHex(Md.monaCol ?? 0xffd49a); monaBeam.material.uniforms.col.value.setHex(Md.monaCol ?? 0xffd49a); thiefSpot.intensity = Md.thief * (F.thiefK ?? 1); thiefSpot.color.setHex(Md.thiefCol ?? 0xdce8ff); thiefBeam.material.uniforms.col.value.setHex(Md.thiefCol ?? 0xdce8ff); thiefPool.material.color.setHex(Md.thiefCol ?? 0xdce8ff); thiefSpot.visible = gal && Md.thief > 0;
  skyLight.intensity = Md.sky * dk; skyLight.color.setHex(Md.skyCol); galHemi.color.setHex(Md.hemi[0]); galHemi.groundColor.setHex(Md.hemi[1]); galHemi.intensity = Md.hemi[2] * dk;
  galWash.forEach(L => L.intensity = Md.wash * dk); GALLERY.chandLights.forEach(L => L.intensity = Md.chand * dk); GALLERY.hallLight.intensity = Md.hall * dk; hookSpot.intensity = (F.hookLight || 0) * 6;
  GALLERY.washes.forEach(w => w.material.opacity = Md.washOp * dk); GALLERY.bulbs.forEach(b => b.material.color.copy(bulbCol).multiplyScalar(2.5 * Md.bulbs * (0.3 + 0.7 * dk)));
  GALLERY.sky.material.map = GALLERY[Md.skyTex];
  const [bm0, bt, bs] = Md.beams, bm = bm0 * (F.monaBeamK ?? 1); monaBeam.visible = gal && bm > 0; monaBeam.material.uniforms.k.value = bm; thiefBeam.visible = thiefPool.visible = gal && bt > 0 && F.thiefBeam !== false; thiefBeam.material.uniforms.k.value = bt * (F.thiefK ?? 1); thiefPool.material.opacity = 0.5 * bt * (F.thiefK ?? 1);
  moonBeam.visible = moonPool.visible = gal && bs > 0; moonBeam.material.uniforms.k.value = bs * dk; moonPool.material.opacity = 0.25 * bs * dk;
  const bc = Md.sunCol ?? 0x9ab8ff; moonBeam.material.uniforms.col.value.setHex(bc); moonPool.material.color.setHex(bc);
  for (const b of [monaBeam, thiefBeam, moonBeam, hatchBeam]) b.material.uniforms.time.value = t;
  dust.visible = gal && Md.thief + Md.mona > 0; placeDust(t);
  const painting = F.painting !== false; GALLERY.canvas.visible = painting && !(F.thief && (F.thief.panelK || 0) > 0);
  const gs = F.glass || "ok"; GALLERY.glass[0].visible = gs === "ok"; GALLERY.glassBroken.visible = gs === "broken"; GALLERY.glass.slice(1).forEach(g => g.visible = gs !== "none");
  { const sh = F.shatter, settled = !!F.shards; GALLERY.shards.forEach(m => { const u = m.userData; if (sh != null && sh >= 0 && sh < 0.9) { const tt = sh; m.visible = true;
        m.position.set(u.p0.x + u.v.x * tt, Math.max(0.004, u.p0.y + u.v.y * tt - 4.9 * tt * tt), u.p0.z + u.v.z * tt); if (m.position.y <= 0.004) m.position.lerp(u.end, Math.min(1, (tt - 0.35) * 2)); m.rotation.set(u.spin.x * tt, u.spin.y * tt + u.ry, u.spin.z * tt); }
      else if ((sh != null && sh >= 0.9) || settled || gs === "broken") { m.visible = sh == null || sh >= 0.9 || settled; m.position.copy(u.end); m.rotation.set(0, u.ry, 0); } else m.visible = false; }); }
  GALLERY.fabric.visible = F.fabric === true;
  GALLERY.cams.forEach(c => c.visible = F.camsOn !== false); CORRIDOR.camLed.visible = F.camsOn !== false;
  const down = !!F.ropeDown; GALLERY.ropes[1].visible = !down; GALLERY.ropes[2].visible = !down; GALLERY.ropeDown.visible = down; GALLERY.tape.visible = !!F.tape;
  placeThief(F.thief || null); placeWaiter(F.waiter || null); placeFlash(F.flash || null); flashBeam.material.uniforms.time.value = t;
  // ---- corridor / security light focus: the tubes / room fill go down as the story gets colder, the key stays on the subject
  { const cool = F.cool ?? 0, fk = F.fillK ?? 1; corTubes.forEach(L => { L.intensity = 3.2 * fk * (1 - 0.55 * cool); L.color.setHex(cool > 0.5 ? 0xb8ccff : 0xe8f2ff); }); corHemi.intensity = 0.25 * fk * (1 - 0.5 * cool); corHemi.color.setHex(cool > 0.5 ? 0x6a80b8 : 0xc8d4e0);
    corKey.intensity = 14 * (F.corKeyK ?? 1); corKey.color.setHex(cool > 0.5 ? 0xd2deff : 0xe8f2ff); secHemi.intensity = 0.2 * fk; secTop.intensity = 10 * fk; secGlow.intensity = 6 * (F.glowK ?? 1); }
  // ---- corridor
  CORRIDOR.hatch.rotation.x = -(F.hatch ?? 1) * 1.45; CORRIDOR.cable.visible = (F.hatch ?? 1) > 0.3; hatchBeam.visible = at === "corridor" && !!F.hatchBeam;
  const pr = F.prints ?? 1; for (const k of ["A", "B"]) CORRIDOR.prints[k].forEach(m => { m.visible = pr > 0 && F["prints" + k] !== false; const lit = pr >= 2; if (m.material.map !== CORRIDOR.printTex[k][lit ? 1 : 0]) { m.material.map = CORRIDOR.printTex[k][lit ? 1 : 0]; m.material.blending = lit ? THREE.AdditiveBlending : THREE.NormalBlending; m.material.needsUpdate = true; } });
  CORRIDOR.cardLed.material.color.setHex(F.cardLed === "green" ? 0x30ff60 : 0xff2a2a).multiplyScalar(2.5);
  // ---- security
  const st = F.cctv || "live", stamp = F.stamp || "02:08:14";
  SECURITY.screens.forEach((s, i) => { const w = Array.isArray(st) ? st[i] : st, key = `${w}:${w === "off" ? "" : stamp}`; if (SECURITY.state[i] !== key) { s.material.map = SECURITY.camTex(i, w === "off", stamp); s.material.needsUpdate = true; SECURITY.state[i] = key; } });
  SECURITY.staff.visible = F.staff != null; if (F.staff != null) SECURITY.staff.material.map = SECURITY.staffTex[F.staff ? 1 : 0];
  if (SECURITY.logHi !== (F.logHi ?? null)) { SECURITY.log.material.map = SECURITY.logTex(F.logHi ?? null); SECURITY.log.material.needsUpdate = true; SECURITY.logHi = F.logHi ?? null; }
  // ---- character key light, shadow bake per location/mood
  charKey.visible = !!F.key; if (F.key) { const K = F.key, fr = K.from || [0.6, 1.9, 1.2]; charKey.position.set(K.at[0] + fr[0], K.at[1] + fr[1], K.at[2] + fr[2]); charKey.target.position.set(...K.at); charKey.target.updateMatrixWorld(); charKey.color.setHex(K.col ?? 0xffffff); charKey.intensity = K.k ?? 8; charKey.angle = K.angle ?? 0.42; }
  const bk = at + (F.mood || ""); if (bakedLoc !== bk) { CHARS.bake([monaSpot, skyLight, corKey, secTop].filter(l => l !== Lc.dyn && l.visible)); bakedLoc = bk; }
  const list = (F.pions || []);
  await CHARS.place(list, Object.assign({ light: F.key ? charKey : Lc.dyn, rimLight: F.key ? charKey : Lc.rim }, Lc.LP, F.lp ? (LIGHT_PRESETS[F.lp] || F.lp) : {}));
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  composer.render();
  const prj = (p) => { const q = V(...p).project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2, q.z]; };
  const pts = {}; list.forEach((P, i) => { if (P && P.anchor) pts["pion" + i] = prj([P.anchor[0], P.anchor[1] + P.height * 0.75, P.anchor[2]]); });
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};
window.MUSEUM = { GAL, FW, MONA, CASE, HOOK, COR, HATCH, SEC };
window.__ready = true;
