// ================================================================ MUSEUM: three locations in one scene (x offsets), sized for Pion (1.03 m)
//   gallery    x = 0   the Mona Lisa hall (v2: parquet, teal damask, navy coffers, chandeliers, salon paintings, statues, the thief rig),
//                      the painting on a freestanding wall behind a glass case, brass stanchions, benches, other paintings, dome cameras,
//                      the ceiling hook right above the painting (+ the scrap of black fabric), the staff door, the entrance arch
//   corridor   x = 30  the service corridor: dusty concrete, drop ceiling with the access hatch, two trails of footprints, keycard door
//   security   x = 60  the security room: wall of CCTV monitors (live / NO SIGNAL), the maintenance terminal with the access log
// The user's reference (createMuseumScene) kept: warm beige walls + dark-gold panel frames, gold pilasters, marble floor, dark ceiling,
// the painting in a gold frame behind glass, the hook above it, warm spot on the painting + warm wall lights. Changed for our style:
// real scale (the reference wall was 12 m high, the painting 3.4 m), a closed room the camera can turn around in, the actual (drawn) painting,
// a glass CASE (it is opened / smashed in the story), our render chain (AgX, GTAO, ink lines, bokeh, bloom, grade) and charlayer for Pion.
const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.2;   // gold + brass need something to reflect
const GOLD = mat({ color: 0xc49a46, metalness: 0.85, roughness: 0.28 }), DGOLD = mat({ color: 0x7a5522, metalness: 0.7, roughness: 0.35 });
const BRASS = mat({ color: 0xc8a050, metalness: 0.9, roughness: 0.25 }), BRONZE = mat({ color: 0x2c241c, metalness: 0.6, roughness: 0.4 });
const INKC = "#2a1a0e";
// light shafts v2 (user: "the light lines must be clear, not faint, but still with a gradient, not just straight"):
// a crisp cone edge, a bright core that fades from the source to the floor, fine angular streaks (dust / lens rays) that drift, a pool on the floor
function beamMat(col, op) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false,
    uniforms: { col: { value: new THREE.Color(col) }, op: { value: op }, k: { value: 1 }, time: { value: 0 }, seed: { value: Math.random() * 10 } },
    vertexShader: `varying vec2 vUv; varying vec3 vN, vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 col; uniform float op, k, time, seed; varying vec2 vUv; varying vec3 vN, vV;
      float h(float x){ return fract(sin(x * 91.7 + seed) * 43758.5); }
      float n1(float x){ float i = floor(x), f = fract(x); return mix(h(i), h(i + 1.0), f * f * (3.0 - 2.0 * f)); }
      void main(){
        float e = abs(dot(normalize(vN), normalize(vV)));                  // 1 = middle of the cone as seen, 0 = its silhouette
        float edge = smoothstep(0.02, 0.16, e);                             // a defined border (not a smear)
        float core = 0.42 + 0.58 * pow(e, 1.6);                             // brighter core, still lit to the edge
        float along = pow(vUv.y, 1.35) * smoothstep(0.0, 0.08, vUv.y) * (0.35 + 0.65 * smoothstep(1.0, 0.9, vUv.y) + 0.0);   // source -> floor
        float a0 = vUv.x * 6.2831853;
        float streak = 0.72 + 0.28 * n1(vUv.x * 48.0 + time * 0.15) + 0.18 * n1(vUv.x * 13.0 - time * 0.07) - 0.12 * n1(vUv.x * 90.0);   // rays
        float a = op * k * edge * core * along * streak;
        gl_FragColor = vec4(col * a, a); }` }); }
function beam(from, to, r0, r1, col, op) {   // cone from the source (r0) to the floor (r1)
  const d = V(...to).sub(V(...from)), L = d.length(), g = new THREE.CylinderGeometry(r0, r1, L, 48, 1, true); g.translate(0, -L / 2, 0);
  const m = new THREE.Mesh(g, beamMat(col, op)); m.position.set(...from); m.quaternion.setFromUnitVectors(V(0, -1, 0), d.normalize()); m.renderOrder = 10; scene.add(m);
  m.userData.isBeam = true; return m; }
