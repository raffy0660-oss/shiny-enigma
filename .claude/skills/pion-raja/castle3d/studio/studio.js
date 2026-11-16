// Pion Studio: the 2D engine Pion (a camera-facing video plane) inside the 3D castle, lit per mood,
// shot with the same camera plan (engine/camplan.js) as the engine and the Remotion finisher.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OutlineEffect } from "three/addons/effects/OutlineEffect.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

await window.__boot;                       // moods.json + camplan.js
const CP = window.CamPlan;
const [scene_json, timeline, cuesTxt] = await Promise.all([
  fetch("assets/scene.json").then(r => r.json()),
  fetch("assets/timeline.json").then(r => r.json()),
  fetch("assets/cues.txt").then(r => r.text()),
]);
const B2T = (v) => new THREE.Vector3(v[0], v[2], -v[1]);        // Blender z-up -> three y-up
const [RW, RH] = scene_json.camera.res;
const PS = scene_json.pion.scale;
const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$("stage").appendChild(renderer.domElement);
const ink = new OutlineEffect(renderer, { defaultThickness: 0.0035, defaultColor: [0.02, 0.015, 0.012], defaultAlpha: 1 });
let useInk = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070504);

// ---------------------------------------------------------------- shot camera (from Blender)
const C = scene_json.camera;
const camera = new THREE.PerspectiveCamera(1, RW / RH, 0.1, 400);
const vfov = 2 * Math.atan((C.sensor / 2) / C.lens) * 180 / Math.PI;    // portrait: the sensor fits the height
camera.fov = RW >= RH ? 2 * Math.atan(Math.tan(vfov * Math.PI / 360) * RH / RW) * 180 / Math.PI : vfov;
const qBlender = new THREE.Quaternion(C.quat_wxyz[1], C.quat_wxyz[2], C.quat_wxyz[3], C.quat_wxyz[0]);
const qAxes = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const baseQuat = qAxes.clone().multiply(qBlender);
const basePos = B2T(C.pos);
const shiftPx = C.shift_y * Math.max(RW, RH);
function setBaseCamera() {
  camera.position.copy(basePos); camera.quaternion.copy(baseQuat);
  camera.setViewOffset(RW, RH, 0, -shiftPx, RW, RH);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
}
setBaseCamera();
const headWorld = new THREE.Vector3(0, scene_json.pion.head_z, 0);
const focusPx = (() => { const p = headWorld.clone().project(camera); return [(p.x + 1) / 2 * RW, (1 - p.y) / 2 * RH]; })();

