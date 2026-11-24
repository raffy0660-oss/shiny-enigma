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
  path([["M", 0.455, 0.37], ["L", 0.445, 0.5], ["Q", 0.38, 0.53, 0.33, 0.57], ["Q", 0.5, 0.645, 0.67, 0.57], ["Q", 0.62, 0.53, 0.562, 0.5], ["L", 0.55, 0.37]]);
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
  path([["M", 0.395, 0.54], ["C", 0.375, 0.42, 0.37, 0.25, 0.42, 0.212], ["Q", 0.5, 0.186, 0.582, 0.212], ["C", 0.632, 0.25, 0.625, 0.42, 0.605, 0.54], ["Q", 0.66, 0.565, 0.695, 0.555], ["C", 0.7, 0.42, 0.69, 0.22, 0.6, 0.178], ["Q", 0.5, 0.15, 0.4, 0.178], ["C", 0.31, 0.22, 0.3, 0.42, 0.31, 0.555], ["Q", 0.35, 0.565, 0.395, 0.54]]);
  fillInk(lin(0.3, 0.12, 0.7, 0.56, [[0, "#3e2915"], [0.5, "#26180b"], [1, "#150d06"]]), 2.8);
  g.strokeStyle = "rgba(130,90,45,.4)"; g.lineWidth = 2; for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { const x = 0.5 + s * (0.12 + i * 0.012); g.beginPath(); g.moveTo(X(x), Y(0.22)); g.bezierCurveTo(X(x + s * 0.04), Y(0.3), X(x + s * 0.03), Y(0.45), X(x + s * 0.035), Y(0.55)); g.stroke(); }
  // face: rounder oval, warm light from her right, shadowed far cheek, soft eyes without brows, the smile
  g.save(); g.beginPath(); g.ellipse(X(0.5), Y(0.3), X(0.1), Y(0.09), 0.03, 0, 7); g.clip();
  g.fillStyle = rad(0.47, 0.285, 0.02, 0.15, [[0, "#f8d394"], [0.55, "#e4b071"], [1, "#b47e44"]]); g.fillRect(0, 0, w, h);
  g.fillStyle = rad(0.59, 0.325, 0.0, 0.08, [[0, "rgba(130,75,35,.3)"], [1, "rgba(130,75,35,0)"]]); g.fillRect(0, 0, w, h); g.restore();
  g.beginPath(); g.ellipse(X(0.5), Y(0.3), X(0.1), Y(0.09), 0.03, 0, 7); g.strokeStyle = "rgba(42,22,8,.8)"; g.lineWidth = 2.8; g.stroke();
  g.fillStyle = "rgba(60,40,20,.16)"; g.beginPath(); g.moveTo(X(0.385), Y(0.225)); g.quadraticCurveTo(X(0.5), Y(0.178), X(0.62), Y(0.225)); g.lineTo(X(0.615), Y(0.236)); g.quadraticCurveTo(X(0.5), Y(0.192), X(0.39), Y(0.236)); g.fill();   // veil
  for (const x of [0.457, 0.55]) { g.fillStyle = "rgba(150,90,50,.3)"; g.beginPath(); g.ellipse(X(x), Y(0.284), X(0.034), Y(0.014), 0, 0, 7); g.fill();
    g.fillStyle = "#f6ead4"; g.beginPath(); g.ellipse(X(x), Y(0.287), X(0.021), Y(0.0085), 0, 0, 7); g.fill();
    g.fillStyle = "#4a2c12"; g.beginPath(); g.arc(X(x + 0.006), Y(0.288), X(0.0088), 0, 7); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(X(x + 0.01), Y(0.285), X(0.0026), 0, 7); g.fill();
    g.strokeStyle = "rgba(42,22,8,.8)"; g.lineWidth = 2.4; g.beginPath(); g.ellipse(X(x), Y(0.287), X(0.023), Y(0.0095), 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
  g.strokeStyle = "rgba(120,70,35,.5)"; g.lineWidth = 2.6; g.beginPath(); g.moveTo(X(0.507), Y(0.292)); g.quadraticCurveTo(X(0.495), Y(0.318), X(0.513), Y(0.326)); g.stroke();
  g.fillStyle = "rgba(205,115,80,.18)"; for (const x of [0.445, 0.57]) { g.beginPath(); g.arc(X(x), Y(0.322), X(0.026), 0, 7); g.fill(); }
  g.strokeStyle = "#8a4428"; g.lineWidth = 3.2; g.beginPath(); g.moveTo(X(0.472), Y(0.345)); g.bezierCurveTo(X(0.492), Y(0.351), X(0.52), Y(0.351), X(0.54), Y(0.341)); g.stroke();
  g.strokeStyle = "rgba(138,68,40,.4)"; g.lineWidth = 2; g.beginPath(); g.moveTo(X(0.49), Y(0.356)); g.quadraticCurveTo(X(0.506), Y(0.36), X(0.523), Y(0.355)); g.stroke();
  // varnish, craquelure, darker edges
  g.fillStyle = "rgba(175,125,45,.15)"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(40,25,10,.1)"; g.lineWidth = 1; for (let i = 0; i < 420; i++) { let x = rnd() * w, y = rnd() * h; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (rnd() - 0.5) * 24; y += (rnd() - 0.5) * 24; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = rad(0.5, 0.48, 0.32, 0.85, [[0, "rgba(0,0,0,0)"], [1, "rgba(25,15,5,.6)"]]); g.fillRect(0, 0, w, h); }); }
