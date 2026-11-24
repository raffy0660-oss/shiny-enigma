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