// same framing maths as castle3d/remotion/src/PionCastle.tsx: crop window toward the face + corner, dutch roll
function applyShot(z, ox, oy, rollDeg) {
  const th = rollDeg * Math.PI / 180, c = Math.abs(Math.cos(th)), s = Math.abs(Math.sin(th));
  const S = z * Math.max(c + RH / RW * s, c + RW / RH * s);
  const a = Math.min(1.2, Math.max(0, (1 - 1 / z) / (1 - 1 / 1.5))) * 0.9;
  let cx = RW / 2 + (focusPx[0] - RW / 2) * a + ox * RW, cy = RH / 2 + (focusPx[1] - RH / 2) * a + oy * RH;
  const hw = RW / 2 / S, hh = RH / 2 / S, bx = hw * c + hh * s, by = hw * s + hh * c;
  cx = Math.min(Math.max(cx, bx), RW - bx); cy = Math.min(Math.max(cy, by), RH - by);
  camera.position.copy(basePos); camera.quaternion.copy(baseQuat); camera.rotateZ(th);
  camera.setViewOffset(RW, RH, cx - RW / (2 * S), cy - RH / (2 * S) - shiftPx, RW / S, RH / S);
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.copy(headWorld);
controls.enabled = false;
let shotCam = true;

// ---------------------------------------------------------------- canvas textures (procedural looks lost in glTF)
function canvasTex(w, h, draw, srgb = true) {
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h; draw(cv.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}
const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();  // deterministic
const brick = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#3b2a1e"; g.fillRect(0, 0, w, h);
  const rows = 8, bw = w / 2;
  for (let r = 0; r < rows; r++) for (let i = -1; i < 3; i++) {
    const x = i * bw + (r % 2) * bw / 2, y = r * h / rows, v = 0.75 + rnd() * 0.3;
    g.fillStyle = `rgb(${158 * v | 0},${122 * v | 0},${88 * v | 0})`; g.fillRect(x + 4, y + 4, bw - 8, h / rows - 8);
  }
});
const coffers = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = "#e3b04a"; g.fillRect(0, 0, w, h);
  const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.45);
  grd.addColorStop(0, "#8a1420"); grd.addColorStop(1, "#4a0a12"); g.fillStyle = grd; g.fillRect(34, 34, w - 68, h - 68);
  g.fillStyle = "#f0c460"; g.beginPath(); g.arc(w / 2, h / 2, 26, 0, 7); g.fill();
  g.strokeStyle = "#f0c460"; g.lineWidth = 5; g.beginPath(); g.arc(w / 2, h / 2, 62, 0, 7); g.stroke();
});
const glass = canvasTex(256, 512, (g, w, h) => {
  const pal = ["#1534d8", "#d81420", "#ffbf26", "#1a9a40", "#f27318", "#7a22c8"];
  for (let i = 0; i < 90; i++) { g.fillStyle = pal[(rnd() * pal.length) | 0]; const x = rnd() * w, y = rnd() * h, r = 18 + rnd() * 30;
    g.beginPath(); for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + rnd(); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
  g.strokeStyle = "#111"; g.lineWidth = 5;
  for (let i = 0; i < 70; i++) { g.beginPath(); g.moveTo(rnd() * w, rnd() * h); g.lineTo(rnd() * w, rnd() * h); g.stroke(); }
});
function worldUV(mesh, size) { // planar UVs from world position on the dominant face axis (walls, glass)
  const g = mesh.geometry, pos = g.attributes.position, nrm = g.attributes.normal, uv = new Float32Array(pos.count * 2), p = new THREE.Vector3(), n = new THREE.Vector3();
  const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); n.fromBufferAttribute(nrm, i).applyMatrix3(nm);
    const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
    const [u, v] = ax > ay && ax > az ? [p.z, p.y] : az > ay ? [p.x, p.y] : [p.x, p.z];
    uv[i * 2] = u / size; uv[i * 2 + 1] = v / size;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

// ---------------------------------------------------------------- castle
const gltf = await new GLTFLoader().loadAsync("assets/castle.glb");
const castle = gltf.scene;
castle.updateMatrixWorld(true);
const pickables = [];
const mergeGroups = new Map();
castle.traverse((o) => {
  if (!o.isMesh) return;
  const n = o.name;
  o.receiveShadow = true;
  o.castShadow = /Statue|Throne|Pillar|Plinth|Chest|Dais/.test(n);
  if (/^(BackWall|SideWall)/.test(n)) {
    o.material = o.material.clone(); worldUV(o, 3.0); o.material.map = brick; o.material.color.set(0xffffff); o.material.roughness = 0.85;
  } else if (/^Vault$/.test(n)) {
    o.material = o.material.clone(); o.material.map = coffers; coffers.repeat.set(14, 18); o.material.color.set(0xffffff);
    o.material.metalness = 0.35; o.material.roughness = 0.45; o.material.side = THREE.DoubleSide;
  } else if (/^Window_/.test(n)) {
    o.material = new THREE.MeshBasicMaterial({ map: glass, toneMapped: false, side: THREE.DoubleSide }); worldUV(o, 4.0);
  } else if (/^(Coin_|Floor_|ThroneStud_|Mullion|LampRod_|SpikeBall|ThroneCrown)/.test(n)) {
    const k = o.material.uuid; if (!mergeGroups.has(k)) mergeGroups.set(k, []); mergeGroups.get(k).push(o); return;
  }
  pickables.push(o);
});
// threejs-performance: hundreds of coins, floor tiles and studs become one draw call per material
for (const [, list] of mergeGroups) {
  if (list.length < 3) { pickables.push(...list); continue; }
  const geos = list.map((o) => { let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal") g.deleteAttribute(k);
    return g.applyMatrix4(o.matrixWorld); });
  const merged = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(geos), list[0].material);
  merged.name = `merged ${list[0].name.replace(/_\d.*$/, "")} x${list.length}`;
  merged.receiveShadow = true; merged.matrixAutoUpdate = false;
  for (const o of list) o.parent.remove(o);
  scene.add(merged); pickables.push(merged);
}
castle.traverse((o) => { o.matrixAutoUpdate = false; });      // static scenery: no per-frame matrix work
scene.add(castle);

