'use strict';
/* Mini WebGL2 engine + Pion Raja model (toon, inverted-hull outline, spring physics). No external libs. */
const W = 1078, H = 1920, ASPECT = W / H;
const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: true, stencil: true, depth: true, preserveDrawingBuffer: true });
if (!gl) throw new Error('no webgl2');

/* ---------------- math (column-major) ---------------- */
const mat = {
  id: () => Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1),
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
  T(x, y, z) { const m = mat.id(); m[12] = x; m[13] = y; m[14] = z; return m; },
  S(x, y, z) { const m = mat.id(); m[0] = x; m[5] = y; m[10] = z; return m; },
  RX(a) { const c = Math.cos(a), s = Math.sin(a), m = mat.id(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  RY(a) { const c = Math.cos(a), s = Math.sin(a), m = mat.id(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  RZ(a) { const c = Math.cos(a), s = Math.sin(a), m = mat.id(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  persp(fovy, asp, n, f) { const t = 1 / Math.tan(fovy / 2); return Float32Array.of(t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0); },
  chain(...ms) { return ms.reduce((a, b) => mat.mul(a, b)); },
  xform(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14], m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]]; }
};
function normalMat(m) {
  const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
  const C00 = e * i - h * f, C01 = -(b * i - h * c), C02 = b * f - e * c;
  const C10 = -(d * i - g * f), C11 = a * i - g * c, C12 = -(a * f - d * c);
  const C20 = d * h - g * e, C21 = -(a * h - g * b), C22 = a * e - d * b;
  const det = a * C00 + d * C01 + g * C02, id = 1 / det;
  const o = new Float32Array(9);
  const Cm = [[C00, C01, C02], [C10, C11, C12], [C20, C21, C22]];
  for (let r = 0; r < 3; r++) for (let cc = 0; cc < 3; cc++) o[cc * 3 + r] = Cm[r][cc] * id;
  return o;
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };

/* ---------------- shaders ---------------- */
function prog(vs, fs) {
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) + '\n' + s); return sh; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aPos'); gl.bindAttribLocation(p, 1, 'aNrm'); gl.bindAttribLocation(p, 2, 'aCol'); gl.bindAttribLocation(p, 3, 'aUv');
  gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
  return { p, u };
}
const HEAD = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm; layout(location=2) in vec3 aCol; layout(location=3) in vec2 aUv;
`;
const toon = prog(HEAD + `
uniform mat4 uVP; uniform mat4 uM; uniform mat3 uNM;
out vec3 vN; out vec3 vCol; out vec2 vUv; out vec3 vW; out vec3 vO;
void main(){ vec4 w=uM*vec4(aPos,1.); vW=w.xyz; vO=aPos; vN=normalize(uNM*aNrm); vCol=aCol; vUv=aUv; gl_Position=uVP*w; }`,
  `#version 300 es
