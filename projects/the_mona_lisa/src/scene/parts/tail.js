// ================================================================ characters + per-frame state
const CHARS = createChars(scene, camera, renderer, { n: 3, E: 0.6, D: 0.22, hide: [monaBeam, thiefBeam, moonBeam, hatchBeam, thiefPool, moonPool, dust], rim: 1.0, glow: 0.35, shade: 0.8 });
composer.insertPass(CHARS.pass(pionRT), composer.passes.indexOf(pionComp)); CHARS.guard(gtao); CHARS.guard(bokeh);
{ const L = [monaBeam, thiefBeam, moonBeam, hatchBeam, thiefPool, moonPool, dust, ...GALLERY.washes], r0 = gtao.render.bind(gtao);   // volumes + glows: no ink outline, no AO
  gtao.render = (...a) => { const v = L.map(o => o.visible); L.forEach(o => o.visible = false); r0(...a); L.forEach((o, i) => o.visible = v[i]); }; }
const charKey = new THREE.SpotLight(0xffffff, 0, 7, 0.42, 0.75, 1.3); scene.add(charKey, charKey.target); charKey.visible = false;   // F.key = { at, from, col, k }
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
  heist: { mona: 34, thief: 46, sky: 0.45, skyCol: 0x8fb0ff, hemi: [0x3a4a70, 0x0a0806, 0.06], wash: 0, washOp: 0.1, bulbs: 0.08, chand: 0, hall: 0.6, beams: [1, 1, 0.35], env: 0.07, skyTex: "skyNight", bg: 0x030406, fog: 0.07, vig: 0.62 },
  night: { mona: 34, thief: 0, sky: 1.2, skyCol: 0x8fb0ff, hemi: [0x5a6a90, 0x120c08, 0.16], wash: 1.4, washOp: 0.3, bulbs: 0.15, chand: 0, hall: 1.5, beams: [0.8, 0, 1], env: 0.1, skyTex: "skyNight", bg: 0x05070c, fog: 0.045, vig: 0.5 },
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
  const bg = gal ? Md.bg : Lc.bg; scene.background.setHex(bg); scene.fog.color.setHex(bg); scene.fog.density = gal ? Md.fog : Lc.fog; grade.uniforms.vig.value = gal ? Md.vig : Lc.vig; grade.uniforms.sepia.value = F.sepia || 0; grade.uniforms.grain.value = 0.03;
  for (const [L, where] of LIGHTSET) L.visible = where === at;
  scene.environmentIntensity = gal ? Md.env * (0.4 + 0.6 * dk) : 0.1;
  // ---- gallery
  monaSpot.intensity = Md.mona * (F.spotK ?? 1); thiefSpot.intensity = Md.thief * (F.thiefK ?? 1); thiefSpot.visible = gal && Md.thief > 0;
  skyLight.intensity = Md.sky * dk; skyLight.color.setHex(Md.skyCol); galHemi.color.setHex(Md.hemi[0]); galHemi.groundColor.setHex(Md.hemi[1]); galHemi.intensity = Md.hemi[2] * dk;
  galWash.forEach(L => L.intensity = Md.wash * dk); GALLERY.chandLights.forEach(L => L.intensity = Md.chand * dk); GALLERY.hallLight.intensity = Md.hall * dk; hookSpot.intensity = (F.hookLight || 0) * 6;
  GALLERY.washes.forEach(w => w.material.opacity = Md.washOp * dk); GALLERY.bulbs.forEach(b => b.material.color.copy(bulbCol).multiplyScalar(2.5 * Md.bulbs * (0.3 + 0.7 * dk)));
  GALLERY.sky.material.map = GALLERY[Md.skyTex];
  const [bm, bt, bs] = Md.beams; monaBeam.visible = gal && bm > 0; monaBeam.material.uniforms.k.value = bm; thiefBeam.visible = thiefPool.visible = gal && bt > 0 && F.thiefBeam !== false; thiefBeam.material.uniforms.k.value = bt * (F.thiefK ?? 1); thiefPool.material.opacity = 0.5 * bt * (F.thiefK ?? 1);
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
  placeThief(gal ? F.thief : null);
  // ---- corridor
  CORRIDOR.hatch.rotation.x = -(F.hatch ?? 1) * 1.45; CORRIDOR.cable.visible = (F.hatch ?? 1) > 0.3; hatchBeam.visible = at === "corridor" && !!F.hatchBeam;
  const pr = F.prints ?? 1; for (const k of ["A", "B"]) CORRIDOR.prints[k].forEach(m => { m.visible = pr > 0 && F["prints" + k] !== false; const lit = pr >= 2; if (m.material.map !== CORRIDOR.printTex[k][lit ? 1 : 0]) { m.material.map = CORRIDOR.printTex[k][lit ? 1 : 0]; m.material.blending = lit ? THREE.AdditiveBlending : THREE.NormalBlending; m.material.needsUpdate = true; } });
  CORRIDOR.cardLed.material.color.setHex(F.cardLed === "green" ? 0x30ff60 : 0xff2a2a).multiplyScalar(2.5);
  // ---- security
  const st = F.cctv || "live", stamp = F.stamp || "02:08:14";
  SECURITY.screens.forEach((s, i) => { const w = Array.isArray(st) ? st[i] : st, key = `${w}:${w === "off" ? "" : stamp}`; if (SECURITY.state[i] !== key) { s.material.map = SECURITY.camTex(i, w === "off", stamp); s.material.needsUpdate = true; SECURITY.state[i] = key; } });
  if (SECURITY.logHi !== (F.logHi ?? null)) { SECURITY.log.material.map = SECURITY.logTex(F.logHi ?? null); SECURITY.log.material.needsUpdate = true; SECURITY.logHi = F.logHi ?? null; }
  // ---- character key light, shadow bake per location/mood
  charKey.visible = !!F.key; if (F.key) { const K = F.key, fr = K.from || [0.6, 1.9, 1.2]; charKey.position.set(K.at[0] + fr[0], K.at[1] + fr[1], K.at[2] + fr[2]); charKey.target.position.set(...K.at); charKey.target.updateMatrixWorld(); charKey.color.setHex(K.col ?? 0xffffff); charKey.intensity = K.k ?? 8; charKey.angle = K.angle ?? 0.42; }
  const bk = at + (F.mood || ""); if (bakedLoc !== bk) { CHARS.bake([monaSpot, skyLight, corKey, secTop].filter(l => l !== Lc.dyn && l.visible)); bakedLoc = bk; }
  const list = (F.pions || []);
  await CHARS.place(list, Object.assign({ light: Lc.dyn, rimLight: F.key ? charKey : Lc.rim }, Lc.LP, F.lp ? (LIGHT_PRESETS[F.lp] || F.lp) : {}));
  inkPass.uniforms.tNormal.value = gtao.normalTexture; inkPass.uniforms.tDepth.value = gtao.depthTexture;
  composer.render();
  const prj = (p) => { const q = V(...p).project(camera); return [(q.x + 1) / 2, (1 - q.y) / 2, q.z]; };
  const pts = {}; list.forEach((P, i) => { if (P && P.anchor) pts["pion" + i] = prj([P.anchor[0], P.anchor[1] + P.height * 0.75, P.anchor[2]]); });
  return { img: renderer.domElement.toDataURL("image/jpeg", 0.93), pts };
};
window.MUSEUM = { GAL, FW, MONA, CASE, HOOK, COR, HATCH, SEC };
window.__ready = true;