// ---------------------------------------------------------------- Pion: the 2D engine render on a camera-facing plane
const video = Object.assign(document.createElement("video"), { src: "assets/pion.webm", muted: true, playsInline: true, preload: "auto", crossOrigin: "anonymous" });
await new Promise((ok) => { video.addEventListener("loadeddata", ok, { once: true }); video.load(); });
// a canvas copy of the current video frame: updates while paused and scrubbing too (VideoTexture only does while playing)
const pionCanvas = Object.assign(document.createElement("canvas"), { width: video.videoWidth, height: video.videoHeight });
const pionCtx = pionCanvas.getContext("2d");
const pionTex = new THREE.CanvasTexture(pionCanvas); pionTex.colorSpace = THREE.SRGBColorSpace;
function drawPion() { pionCtx.clearRect(0, 0, pionCanvas.width, pionCanvas.height); pionCtx.drawImage(video, 0, 0); pionTex.needsUpdate = true; }
// redraw whenever the decoder presents a frame (playing, or a seek while paused); 'seeked' as a fallback
if ("requestVideoFrameCallback" in video) video.requestVideoFrameCallback(function onFrame() { drawPion(); video.requestVideoFrameCallback(onFrame); });
video.addEventListener("seeked", drawPion);
drawPion();
const updatePion = () => {};
const [ew, eh] = timeline.engine_frame, vh = scene_json.pion.frame_vh * PS;
const pion = new THREE.Mesh(new THREE.PlaneGeometry(vh * ew / eh, vh),
  new THREE.MeshBasicMaterial({ map: pionTex, transparent: true, alphaTest: 0.02, toneMapped: false, depthWrite: false }));
pion.material.userData.outlineParameters = { visible: false };   // the engine already draws his ink
pion.position.set(0, scene_json.pion.frame_cy * PS, 0);
pion.castShadow = true;
pion.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: pionTex, alphaTest: 0.5 }); // his silhouette casts the shadow
pion.name = "Pion (2D)";
scene.add(pion); pickables.push(pion);

// ---------------------------------------------------------------- lights: one fixed rig, blended per mood (no shader recompiles)
const E = scene_json.emotions, LIGHTS = scene_json.lights;
const W2CD = 1 / (4 * Math.PI);                                  // Blender watts -> three candela (point/spot)
const col = (c) => new THREE.Color().setRGB(c[0], c[1], c[2]);
const rig = { torches: [], chand: null, hub: null, hemi: null, under: null, rim: null, top: null, chests: [], win: null, book: null };
for (const L of LIGHTS.filter((l) => l.name.startsWith("TorchLight"))) {
  const p = new THREE.PointLight(0xffaa66, 0, 0, 2); p.position.copy(B2T(L.pos)); scene.add(p); rig.torches.push(p);
}
const hubL = LIGHTS.find((l) => l.name === "ChandHub");
const hubPos = hubL ? B2T(hubL.pos) : new THREE.Vector3(0, 16, -7.5);
rig.hub = new THREE.SpotLight(0xffaa55, 0, 0, THREE.MathUtils.degToRad(55), 0.7, 2);
rig.hub.position.copy(hubPos); rig.hub.target.position.set(hubPos.x, 0, hubPos.z); scene.add(rig.hub, rig.hub.target);
rig.hub.castShadow = true; rig.hub.shadow.mapSize.set(1024, 1024); rig.hub.shadow.bias = -0.0005;
rig.chand = new THREE.PointLight(0xffaa55, 0, 0, 2); rig.chand.position.copy(hubPos).add(new THREE.Vector3(0, -0.8, 0)); scene.add(rig.chand);
rig.hemi = new THREE.HemisphereLight(0xffaa66, 0x120a06, 0); scene.add(rig.hemi);
const spotAt = (bp, aim = headWorld) => { const s = new THREE.SpotLight(0xffffff, 0, 0, THREE.MathUtils.degToRad(30), 0.6, 2);
  s.position.copy(B2T(bp)); s.target.position.copy(aim); scene.add(s, s.target); return s; };