const poolTex = canvasTex(256, 256, (g, w, h) => { const q = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); q.addColorStop(0, "rgba(255,255,255,0.95)"); q.addColorStop(0.55, "rgba(255,255,255,0.45)"); q.addColorStop(0.85, "rgba(255,255,255,0.12)"); q.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = q; g.fillRect(0, 0, w, h); });
poolTex.wrapS = poolTex.wrapT = THREE.ClampToEdgeWrapping;
function pool(x, y, z, rx, rz, col, op) {   // the bright ellipse where a beam lands (additive decal)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rx * 2, rz * 2), new THREE.MeshBasicMaterial({ map: poolTex, color: new THREE.Color(col), transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -3 }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 4; scene.add(m); m.userData.isBeam = true; return m; }
const glowMat = (col, k = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), toneMapped: false, fog: false });
function framedShape(ow, oh, iw, ih, r = 0) { const s = new THREE.Shape(); s.moveTo(-ow / 2, -oh / 2); s.lineTo(ow / 2, -oh / 2); s.lineTo(ow / 2, oh / 2); s.lineTo(-ow / 2, oh / 2); s.lineTo(-ow / 2, -oh / 2);
  const h = new THREE.Path(); h.moveTo(-iw / 2, -ih / 2); h.lineTo(-iw / 2, ih / 2); h.lineTo(iw / 2, ih / 2); h.lineTo(iw / 2, -ih / 2); h.lineTo(-iw / 2, -ih / 2); s.holes.push(h); return s; }
// ornate picture frame: two bevelled extrusions (outer moulding + inner slip), local XY = picture plane, +z toward the viewer
function pictureFrame(parent, w, h, fw = 0.12, depth = 0.06) {
  const G = new THREE.Group(); parent.add(G);
  const outer = new THREE.ExtrudeGeometry(framedShape(w + 2 * fw, h + 2 * fw, w + 0.02, h + 0.02), { depth, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.03, bevelSegments: 3, curveSegments: 4 });
  const m1 = new THREE.Mesh(outer, GOLD); m1.castShadow = m1.receiveShadow = true; G.add(m1);
  const inner = new THREE.ExtrudeGeometry(framedShape(w + 0.05, h + 0.05, w, h), { depth: depth + 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 2 });
  const m2 = new THREE.Mesh(inner, DGOLD); m2.receiveShadow = true; G.add(m2);
  for (const [x, y] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const k = new THREE.Mesh(new THREE.SphereGeometry(fw * 0.32, 12, 8), GOLD); k.position.set(x * (w / 2 + fw * 0.55), y * (h / 2 + fw * 0.55), depth + 0.02); k.scale.z = 0.5; G.add(k); }   // corner ornaments
  return G; }
function catenary(a, b, sag, r, m, seg = 24) { const pts = []; for (let i = 0; i <= seg; i++) { const u = i / seg; pts.push(V(lerp(a[0], b[0], u), lerp(a[1], b[1], u) - sag * 4 * u * (1 - u), lerp(a[2], b[2], u))); }
  const me = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, 8), m); me.castShadow = true; scene.add(me); return me; }
// the wall-wash glow above a lit painting: additive radial plane (cheaper than one spotlight per painting under swiftshader)
const washTex = canvasTex(256, 256, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.15, 4, w / 2, h * 0.45, w * 0.55); gr.addColorStop(0, "rgba(255,214,150,0.85)"); gr.addColorStop(0.5, "rgba(255,190,120,0.3)"); gr.addColorStop(1, "rgba(255,180,110,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
washTex.wrapS = washTex.wrapT = THREE.ClampToEdgeWrapping;
const washMat = new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false, opacity: 0.55 });

