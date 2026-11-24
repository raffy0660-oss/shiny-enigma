// ================================================================ THE THIEF: a pawn (same size as Pion) as an unrevealed black shadow, on a rope from the ceiling hook.
// Built in 3D (not a 2D card) because the reference move turns him over: upright -> leaning back flat -> upside down -> upright again.
// F.thief = { pos (harness point, world), yaw, pitch, roll (rad), handL, handR (local to the harness, +z = his front), grip (0..1 hands on the panel),
//             panelK (0..1 the painting from its frame to his hands), tail (rope tail length), sway }
const THIEF = new THREE.Group(); scene.add(THIEF); THIEF.visible = false;
// v2 (user: "make him just a black shadow, not black clothes; not revealed yet", ref: anime culprit silhouettes): flat blue-black body,
// a crisp cool rim on the lit side, white eyes with small grey irises and a thin grin, no costume details (no hat, no colours)
const SHADOW = new THREE.ShaderMaterial({ uniforms: { base: { value: new THREE.Color(0x07080f) }, rim: { value: new THREE.Color(0x7c8cb4) }, rimK: { value: 1.0 } },
  vertexShader: `varying vec3 vN, vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
  fragmentShader: `uniform vec3 base, rim; uniform float rimK; varying vec3 vN, vV;
    void main(){ vec3 n = normalize(vN); float f = 1.0 - max(dot(n, normalize(vV)), 0.0);
      float side = smoothstep(-0.2, 0.6, dot(n, normalize(vec3(0.55, 0.65, 0.2))));          // the rim only on the side the light comes from
      float edge = smoothstep(0.58, 0.72, f) * side;                                          // crisp anime edge line
      float soft = pow(f, 3.0) * 0.25;
      vec3 c = base * (0.9 + 0.25 * n.y) + rim * (edge * 0.85 + soft) * rimK;
      gl_FragColor = vec4(c, 1.0); }` });
{ const B = new THREE.Group(); B.position.y = -0.42; THIEF.add(B);
  const prof = [[0, 0], [0.29, 0], [0.3, 0.04], [0.28, 0.07], [0.24, 0.09], [0.25, 0.13], [0.19, 0.16], [0.15, 0.25], [0.125, 0.38], [0.12, 0.48], [0.2, 0.52], [0.21, 0.555], [0.16, 0.585], [0.09, 0.6], [0, 0.6]].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(prof, 40), SHADOW, 0, 0, 0, { parent: B });
  add(new THREE.SphereGeometry(0.255, 36, 24), SHADOW, 0, 0.82, 0, { parent: B });
  const faceT = canvasTex(1024, 384, (g, w, h) => { g.clearRect(0, 0, w, h);
    for (const s of [-1, 1]) { const cx = w / 2 + s * 88, cy = h * 0.46;
      g.save(); g.translate(cx, cy); g.rotate(s * 0.22); g.fillStyle = "#f4f6fb"; g.beginPath(); g.moveTo(-60, 4); g.quadraticCurveTo(0, -46, 60, 4); g.quadraticCurveTo(0, 34, -60, 4); g.fill();   // almond eye, tilted up at the outside
      g.fillStyle = "#8a93a8"; g.beginPath(); g.arc(-s * 8, 2, 13, 0, 7); g.fill(); g.fillStyle = "#1a1c24"; g.beginPath(); g.arc(-s * 8, 2, 5, 0, 7); g.fill(); g.restore(); }   // small grey iris
    g.fillStyle = "#e8ecf4"; g.beginPath(); g.moveTo(w / 2 - 74, h * 0.74); g.quadraticCurveTo(w / 2, h * 0.86, w / 2 + 80, h * 0.7); g.quadraticCurveTo(w / 2, h * 0.8, w / 2 - 74, h * 0.74); g.fill(); });   // thin grin
  faceT.wrapS = faceT.wrapT = THREE.ClampToEdgeWrapping;
  THIEF.userData.face = add(new THREE.SphereGeometry(0.259, 48, 16, Math.PI / 2 - 1.25, 2.5, Math.PI / 2 - 0.62, 1.05), new THREE.MeshBasicMaterial({ map: faceT, transparent: true, toneMapped: false, fog: false, color: 0xe8ecf4, polygonOffset: true, polygonOffsetFactor: -2 }), 0, 0.82, 0, { parent: B, cast: false });
  add(new THREE.TorusGeometry(0.135, 0.018, 10, 32), SHADOW, 0, 0.42, 0, { parent: B, rx: Math.PI / 2 });                         // a harness, part of the silhouette
  THIEF.userData.arms = [-1, 1].map(s => { const up = add(new THREE.CylinderGeometry(0.042, 0.04, 1, 10), SHADOW, 0, 0, 0, { parent: THIEF }), lo = add(new THREE.CylinderGeometry(0.04, 0.036, 1, 10), SHADOW, 0, 0, 0, { parent: THIEF });
    const hand = add(new THREE.SphereGeometry(0.068, 16, 12), SHADOW, 0, 0, 0, { parent: THIEF }); return { s, up, lo, hand, sh: V(s * 0.17, 0.1, 0.0) }; });
}
const ROPE = add(new THREE.CylinderGeometry(0.011, 0.011, 1, 8, 1), mat({ color: 0x1a1c24, roughness: 0.6 }), 0, 0, 0, { cast: true }); ROPE.visible = false;
const ROPETAIL = add(new THREE.CylinderGeometry(0.011, 0.011, 1, 8, 1), ROPE.material, 0, 0, 0); ROPETAIL.visible = false;
const STOLEN = add(new THREE.BoxGeometry(MONA.W, MONA.H, 0.018), GALLERY.canvas.material, 0, 0, 0); STOLEN.visible = false;
const _up = V(0, 1, 0);
function segment(mesh, a, b) { const d = b.clone().sub(a), L = d.length(); mesh.position.copy(a).addScaledVector(d, 0.5); mesh.scale.set(1, Math.max(L, 1e-3), 1); mesh.quaternion.setFromUnitVectors(_up, d.normalize()); }
function placeThief(T) {
  THIEF.visible = !!T; ROPE.visible = !!T && T.rope !== false; ROPETAIL.visible = !!T && T.rope !== false && (T.tail ?? 0) > 0.05; STOLEN.visible = false;
  if (!T) return;
  THIEF.position.set(...T.pos); THIEF.rotation.set(0, 0, 0); THIEF.rotation.order = "YXZ"; THIEF.rotation.set(T.pitch || 0, T.yaw || 0, T.roll || 0); THIEF.updateMatrixWorld(true);
  // the painting: from its place in the frame to his hands (held in front of his chest, picture toward him)
  const pk = Math.max(0, Math.min(1, T.panelK || 0)); let panelLocal = null;
  if (pk > 0) { GALLERY.canvas.updateMatrixWorld(true); const p0 = new THREE.Vector3(), q0 = new THREE.Quaternion(); GALLERY.canvas.getWorldPosition(p0); GALLERY.canvas.getWorldQuaternion(q0);
    const hold = new THREE.Object3D(); hold.position.set(0, 0.02, 0.34); hold.rotation.set(0.25, Math.PI, 0); THIEF.add(hold); hold.updateMatrixWorld(true);
    const p1 = new THREE.Vector3(), q1 = new THREE.Quaternion(); hold.getWorldPosition(p1); hold.getWorldQuaternion(q1); THIEF.remove(hold);
    const e = pk * pk * (3 - 2 * pk); STOLEN.position.copy(p0.lerp(p1, e)); STOLEN.position.addScaledVector(V(0, 0, 1), Math.sin(Math.PI * e) * 0.12); STOLEN.quaternion.copy(q0.slerp(q1, e)); STOLEN.visible = true; STOLEN.updateMatrixWorld(true);
    panelLocal = THIEF.worldToLocal(STOLEN.position.clone()); }
  // arms
  const gk = Math.max(0, Math.min(1, T.grip || 0));
  for (const A of THIEF.userData.arms) { let hnd = V(...((A.s < 0 ? T.handL : T.handR) || [A.s * 0.26, -0.05, 0.12]));
    if (panelLocal && gk > 0) { const edge = THIEF.worldToLocal(STOLEN.localToWorld(V(A.s * MONA.W * 0.5 * -1, 0, 0))); hnd.lerp(edge, gk); }
    const sh = A.sh.clone(), mid = sh.clone().lerp(hnd, 0.5); const len = sh.distanceTo(hnd), bend = Math.max(0, 0.42 - len) * 0.6 + 0.03;
    mid.add(V(A.s * bend, -bend * 0.6, -bend * 0.4)); segment(A.up, sh, mid); segment(A.lo, mid, hnd); A.hand.position.copy(hnd); }
  // rope from the eye bolt to the carabiner, and its loose tail hanging below him
  const hookP = V(HOOK[0], HOOK[1] - 0.15, HOOK[2]), carab = THIEF.localToWorld(V(0, 0, 0.16)); segment(ROPE, hookP, carab);
  const tl = T.tail ?? 0, sw = T.sway || 0; segment(ROPETAIL, carab, carab.clone().add(V(0.08 * Math.sin(sw), -tl, 0.06 * Math.cos(sw * 1.3))));
}