rig.under = spotAt([0, -3.2, 0.25]);
rig.rim = spotAt([1.5, 3.2 * PS, 5.5 * PS]);
rig.top = spotAt([0, -1.5, 15]);
rig.win = spotAt([-scene_json.room.x + 0.4, 3.5, 9.7], B2T([0.4, -0.3, 1.8]));
for (const x of [-6.2, 6.0]) { const p = new THREE.PointLight(0xffaa33, 0, 0, 2); p.position.copy(B2T([x, 17.5, 1.9])); scene.add(p); rig.chests.push(p); }
rig.book = new THREE.PointLight(0xffc860, 0, 0, 2); rig.book.position.copy(B2T([0.52 * PS, -1.45 * PS, 1.85 * PS])); scene.add(rig.book);

function moodParams(name) { // build_castle.EMOTIONS -> rig values
  const m = E[name] || E.hangat, room = m.room || [0.35, [1, 0.62, 0.32]];
  const v = { torch: [col(room[1]), 1400 * room[0] * W2CD], hub: [col(m.chand), m.hub * W2CD * 2.6], chand: [col(m.chand), 700 * 8 * m.k * W2CD * 0.45],
    hemi: [col(room[1]), 0.12 + room[0] * 0.55], under: [new THREE.Color(), 0], rim: [new THREE.Color(), 0], top: [new THREE.Color(), 0],
    chests: [new THREE.Color(), 0], win: [new THREE.Color(), 0], book: [new THREE.Color(), 0] };
  if (m.under) v.under = [col(m.under[0]), m.under[1] * W2CD * 4];
  if (m.rim) v.rim = [col(m.rim[0]), m.rim[1] * W2CD * 4];
  if (m.top) v.top = [col(m.top[0]), m.top[1] * 10 * W2CD];
  if (m.chests) v.chests = [col(m.chests[0]), m.chests[1] * W2CD];
  if (m.window) v.win = [col(m.window[1]), m.window[2] * W2CD * 0.02];
  if (m.book) v.book = [col(m.book[0]), m.book[1] * W2CD * 0.25];
  return v;
}
function applyMoods(weights) {
  const acc = {};
  for (const [name, w] of Object.entries(weights)) {
    const v = moodParams(name);
    for (const k in v) { acc[k] = acc[k] || [new THREE.Color(0, 0, 0), 0]; acc[k][0].add(v[k][0].clone().multiplyScalar(w * v[k][1])); acc[k][1] += w * v[k][1]; }
  }
  const set = (light, k) => { const [c, i] = acc[k]; light.intensity = i; if (i > 1e-4) light.color.copy(c).multiplyScalar(1 / i); };
  rig.torches.forEach((l) => set(l, "torch")); set(rig.hub, "hub"); set(rig.chand, "chand"); set(rig.hemi, "hemi");
  set(rig.under, "under"); set(rig.rim, "rim"); set(rig.top, "top"); rig.chests.forEach((l) => set(l, "chests")); set(rig.win, "win"); set(rig.book, "book");
}

// ---------------------------------------------------------------- timeline: cues -> moods + camera plan
const segs = timeline.segs, fps = timeline.fps, dur = timeline.frames / fps;
const P = CP.parseCues(cuesTxt);
if (!P.az.length) P.az = [{ t: 0, every: 3, amt: 1 }];
const keys = CP.planCamera(P);
function moodWeights(t) {
  let w = { [segs[0][1]]: 1 };
  for (let i = 1; i < segs.length; i++) { const [t0, m] = segs[i]; if (t < t0) break;
    let u = Math.min(1, (t - t0) / 0.5); u = u * u * (3 - 2 * u);
    for (const k in w) w[k] *= 1 - u; w[m] = (w[m] || 0) + u; }
  return w;
}
const segBar = $("segs"), moodColor = { hangat: "#e08a2c", marah: "#d0281e", sedih: "#4f7ad8", kaget: "#f2efe4", licik: "#36c26a", duit: "#e8c040", misteri: "#8a62e0", pencerahan: "#ffd27a" };
segs.forEach(([t0, m], i) => { const t1 = i + 1 < segs.length ? segs[i + 1][0] : dur, d = document.createElement("div");
  d.style.left = `${t0 / dur * 100}%`; d.style.width = `${(t1 - t0) / dur * 100}%`; d.style.background = moodColor[m] || "#888"; d.title = m; segBar.appendChild(d); });