precision highp float;
in vec3 vN; in vec3 vCol; in vec2 vUv; in vec3 vW; in vec3 vO; out vec4 o; uniform vec3 uEye; uniform float uSpec; uniform float uSoot; uniform float uSootK;
float h3(vec3 p){ return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
float vn(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
uniform vec3 uColor; uniform float uUseVC; uniform sampler2D uTex; uniform float uUseTex; uniform sampler2D uRamp;
uniform vec3 uLDir; uniform vec3 uKey; uniform vec3 uAmb; uniform vec3 uSky; uniform vec3 uGnd; uniform float uDouble; uniform float uExp;
uniform vec3 uRim; uniform float uFlash; uniform float uCut; uniform float uSoft; uniform float uFlat; uniform float uR2; uniform float uFace; uniform vec4 uEdge; // uSoft: 1 = smooth sun shading (3D worlds); uFlat: 1 = flat 2D cartoon (two tones, no gloss)
uniform vec4 uLPos; uniform float uLAtt; // optional point key light fixed in the room (xyz, w=on): shading changes as he moves
uniform vec4 uAO; uniform float uAOs; // soft contact occlusion bands in object space (under the collar, under the crown)
void main(){
  if(uCut>.5 && uUseTex>.5 && texture(uTex,vUv).a<.5) discard;
  vec3 n=normalize(vN); if(uDouble>.5 && !gl_FrontFacing) n=-n;
  vec3 base=uColor; if(uUseVC>.5) base*=vCol; if(uUseTex>.5) base*=texture(uTex,vUv).rgb;
  vec3 Ld=normalize(uLDir); float att=1.;
  if(uLPos.w>.5){ vec3 tl=uLPos.xyz-vW; Ld=normalize(mix(uLDir, normalize(tl), uLPos.w-.5)); att=clamp(uLAtt/max(dot(tl,tl),.01),.4,2.2); }
  float d=dot(n,Ld), x=d*.5+.5, aw=max(fwidth(x)*.75,.002); // analytic cel bands, anti-aliased (crisp at any zoom)
  float r=.549+.137*smoothstep(.2-aw,.2+aw,x)+.157*smoothstep(.4-aw,.4+aw,x)+.118*smoothstep(.6-aw,.6+aw,x)+.039*smoothstep(.8-aw,.8+aw,x);
  if(uSoft>0.){ float lam=smoothstep(-.35,1.,d); r=mix(r,.1+.9*lam,uSoft); }   // real terminator: the side away from the sun goes dark
  if(uFlat>0.){ r=mix(r, mix(.62,1.,smoothstep(.5-aw*2.,.5+aw*2.,x)), uFlat); }   // flat 2D: one hard shadow edge
  float hemi=mix(mix(n.y*.5+.5, .5, uFlat), .5, uR2);
  vec3 light=uAmb+mix(uGnd,uSky,hemi)+uKey*r*att;
  if(uAOs>0.){ vec2 q=clamp(vec2((vO.y-uAO.x)/(uAO.y-uAO.x),(vO.y-uAO.z)/(uAO.w-uAO.z)),0.,1.); q=q*q*(3.-2.*q); float occ=q.x+q.y; /* edges may be reversed (GLSL smoothstep may not) */ light*=1.-uAOs*(1.-.35*uR2)*clamp(occ,0.,1.)*(.55+.45*(1.-max(n.y,0.))); }
  vec3 Vd=normalize(uEye-vW); float fres=1.-max(dot(n,Vd),0.);
  float rim=pow(1.-clamp(n.z,0.,1.),3.)*clamp(n.x*-.6+n.y*.5+.5,0.,1.);
  float rimCel=smoothstep(.6-aw*4.,.6+aw*4.,fres)*smoothstep(-.15,.2,d);   // crisp lit-side rim band, coloured by the room light
  if(uSoot>0.){ vec3 q=vO*uSootK; float nz=vn(q*2.3)*.65+vn(q*5.1)*.35; base*=mix(1.,.28,uSoot*smoothstep(.52,.72,nz)); }
  float shadeAmt=1.-smoothstep(.62,.9,r);                                    // painted shadows: cooler, a touch more saturated
  vec3 col=base*light*uExp*mix(vec3(1.),vec3(.88,.86,1.06),shadeAmt*.6)+(uRim*rim*.6*(1.-uSoft*.7)+uRim*rimCel*1.4*(1.-uSoft*.5))*(1.-max(uFlat,uR2));
  if(uSoft>0.){ vec2 nl=normalize(n.xy+1e-4), ll=normalize(Ld.xy+1e-4); col+=uKey*uSoft*.85*pow(fres,2.4)*max(dot(nl,ll),0.); }   // sun glint on the lit edge
  if(uSpec>0. && uFlat<.5 && uR2<.5){ vec3 V=normalize(uEye-vW); vec3 R=reflect(-Ld,n); float sp=pow(max(dot(R,V),0.),18.); col+=uSpec*(smoothstep(.45,.55,sp)*vec3(1.,.97,.86)+.35*smoothstep(.08,.3,sp)*vec3(1.,.85,.5)); float fr=pow(1.-max(dot(n,V),0.),2.5); col+=uSpec*.25*fr*vec3(1.,.8,.4); }
  if(uR2>0.){   // 2D reference look: painted airbrush gradient (bright centre leaning to the key light, soft darker hue-shifted edge), no terminator
    vec3 V=normalize(uEye-vW); float fac=clamp(dot(n,V),0.,1.); vec3 Ls=normalize(Ld*.9+V*.5);
    float g=smoothstep(-.4,.8,dot(n,Ls)); g=mix(g,1.,.35*uFace); float sil=smoothstep(.32,.0,fac)*(1.-.6*uFace);   // one-sided soft core shade + slight silhouette darkening
    float k=clamp(g*(1.-.45*sil),0.,1.);
    vec3 cool=vec3(.86,.84,1.08), warm=vec3(1.,.9,.8);
    vec3 cE=uEdge.w>.5?uEdge.rgb:base*mix(vec3(.72)*cool,vec3(.9)*warm,uFace);
    vec3 gr=mix(cE,base,k)+base*.05*smoothstep(.8,1.,k)*(1.-uFace);
    float rr=1.-fac, band=smoothstep(.6,.78,rr)*(1.-smoothstep(.9,.99,rr));                                   // thin light strip just inside the outline...
    float lit=smoothstep(-.15,.55,dot(normalize(n.xy+1e-4),normalize(Ld.xy+1e-4)));                            // ...on the side facing the key (video 14 look)
    gr=mix(gr,min(base*1.3+.07,vec3(1.)),band*lit*.6*(1.-.7*uFace));
    vec3 lt=(uAmb+mix(uGnd,uSky,.5)+uKey*.9)*uExp; float ll=dot(lt,vec3(.333)); lt=lt/max(ll,.05)*min(ll,1.15);
    if(uAOs>0.){ vec2 q2=clamp(vec2((vO.y-uAO.x)/(uAO.y-uAO.x),(vO.y-uAO.z)/(uAO.w-uAO.z)),0.,1.); q2=q2*q2*(3.-2.*q2); gr*=1.-uAOs*.9*clamp(q2.x+q2.y,0.,1.); }   // contact shade under collar / hat
    col=mix(col,gr*lt,uR2);
  }
  col=mix(col,vec3(1.,.97,.9),uFlash);
  o=vec4(clamp(col,0.,1.),1.);
}`);
const outl = prog(HEAD + `
uniform mat4 uVP; uniform mat4 uM; uniform float uThick; uniform float uRadial;
void main(){
  vec3 p=aPos;
  if(uRadial>.5){ vec2 d=normalize(p.xz+1e-5); p.xz+=d*uThick; } else { p+=normalize(aNrm)*uThick; }
  gl_Position=uVP*uM*vec4(p,1.);
}`,
  `#version 300 es
precision highp float; out vec4 o; uniform vec3 uCol; uniform float uFlash; void main(){ o=vec4(mix(uCol,vec3(1.,.95,.85),uFlash),1.); }`);
const faceP = prog(HEAD + `
uniform mat4 uVP; uniform mat4 uM; out vec2 vUv; out vec3 vN; uniform mat3 uNM;
void main(){ vUv=aUv; vN=normalize(uNM*aNrm); gl_Position=uVP*uM*vec4(aPos,1.); }`,
  `#version 300 es
precision highp float; in vec2 vUv; in vec3 vN; out vec4 o;
uniform sampler2D uA; uniform sampler2D uB; uniform sampler2D uGloss; uniform sampler2D uHurt; uniform float uHurtA; uniform float uMix; uniform float uSq; uniform float uExp; uniform vec3 uTint; uniform float uFlash;
void main(){
  // expression swap: squash the features toward the face centre, swap at the midpoint, pop back (no ghosting)
  const vec2 C=vec2(.25,.51); vec2 sc=vec2(1.+.10*uSq,1.-.42*uSq); vec2 uv=C+(vUv-C)/sc;
  vec4 c=uMix<.5?texture(uA,uv):texture(uB,uv);
  vec4 hu=texture(uHurt,vUv)*uHurtA; c=hu+c*(1.-hu.a);
  vec4 gs=texture(uGloss,vUv); c=gs+c*(1.-gs.a);   // gloss is not squashed; all premultiplied
  vec3 rgb=c.rgb*uExp*uTint; rgb=mix(rgb,vec3(c.a),uFlash); o=vec4(rgb,c.a); }`);
const shadP = prog(HEAD + `
uniform mat4 uVP; uniform mat4 uM; uniform vec3 uLRay; uniform vec2 uJit; uniform float uFadeH; out float vH;
void main(){ vec4 w=uM*vec4(aPos,1.); vec3 L=normalize(uLRay+vec3(uJit.x,0.,uJit.y)); vec3 p=w.xyz-L*(w.y/L.y); p.y=0.002; vH=w.y/max(uFadeH,1e-4); gl_Position=uVP*vec4(p,1.); }`,
  `#version 300 es
precision highp float; in float vH; out vec4 o; uniform vec4 uCol;
void main(){ float a=uCol.a*(1.-.55*smoothstep(0.,1.,vH)); o=vec4(uCol.rgb*a,a); }`); // parts high above the ground cast a lighter shadow
const blobP = prog(HEAD + `
uniform mat4 uVP; uniform mat4 uM; out vec2 vP;
void main(){ vP=aPos.xz; gl_Position=uVP*uM*vec4(aPos,1.); }`,
  `#version 300 es
precision highp float; in vec2 vP; out vec4 o; uniform vec4 uCol;
void main(){ float d=length(vP); float a=smoothstep(1.,.0,d); a=a*a*uCol.a; o=vec4(uCol.rgb*a,a); }`);
const flatP = prog(HEAD + `
uniform mat4 uVP; uniform mat4 uM; void main(){ gl_Position=uVP*uM*vec4(aPos,1.); }`,
  `#version 300 es
precision highp float; out vec4 o; uniform vec4 uCol; void main(){ o=vec4(uCol.rgb*uCol.a,uCol.a); }`);

/* ---------------- geometry builders ---------------- */
function G() { return { pos: [], nrm: [], col: [], uv: [], idx: [] }; }
function fin(g) { return { pos: new Float32Array(g.pos), nrm: new Float32Array(g.nrm), col: new Float32Array(g.col), uv: new Float32Array(g.uv), idx: new Uint32Array(g.idx) }; }
function fixWinding(g) {
  let pos = 0, neg = 0; const P = g.pos, N = g.nrm, I = g.idx;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
    const nx = N[a] + N[b] + N[c], ny = N[a + 1] + N[b + 1] + N[c + 1], nz = N[a + 2] + N[b + 2] + N[c + 2];
    const d = cx * nx + cy * ny + cz * nz; if (d > 1e-12) pos++; else if (d < -1e-12) neg++;
  }
  if (neg > pos) for (let t = 0; t < I.length; t += 3) { const x = I[t + 1]; I[t + 1] = I[t + 2]; I[t + 2] = x; }
  return g;
}
function gridIdx(g, rows, cols) { for (let i = 0; i < rows - 1; i++) for (let j = 0; j < cols - 1; j++) { const a = i * cols + j, b = a + 1, c = a + cols, d = c + 1; g.idx.push(a, b, c, b, d, c); } }
const cr = (p0, p1, p2, p3, t) => .5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
function spline2D(pts, div) {
  const n = pts.length - 1, out = [];
  for (let k = 0; k <= div; k++) { const t = k / div * n; const i = Math.min(Math.floor(t), n - 1), f = t - i; const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, n)]; out.push([Math.max(0, cr(p0[0], p1[0], p2[0], p3[0], f)), Math.max(0, cr(p0[1], p1[1], p2[1], p3[1], f))]); }
  return out;
}
function lathe(profile, segs, phi0, phiLen, colFn) {
  const g = G(), n = profile.length, cols = segs + 1;
  for (let i = 0; i < n; i++) {
    const a = profile[Math.max(i - 1, 0)], b = profile[Math.min(i + 1, n - 1)];
    let tr = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tr, ty) || 1; let nr = ty / l, ny = -tr / l;
    for (let j = 0; j <= segs; j++) {
      const phi = phi0 + j / segs * phiLen, s = Math.sin(phi), c = Math.cos(phi);
      g.pos.push(profile[i][0] * s, profile[i][1], profile[i][0] * c); g.nrm.push(nr * s, ny, nr * c);
      const col = colFn ? colFn(profile[i][1]) : [1, 1, 1]; g.col.push(...col); g.uv.push(j / segs, i / (n - 1));
    }
  }
  gridIdx(g, n, cols); const r = fin(g); r.rows = n; r.cols = cols; return fixWinding(r);
}
function sphere(rad, ws, hs, colFn) {
  const g = G();
  for (let iy = 0; iy <= hs; iy++) { const v = iy / hs; for (let ix = 0; ix <= ws; ix++) { const u = ix / ws; const x = -rad * Math.cos(u * 2 * Math.PI) * Math.sin(v * Math.PI), y = rad * Math.cos(v * Math.PI), z = rad * Math.sin(u * 2 * Math.PI) * Math.sin(v * Math.PI); g.pos.push(x, y, z); g.nrm.push(x / rad, y / rad, z / rad); g.col.push(...(colFn ? colFn(y) : [1, 1, 1])); g.uv.push(u, 1 - v); } }
  gridIdx(g, hs + 1, ws + 1); return fixWinding(fin(g));
}
function torus(R, r, seg, tub, colFn) {
  const g = G();
  for (let j = 0; j <= tub; j++) for (let i = 0; i <= seg; i++) {
    const u = i / seg * Math.PI * 2, v = j / tub * Math.PI * 2;
    const x = (R + r * Math.cos(v)) * Math.cos(u), y = r * Math.sin(v), z = (R + r * Math.cos(v)) * Math.sin(u);
    g.pos.push(x, y, z); g.nrm.push(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)); g.col.push(...(colFn ? colFn(y) : [1, 1, 1])); g.uv.push(i / seg * 8, j / tub);
  }
  gridIdx(g, tub + 1, seg + 1); return fixWinding(fin(g));
}
function cylinder(rt, rb, h, segs, open) {
  const g = G();
  for (let i = 0; i < 2; i++) for (let j = 0; j <= segs; j++) { const a = j / segs * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), rr = i ? rb : rt, y = i ? -h / 2 : h / 2; g.pos.push(rr * s, y, rr * c); const sl = (rb - rt) / h; const nl = Math.hypot(1, sl); g.nrm.push(s / nl, sl / nl, c / nl); g.col.push(1, 1, 1); g.uv.push(j / segs, i); }
  gridIdx(g, 2, segs + 1); const r = fin(g); r.rows = 2; r.cols = segs + 1; return fixWinding(r);
}
function cone(rad, h, segs) {
  const g = G(); const sl = rad / h, nl = Math.hypot(1, sl);
  for (let i = 0; i < 2; i++) for (let j = 0; j <= segs; j++) { const a = j / segs * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), rr = i ? rad : 0, y = i ? 0 : h; g.pos.push(rr * s, y, rr * c); g.nrm.push(s / nl, sl / nl, c / nl); g.col.push(1, 1, 1); g.uv.push(j / segs, i); }
  gridIdx(g, 2, segs + 1); return fixWinding(fin(g));
}
/* tube along 3D polyline; returns grid (rows=len, cols=rad+1) */
function tubeGeo(pts, rad, rs, uvScale) {
  const g = G(), n = pts.length, cols = rs + 1;
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, n - 1)];
    let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const tl = Math.hypot(...t) || 1; t = t.map(v => v / tl);
    let ref = Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0];
    let s = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]; const sl = Math.hypot(...s) || 1; s = s.map(v => v / sl);
    const u = [t[1] * s[2] - t[2] * s[1], t[2] * s[0] - t[0] * s[2], t[0] * s[1] - t[1] * s[0]];
    for (let j = 0; j <= rs; j++) { const ang = j / rs * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang); const nx = s[0] * c + u[0] * sn, ny = s[1] * c + u[1] * sn, nz = s[2] * c + u[2] * sn; g.pos.push(p[0] + nx * rad, p[1] + ny * rad, p[2] + nz * rad); g.nrm.push(nx, ny, nz); g.col.push(1, 1, 1); g.uv.push(i / (n - 1) * uvScale, j / rs); }
  }
  gridIdx(g, n, cols); const r = fin(g); r.rows = n; r.cols = cols; r.wrapCols = true; return fixWinding(r);
}
/* normals for deformed grids */
function gridNormals(g) {
  const P = g.pos, N = g.nrm, rows = g.rows, cols = g.cols, wrap = !!g.wrapCols; N.fill(0);
  const add = (a, b, c) => {
    const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2], vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { N[k * 3] += nx; N[k * 3 + 1] += ny; N[k * 3 + 2] += nz; }
  };
  const I = g.idx; for (let t = 0; t < I.length; t += 3) add(I[t], I[t + 1], I[t + 2]);
  if (wrap) for (let i = 0; i < rows; i++) { const a = i * cols, b = i * cols + cols - 1; for (let k = 0; k < 3; k++) { const s = N[a * 3 + k] + N[b * 3 + k]; N[a * 3 + k] = s; N[b * 3 + k] = s; } }
  for (let v = 0; v < N.length; v += 3) { const l = Math.hypot(N[v], N[v + 1], N[v + 2]) || 1; N[v] /= l; N[v + 1] /= l; N[v + 2] /= l; }
}

class Mesh {
  constructor(g, dyn) {
    this.g = g; this.n = g.idx.length; this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const mk = (loc, arr, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, dyn ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
    this.bp = mk(0, g.pos, 3); this.bn = mk(1, g.nrm, 3); this.bc = mk(2, g.col, 3); this.bu = mk(3, g.uv, 2);
    this.ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.idx, gl.STATIC_DRAW); gl.bindVertexArray(null);
  }
  upload() { gl.bindBuffer(gl.ARRAY_BUFFER, this.bp); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.g.pos); gl.bindBuffer(gl.ARRAY_BUFFER, this.bn); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.g.nrm); }
  draw() { gl.bindVertexArray(this.vao); gl.drawElements(gl.TRIANGLES, this.n, gl.UNSIGNED_INT, 0); }
}

/* ---------------- textures ---------------- */
function texFromCanvas(c, repeat) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const w = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); return t;
}
function rampTex(levels) {
  const d = new Uint8Array(levels.length * 4); levels.forEach((v, i) => { d[i * 4] = v; d[i * 4 + 1] = v; d[i * 4 + 2] = v; d[i * 4 + 3] = 255; });
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, levels.length, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t;
}
function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function ermineCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#fff8ee'; g.fillRect(0, 0, 256, 256);
  const r = rng(7); g.fillStyle = '#1a1210';
  const tail = (x, y, k, rot) => { // teardrop tail + three dots, drawn with wrap-around so the texture tiles
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      g.save(); g.translate(x + ox, y + oy); g.rotate(rot); g.scale(k, k);
      g.beginPath(); g.moveTo(0, -12); g.bezierCurveTo(16, -6, 10, 16, 0, 30); g.bezierCurveTo(-10, 16, -16, -6, 0, -12); g.fill();
      for (const [dx, dy] of [[-13, -20], [13, -20], [0, -29]]) { g.beginPath(); g.arc(dx, dy, 7, 0, 7); g.fill(); }
      g.restore();
    }
  };
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    const x = (col + (row % 2) * .5) * 128 + 40 + (r() - .5) * 16, y = row * 128 + 64 + (r() - .5) * 12;
    tail(x, y, 1.05 + r() * .2, (r() - .5) * .5);
  }
  return c;
}
function faceCanvas(kind, closed, talk) { // talk: 0 = expression's own mouth, 1..3 = open-mouth speaking levels
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2);
  const BR = window.STYLE2D ? '#1d1411' : '#3a1a12'; g.translate(256, 250); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = BR; g.fillStyle = BR; g.lineWidth = 15;
  const line = (x1, y1, x2, y2) => { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); };
  const ex = 92;
  const shut = (y, w) => { for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - (w || 28), y); g.quadraticCurveTo(s * ex, y + 16, s * ex + (w || 28), y); g.stroke(); } };
  const smile = (w, h, y, fill) => { g.save(); g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.arc(0, y, w, 0, Math.PI, false); g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = 12; g.stroke(); g.restore(); };
  const mouth = !talk; // draw the expression's own mouth?
  const WH = '#fffaf2', MOUTH = '#5a1712', TONGUE = '#ff7f78', TEETH = '#fff6ee', TEAR = '#7fd3ff', TEARS = '#2a6f9a';
  const blush = strokes => { for (const s of [-1, 1]) { g.save(); if (strokes) { g.strokeStyle = '#ff7f9a'; g.lineWidth = 6; for (let k = 0; k < 3; k++) line(s * 134 - 14 + k * 12, 34, s * 134 - 22 + k * 12, 54); }
    else { g.fillStyle = 'rgba(255,120,140,.55)'; g.beginPath(); g.ellipse(s * 134, 44, 30, 17, 0, 0, 7); g.fill(); } g.restore(); } };
  const tear = (x, y, k) => { g.save(); g.translate(x, y); g.scale(k, k); g.fillStyle = TEAR; g.strokeStyle = TEARS; g.lineWidth = 5; g.beginPath(); g.moveTo(0, -18); g.quadraticCurveTo(16, 6, 0, 16); g.quadraticCurveTo(-16, 6, 0, -18); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-4, 4, 4, 0, 7); g.fill(); g.restore(); };
  const heart = (x, y, k) => { g.save(); g.translate(x, y); g.scale(k, k); g.beginPath(); g.moveTo(0, 14); g.bezierCurveTo(-30, -8, -14, -30, 0, -14); g.bezierCurveTo(14, -30, 30, -8, 0, 14); g.fillStyle = '#ff5a7a'; g.fill(); g.lineWidth = 6; g.strokeStyle = BR; g.stroke(); g.restore(); };
  const angerVein = (x, y, k) => { g.save(); g.translate(x, y); g.scale(k, k); g.strokeStyle = '#e01b1b'; g.lineWidth = 11; for (let q = 0; q < 4; q++) { g.save(); g.rotate(q * Math.PI / 2 + .785); g.beginPath(); g.moveTo(9, -5); g.quadraticCurveTo(22, -8, 25, -24); g.stroke(); g.restore(); } g.restore(); };
  const bigEye = (s, rx, ry, px, py, pr, y0) => { g.save(); g.lineWidth = 12; g.fillStyle = WH; g.beginPath(); g.ellipse(s * ex, y0, rx, ry, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = BR; g.beginPath(); g.arc(s * ex + px, y0 + py, pr, 0, 7); g.fill(); g.restore(); };
  const laugh = (w, y, teeth) => { g.save(); g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.arc(0, y, w, 0, Math.PI, false); g.closePath(); g.fillStyle = MOUTH; g.fill(); g.save(); g.clip();
    g.fillStyle = TONGUE; g.beginPath(); g.ellipse(0, y + w * .9, w * .62, w * .45, 0, 0, 7); g.fill(); if (teeth) { g.fillStyle = TEETH; g.fillRect(-w, y - 2, 2 * w, 12); } g.restore(); g.lineWidth = 12; g.stroke(); g.restore(); };
  if (kind === 'datar') {
    line(-ex - 36, -62, -ex + 30, -46); line(ex + 36, -62, ex - 30, -46);
    if (closed) shut(6, 22); else { line(-ex, -16, -ex, 24); line(ex, -16, ex, 24); }
    if (mouth) { g.beginPath(); g.moveTo(0, 50); g.lineTo(-17, 78); g.lineTo(17, 78); g.closePath(); g.fill(); g.stroke(); }
  } else if (kind === 'imut') {
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, 22, 34, Math.PI * 1.1, Math.PI * 1.9, false); g.stroke(); }
    if (mouth) smile(32, 40, 48, '#fff6ee');
  } else if (kind === 'senang') {
    if (closed) shut(10); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, 4, 24, 32, 0, 0, 7); g.fill(); line(s * ex + s * 22, -4, s * ex + s * 22, -64); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 7, -6, 8, 0, 7); g.fill(); g.fillStyle = BR; }
    if (mouth) smile(58, 54, 40, '#fff6ee');
  } else if (kind === 'kaget') {
    for (const s of [-1, 1]) { if (closed) shut(6, 32); else { g.save(); g.lineWidth = 13; g.fillStyle = '#fffaf2'; g.beginPath(); g.ellipse(s * ex, 0, 34, 42, 0, 0, 7); g.fill(); g.stroke(); g.restore(); g.beginPath(); g.arc(s * ex + (s > 0 ? -4 : 4), 4, 10, 0, 7); g.fill(); } line(s * ex - 28, -92, s * ex + 28, -100); }
    if (mouth) { g.beginPath(); g.ellipse(0, 78, 20, 28, 0, 0, 7); g.fill(); }
  } else if (kind === 'penasaran') {
    if (closed) shut(8, 24); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, 2, 20, 30, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 6, -8, 8, 0, 7); g.fill(); g.fillStyle = BR; }
    line(-ex - 30, -58, -ex + 28, -74); line(ex - 28, -52, ex + 30, -54);
    if (mouth) { g.beginPath(); g.moveTo(-22, 66); g.quadraticCurveTo(0, 82, 22, 62); g.stroke(); }
  } else if (kind === 'pusing') {
    for (const sx of [-1, 1]) { g.save(); g.lineWidth = 11; g.beginPath(); for (let a = 0; a < Math.PI * 5; a += .15) { const r = 3 + a * 2.6; const x = sx * ex + Math.cos(a * sx) * r, y = 2 + Math.sin(a * sx) * r; if (a === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); g.restore(); }
    if (mouth) { g.beginPath(); g.moveTo(-34, 72); g.quadraticCurveTo(-17, 58, 0, 72); g.quadraticCurveTo(17, 86, 34, 70); g.stroke(); }
  } else if (kind === 'curiga') {
    line(-ex - 34, -58, -ex + 30, -34); line(ex + 34, -58, ex - 30, -34);
    line(-ex - 24, 6, -ex + 24, 6); line(ex - 24, 6, ex + 24, 6);
    if (mouth) { g.beginPath(); g.moveTo(-34, 70); g.quadraticCurveTo(-14, 56, 0, 70); g.quadraticCurveTo(14, 84, 34, 68); g.stroke(); }
  } else if (kind === 'sinis') { // sarcastic: heavy lids, one brow cocked, lopsided smirk
    line(-ex - 34, -40, -ex + 30, -40);
    g.beginPath(); g.moveTo(ex - 34, -58); g.quadraticCurveTo(ex, -92, ex + 36, -70); g.stroke();
    for (const s of [-1, 1]) {
      if (closed) { line(s * ex - 26, 8, s * ex + 26, 8); continue; }
      g.save(); g.beginPath(); g.rect(s * ex - 40, -4, 80, 60); g.clip();
      g.beginPath(); g.ellipse(s * ex + 6, 8, 22, 30, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex + 1, 4, 6, 0, 7); g.fill(); g.restore();
      line(s * ex - 30, -4, s * ex + 30, -4);
    }
    if (mouth) { g.beginPath(); g.moveTo(-30, 70); g.quadraticCurveTo(4, 74, 30, 58); g.quadraticCurveTo(38, 52, 40, 44); g.stroke(); }
  } else if (kind === 'duit') { // money eyes: big green dollar signs
    for (const s of [-1, 1]) { g.save(); g.translate(s * ex, 4); g.font = '900 150px Inter, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 16; g.strokeStyle = BR; g.strokeText('$', 0, 0); g.fillStyle = '#25c74f'; g.fillText('$', 0, 0); g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(-20, -38, 9, 0, 7); g.fill(); g.restore(); }
    line(-ex - 34, -96, -ex + 28, -108); line(ex + 34, -96, ex - 28, -108);
    if (mouth) talkMouth(3, true);
  } else if (kind === 'licik') { // sly / smug: lidded eyes looking aside, one brow up, wide sneaky grin
    line(-ex - 34, -46, -ex + 30, -40); g.beginPath(); g.moveTo(ex - 32, -60); g.quadraticCurveTo(ex, -96, ex + 36, -74); g.stroke();
    for (const s of [-1, 1]) {
      if (closed) { line(s * ex - 26, 10, s * ex + 26, 10); continue; }
      g.save(); g.beginPath(); g.rect(s * ex - 40, 2, 80, 60); g.clip();
      g.beginPath(); g.ellipse(s * ex + 12, 14, 22, 26, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex + 7, 10, 6, 0, 7); g.fill(); g.restore();
      g.beginPath(); g.moveTo(s * ex - 32, 6); g.quadraticCurveTo(s * ex, -2, s * ex + 32, 4); g.stroke();
    }
    if (mouth) { g.save(); g.beginPath(); g.moveTo(-40, 56); g.quadraticCurveTo(10, 96, 52, 46); g.quadraticCurveTo(8, 66, -40, 56); g.closePath(); g.fillStyle = '#fff6ee'; g.fill(); g.lineWidth = 11; g.stroke();
      g.lineWidth = 5; for (const x of [-18, 4, 26]) line(x, 58 + (x + 40) * .05, x + 2, 72 - Math.abs(x - 6) * .2); g.restore(); }
  } else if (kind === 'marah') { // furious: steep thick brows, glaring eyes, gritted teeth
    g.save(); g.lineWidth = 20; line(-ex - 46, -78, -ex + 34, -40); line(ex + 46, -78, ex - 34, -40); g.restore();
    for (const s of [-1, 1]) { if (closed) { line(s * ex - 26, 8, s * ex + 26, 8); continue; }
      g.save(); g.beginPath(); g.moveTo(s * ex - s * 34, -24); g.lineTo(s * ex + s * 34, -4); g.lineTo(s * ex + s * 30, 34); g.lineTo(s * ex - s * 30, 34); g.closePath(); g.clip();
      g.beginPath(); g.ellipse(s * ex, 10, 30, 30, 0, 0, 7); g.fillStyle = '#fffaf2'; g.fill(); g.lineWidth = 12; g.stroke();
      g.fillStyle = BR; g.beginPath(); g.arc(s * ex + s * 3, 14, 11, 0, 7); g.fill(); g.restore();
      g.beginPath(); g.moveTo(s * ex - s * 34, -24); g.lineTo(s * ex + s * 34, -4); g.stroke(); }
    if (mouth) { g.save(); g.translate(0, 70); g.beginPath(); g.rect(-44, -16, 88, 34); g.fillStyle = '#fff6ee'; g.fill(); g.lineWidth = 11; g.stroke();
      g.lineWidth = 6; for (const x of [-22, 0, 22]) line(x, -16, x, 18); line(-44, 1, 44, 1); g.restore(); }
  } else if (kind === 'sakit') { // in pain: one eye swollen shut, the other droopy, wobbly mouth
    line(-ex - 34, -52, -ex + 26, -62); g.beginPath(); g.moveTo(ex - 30, -70); g.quadraticCurveTo(ex, -48, ex + 34, -60); g.stroke();
    if (closed) line(-ex - 22, 10, -ex + 22, 10);
    else { g.save(); g.beginPath(); g.rect(-ex - 40, 0, 80, 60); g.clip(); g.beginPath(); g.ellipse(-ex, 12, 22, 28, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-ex - 6, 8, 6, 0, 7); g.fill(); g.restore(); line(-ex - 28, 0, -ex + 28, 0); }
    g.beginPath(); g.moveTo(ex - 30, 4); g.lineTo(ex + 26, 16); g.lineTo(ex - 30, 28); g.stroke();   // > shut eye
    if (mouth) { g.beginPath(); g.moveTo(-36, 74); for (let k = 0; k <= 8; k++) g.lineTo(-36 + k * 9, 74 + (k % 2 ? -8 : 6)); g.stroke(); }
  } else if (kind === 'kecewa') { // bittersweet: worried brows, happy ^^ eyes with a tear, small smile
    line(-ex - 34, -54, -ex + 30, -74); line(ex + 34, -54, ex - 30, -74);
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, 16, 26, Math.PI * 1.1, Math.PI * 1.9, false); g.stroke(); }
    g.save(); g.fillStyle = '#7fd3ff'; g.strokeStyle = '#2a6f9a'; g.lineWidth = 5; g.beginPath(); g.moveTo(ex + 22, 22); g.quadraticCurveTo(ex + 40, 52, ex + 26, 60); g.quadraticCurveTo(ex + 8, 52, ex + 22, 22); g.fill(); g.stroke(); g.restore();
    if (mouth) { g.beginPath(); g.moveTo(-26, 64); g.quadraticCurveTo(0, 82, 26, 64); g.stroke(); }
  } else if (kind === 'ragu') { // unsure: mismatched brows, eyes glancing aside, squiggly mouth
    line(-ex - 32, -60, -ex + 28, -58); g.beginPath(); g.moveTo(ex - 30, -62); g.quadraticCurveTo(ex, -86, ex + 32, -70); g.stroke();
    if (closed) shut(8, 24); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex + 12, 4, 20, 28, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex + 6, -6, 7, 0, 7); g.fill(); g.fillStyle = BR; }
    if (mouth) { g.beginPath(); g.moveTo(-30, 70); g.bezierCurveTo(-15, 56, -5, 84, 8, 70); g.bezierCurveTo(18, 60, 26, 76, 32, 68); g.stroke(); }
  } else if (kind === 'ngakak') { // laughing: squeezed > < eyes, huge open mouth
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - s * 26, -22); g.lineTo(s * ex + s * 20, 0); g.lineTo(s * ex - s * 26, 22); g.stroke(); }
    line(-ex - 30, -62, -ex + 26, -72); line(ex + 30, -62, ex - 26, -72);
    if (mouth) talkMouth(3, true);
  } else if (kind === 'nangis') { // crying: worried brows, heavy-lidded wet eyes, tear streams, wobbly frown
    line(-ex - 34, -48, -ex + 30, -72); line(ex + 34, -48, ex - 30, -72);
    if (closed) shut(10, 26); else for (const s of [-1, 1]) {
      g.save(); g.beginPath(); g.rect(s * ex - 42, -2, 84, 62); g.clip(); g.lineWidth = 12; g.fillStyle = WH; g.beginPath(); g.ellipse(s * ex, 8, 28, 30, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = BR; g.beginPath(); g.arc(s * ex, 22, 12, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 4, 18, 4, 0, 7); g.fill(); g.restore();
      line(s * ex - 32, -2, s * ex + 32, -2); }
    for (const s of [-1, 1]) { g.save(); g.strokeStyle = TEAR; g.globalAlpha = .9; g.lineWidth = 12; g.beginPath(); g.moveTo(s * ex + s * 16, 38); g.quadraticCurveTo(s * ex + s * 24, 84, s * ex + s * 18, 126); g.stroke(); g.restore(); tear(s * ex + s * 34, 74, 1.1); }
    if (mouth) { g.beginPath(); g.moveTo(-30, 82); g.quadraticCurveTo(-15, 62, 0, 72); g.quadraticCurveTo(15, 62, 30, 82); g.stroke(); }
  } else if (kind === 'tersedu') { // sobbing T_T: T eyes, rivers of tears, wailing mouth
    line(-ex - 34, -46, -ex + 28, -66); line(ex + 34, -46, ex - 28, -66);
    for (const s of [-1, 1]) {
      g.save(); g.fillStyle = TEAR; g.strokeStyle = TEARS; g.lineWidth = 5; g.beginPath(); g.moveTo(s * ex - 14, 8); g.lineTo(s * ex + 14, 8);
      g.quadraticCurveTo(s * ex + 20, 90, s * ex + 30, 176); g.lineTo(s * ex - 30, 176); g.quadraticCurveTo(s * ex - 20, 90, s * ex - 14, 8); g.closePath(); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 4; g.beginPath(); g.moveTo(s * ex - 4, 30); g.quadraticCurveTo(s * ex - 2, 90, s * ex - 10, 150); g.stroke(); g.restore();
      g.save(); g.lineWidth = 15; line(s * ex - 32, -14, s * ex + 32, -14); line(s * ex, -14, s * ex, 10); g.restore(); }
    if (mouth) { g.save(); g.beginPath(); g.ellipse(0, 78, 18, 26, 0, 0, 7); g.fillStyle = MOUTH; g.fill(); g.save(); g.clip(); g.fillStyle = TONGUE; g.beginPath(); g.ellipse(0, 100, 14, 10, 0, 0, 7); g.fill(); g.restore(); g.lineWidth = 11; g.stroke(); g.restore(); }
  } else if (kind === 'girang') { // overjoyed: big sparkly dark eyes, brows high, wide open laugh
    line(-ex - 30, -84, -ex + 26, -98); line(ex + 30, -84, ex - 26, -98);
    if (closed) shut(6, 30); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, 0, 30, 38, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 9, -14, 10, 0, 7); g.fill(); g.beginPath(); g.arc(s * ex + 10, 12, 5, 0, 7); g.fill(); g.fillStyle = BR; }
    if (mouth) laugh(56, 40, true);
  } else if (kind === 'bahagia') { // blissful: closed ^ ^ eyes, pink blush strokes, open smile with tongue
    g.save(); g.lineWidth = 16; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, 20, 30, Math.PI * 1.12, Math.PI * 1.88, false); g.stroke(); } g.restore();
    line(-ex - 28, -60, -ex + 24, -68); line(ex + 28, -60, ex - 24, -68);
    blush(true);
    if (mouth) laugh(40, 46, false);
  } else if (kind === 'cium') { // kissy: eyes shut, blush, "3" lips pushed out, a little heart
    g.save(); g.lineWidth = 14; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, -6, 28, Math.PI * .12, Math.PI * .88, false); g.stroke(); } g.restore();
    line(-ex - 30, -58, -ex + 26, -66); line(ex + 30, -58, ex - 26, -66);
    blush(true);
    if (mouth) { g.save(); g.lineWidth = 12; g.beginPath(); g.moveTo(-4, 50); g.quadraticCurveTo(24, 52, 12, 66); g.quadraticCurveTo(26, 74, 6, 86); g.stroke(); g.restore(); heart(56, 46, .9); }
  } else if (kind === 'lega') { // relieved / content: soft closed eyes, blush, small "hah~" mouth
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - 28, 6); g.quadraticCurveTo(s * ex, 22, s * ex + 28, 6); g.stroke(); }
    line(-ex - 30, -50, -ex + 28, -58); line(ex + 30, -50, ex - 28, -58);
    blush(true);
    if (mouth) { g.save(); g.beginPath(); g.moveTo(-18, 62); g.quadraticCurveTo(0, 52, 18, 62); g.quadraticCurveTo(14, 88, 0, 88); g.quadraticCurveTo(-14, 88, -18, 62); g.closePath(); g.fillStyle = MOUTH; g.fill(); g.lineWidth = 11; g.stroke(); g.restore(); }
  } else if (kind === 'gemas') { // squee >_<: squeezed eyes, round pink cheeks, open mouth with a fang
    g.save(); g.lineWidth = 16; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - s * 28, -24); g.lineTo(s * ex + s * 22, 2); g.lineTo(s * ex - s * 28, 26); g.stroke(); } g.restore();
    line(-ex - 30, -64, -ex + 26, -78); line(ex + 30, -64, ex - 26, -78);
    blush(false);
    if (mouth) { laugh(36, 50, false); g.save(); g.fillStyle = TEETH; g.lineWidth = 5; g.beginPath(); g.moveTo(-22, 51); g.lineTo(-8, 51); g.lineTo(-15, 66); g.closePath(); g.fill(); g.stroke(); g.restore(); }
  } else if (kind === 'syok') { // horrified: bulging eyes, pin pupils, eye bags, gaping mouth, sweat
    for (const s of [-1, 1]) line(s * ex - s * 24, -84, s * ex + s * 24, -96);
    if (closed) shut(6, 34); else for (const s of [-1, 1]) { bigEye(s, 40, 48, 0, 4, 7, 0); g.save(); g.lineWidth = 6; g.beginPath(); g.arc(s * ex, 36, 30, Math.PI * .25, Math.PI * .75); g.stroke(); g.restore(); }
    tear(152, -34, 1.0);
    if (mouth) { g.save(); g.beginPath(); g.moveTo(-26, 56); g.lineTo(26, 56); g.lineTo(36, 108); g.lineTo(-36, 108); g.closePath(); g.fillStyle = MOUTH; g.fill(); g.save(); g.clip(); g.fillStyle = TEETH; g.fillRect(-40, 56, 80, 12); g.fillStyle = TONGUE; g.beginPath(); g.ellipse(0, 110, 26, 14, 0, 0, 7); g.fill(); g.restore(); g.lineWidth = 11; g.stroke(); g.restore(); }
  } else if (kind === 'kesal') { // annoyed: low thick brows, squinting "=" eyes, clenched teeth, anger vein
    g.save(); g.lineWidth = 18; line(-ex - 40, -62, -ex + 30, -44); line(ex + 40, -62, ex - 30, -44); g.restore();
    for (const s of [-1, 1]) { line(s * ex - 30, -2, s * ex + 30, -2); line(s * ex - 24, 16, s * ex + 24, 16); }
    if (mouth) { g.save(); g.translate(0, 74); g.beginPath(); g.rect(-34, -10, 68, 20); g.fillStyle = TEETH; g.fill(); g.lineWidth = 10; g.stroke(); g.lineWidth = 5; line(-34, 0, 34, 0); for (const x of [-14, 6]) line(x, -10, x, 10); g.restore(); }
    angerVein(150, -48, 1);
  } else if (kind === 'ngiler') { // dazed drooling: dot eyes, one brow up, slack wavy mouth, drool
    line(-ex - 30, -50, -ex + 28, -50); g.beginPath(); g.moveTo(ex - 28, -48); g.lineTo(ex + 10, -48); g.lineTo(ex + 10, -82); g.stroke();
    if (closed) shut(8, 20); else for (const s of [-1, 1]) { g.beginPath(); g.arc(s * ex, 6, 13, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 4, 2, 4, 0, 7); g.fill(); g.fillStyle = BR; }
    if (mouth) { g.save(); g.beginPath(); g.moveTo(-40, 62); g.bezierCurveTo(-20, 48, 0, 76, 20, 58); g.bezierCurveTo(30, 52, 38, 60, 40, 66); g.bezierCurveTo(20, 92, -20, 92, -40, 62); g.closePath(); g.fillStyle = MOUTH; g.fill(); g.lineWidth = 11; g.stroke(); g.restore();
      g.save(); g.strokeStyle = TEAR; g.lineWidth = 9; line(24, 82, 26, 104); g.restore(); tear(26, 114, .8); }
  } else if (kind === 'merajuk') { // sulking: brows pinched down, lidded eyes looking down, pouted lips, blush
    line(-ex - 30, -62, -ex + 30, -46); line(ex + 30, -62, ex - 30, -46);
    for (const s of [-1, 1]) { if (closed) { line(s * ex - 26, 10, s * ex + 26, 10); continue; }
      g.save(); g.beginPath(); g.rect(s * ex - 40, 4, 80, 60); g.clip(); g.beginPath(); g.ellipse(s * ex, 12, 24, 30, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 6, 22, 6, 0, 7); g.fill(); g.restore();
      line(s * ex - 30, 4, s * ex + 30, 4); }
    blush(false);
    if (mouth) { g.save(); g.beginPath(); g.ellipse(6, 76, 20, 14, 0, 0, 7); g.fillStyle = '#c9474f'; g.fill(); g.lineWidth = 10; g.stroke(); g.lineWidth = 5; line(-8, 76, 20, 76); g.restore(); }
  } else if (kind === 'memelas') { // puppy eyes: huge glossy dark eyes, watery rims, worried brows, tiny wobbly mouth
    line(-ex - 34, -58, -ex + 30, -82); line(ex + 34, -58, ex - 30, -82);
    if (closed) shut(10, 30); else for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(s * ex, 6, 40, 46, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.ellipse(s * ex - 12, -12, 14, 16, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(s * ex + 14, 22, 7, 0, 7); g.fill(); g.beginPath(); g.arc(s * ex - 2, 30, 4, 0, 7); g.fill(); g.fillStyle = BR;
      g.save(); g.strokeStyle = 'rgba(127,211,255,.95)'; g.lineWidth = 7; g.beginPath(); g.arc(s * ex, 6, 34, Math.PI * .22, Math.PI * .78); g.stroke(); g.restore(); }
    if (mouth) { g.beginPath(); g.moveTo(-16, 80); g.quadraticCurveTo(-8, 70, 0, 77); g.quadraticCurveTo(8, 70, 16, 80); g.stroke(); }
  } else if (kind === 'bosan') { // bored: flat heavy lids, eyes sunk low, flat mouth
    line(-ex - 32, -46, -ex + 30, -46); line(ex + 32, -46, ex - 30, -46);
    for (const s of [-1, 1]) { if (closed) { line(s * ex - 26, 10, s * ex + 26, 10); continue; }
      g.save(); g.beginPath(); g.rect(s * ex - 40, 2, 80, 60); g.clip(); g.beginPath(); g.ellipse(s * ex, 14, 22, 26, 0, 0, 7); g.fill(); g.restore();
      g.save(); g.lineWidth = 14; line(s * ex - 32, 2, s * ex + 32, 2); g.restore(); }
    if (mouth) line(-20, 76, 18, 74);
  } else if (kind === 'cemas') { // worried: tilted brows, small eyes, wavy mouth, sweat drop
    line(-ex - 34, -52, -ex + 28, -74); line(ex + 34, -52, ex - 28, -74);
    if (closed) shut(8, 22); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, 4, 15, 24, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 4, -6, 5, 0, 7); g.fill(); g.fillStyle = BR; }
    tear(152, -30, 1.0);
    if (mouth) { g.beginPath(); g.moveTo(-34, 74); g.quadraticCurveTo(-23, 62, -12, 74); g.quadraticCurveTo(-1, 86, 10, 74); g.quadraticCurveTo(21, 62, 32, 74); g.stroke(); }
  } else if (kind === 'bangga') { // smug / proud: relaxed high brows, squinting satisfied eyes, side smile
    line(-ex - 32, -64, -ex + 30, -72); line(ex + 32, -64, ex - 30, -72);
    for (const s of [-1, 1]) { if (closed) { line(s * ex - 26, 12, s * ex + 26, 12); continue; }
      g.beginPath(); g.ellipse(s * ex + 4, 2, 26, 26, 0, 0, Math.PI, false); g.closePath(); g.fill();      // lower half: lids at half mast
      g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 4, 10, 6, 0, 7); g.fill(); g.fillStyle = BR;
      g.save(); g.lineWidth = 14; line(s * ex - 30, 2, s * ex + 36, 2); g.restore(); }
    if (mouth) { g.beginPath(); g.moveTo(-22, 68); g.quadraticCurveTo(6, 82, 30, 62); g.stroke(); line(30, 62, 36, 56); }
  } else if (kind === 'ngamuk') { // raging: zigzag brows, sharp white eyes with pin pupils, yelling mouth, vein
    g.save(); g.lineWidth = 22; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex + s * 46, -84); g.lineTo(s * ex + s * 4, -66); g.lineTo(s * ex - s * 40, -34); g.stroke(); } g.restore(); // inner ends dive down
    for (const s of [-1, 1]) { if (closed) { line(s * ex - 26, 8, s * ex + 26, 8); continue; }
      g.save(); g.beginPath(); g.moveTo(s * ex + s * 36, -24); g.lineTo(s * ex - s * 34, -2); g.lineTo(s * ex - s * 26, 30); g.lineTo(s * ex + s * 30, 28); g.closePath(); g.fillStyle = WH; g.fill(); g.lineWidth = 12; g.stroke();
      g.fillStyle = BR; g.beginPath(); g.arc(s * ex - s * 4, 12, 11, 0, 7); g.fill(); g.restore(); }
    if (mouth) { g.save(); g.beginPath(); g.moveTo(-30, 56); g.quadraticCurveTo(0, 46, 30, 56); g.lineTo(52, 110); g.quadraticCurveTo(0, 118, -52, 110); g.closePath(); g.fillStyle = MOUTH; g.fill(); g.save(); g.clip();
      g.fillStyle = TEETH; g.fillRect(-60, 44, 120, 18); g.fillStyle = TONGUE; g.beginPath(); g.ellipse(0, 112, 30, 14, 0, 0, 7); g.fill(); g.restore(); g.lineWidth = 12; g.stroke(); g.restore(); }
    angerVein(150, -52, 1.15);
  } else if (kind === 'santai') { // vibing: music-note eyes, one brow cocked, toothy grin
    for (const s of [-1, 1]) { g.save(); g.translate(s * ex - 8, 0); g.beginPath(); g.ellipse(0, 20, 17, 13, -.4, 0, 7); g.fill(); g.lineWidth = 10; line(14, 16, 14, -40); g.beginPath(); g.moveTo(14, -40); g.quadraticCurveTo(36, -30, 36, -10); g.stroke(); g.restore(); }
    line(-ex - 30, -66, -ex + 26, -72); g.beginPath(); g.moveTo(ex - 28, -70); g.quadraticCurveTo(ex, -88, ex + 30, -72); g.stroke();
    if (mouth) { g.save(); g.beginPath(); g.moveTo(-46, 56); g.quadraticCurveTo(0, 64, 46, 52); g.quadraticCurveTo(10, 104, -46, 56); g.closePath(); g.fillStyle = TEETH; g.fill(); g.lineWidth = 11; g.stroke();
      g.lineWidth = 5; g.beginPath(); g.moveTo(-40, 64); g.quadraticCurveTo(0, 74, 42, 60); g.stroke(); for (const x of [-18, 2, 22]) line(x, 62, x + 1, 80 - Math.abs(x) * .3); g.restore(); }
  } else if (kind === 'soktahu') { // "well, actually": big round eyes looking up, brows raised, buck teeth, freckles (+ nerd glasses)
    line(-ex - 30, -94, -ex + 26, -102); line(ex + 30, -100, ex - 26, -108);
    if (closed) shut(6, 30); else for (const s of [-1, 1]) { g.save(); g.lineWidth = 12; g.fillStyle = WH; g.beginPath(); g.arc(s * ex, 4, 34, 0, 7); g.fill(); g.stroke();
      g.fillStyle = BR; g.beginPath(); g.arc(s * ex + 13, 15, 16, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex + 8, 9, 6, 0, 7); g.fill(); g.restore(); } // looking down at the book
    g.save(); g.fillStyle = '#b8481f'; for (const s of [-1, 1]) for (const [dx, dy] of [[-12, 0], [8, 8], [0, -10], [18, -4]]) { g.beginPath(); g.arc(s * 138 + dx, 52 + dy, 4.5, 0, 7); g.fill(); } g.restore();
    if (mouth) { g.beginPath(); g.moveTo(-28, 64); g.quadraticCurveTo(0, 72, 28, 64); g.stroke(); g.save(); g.fillStyle = TEETH; g.lineWidth = 7; for (const x of [-16, 1]) { g.beginPath(); g.rect(x, 67, 15, 22); g.fill(); g.stroke(); } g.restore(); }
  }
  else if (kind === 'melet') { // concentrating, tongue stuck out: one eye squinted, brows set, tongue hanging out of a small grin
    line(-ex - 34, -66, -ex + 30, -56); line(ex + 34, -60, ex - 30, -62);
    if (closed) shut(8, 24); else { g.beginPath(); g.ellipse(-ex, 4, 20, 28, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-ex - 6, -6, 7, 0, 7); g.fill(); g.fillStyle = BR;
      g.save(); g.lineWidth = 15; g.beginPath(); g.moveTo(ex - 28, 10); g.quadraticCurveTo(ex, -6, ex + 28, 10); g.stroke(); g.restore(); }
    if (mouth) { g.beginPath(); g.moveTo(-30, 62); g.quadraticCurveTo(0, 74, 30, 60); g.stroke();
      g.save(); g.beginPath(); g.moveTo(-17, 66); g.lineTo(17, 66); g.quadraticCurveTo(22, 108, 0, 110); g.quadraticCurveTo(-22, 108, -17, 66); g.closePath(); g.fillStyle = TONGUE; g.fill(); g.lineWidth = 10; g.stroke();
      g.lineWidth = 5; g.strokeStyle = '#c9474f'; line(0, 74, 0, 96); g.restore(); }
  } else if (kind === 'gembung') { // cheeks puffed full of air: eyes squeezed, round bulging cheeks, lips pressed shut
    g.save(); g.lineWidth = 15; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * ex - 28, 2); g.quadraticCurveTo(s * ex, -16, s * ex + 28, 2); g.stroke(); } g.restore();
    line(-ex - 32, -62, -ex + 28, -70); line(ex + 32, -62, ex - 28, -70);
    for (const s of [-1, 1]) { g.save(); g.fillStyle = 'rgba(255,130,120,.5)'; g.beginPath(); g.arc(s * 118, 64, 46, 0, 7); g.fill();
      g.lineWidth = 8; g.beginPath(); g.arc(s * 118, 64, 50, s > 0 ? -.9 : Math.PI - .5, s > 0 ? .5 : Math.PI + .9); g.stroke(); g.restore(); }
    if (mouth) { g.save(); g.fillStyle = '#c9474f'; g.beginPath(); g.ellipse(0, 76, 13, 10, 0, 0, 7); g.fill(); g.lineWidth = 9; g.stroke(); g.restore(); }
  } else if (kind === 'tiup') { // blowing: lips pushed into a small "o", eyes wide and focused
    line(-ex - 32, -70, -ex + 28, -62); line(ex + 32, -70, ex - 28, -62);
    if (closed) shut(8, 24); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, 4, 21, 30, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 6, -6, 8, 0, 7); g.fill(); g.fillStyle = BR; }
    if (mouth) { g.save(); g.beginPath(); g.ellipse(0, 76, 18, 18, 0, 0, 7); g.fillStyle = '#e0626a'; g.fill(); g.lineWidth = 10; g.stroke(); g.beginPath(); g.ellipse(0, 76, 7, 7, 0, 0, 7); g.fillStyle = MOUTH; g.fill(); g.restore(); }
  } else if (kind === 'malu') { // embarrassed: eyes glancing aside, heavy blush lines, wobbly little mouth, sweat drop
    line(-ex - 34, -54, -ex + 28, -72); line(ex + 34, -54, ex - 28, -72);
    if (closed) shut(8, 22); else for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * ex, 6, 17, 25, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(s * ex - 10, -2, 6, 0, 7); g.fill(); g.fillStyle = BR;
    }
    blush(false); blush(true); tear(156, -34, .9);
    if (mouth) { g.beginPath(); g.moveTo(-26, 74); g.quadraticCurveTo(-13, 66, 0, 74); g.quadraticCurveTo(13, 82, 26, 72); g.stroke(); }
  } else if (kind === 'sewot') { // embarrassed and getting cross: low brows, squint, blush, pouty grimace, small vein
    g.save(); g.lineWidth = 17; line(-ex - 38, -60, -ex + 30, -42); line(ex + 38, -60, ex - 30, -42); g.restore();
    for (const s of [-1, 1]) { if (closed) { line(s * ex - 26, 8, s * ex + 26, 8); continue; }
      g.save(); g.beginPath(); g.rect(s * ex - 40, -6, 80, 60); g.clip(); g.beginPath(); g.ellipse(s * ex, 8, 20, 24, 0, 0, 7); g.fill(); g.restore(); g.save(); g.lineWidth = 13; line(s * ex - 30, -6, s * ex + 30, -2); g.restore(); }
    blush(false); blush(true); angerVein(150, -50, .8);
    if (mouth) { g.beginPath(); g.moveTo(-30, 80); g.quadraticCurveTo(0, 62, 30, 80); g.stroke(); }
  }
  if (talk) talkMouth(talk, ['senang', 'imut', 'ngakak', 'duit', 'girang', 'bahagia', 'gemas', 'santai', 'bangga', 'soktahu', 'lega'].includes(kind));
  return c;

  function talkMouth(lvl, happy) {
    const sly = ['curiga', 'datar', 'sinis', 'pusing', 'ragu', 'licik', 'kesal', 'bosan', 'merajuk', 'bangga', 'malu', 'sewot', 'melet'].includes(kind), round = ['kaget', 'tiup', 'gembung', 'sakit', 'syok', 'tersedu', 'nangis', 'cemas', 'memelas', 'ngiler', 'cium'].includes(kind);
    if (kind === 'marah' || kind === 'ngamuk') { // shouting: wide, square-ish, teeth top and bottom
      const w = 30 + lvl * 9, h = 10 + lvl * 13; g.save(); g.translate(0, 70); g.beginPath(); g.rect(-w, -h / 2, 2 * w, h); g.fillStyle = '#5a1712'; g.fill(); g.fillStyle = '#fff6ee'; g.fillRect(-w, -h / 2, 2 * w, Math.min(12, h * .3)); g.fillRect(-w, h / 2 - Math.min(10, h * .25), 2 * w, Math.min(10, h * .25)); g.lineWidth = 11; g.strokeRect(-w, -h / 2, 2 * w, h); g.restore(); return; }
    const w = [0, 22, 30, 36][lvl] * (happy ? 1.45 : round ? .8 : 1) * (kind === 'ngakak' ? 1.3 : 1);
    const h = [0, 14, 28, 42][lvl] * (sly ? .72 : round ? 1.25 : 1) * (kind === 'ngakak' ? 1.25 : 1);
    const shape = () => { g.beginPath(); if (happy) { g.moveTo(-w, 0); g.lineTo(w, 0); g.ellipse(0, 0, w, h + 8, 0, 0, Math.PI, false); g.closePath(); } else g.ellipse(0, 0, w, h * .5 + 5, 0, 0, 7); };
    g.save(); g.translate(sly ? 12 : 0, happy ? 46 : 66); if (sly) g.rotate(-.16);
    shape(); g.fillStyle = '#5a1712'; g.fill();
    g.save(); shape(); g.clip();
    g.fillStyle = '#ff7f78'; g.beginPath(); g.ellipse(0, happy ? h + 8 : h * .5 + 5, w * .62, h * .42 + 6, 0, 0, 7); g.fill();
    if (happy) { g.fillStyle = '#fff6ee'; g.fillRect(-w, -2, 2 * w, Math.min(12, 4 + h * .25)); }
    g.restore();
    shape(); g.lineWidth = 11; g.strokeStyle = BR; g.stroke(); g.restore();
  }
}
function glassesCanvas() { // round detective glasses in face UV space
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2); g.translate(256, 250);
  for (const s of [-1, 1]) { g.beginPath(); g.arc(s * 92, 6, 56, 0, 7); g.fillStyle = 'rgba(200,235,255,.22)'; g.fill(); g.lineWidth = 13; g.strokeStyle = '#2b1a10'; g.stroke();
    g.lineWidth = 5; g.strokeStyle = '#c8962e'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.75)'; g.save(); g.translate(s * 92 - 22, -16); g.rotate(-.7); g.beginPath(); g.ellipse(0, 0, 18, 6, 0, 0, 7); g.fill(); g.restore(); }
  g.lineWidth = 12; g.strokeStyle = '#2b1a10'; g.beginPath(); g.moveTo(-36, 0); g.quadraticCurveTo(0, -18, 36, 0); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 148, -2); g.lineTo(s * 230, -12); g.stroke(); }
  return c;
}
function nerdGlassesCanvas() { // thick square "well, actually" glasses (expression soktahu)
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2); g.translate(256, 250);
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  for (const s of [-1, 1]) { rr(s * 92 - 60, -42, 120, 92, 18); g.fillStyle = 'rgba(255,248,215,.2)'; g.fill(); g.lineWidth = 20; g.strokeStyle = '#3b2416'; g.stroke();
    g.save(); rr(s * 92 - 60, -42, 120, 92, 18); g.clip(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(s * 92 - 40, -42); g.lineTo(s * 92 - 14, -42); g.lineTo(s * 92 - 54, 50); g.lineTo(s * 92 - 70, 50); g.closePath(); g.fill(); g.restore(); }
  g.lineWidth = 18; g.strokeStyle = '#3b2416'; g.beginPath(); g.moveTo(-32, -10); g.quadraticCurveTo(0, -20, 32, -10); g.stroke();
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(s * 152, -16); g.lineTo(s * 232, -24); g.stroke(); }
  return c;
}
function monocleCanvas() { // single monocle on the right eye + gold chain hanging down
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2); g.translate(256, 250);
  g.strokeStyle = '#c8962e'; g.lineWidth = 6; g.setLineDash([9, 5]); g.beginPath(); g.moveTo(92 + 30, 50); g.bezierCurveTo(150, 140, 120, 210, 60, 250); g.stroke(); g.setLineDash([]);
  g.beginPath(); g.arc(92, 6, 54, 0, 7); g.fillStyle = 'rgba(200,235,255,.25)'; g.fill(); g.lineWidth = 15; g.strokeStyle = '#2b1a10'; g.stroke(); g.lineWidth = 8; g.strokeStyle = '#e0ad3a'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.8)'; g.save(); g.translate(72, -16); g.rotate(-.7); g.beginPath(); g.ellipse(0, 0, 18, 6, 0, 0, 7); g.fill(); g.restore();
  return c;
}
function swimCanvas() { // costume swim: retro swimsuit, navy + white stripes over the pawn body (v = 0 at the base)
  const c = document.createElement('canvas'); c.width = 64; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#123582'; g.fillRect(0, 0, 64, 512);
  for (let k = 0; k < 7; k++) { const y = 40 + k * 46; g.fillStyle = '#f4f6fb'; g.fillRect(0, y, 64, 22); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, y + 19, 64, 3); }
  g.fillStyle = '#e8b21c'; g.fillRect(0, 420, 64, 12);   // gold trim at the hem
  return c;
}
function gogglesCanvas() { // swim goggles in face UV space: strap all around the head (never across the lenses), two big tinted lenses with a thick rubber rim, bridge
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2);
  const LX = 96, LY = 2, RX = 70, RY = 60, lens = (x0, s) => { g.beginPath(); g.ellipse(x0 + s * LX, 250 + LY, RX, RY, s * .1, 0, 7); };
  g.fillStyle = '#123582'; g.fillRect(0, 232, 1024, 30); g.fillStyle = '#2d5fc4'; g.fillRect(0, 237, 1024, 8);
  g.strokeStyle = '#0b1a3a'; g.lineWidth = 5; g.beginPath(); g.moveTo(0, 232); g.lineTo(1024, 232); g.moveTo(0, 262); g.lineTo(1024, 262); g.stroke();
  g.save(); g.globalCompositeOperation = 'destination-out'; for (const s of [-1, 1]) { lens(256, s); g.fill(); } g.restore();   // no strap behind the lenses
  g.translate(256, 250);
  const L = s => { g.beginPath(); g.ellipse(s * LX, LY, RX, RY, s * .1, 0, 7); };
  for (const s of [-1, 1]) {
    L(s); g.fillStyle = 'rgba(150,230,255,.24)'; g.fill();
    g.save(); L(s); g.clip(); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 9; g.beginPath(); g.ellipse(s * LX, LY, RX - 16, RY - 16, s * .1, Math.PI * 1.08, Math.PI * 1.42); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.8)'; g.beginPath(); g.arc(s * LX + 40, LY + 34, 6, 0, 7); g.fill(); g.restore();
    L(s); g.lineWidth = 34; g.strokeStyle = '#0b1a3a'; g.stroke(); g.lineWidth = 22; g.strokeStyle = '#19c3e6'; g.stroke();
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.65)'; g.beginPath(); g.ellipse(s * LX, LY, RX + 3, RY + 3, s * .1, Math.PI * 1.1, Math.PI * 1.5); g.stroke();
  }
  g.lineWidth = 22; g.strokeStyle = '#0b1a3a'; g.beginPath(); g.moveTo(-34, -4); g.quadraticCurveTo(0, -18, 34, -4); g.stroke();
  g.lineWidth = 11; g.strokeStyle = '#19c3e6'; g.stroke();
  return c;
}
function plaidCanvas(base, dark, light) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (const [w, col, a] of [[28, dark, .45], [8, dark, .7], [4, light, .6]]) { g.globalAlpha = a; g.fillStyle = col;
    for (let k = 0; k < 256; k += 64) { g.fillRect(k + 10, 0, w, 256); g.fillRect(0, k + 10, 256, w); } }
  g.globalAlpha = 1; return c;
}
function hurtCanvas() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2); g.translate(256, 250);
  const R = rng(31);
  // soot smudges
  for (let i = 0; i < 14; i++) { const x = (R() - .5) * 420, y = (R() - .5) * 300 - 20, r = 18 + R() * 30; const q = g.createRadialGradient(x, y, 0, x, y, r); q.addColorStop(0, 'rgba(40,25,20,.55)'); q.addColorStop(1, 'rgba(40,25,20,0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  // bruise around the right eye
  const b = g.createRadialGradient(96, 12, 10, 96, 12, 62); b.addColorStop(0, 'rgba(120,50,150,.0)'); b.addColorStop(.55, 'rgba(120,50,150,.55)'); b.addColorStop(1, 'rgba(120,50,150,0)'); g.fillStyle = b; g.beginPath(); g.arc(96, 12, 62, 0, 7); g.fill();
  const plaster = (x, y, w, h, rot) => { g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = '#f4c99a'; g.strokeStyle = '#3a1a12'; g.lineWidth = 5; g.beginPath(); const r = h / 2; g.moveTo(-w / 2 + r, -r); g.lineTo(w / 2 - r, -r); g.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2); g.lineTo(-w / 2 + r, r); g.arc(-w / 2 + r, 0, r, Math.PI / 2, Math.PI * 1.5); g.fill(); g.stroke();
    g.fillStyle = '#fbe3c8'; g.fillRect(-w * .16, -r + 4, w * .32, h - 8); g.strokeRect(-w * .16, -r + 4, w * .32, h - 8);
    g.fillStyle = 'rgba(120,70,40,.45)'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(-w * .38 + (i % 3) * 9 + (i > 2 ? w * .6 : 0), (i % 2 ? -5 : 5), 2.2, 0, 7); g.fill(); }
    g.restore(); };
  plaster(-60, -118, 120, 34, .5); plaster(-60, -118, 120, 34, -.5);   // X on the forehead
  plaster(-150, 60, 100, 30, -.35);                                     // cheek
  plaster(160, -60, 80, 26, .9);                                        // temple
  return c;
}
function glossCanvas() { // kilau putih (separate layer so expression swaps/blinks never distort it)
  const c = document.createElement('canvas'); c.width = 2048; c.height = 1024; const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.save(); g.translate(256 - 128, 250 - 138); g.rotate(-.75); g.beginPath(); g.ellipse(0, 0, 44, 15, 0, 0, 7); g.fill(); g.restore();
  g.beginPath(); g.arc(256 - 66, 250 - 168, 8, 0, 7); g.fill();
  return c;
}

/* ---------------- pion model ---------------- */
const U = 1 / 4.65; // model units -> 1.0 = whole pion height
function gradCol(y) { // y in local-world model units
  const t = clamp(y / 4, 0, 1), st = [[0, [.55, .05, .12]], [.35, [.85, .13, .17]], [.65, [.97, .3, .2]], [1, [1, .55, .25]]];
  for (let i = 0; i < 3; i++) if (t <= st[i + 1][0]) { const f = (t - st[i][0]) / (st[i + 1][0] - st[i][0]); return st[i][1].map((v, k) => lerp(v, st[i + 1][1][k], f)); }
  return st[3][1];
}
const capeProfile = spline2D([[1.5, 0], [1.38, .3], [1.08, .55], [.82, 1.05], [.68, 1.6], [.7, 2.0], [.86, 2.15]], 28);
const PHI0 = Math.PI - 1.8, PHIL = 3.6;
const bodySp = spline2D([[0, 0], [1.3, 0], [1.3, .12], [1.15, .2], [1.15, .32], [.9, .5], [.62, 1.05], [.46, 1.6], [.42, 1.95]], 64);
const RAMP = rampTex([140, 175, 215, 245, 255]);
const M = {};
M.body = new Mesh(lathe(bodySp, 64, 0, Math.PI * 2, gradCol));
M.rings = [[1.3, .12], [1.15, .2], [1.15, .32], [.9, .5]].map(([r, y]) => ({ y, mesh: new Mesh(torus(r, .035, 48, 8)) }));
M.collar = new Mesh(torus(.58, .2, 40, 14, y => gradCol(2.05 + y)));
M.head = new Mesh(sphere(1, 48, 32, y => gradCol(2.95 + y * .96)));
M.face = new Mesh(sphere(1.012, 64, 40));
M.crownBand = new Mesh(cylinder(.86, .76, .38, 40, true));
M.crownRing = new Mesh(torus(.86, .06, 40, 8));
M.spikes = []; for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2, h = k % 2 ? .55 : .8; M.spikes.push({ a, h, cone: new Mesh(cone(.14, h, 12)), ball: new Mesh(sphere(.11, 14, 10)) }); }
// cape (dynamic)
function capeMesh(g) { g.base = g.pos.slice(); return new Mesh(g, true); }
M.cape = capeMesh(lathe(capeProfile, 56, PHI0, PHIL));
const edgeL = capeProfile.map(([r, y]) => [r * Math.sin(PHI0), y, r * Math.cos(PHI0)]);
const edgeR = capeProfile.map(([r, y]) => [r * Math.sin(PHI0 + PHIL), y, r * Math.cos(PHI0 + PHIL)]);
const hemPts = []; for (let i = 0; i <= 44; i++) { const ph = PHI0 + i / 44 * PHIL; hemPts.push([1.5 * Math.sin(ph), .02, 1.5 * Math.cos(ph)]); }
M.edgeL = capeMesh(tubeGeo(edgeL, .14, 10, 5)); M.edgeR = capeMesh(tubeGeo(edgeR, .14, 10, 5)); M.hem = capeMesh(tubeGeo(hemPts, .16, 10, 9));
M.ermColl = capeMesh(torus(.76, .17, 44, 12));
M.ermColl.g.rows = 13; M.ermColl.g.cols = 45; M.ermColl.g.wrapCols = true; // only used for normals recompute (tiny motion)
const CAPE_PARTS = [M.cape, M.edgeL, M.edgeR, M.hem, M.ermColl];
// arms (dynamic tubes) + hands
const ARM_N = 14, ARM_R = 10;
function armGeo() { const pts = []; for (let i = 0; i < ARM_N; i++) pts.push([0, i * .1, 0]); return tubeGeo(pts, .15, ARM_R, 1); }
M.arm = [new Mesh(armGeo(), true), new Mesh(armGeo(), true)];
M.hand = new Mesh(sphere(.27, 20, 14));
M.shoulder = new Mesh(sphere(.15, 16, 12));
M.bandRing = new Mesh(torus(1.0, .1, 48, 10));          // head bandage
M.bandKnot = new Mesh(sphere(.16, 14, 10));
M.plaster = new Mesh(fixWinding(fin((() => { const g = G(); const hw = .32, hh = .09, hd = .025; // flat box (body plaster)
  const F = [[[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]], [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]]], S = [hw, hh, hd];
  for (const [n, u, v] of F) { const b = g.pos.length / 3; for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { for (let i = 0; i < 3; i++) g.pos.push(n[i] * S[i] + u[i] * su * S[i] + v[i] * sv * S[i]); g.nrm.push(...n); g.col.push(1, 1, 1); g.uv.push(0, 0); } g.idx.push(b, b + 1, b + 2, b, b + 2, b + 3); }
  return g; })())));
M.finger = new Mesh(cylinder(.075, .085, .42, 12, false));
M.hatDome = new Mesh(sphere(1.04, 40, 24));            // deerstalker: dome + front/back brim + bow on top
M.hatBrim = new Mesh(sphere(1, 40, 12));
M.hatBow = new Mesh(sphere(.13, 14, 10));
M.magRing = new Mesh(torus(.34, .055, 40, 10));           // magnifying glass (ring in the XZ plane, rotated to face forward when drawn)
M.magLens = new Mesh(cylinder(.3, .3, .03, 32, false));
M.magHandle = new Mesh(cylinder(.06, .075, .55, 12, false));
M.fingerTip = new Mesh(sphere(.085, 10, 8));
const TEX = { erm: texFromCanvas(ermineCanvas(), true) };
const EXPRS = ['datar', 'imut', 'senang', 'kaget', 'penasaran', 'curiga', 'pusing', 'sinis', 'ngakak', 'duit', 'marah', 'sakit', 'kecewa', 'ragu', 'licik',
  'nangis', 'tersedu', 'girang', 'bahagia', 'cium', 'lega', 'gemas', 'syok', 'kesal', 'ngiler', 'merajuk', 'memelas', 'bosan', 'cemas', 'bangga', 'ngamuk', 'santai', 'soktahu', 'melet', 'gembung', 'tiup', 'malu', 'sewot'];
const BLINKABLE = ['datar', 'senang', 'kaget', 'penasaran', 'sinis', 'marah', 'sakit', 'ragu', 'licik', 'nangis', 'girang', 'syok', 'ngiler', 'merajuk', 'memelas', 'bosan', 'cemas', 'bangga', 'ngamuk', 'soktahu', 'melet', 'tiup', 'malu', 'sewot']; // the others already have closed / slit eyes
const FACE_CACHE = {};
function faceTexture(kind, closed, talk) { // lazily built: expression x blink x mouth-open level
  if (!EXPRS.includes(kind)) kind = 'datar';
  const key = kind + (closed && BLINKABLE.includes(kind) ? '|c' : '|o') + '|' + (talk | 0);
  return FACE_CACHE[key] || (FACE_CACHE[key] = texFromCanvas(faceCanvas(kind, closed && BLINKABLE.includes(kind), talk | 0), false));
}
const FACES = {}; for (const k of EXPRS) FACES[k] = faceTexture(k, false, 0);
const GLOSS = texFromCanvas(glossCanvas(), false);
const HURT = texFromCanvas(hurtCanvas(), false);
const GLASSES = texFromCanvas(glassesCanvas(), false);
const MONOCLE = texFromCanvas(monocleCanvas(), false);
const NERD = texFromCanvas(nerdGlassesCanvas(), false);
TEX.plaid = texFromCanvas(plaidCanvas('#b8874f', '#5a3a1e', '#e8cfa0'), true);
TEX.tweed = texFromCanvas(plaidCanvas('#8a5e34', '#3e2614', '#c49a64'), true);
TEX.swim = texFromCanvas(swimCanvas(), true);
const GOGGLES = texFromCanvas(gogglesCanvas(), false);
const blobMesh = new Mesh((() => { const g = G(); g.pos.push(-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1); for (let i = 0; i < 4; i++) { g.nrm.push(0, 1, 0); g.col.push(1, 1, 1); g.uv.push(0, 0); } g.idx.push(0, 2, 1, 0, 3, 2); return fin(g); })());

/* ---------------- physics state ---------------- */
function mkSpring() { return { p: 0, v: 0 }; }
function stepSpring(s, target, k, c, dt) { s.v += (k * (target - s.p) - c * s.v) * dt; s.p += s.v * dt; }
const PH = { hy: mkSpring(), hz: mkSpring(), hx: mkSpring(), fl: mkSpring(), lf: mkSpring(), trx: mkSpring(), trz: mkSpring(), cx: mkSpring(), cz: mkSpring(), cy: mkSpring() };
function resetPhysics() { for (const k in PH) { PH[k].p = 0; PH[k].v = 0; } }
function physStep(vx, vy, vz, dt) { // velocities in "skill units" (pion height = 2)
  const n = 4, h = dt / n;
  for (let i = 0; i < n; i++) {
    stepSpring(PH.hy, clamp(-vy * .022, -.14, .14), 260, 15, h);
    stepSpring(PH.hz, clamp(-vz * .028, -.10, .10), 220, 14, h);
    stepSpring(PH.hx, clamp(-vx * .028, -.10, .10), 220, 14, h);
    stepSpring(PH.fl, clamp(-vy * .07, -.25, .5), 70, 5, h);
    stepSpring(PH.lf, clamp(-vy * .14, -.3, .6), 60, 4.5, h);
    stepSpring(PH.trx, clamp(vx * .14, -.5, .5), 50, 4, h);
    stepSpring(PH.trz, clamp(vz * .14, -.25, 1.2), 50, 4, h);
    // crown: loose on the head, so it tips against the motion, overshoots and settles a beat later than the head
    // (cx / cz = the crown's own roll / pitch in the world; it chases the head's roll -.7 hx / pitch .7 hz)
    stepSpring(PH.cx, -.7 * PH.hx.p + clamp(vx * .025, -.14, .14), 95, 5.5, h);
    stepSpring(PH.cz, .7 * PH.hz.p + clamp(-vz * .025, -.12, .12), 95, 5.5, h);
    stepSpring(PH.cy, clamp(-vy * .014, -.035, .06), 150, 7.5, h);   // crown height: lags and lifts a little on landings
  }
}
function deformCape(time) {
  const fl = PH.fl.p, lf = PH.lf.p, tx = PH.trx.p, tz = PH.trz.p, mag = Math.min(1, Math.abs(fl) + Math.abs(lf) + (Math.abs(tx) + Math.abs(tz)) * .4);
  for (const m of CAPE_PARTS) {
    const g = m.g, b = g.base, p = g.pos;
    for (let i = 0; i < p.length; i += 3) {
      const bx = b[i], by = b[i + 1], bz = b[i + 2];
      let w = Math.max(0, 1 - by / 2.15); w *= w;
      const riak = Math.sin(Math.atan2(bx, bz) * 5 + time * 13 + by * 3) * (.03 + .12 * mag) * w;
      const k = 1 + fl * w + riak;
      p[i] = bx * k - tx * w * 1.2; p[i + 1] = by + lf * w * .6 + riak * .8; p[i + 2] = bz * k - tz * w * 1.2;
    }
    gridNormals(g); m.upload();
  }
}
function buildArm(mesh, S, E, Hh, rad0, rad1) { // quadratic bezier S->Hh with control E
  const g = mesh.g, P = g.pos; let vi = 0;
  const pts = []; for (let i = 0; i < ARM_N; i++) { const t = i / (ARM_N - 1), a = 1 - t; pts.push([a * a * S[0] + 2 * a * t * E[0] + t * t * Hh[0], a * a * S[1] + 2 * a * t * E[1] + t * t * Hh[1], a * a * S[2] + 2 * a * t * E[2] + t * t * Hh[2]]); }
  for (let i = 0; i < ARM_N; i++) {
    const p = pts[i], a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, ARM_N - 1)];
    let t = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const tl = Math.hypot(...t) || 1; t = t.map(v => v / tl);
    // rotation-minimising frame: carry the previous ring's side vector along the arm (a fixed reference
    // vector flips when the arm passes vertical, which twists the tube and spikes its outline)
    let s;
    if (i && buildArm.ps) { const q = buildArm.ps, dq = q[0] * t[0] + q[1] * t[1] + q[2] * t[2]; s = [q[0] - dq * t[0], q[1] - dq * t[1], q[2] - dq * t[2]]; }
    if (!s || Math.hypot(...s) < 1e-4) { const ref = Math.abs(t[1]) > .9 ? [1, 0, 0] : [0, 1, 0]; s = [t[1] * ref[2] - t[2] * ref[1], t[2] * ref[0] - t[0] * ref[2], t[0] * ref[1] - t[1] * ref[0]]; }
    const sl = Math.hypot(...s) || 1; s = s.map(v => v / sl); buildArm.ps = s;
    const u = [t[1] * s[2] - t[2] * s[1], t[2] * s[0] - t[0] * s[2], t[0] * s[1] - t[1] * s[0]];
    const rad = lerp(rad0, rad1, i / (ARM_N - 1));
    for (let j = 0; j <= ARM_R; j++) { const ang = j / ARM_R * Math.PI * 2, c = Math.cos(ang), sn = Math.sin(ang); P[vi * 3] = p[0] + (s[0] * c + u[0] * sn) * rad; P[vi * 3 + 1] = p[1] + (s[1] * c + u[1] * sn) * rad; P[vi * 3 + 2] = p[2] + (s[2] * c + u[2] * sn) * rad; vi++; }
  }
  gridNormals(g); mesh.upload();
}

/* ---------------- draw helpers ---------------- */
function setCommon(P, VP, L) {
  gl.useProgram(P.p); gl.uniformMatrix4fv(P.u.uVP, false, VP);
}
function drawToon(Msh, model, VP, L, o) {
  const P = toon; gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uVP, false, VP); gl.uniformMatrix4fv(P.u.uM, false, model); gl.uniformMatrix3fv(P.u.uNM, false, normalMat(model));
  gl.uniform3fv(P.u.uColor, o.color || [1, 1, 1]); gl.uniform1f(P.u.uUseVC, o.vc ? 1 : 0); gl.uniform1f(P.u.uUseTex, o.tex ? 1 : 0); gl.uniform1f(P.u.uDouble, o.dbl ? 1 : 0);
  if (L.pos) { const dx = L.pos[0], dy = L.pos[1] - 3.0, dz = L.pos[2]; gl.uniform4f(P.u.uLPos, L.pos[0], L.pos[1], L.pos[2], 1.5); gl.uniform1f(P.u.uLAtt, dx * dx + dy * dy + dz * dz); }
  else gl.uniform4f(P.u.uLPos, 0, 0, 0, 0);
  gl.uniform3fv(P.u.uLDir, L.dir); gl.uniform3fv(P.u.uKey, L.key); gl.uniform3fv(P.u.uAmb, L.amb); gl.uniform3fv(P.u.uSky, L.sky); gl.uniform3fv(P.u.uGnd, L.gnd); gl.uniform1f(P.u.uExp, L.exp); gl.uniform3fv(P.u.uRim, L.rim); if (P.u.uSoft) gl.uniform1f(P.u.uSoft, L.soft || 0); if (P.u.uFlat) gl.uniform1f(P.u.uFlat, L.flat || 0); if (P.u.uR2) { gl.uniform1f(P.u.uR2, window.STYLE2D ? 1 : 0); gl.uniform1f(P.u.uFace, o.face ? 1 : 0); gl.uniform4fv(P.u.uEdge, o.edge ? [...o.edge, 1] : [0, 0, 0, 0]); } window.OUTK = L.flat ? 1.12 : L.soft ? 1 - .45 * L.soft : 1; gl.uniform1f(P.u.uFlash, FLASH); gl.uniform1f(P.u.uSpec, o.spec || 0); gl.uniform1f(P.u.uCut, o.cut ? 1 : 0); gl.uniform1f(P.u.uSoot, o.noSoot ? 0 : SOOT); gl.uniform1f(P.u.uSootK, o.sootK || 1); gl.uniform3fv(P.u.uEye, window.EYE || [0, 10, 20]);
  const ao = o.ao || [9, 10, 9, 10, 0]; gl.uniform4fv(P.u.uAO, ao.slice(0, 4)); gl.uniform1f(P.u.uAOs, ao[4]);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, o.tex || RAMP); gl.uniform1i(P.u.uTex, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, RAMP); gl.uniform1i(P.u.uRamp, 1);
  if (o.dbl) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
  Msh.draw();
}
const OUTCOL = [.2, .05, .04], OUT2D = [.055, .05, .065];   // 2D reference style: near-black ink
let FLASH = 0, SOOT = 0; // SOOT: 0..1 burn smudges on the toon materials (hurt state)
function drawOutline(Msh, model, VP, thick, radial, dbl, col) {
  const P = outl; gl.useProgram(P.p);
  gl.uniformMatrix4fv(P.u.uVP, false, VP); gl.uniformMatrix4fv(P.u.uM, false, model); gl.uniform1f(P.u.uThick, thick * (window.OUTK || 1) * (window.STYLE2D ? 1.3 : 1)); gl.uniform1f(P.u.uRadial, radial ? 1 : 0); gl.uniform3fv(P.u.uCol, col || (window.STYLE2D ? OUT2D : OUTCOL)); gl.uniform1f(P.u.uFlash, FLASH);
  if (dbl) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); }
  Msh.draw();
}
function drawShadowMesh(Msh, model, VP, lray, jit, col, fadeH) {
  const P = shadP; gl.useProgram(P.p); gl.uniform1f(P.u.uFadeH, fadeH || 1e4);
  gl.uniformMatrix4fv(P.u.uVP, false, VP); gl.uniformMatrix4fv(P.u.uM, false, model); gl.uniform3fv(P.u.uLRay, lray); gl.uniform2fv(P.u.uJit, jit); gl.uniform4fv(P.u.uCol, col);
  gl.disable(gl.CULL_FACE); Msh.draw();
}
/* ---------------- motion blur: average several renders inside the shutter interval ----------------
   renderAt(u): draw the scene u frames before the current frame (0 <= u <= shutter).
   compose(): flatten every layer into one canvas and return it.  probe(): screen points that move with the
   character (head, hands, body). The two extreme samples decide how many in-between samples are needed,
   so still frames cost only two renders and fast moves get up to maxN. Accumulation is premultiplied float. */
window.MB = { maxN: 16, shutter: .4, pxPerSample: 2, maxPx: 28, maxRel: .045 }; // px in 1078-wide layout pixels (scaled for 4K)
function mbCapture(renderAt, compose, probe) {
  // centred shutter: samples from S/2 frames before to S/2 frames after the frame time, so an impact frame stays
  // crisp (nothing moves after it) and only carries a light trail of the fall.
  const C = window.MB, N0 = Math.max(1, C.maxN | 0), S = C.shutter, hw0 = S / 2;
  window.__mbN = 1;
  if (N0 < 2 || !(S > 0)) { renderAt(0); return compose(); }
  const span = (a, b) => { let d = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] && b[i]) d = Math.max(d, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1])); return d; };
  renderAt(hw0); const pA = probe();
  renderAt(-hw0); const pB = probe();
  renderAt(0); const p0 = probe();
  let d = span(pA, p0) + span(p0, pB);                                // path length through the shutter
  if (d < 1.5) return compose();                                     // practically still: the sharp frame, no pixel work
  const tall = p0[1] && p0[2] ? Math.hypot(p0[1][0] - p0[2][0], p0[1][1] - p0[2][1]) : 400; // ground/base -> crown top, layout px
  const cap = Math.max(6, Math.min(C.maxPx, C.maxRel * tall));      // smear at most ~4.5% of Pion's on-screen height
  let hw = hw0; if (d > cap) { hw = hw0 * cap / d; d = cap; }        // very fast: shorten the shutter so Pion stays readable
  const N = Math.min(N0, Math.max(3, Math.ceil(d / C.pxPerSample) + 1));
  // only the area the character sweeps is averaged; the rest of the frame is the sharp u = 0 image
  const cv0 = compose(), w = cv0.width, h = cv0.height, k = w / W, pts = p0.concat(pA, pB).filter(Boolean);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of pts) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
  const mg = Math.max(x1 - x0, y1 - y0) * .6 + 60;
  const bx = Math.max(0, Math.floor((x0 - mg) * k)), by = Math.max(0, Math.floor((y0 - mg) * k));
  const bw = Math.min(w, Math.ceil((x1 + mg) * k)) - bx, bh = Math.min(h, Math.ceil((y1 + mg) * k)) - by;
  if (bw <= 0 || bh <= 0) return cv0;
  const keep = cv0.getContext('2d').getImageData(0, 0, w, h);         // sharp full frame (outside the box)
  const acc = new Float32Array(bw * bh * 4);
  const add = c => { const d8 = c.getContext('2d').getImageData(bx, by, bw, bh).data;
    for (let i = 0; i < d8.length; i += 4) { const a = d8[i + 3]; if (!a) continue; const q = a / 255; acc[i] += d8[i] * q; acc[i + 1] += d8[i + 1] * q; acc[i + 2] += d8[i + 2] * q; acc[i + 3] += a; } };
  for (let i = 0; i < N; i++) { renderAt(hw - 2 * hw * i / (N - 1)); add(compose()); }
  const out = compose(), g = out.getContext('2d'); g.putImageData(keep, 0, 0);
  const img = g.createImageData(bw, bh), o = img.data;
  for (let i = 0; i < o.length; i += 4) { const a = acc[i + 3]; if (a <= 0) continue; o[i] = acc[i] / a * 255; o[i + 1] = acc[i + 1] / a * 255; o[i + 2] = acc[i + 2] / a * 255; o[i + 3] = a / N; }
  g.putImageData(img, bx, by); window.__mbN = N; return out;
}
window.__engine = true;