// ---------------------------------------------------------------- drawn paintings
function monaLisaTex() { return canvasTex(768, 1116, (g, w, h) => {   // drawn homage (curves, soft shading, thin warm ink): sfumato landscape, the sitter, folded hands, the smile
  const X = v => v * w, Y = v => v * h;
  const lin = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(X(x0), Y(y0), X(x1), Y(y1)); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
  const rad = (x, y, r0, r1, stops) => { const q = g.createRadialGradient(X(x), Y(y), X(r0), X(x), Y(y), X(r1)); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
  const path = (cmds) => { g.beginPath(); for (const c of cmds) { const [op, ...a] = c; const p = a.map((v, i) => i % 2 ? Y(v) : X(v)); if (op === "M") g.moveTo(...p); else if (op === "L") g.lineTo(...p); else if (op === "Q") g.quadraticCurveTo(...p); else g.bezierCurveTo(...p); } g.closePath(); };
  const fillInk = (fill, lw = 2.6) => { g.fillStyle = fill; g.fill(); g.strokeStyle = "rgba(42,22,8,.78)"; g.lineWidth = lw; g.stroke(); };
  // landscape layer, blurred (sfumato)
  const L = document.createElement("canvas"); L.width = w; L.height = h; const l = L.getContext("2d");
  let q = l.createLinearGradient(0, 0, 0, h * 0.62); q.addColorStop(0, "#9db29a"); q.addColorStop(0.45, "#cbc79e"); q.addColorStop(1, "#a0976a"); l.fillStyle = q; l.fillRect(0, 0, w, h);
  const crag = (pts, c) => { l.beginPath(); l.moveTo(X(pts[0][0]), Y(pts[0][1])); for (let i = 1; i < pts.length; i++) { const [x, y] = pts[i], [px, py] = pts[i - 1]; l.quadraticCurveTo(X((px + x) / 2 + 0.01), Y(Math.min(py, y) - 0.015), X(x), Y(y)); } l.lineTo(X(pts[pts.length - 1][0]), Y(0.8)); l.lineTo(X(pts[0][0]), Y(0.8)); l.closePath(); l.fillStyle = c; l.fill(); };
  crag([[0, 0.4], [0.06, 0.3], [0.11, 0.34], [0.17, 0.26], [0.24, 0.33], [0.34, 0.37]], "#7c9488"); crag([[0.66, 0.33], [0.74, 0.21], [0.8, 0.26], [0.87, 0.15], [0.94, 0.22], [1, 0.18]], "#748b84");
  crag([[0, 0.5], [0.12, 0.44], [0.34, 0.49]], "#8a845a"); crag([[0.66, 0.46], [0.84, 0.39], [1, 0.43]], "#878153");
  l.fillStyle = "#c4caae"; l.beginPath(); l.ellipse(X(0.86), Y(0.345), X(0.12), Y(0.022), 0, 0, 7); l.fill();
  l.strokeStyle = "#cfb57c"; l.lineWidth = 12; l.beginPath(); l.moveTo(X(0.02), Y(0.66)); l.bezierCurveTo(X(0.22), Y(0.58), X(0.04), Y(0.52), X(0.22), Y(0.46)); l.stroke();
  l.strokeStyle = "#5e5034"; l.lineWidth = 6; l.beginPath(); l.moveTo(X(0.78), Y(0.505)); l.lineTo(X(0.96), Y(0.505)); l.stroke(); for (const x of [0.81, 0.86, 0.91]) { l.beginPath(); l.arc(X(x), Y(0.526), X(0.022), Math.PI, 0); l.stroke(); }
  g.filter = "blur(5px)"; g.drawImage(L, 0, 0); g.filter = "none";
  // dress (sloping shoulders, turned a little to her right)
  path([["M", 0.08, 1], ["C", 0.1, 0.8, 0.16, 0.62, 0.3, 0.56], ["Q", 0.38, 0.52, 0.45, 0.5], ["L", 0.57, 0.5], ["Q", 0.66, 0.52, 0.73, 0.57], ["C", 0.84, 0.63, 0.9, 0.8, 0.93, 1]]);
  fillInk(lin(0.3, 0.5, 0.7, 1, [[0, "#3c2d18"], [0.45, "#231910"], [1, "#110b05"]]), 3);
  // neck + chest + neckline with embroidery
  path([["M", 0.448, 0.43], ["L", 0.44, 0.5], ["Q", 0.38, 0.53, 0.33, 0.57], ["Q", 0.5, 0.645, 0.67, 0.57], ["Q", 0.62, 0.53, 0.562, 0.5], ["L", 0.556, 0.43]]);
  fillInk(lin(0.5, 0.45, 0.5, 0.63, [[0, "#b98248"], [0.35, "#e4b072"], [1, "#cf985a"]]), 2.2);
  g.strokeStyle = "#b08a48"; g.lineWidth = 3; g.beginPath(); g.moveTo(X(0.33), Y(0.572)); g.quadraticCurveTo(X(0.5), Y(0.648), X(0.67), Y(0.572)); g.stroke();
  g.setLineDash([3, 5]); g.strokeStyle = "#dcbc7c"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0.34), Y(0.58)); g.quadraticCurveTo(X(0.5), Y(0.655), X(0.66), Y(0.58)); g.stroke(); g.setLineDash([]);
  // sleeves (golden brown, folds) + hands (right over left)
  path([["M", 0.15, 0.86], ["C", 0.18, 0.76, 0.3, 0.72, 0.42, 0.75], ["Q", 0.55, 0.77, 0.7, 0.735], ["C", 0.82, 0.72, 0.9, 0.8, 0.88, 0.88], ["Q", 0.7, 0.95, 0.5, 0.93], ["Q", 0.3, 0.95, 0.15, 0.86]]);
  fillInk(lin(0.2, 0.72, 0.8, 0.94, [[0, "#6a4a22"], [0.35, "#9e7638"], [0.6, "#7c5828"], [1, "#4e3418"]]), 3);
  for (let i = 0; i < 12; i++) { const x = 0.21 + i * 0.053; g.strokeStyle = i % 2 ? "rgba(50,30,10,.45)" : "rgba(225,175,95,.35)"; g.lineWidth = 4; g.beginPath(); g.moveTo(X(x), Y(0.765)); g.quadraticCurveTo(X(x + 0.025), Y(0.83), X(x - 0.01), Y(0.915)); g.stroke(); }
  path([["M", 0.3, 0.85], ["Q", 0.36, 0.82, 0.45, 0.835], ["Q", 0.52, 0.86, 0.48, 0.885], ["Q", 0.4, 0.905, 0.31, 0.885], ["Q", 0.28, 0.87, 0.3, 0.85]]);
  fillInk(lin(0.3, 0.83, 0.5, 0.9, [[0, "#c88c50"], [1, "#a8723c"]]));
  path([["M", 0.44, 0.815], ["Q", 0.55, 0.78, 0.66, 0.8], ["Q", 0.72, 0.82, 0.69, 0.85], ["Q", 0.6, 0.875, 0.5, 0.868], ["Q", 0.43, 0.85, 0.44, 0.815]]);
  fillInk(lin(0.44, 0.79, 0.7, 0.87, [[0, "#efbc7c"], [0.6, "#d89e5e"], [1, "#b47a40"]]));
  g.strokeStyle = "rgba(95,52,22,.6)"; g.lineWidth = 2; for (const x of [0.57, 0.605, 0.64]) { g.beginPath(); g.moveTo(X(x), Y(0.8)); g.quadraticCurveTo(X(x + 0.015), Y(0.83), X(x + 0.01), Y(0.86)); g.stroke(); }
  // hair: soft dark mass falling to the shoulders, parted in the middle, a few lighter strands
  path([["M", 0.395, 0.54], ["C", 0.37, 0.42, 0.355, 0.24, 0.42, 0.185], ["Q", 0.5, 0.15, 0.585, 0.185], ["C", 0.65, 0.24, 0.635, 0.42, 0.61, 0.54], ["Q", 0.66, 0.565, 0.695, 0.555], ["C", 0.7, 0.42, 0.69, 0.2, 0.6, 0.145], ["Q", 0.5, 0.11, 0.4, 0.145], ["C", 0.31, 0.2, 0.3, 0.42, 0.31, 0.555], ["Q", 0.35, 0.565, 0.395, 0.54]]);
  fillInk(lin(0.3, 0.12, 0.7, 0.56, [[0, "#3e2915"], [0.5, "#26180b"], [1, "#150d06"]]), 2.8);
  g.strokeStyle = "rgba(130,90,45,.4)"; g.lineWidth = 2; for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = 0.5 + s * (0.12 + i * 0.012); g.beginPath(); g.moveTo(X(x), Y(0.2)); g.bezierCurveTo(X(x + s * 0.04), Y(0.3), X(x + s * 0.03), Y(0.45), X(x + s * 0.035), Y(0.55)); g.stroke(); }
  // face: rounder oval, warm light from her right, shadowed far cheek, soft eyes without brows, the smile
  g.save(); g.beginPath(); g.ellipse(X(0.5), Y(0.315), X(0.1), Y(0.128), 0.03, 0, 7); g.clip();
  g.fillStyle = rad(0.47, 0.28, 0.02, 0.17, [[0, "#f8d394"], [0.55, "#e4b071"], [1, "#b47e44"]]); g.fillRect(0, 0, w, h);
  g.fillStyle = rad(0.6, 0.36, 0.0, 0.09, [[0, "rgba(130,75,35,.3)"], [1, "rgba(130,75,35,0)"]]); g.fillRect(0, 0, w, h); g.restore();
  g.beginPath(); g.ellipse(X(0.5), Y(0.315), X(0.1), Y(0.128), 0.03, 0, 7); g.strokeStyle = "rgba(42,22,8,.8)"; g.lineWidth = 2.8; g.stroke();
  g.fillStyle = "rgba(60,40,20,.16)"; g.beginPath(); g.moveTo(X(0.37), Y(0.205)); g.quadraticCurveTo(X(0.5), Y(0.14), X(0.635), Y(0.205)); g.lineTo(X(0.63), Y(0.218)); g.quadraticCurveTo(X(0.5), Y(0.158), X(0.375), Y(0.218)); g.fill();   // veil
  for (const x of [0.457, 0.55]) { g.fillStyle = "rgba(150,90,50,.3)"; g.beginPath(); g.ellipse(X(x), Y(0.296), X(0.036), Y(0.017), 0, 0, 7); g.fill();
    g.fillStyle = "#f6ead4"; g.beginPath(); g.ellipse(X(x), Y(0.3), X(0.022), Y(0.0095), 0, 0, 7); g.fill();
    g.fillStyle = "#4a2c12"; g.beginPath(); g.arc(X(x + 0.006), Y(0.301), X(0.0095), 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(X(x + 0.01), Y(0.298), X(0.0028), 0, 7); g.fill();
    g.strokeStyle = "rgba(42,22,8,.8)"; g.lineWidth = 2.4; g.beginPath(); g.ellipse(X(x), Y(0.3), X(0.024), Y(0.0105), 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  g.strokeStyle = "rgba(120,70,35,.5)"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(X(0.508), Y(0.305)); g.quadraticCurveTo(X(0.494), Y(0.345), X(0.514), Y(0.355)); g.stroke();
  g.fillStyle = "rgba(205,115,80,.18)"; for (const x of [0.445, 0.57]) { g.beginPath(); g.arc(X(x), Y(0.345), X(0.028), 0, 7); g.fill(); }
  g.strokeStyle = "#8a4428"; g.lineWidth = 3.2; g.beginPath(); g.moveTo(X(0.47), Y(0.383)); g.bezierCurveTo(X(0.492), Y(0.391), X(0.52), Y(0.391), X(0.543), Y(0.379)); g.stroke();
  g.strokeStyle = "rgba(138,68,40,.4)"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0.488), Y(0.397)); g.quadraticCurveTo(X(0.506), Y(0.402), X(0.525), Y(0.396)); g.stroke();
  // varnish, craquelure, darker edges
  g.fillStyle = "rgba(175,125,45,.15)"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(40,25,10,.1)"; g.lineWidth = 1; for (let i = 0; i < 420; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 24; y += (rnd() - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = rad(0.5, 0.48, 0.32, 0.85, [[0, "rgba(0,0,0,0)"], [1, "rgba(25,15,5,.6)"]]); g.fillRect(0, 0, w, h); }); }
function artTex(kind, w = 512, h = 400) { return canvasTex(w, h, (g) => {   // the other (made-up) paintings of the hall
  const gr = (y0, y1, a, b) => { const q = g.createLinearGradient(0, y0, 0, y1); q.addColorStop(0, a); q.addColorStop(1, b); return q; };
  if (kind === "hills") { g.fillStyle = gr(0, h, "#e8c890", "#9fb7c8"); g.fillRect(0, 0, w, h); for (const [y, c] of [[0.55, "#7d9a5a"], [0.68, "#5f7f45"], [0.8, "#4a6636"]]) { g.fillStyle = c; g.beginPath(); g.moveTo(0, h); for (let x = 0; x <= w; x += 16) g.lineTo(x, h * y - Math.sin(x / w * 7 + y * 9) * 18); g.lineTo(w, h); g.fill(); }
    g.fillStyle = "#fff0c0"; g.beginPath(); g.arc(w * 0.75, h * 0.25, 26, 0, 7); g.fill(); }
  if (kind === "sea") { g.fillStyle = gr(0, h * 0.55, "#f2d29a", "#d98e6a"); g.fillRect(0, 0, w, h); g.fillStyle = gr(h * 0.55, h, "#4a6f8a", "#203850"); g.fillRect(0, h * 0.55, w, h);
    g.fillStyle = "#2a1c12"; g.beginPath(); g.moveTo(w * 0.35, h * 0.62); g.lineTo(w * 0.62, h * 0.62); g.lineTo(w * 0.58, h * 0.68); g.lineTo(w * 0.39, h * 0.68); g.fill(); g.fillRect(w * 0.48, h * 0.3, 5, h * 0.32);
    g.fillStyle = "#f5ead2"; g.beginPath(); g.moveTo(w * 0.49, h * 0.32); g.lineTo(w * 0.6, h * 0.58); g.lineTo(w * 0.49, h * 0.58); g.fill(); }
  if (kind === "fruit") { g.fillStyle = "#3a2618"; g.fillRect(0, 0, w, h); g.fillStyle = "#6a4426"; g.fillRect(0, h * 0.68, w, h); for (const [x, y, r, c] of [[0.4, 0.58, 46, "#c8402a"], [0.55, 0.55, 40, "#e0a030"], [0.48, 0.48, 36, "#7a9a30"], [0.63, 0.6, 34, "#8a2a50"]]) { g.fillStyle = c; g.beginPath(); g.arc(w * x, h * y, r, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 3; g.stroke(); }
    g.fillStyle = "#c9b48a"; g.beginPath(); g.ellipse(w * 0.52, h * 0.66, w * 0.22, h * 0.06, 0, 0, Math.PI); g.fill(); }
  if (kind === "portrait") { g.fillStyle = gr(0, h, "#3c3428", "#1a1610"); g.fillRect(0, 0, w, h); g.fillStyle = "#1c1a24"; g.beginPath(); g.moveTo(w * 0.2, h); g.quadraticCurveTo(w * 0.5, h * 0.45, w * 0.8, h); g.fill();
    g.fillStyle = "#e9d8c0"; g.beginPath(); g.moveTo(w * 0.36, h * 0.62); g.lineTo(w * 0.5, h * 0.72); g.lineTo(w * 0.64, h * 0.62); g.fill();   // ruff collar
    g.fillStyle = "#d8aa78"; g.beginPath(); g.arc(w * 0.5, h * 0.42, w * 0.12, 0, 7); g.fill(); g.strokeStyle = INKC; g.lineWidth = 4; g.stroke(); g.fillStyle = "#2a1a10"; g.beginPath(); g.arc(w * 0.5, h * 0.34, w * 0.13, Math.PI, 0); g.fill(); }
  if (kind === "night") { g.fillStyle = gr(0, h, "#101a3a", "#3a4a7a"); g.fillRect(0, 0, w, h); g.fillStyle = "#f6e9a8"; for (let i = 0; i < 40; i++) g.fillRect(rnd() * w, rnd() * h * 0.5, 3, 3); g.beginPath(); g.arc(w * 0.2, h * 0.2, 22, 0, 7); g.fill();
    for (let i = 0; i < 6; i++) { const x = w * (0.1 + i * 0.15), hh = h * (0.18 + rnd() * 0.12); g.fillStyle = "#1a1830"; g.fillRect(x, h * 0.8 - hh, w * 0.12, hh + h * 0.2); g.fillStyle = "#ffcf6a"; g.fillRect(x + 10, h * 0.8 - hh + 14, 10, 12); } }
  if (kind === "geo") { g.fillStyle = "#e8e0cc"; g.fillRect(0, 0, w, h); for (const [x, y, s, c] of [[0.3, 0.4, 120, "#c84a32"], [0.6, 0.55, 150, "#2a4a8a"], [0.45, 0.7, 90, "#e0b030"]]) { g.fillStyle = c; g.fillRect(w * x - s / 2, h * y - s / 2, s, s); } g.strokeStyle = "#1a1a1a"; g.lineWidth = 8; g.beginPath(); g.moveTo(0, h * 0.3); g.lineTo(w, h * 0.5); g.stroke(); }
  g.fillStyle = "rgba(160,110,40,.12)"; g.fillRect(0, 0, w, h); }); }