for (const m of Object.keys(E)) { const o = document.createElement("option"); o.value = o.textContent = m; $("moodSel").appendChild(o); }

// ---------------------------------------------------------------- transport
const audio = new Audio("assets/audio.mp3");
let playing = false, scrubT = 0;
const now = () => (playing ? audio.currentTime : scrubT);
$("play").onclick = async () => {
  playing = !playing; $("play").textContent = playing ? "❚❚ Pause" : "▶ Play";
  if (playing) { audio.currentTime = scrubT; video.currentTime = scrubT; await Promise.all([audio.play(), video.play()]); }
  else { audio.pause(); video.pause(); scrubT = audio.currentTime; }
};
audio.onended = () => { playing = false; $("play").textContent = "▶ Play"; video.pause(); scrubT = 0; };
$("scrub").oninput = (e) => { scrubT = +e.target.value * dur; if (playing) { audio.currentTime = scrubT; } video.currentTime = scrubT; };
$("shot").onclick = () => { shotCam = true; controls.enabled = false; $("shot").classList.add("on"); $("free").classList.remove("on"); };
$("free").onclick = () => { shotCam = false; setBaseCamera(); camera.clearViewOffset(); controls.enabled = true; controls.target.copy(headWorld); controls.update();
  $("free").classList.add("on"); $("shot").classList.remove("on"); };
$("ink").onclick = () => { useInk = !useInk; $("ink").classList.toggle("on", useInk); };
$("exp").oninput = (e) => { renderer.toneMappingExposure = +e.target.value; };

// threejs-interaction: click (not drag) to name what is under the pointer
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener("pointerdown", (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  $("pick").textContent = hit ? hit.object.name : "-";
});

// ---------------------------------------------------------------- layout + loop
function fit() {
  const st = $("stage").getBoundingClientRect(), k = Math.min(st.width / RW, st.height / RH);
  renderer.setSize(Math.floor(RW * k), Math.floor(RH * k));
}
window.addEventListener("resize", fit); fit();
await renderer.compileAsync(scene, camera);                         // no first-frame shader stalls

const timer = new THREE.Timer(); timer.connect(document);
let fpsAcc = 0, fpsN = 0, fpsShow = 0;
const flat = new THREE.Vector3();
const STILL = new URLSearchParams(location.search).has("still");   // tests: render one frame on demand (software GL)
function frame(dt, tOverride) {
  const t = Math.min(tOverride ?? now(), dur);
  if (playing && Math.abs(video.currentTime - t) > 0.08) video.currentTime = t;
  $("scrub").value = String(t / dur);
  $("time").textContent = `${t.toFixed(2)} / ${dur.toFixed(2)}`;
  const forced = $("moodSel").value, w = forced ? { [forced]: 1 } : moodWeights(t);
  applyMoods(w);
  updatePion();
  $("mood").textContent = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
  const c = CP.sampleCam(keys, t, 1);
  if (shotCam) applyShot(c.z, c.ox, c.oy, c.roll); else controls.update(dt);
  $("zoom").textContent = `${c.z.toFixed(2)}x`;
  flat.set(camera.position.x, pion.position.y, camera.position.z);       // cylindrical billboard: he stays upright on the floor
  pion.lookAt(flat);
  (useInk ? ink : renderer).render(scene, camera);
  fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { fpsShow = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; }
  $("stats").textContent = `${fpsShow.toFixed(0)} fps · ${renderer.info.render.calls} draw calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris`;
}
if (STILL) {
  window.__renderAt = async (t) => { video.currentTime = t; await new Promise((ok) => video.addEventListener("seeked", ok, { once: true }));
    await video.play().catch(() => {}); await new Promise((ok) => setTimeout(ok, 60)); video.pause(); video.currentTime = t;   // headless: force a decode
    await new Promise((ok) => video.addEventListener("seeked", ok, { once: true })); drawPion();
    frame(0, t); return renderer.info.render.calls; };
} else renderer.setAnimationLoop(() => { timer.update(); frame(timer.getDelta()); });
window.__studioReady = true;
