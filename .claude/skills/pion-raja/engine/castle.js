'use strict';
/* Procedural royal throne-room background for reaction mode (no external images).
   paintCastle() paints once into a 2x canvas in frame coordinates (1078 x 1920); drawCastle() draws it every frame
   with camera zoom + animated touches (flicker, light motes, beams). Optional QR "SCAN ME" board on the wall. */
const CASTLE = { cv: null, S: 2, board: null, boardRect: [96, 430, 330, 450], floorY: 1185 };

function qrMatrix(seed, n) { // decorative QR-looking matrix (finder + timing patterns, pseudo-random data)
  n = n || 25; const r = rng(seed || 4242), m = [];
  for (let y = 0; y < n; y++) { m.push([]); for (let x = 0; x < n; x++) m[y].push(r() < .5 ? 1 : 0); }
  const finder = (ox, oy) => { for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) { const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const ring = Math.max(Math.abs(x - 3), Math.abs(y - 3)); m[Y][X] = ring === 4 ? 0 : ring === 2 ? 0 : 1; } };
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) { m[6][i] = i % 2 ? 0 : 1; m[i][6] = i % 2 ? 0 : 1; }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { const ring = Math.max(Math.abs(x), Math.abs(y)); m[n - 9 + y][n - 9 + x] = ring === 1 ? 0 : 1; }
  return m;
}
function drawQR(g, x, y, size, seed, fg) {
  const m = qrMatrix(seed), n = m.length, c = size / (n + 2);
  g.fillStyle = '#fff'; g.fillRect(x, y, size, size); g.fillStyle = fg || '#111';
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (m[j][i]) g.fillRect(x + (i + 1) * c, y + (j + 1) * c, c + .6, c + .6);
}

function paintCastle() {
  const S = CASTLE.S, W0 = 1078, H0 = 1920, c = document.createElement('canvas'); c.width = W0 * S; c.height = H0 * S;
  const g = c.getContext('2d'); g.scale(S, S); const R = rng(77), FY = CASTLE.floorY;
  const lg = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => q.addColorStop(o, col)); return q; };
  const rg = (x, y, r, stops) => { const q = g.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => q.addColorStop(o, col)); return q; };
  const OUT = '#2a0f08';
  // ---------- wall: warm stone blocks
  g.fillStyle = lg(0, 0, 0, FY, [[0, '#4a2418'], [.35, '#8a5a3a'], [1, '#b98d5f']]); g.fillRect(0, 0, W0, FY);
  for (let row = 0, y = 0; y < FY; row++, y += 46) for (let x = -((row % 2) * 60); x < W0; x += 120) {
    const t = R(); g.fillStyle = `rgba(${t < .5 ? '255,230,190' : '60,30,15'},${.05 + R() * .07})`; g.fillRect(x + 2, y + 2, 116, 42);
    g.strokeStyle = 'rgba(50,25,12,.35)'; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 118, 44);
  }
  // red damask panel behind the throne
  g.fillStyle = lg(0, 380, 0, FY, [[0, '#7a0f1c'], [1, '#a5182a']]); g.fillRect(250, 360, 578, FY - 360);
  g.save(); g.globalAlpha = .18; g.fillStyle = '#ffcf5a';
  for (let y = 400; y < FY; y += 70) for (let x = 270 + ((y / 70) % 2) * 35; x < 820; x += 70) { g.beginPath(); g.moveTo(x, y - 18); g.quadraticCurveTo(x + 14, y, x, y + 18); g.quadraticCurveTo(x - 14, y, x, y - 18); g.fill(); g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  g.restore(); g.strokeStyle = '#e8b33a'; g.lineWidth = 8; g.strokeRect(254, 364, 570, FY - 368); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(248, 358, 582, FY - 356);
  // ---------- stained-glass windows
  const windowAt = (cx) => {
    const w = 190, top = 400, bot = 930, x0 = cx - w / 2;
    g.save(); g.beginPath(); g.moveTo(x0, bot); g.lineTo(x0, top + w / 2); g.arc(cx, top + w / 2, w / 2, Math.PI, 0); g.lineTo(x0 + w, bot); g.closePath();
    g.fillStyle = '#3b2216'; g.lineWidth = 26; g.strokeStyle = '#d9a640'; g.stroke(); g.lineWidth = 32; g.strokeStyle = 'rgba(0,0,0,.25)'; g.clip();
    const cols = ['#2f6fe0', '#e23a3a', '#f2c230', '#33b36b', '#8e44d6', '#3fc5e8'];
    for (let y = top - 10; y < bot; y += 34) for (let x = x0 - 10; x < x0 + w + 10; x += 30) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = .85; g.fillRect(x, y, 30, 34); }
    g.globalAlpha = 1; g.fillStyle = rg(cx, top + 120, 220, [[0, 'rgba(255,255,230,.75)'], [1, 'rgba(255,255,230,0)']]); g.fillRect(x0, top, w, bot - top);
    g.strokeStyle = '#222'; g.lineWidth = 4; for (let y = top; y < bot; y += 34) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + w, y); g.stroke(); }
    for (let x = x0; x < x0 + w; x += 30) { g.beginPath(); g.moveTo(x, top); g.lineTo(x, bot); g.stroke(); }
    // rose / crown motif
    g.fillStyle = '#ffd34d'; g.strokeStyle = OUT; g.lineWidth = 4; g.beginPath(); const cy = top + 95;
    g.moveTo(cx - 40, cy + 22); g.lineTo(cx - 46, cy - 18); g.lineTo(cx - 22, cy + 2); g.lineTo(cx, cy - 30); g.lineTo(cx + 22, cy + 2); g.lineTo(cx + 46, cy - 18); g.lineTo(cx + 40, cy + 22); g.closePath(); g.fill(); g.stroke();
    g.restore();
    g.beginPath(); g.moveTo(x0, bot); g.lineTo(x0, top + w / 2); g.arc(cx, top + w / 2, w / 2, Math.PI, 0); g.lineTo(x0 + w, bot); g.lineWidth = 16; g.strokeStyle = '#e8b33a'; g.stroke(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = lg(0, bot, 0, bot + 34, [[0, '#f0c050'], [1, '#9a6a1a']]); g.fillRect(x0 - 24, bot, w + 48, 30); g.strokeRect(x0 - 24, bot, w + 48, 30);
  };
  windowAt(170); windowAt(908);
  // ---------- pillars
  const pillar = (cx) => {
    const w = 64; g.fillStyle = lg(cx - w / 2, 0, cx + w / 2, 0, [[0, '#cfc6bb'], [.45, '#fffaf2'], [1, '#a59a8e']]); g.fillRect(cx - w / 2, 330, w, FY - 330);
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; for (let k = -2; k <= 2; k++) { g.beginPath(); g.moveTo(cx + k * 11, 380); g.lineTo(cx + k * 11, FY - 60); g.stroke(); }
    for (const [y, h] of [[330, 50], [FY - 70, 70]]) { g.fillStyle = lg(0, y, 0, y + h, [[0, '#ffe08a'], [.5, '#e0a930'], [1, '#8a5a12']]); g.fillRect(cx - w / 2 - 14, y, w + 28, h); g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(cx - w / 2 - 14, y, w + 28, h); }
  };
  pillar(318); pillar(760);
  // ---------- banners
  const banner = (cx, col) => {
    const w = 104, top = 330, bot = 860; g.fillStyle = lg(cx - w / 2, 0, cx + w / 2, 0, [[0, col[0]], [.5, col[1]], [1, col[0]]]);
    g.beginPath(); g.moveTo(cx - w / 2, top); g.lineTo(cx + w / 2, top); g.lineTo(cx + w / 2, bot); g.lineTo(cx, bot - 50); g.lineTo(cx - w / 2, bot); g.closePath(); g.fill();
    g.lineWidth = 8; g.strokeStyle = '#f0c040'; g.stroke(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    // emblem: crown over a pawn
    const ey = top + 190; g.fillStyle = '#ffd34d'; g.strokeStyle = OUT; g.lineWidth = 3;
    g.beginPath(); g.arc(cx, ey, 18, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 14, ey + 14); g.quadraticCurveTo(cx - 8, ey + 40, cx - 26, ey + 66); g.lineTo(cx + 26, ey + 66); g.quadraticCurveTo(cx + 8, ey + 40, cx + 14, ey + 14); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx - 20, ey - 14); g.lineTo(cx - 24, ey - 40); g.lineTo(cx - 10, ey - 26); g.lineTo(cx, ey - 44); g.lineTo(cx + 10, ey - 26); g.lineTo(cx + 24, ey - 40); g.lineTo(cx + 20, ey - 14); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#e8b33a'; g.fillRect(cx - w / 2 - 10, top - 14, w + 20, 16); g.strokeRect(cx - w / 2 - 10, top - 14, w + 20, 16);
  };
  banner(394, ['#8a0d1d', '#d0263a']); banner(684, ['#8a0d1d', '#d0263a']);
  // royal crest above the throne
  { const cx = 539, cy = 470; g.fillStyle = lg(0, cy - 70, 0, cy + 90, [[0, '#2f5fd0'], [1, '#173a8a']]); g.strokeStyle = '#f0c040'; g.lineWidth = 10;
    g.beginPath(); g.moveTo(cx - 70, cy - 70); g.lineTo(cx + 70, cy - 70); g.lineTo(cx + 70, cy + 10); g.quadraticCurveTo(cx + 70, cy + 70, cx, cy + 100); g.quadraticCurveTo(cx - 70, cy + 70, cx - 70, cy + 10); g.closePath(); g.fill(); g.stroke(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    for (const s of [-1, 1]) { g.save(); g.translate(cx, cy + 10); g.rotate(s * .75); g.fillStyle = '#dfe6ee'; g.fillRect(-6, -150, 12, 260); g.strokeRect(-6, -150, 12, 260); g.fillStyle = '#e8b33a'; g.fillRect(-30, 70, 60, 12); g.strokeRect(-30, 70, 60, 12); g.restore(); }
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(cx, cy + 10, 26, 0, 7); g.fill(); g.stroke(); }
  // ---------- throne
  { const cx = 539, top = 590, seat = 1040, w = 360;
    g.fillStyle = lg(cx - w / 2, 0, cx + w / 2, 0, [[0, '#8a5a12'], [.2, '#ffd75e'], [.5, '#f0b93a'], [.8, '#ffd75e'], [1, '#8a5a12']]);
    g.beginPath(); g.moveTo(cx - w / 2, seat + 140); g.lineTo(cx - w / 2, top + 80); g.quadraticCurveTo(cx - w / 2, top, cx - 60, top - 10); g.quadraticCurveTo(cx, top - 70, cx + 60, top - 10); g.quadraticCurveTo(cx + w / 2, top, cx + w / 2, top + 80); g.lineTo(cx + w / 2, seat + 140); g.closePath(); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = lg(0, top, 0, seat, [[0, '#c41e33'], [1, '#7a0c1a']]); g.beginPath(); g.moveTo(cx - w / 2 + 40, seat); g.lineTo(cx - w / 2 + 40, top + 90); g.quadraticCurveTo(cx, top + 10, cx + w / 2 - 40, top + 90); g.lineTo(cx + w / 2 - 40, seat); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#ffd34d'; for (let y = top + 110; y < seat - 20; y += 60) for (let x = cx - 110 + ((y / 60) % 2) * 30; x <= cx + 110; x += 60) { g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    g.beginPath(); const ct = top - 60; g.moveTo(cx - 60, ct + 30); g.lineTo(cx - 70, ct - 20); g.lineTo(cx - 34, ct + 6); g.lineTo(cx, ct - 40); g.lineTo(cx + 34, ct + 6); g.lineTo(cx + 70, ct - 20); g.lineTo(cx + 60, ct + 30); g.closePath(); g.fillStyle = '#ffd34d'; g.fill(); g.stroke();
    for (const x of [cx - 70, cx, cx + 70]) { g.beginPath(); g.arc(x, x === cx ? ct - 46 : ct - 26, 9, 0, 7); g.fillStyle = '#e8243a'; g.fill(); g.stroke(); }
    for (const s of [-1, 1]) { const ax = cx + s * (w / 2 + 10); g.fillStyle = lg(0, seat - 60, 0, seat + 140, [[0, '#ffd75e'], [1, '#8a5a12']]); g.fillRect(ax - 34, seat - 60, 68, 200); g.strokeRect(ax - 34, seat - 60, 68, 200); g.beginPath(); g.arc(ax, seat - 64, 30, 0, 7); g.fill(); g.stroke(); }
    g.fillStyle = lg(0, seat, 0, seat + 60, [[0, '#d4223a'], [1, '#7a0c1a']]); g.fillRect(cx - w / 2 + 20, seat, w - 40, 60); g.strokeRect(cx - w / 2 + 20, seat, w - 40, 60); }
  // ---------- chandelier + torches
  { const cx = 539, y = 300; g.strokeStyle = '#3a2410'; g.lineWidth = 5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, y); g.stroke();
    g.fillStyle = lg(0, y, 0, y + 40, [[0, '#ffe08a'], [1, '#9a6a1a']]); g.beginPath(); g.ellipse(cx, y + 20, 190, 26, 0, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = 3; g.stroke();
    for (let k = -4; k <= 4; k++) { const x = cx + k * 44; g.fillStyle = '#fff4dc'; g.fillRect(x - 7, y - 30, 14, 36); g.strokeRect(x - 7, y - 30, 14, 36); }
    for (let k = -3; k <= 3; k++) { g.fillStyle = 'rgba(200,240,255,.8)'; g.beginPath(); g.moveTo(cx + k * 52, y + 44); g.lineTo(cx + k * 52 - 7, y + 64); g.lineTo(cx + k * 52, y + 84); g.lineTo(cx + k * 52 + 7, y + 64); g.closePath(); g.fill(); } }
  for (const x of [52, 1026]) { const y = 1010; g.fillStyle = '#5a3a1a'; g.fillRect(x - 10, y, 20, 70); g.fillStyle = lg(0, y - 20, 0, y + 10, [[0, '#ffd75e'], [1, '#8a5a12']]); g.beginPath(); g.moveTo(x - 26, y - 20); g.lineTo(x + 26, y - 20); g.lineTo(x + 12, y + 8); g.lineTo(x - 12, y + 8); g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 3; g.stroke(); }
  // ---------- curtains + valance
  const curtain = (x0, x1, flip) => {
    const n = 7, wdt = (x1 - x0) / n;
    for (let i = 0; i < n; i++) { const xa = x0 + i * wdt; g.fillStyle = lg(xa, 0, xa + wdt, 0, [[0, '#5e0812'], [.5, '#d8263e'], [1, '#5e0812']]); g.beginPath(); g.moveTo(xa, 280); g.lineTo(xa + wdt, 280);
      const pinch = flip ? (1 - i / n) : i / n; g.quadraticCurveTo(xa + wdt - 40 * pinch, 900, xa + wdt + 20 * (flip ? -1 : 1), FY + 140); g.lineTo(xa + 20 * (flip ? -1 : 1), FY + 140); g.quadraticCurveTo(xa - 40 * pinch, 900, xa, 280); g.fill(); }
    const tx = flip ? x0 + 30 : x1 - 30; g.fillStyle = '#f0c040'; g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath(); g.ellipse(tx, 900, 26, 14, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(tx - 16, 910); g.lineTo(tx + 16, 910); g.lineTo(tx + 10, 990); g.lineTo(tx - 10, 990); g.closePath(); g.fill(); g.stroke();
  };
  curtain(-20, 120, false); curtain(958, 1098, true);
  g.fillStyle = lg(0, 250, 0, 400, [[0, '#6a0a16'], [1, '#c41e33']]);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(W0, 0); g.lineTo(W0, 330); for (let k = 8; k >= 0; k--) { const x = k * W0 / 8; g.quadraticCurveTo(x + W0 / 16, 400, x, 330); } g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 3; g.stroke();
  g.fillStyle = '#f0c040'; for (let k = 0; k < 8; k++) { const x = k * W0 / 8 + W0 / 16; for (let j = -5; j <= 5; j++) { g.fillRect(x + j * 8, 362 - Math.abs(j) * 3, 4, 22); } g.beginPath(); g.arc(x, 386, 9, 0, 7); g.fill(); }
  // ---------- floor: perspective chessboard + red carpet
  { const vx = 539, vy = FY - 560, rows = 12; g.fillStyle = '#1b1210'; g.fillRect(0, FY, W0, H0 - FY);
    const yAt = k => FY + (H0 - FY) * Math.pow(k / rows, 1.6), xAt = (u, y) => vx + (u * 140 - vx) * (y - vy) / (FY - vy);
    for (let r = 0; r < rows; r++) { const ya = yAt(r), yb = yAt(r + 1);
      for (let col = -10; col < 18; col++) { const u0 = col, u1 = col + 1; g.fillStyle = (r + col) % 2 ? '#2a1f1c' : '#efe6d6';
        g.beginPath(); g.moveTo(xAt(u0, ya), ya); g.lineTo(xAt(u1, ya), ya); g.lineTo(xAt(u1, yb), yb); g.lineTo(xAt(u0, yb), yb); g.closePath(); g.fill(); } }
    g.fillStyle = lg(0, FY, 0, H0, [[0, 'rgba(255,220,160,.25)'], [1, 'rgba(0,0,0,.15)']]); g.fillRect(0, FY, W0, H0 - FY);
    const cw = (y) => 150 + (y - FY) * .55; g.fillStyle = lg(0, FY, 0, H0, [[0, '#9a1022'], [1, '#d8263e']]);
    g.beginPath(); g.moveTo(539 - cw(FY), FY); g.lineTo(539 + cw(FY), FY); g.lineTo(539 + cw(H0), H0); g.lineTo(539 - cw(H0), H0); g.closePath(); g.fill();
    for (const s of [-1, 1]) { g.strokeStyle = '#f0c040'; g.lineWidth = 12; g.beginPath(); g.moveTo(539 + s * (cw(FY) - 14), FY); g.lineTo(539 + s * (cw(H0) - 30), H0); g.stroke(); }
    g.fillStyle = lg(0, FY - 6, 0, FY + 16, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, FY - 6, W0, 22); }
  // ---------- treasure: chest of gold (left) + coin pile, cushion with crown (right)
  const coin = (x, y, r) => { g.fillStyle = lg(x - r, y - r, x + r, y + r, [[0, '#fff2a8'], [.5, '#f2b822'], [1, '#a8700e']]); g.beginPath(); g.ellipse(x, y, r, r * .62, 0, 0, 7); g.fill(); g.strokeStyle = '#7a4a08'; g.lineWidth = 2; g.stroke(); };
  { const x = 40, y = 1360, w = 250, h = 150;
    for (let i = 0; i < 70; i++) coin(x + 20 + R() * (w - 20), y - 10 - R() * 70 * Math.sin(Math.PI * R()), 12 + R() * 6);
    g.fillStyle = lg(0, y, 0, y + h, [[0, '#9a5a2a'], [1, '#5a2e12']]); g.fillRect(x, y, w, h); g.strokeStyle = OUT; g.lineWidth = 4; g.strokeRect(x, y, w, h);
    g.fillStyle = '#f0c040'; for (const bx of [x + 30, x + w - 50]) { g.fillRect(bx, y, 20, h); g.strokeRect(bx, y, 20, h); } g.fillRect(x, y + 50, w, 16); g.strokeRect(x, y + 50, w, 16);
    g.fillStyle = '#ffd34d'; g.fillRect(x + w / 2 - 18, y + 40, 36, 40); g.strokeRect(x + w / 2 - 18, y + 40, 36, 40);
    for (const [gx, gy, col] of [[x + 70, y - 40, '#e8243a'], [x + 160, y - 55, '#2f8ae0'], [x + 120, y - 20, '#33c46b']]) { g.fillStyle = col; g.beginPath(); g.moveTo(gx, gy - 12); g.lineTo(gx + 10, gy); g.lineTo(gx, gy + 12); g.lineTo(gx - 10, gy); g.closePath(); g.fill(); g.stroke(); }
    for (let i = 0; i < 40; i++) coin(x - 20 + R() * 330, y + h + 30 + R() * 90, 10 + R() * 5); }
  { const x = 840, y = 1420; g.fillStyle = lg(0, y - 40, 0, y + 60, [[0, '#d8263e'], [1, '#6a0a16']]); g.beginPath(); g.ellipse(x + 100, y, 130, 55, 0, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = 4; g.stroke();
    for (const [tx, ty] of [[x - 25, y - 20], [x + 225, y - 20], [x - 10, y + 35], [x + 210, y + 35]]) { g.fillStyle = '#f0c040'; g.beginPath(); g.arc(tx, ty, 10, 0, 7); g.fill(); g.stroke(); }
    const ct = y - 120; g.fillStyle = lg(0, ct, 0, y - 30, [[0, '#fff0a0'], [1, '#c88a14']]); g.beginPath(); g.moveTo(x + 40, y - 30); g.lineTo(x + 30, ct); g.lineTo(x + 70, ct + 40); g.lineTo(x + 100, ct - 20); g.lineTo(x + 130, ct + 40); g.lineTo(x + 170, ct); g.lineTo(x + 160, y - 30); g.closePath(); g.fill(); g.stroke();
    for (const [bx, by, col] of [[x + 100, y - 60, '#e8243a'], [x + 60, y - 55, '#2f8ae0'], [x + 140, y - 55, '#33c46b']]) { g.fillStyle = col; g.beginPath(); g.arc(bx, by, 10, 0, 7); g.fill(); g.stroke(); }
    for (let i = 0; i < 45; i++) coin(x - 40 + R() * 280, y + 80 + R() * 110, 10 + R() * 6); }
  // candle stands in the mid-ground
  for (const x of [230, 848]) { const y = 1230; g.fillStyle = lg(x - 14, 0, x + 14, 0, [[0, '#9a6a1a'], [.5, '#ffe08a'], [1, '#9a6a1a']]); g.fillRect(x - 8, y - 260, 16, 260); g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(x - 8, y - 260, 16, 260);
    g.beginPath(); g.ellipse(x, y, 40, 12, 0, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.ellipse(x, y - 262, 34, 10, 0, 0, 7); g.fill(); g.stroke();
    for (const dx of [-22, 0, 22]) { g.fillStyle = '#fff4dc'; g.fillRect(x + dx - 6, y - 320 + (dx ? 12 : 0), 12, 56 - (dx ? 12 : 0)); g.strokeRect(x + dx - 6, y - 320 + (dx ? 12 : 0), 12, 56 - (dx ? 12 : 0)); } }
  // warm vignette so the pion pops
  g.fillStyle = rg(539, 1000, 1150, [[0, 'rgba(0,0,0,0)'], [.6, 'rgba(0,0,0,0)'], [1, 'rgba(20,5,0,.55)']]); g.fillRect(0, 0, W0, H0);
  CASTLE.cv = c;
  CASTLE.flames = [[539 - 176, 270], [539 - 132, 270], [539 - 88, 270], [539 - 44, 270], [539, 270], [539 + 44, 270], [539 + 88, 270], [539 + 132, 270], [539 + 176, 270], [52, 985], [1026, 985], [208, 900], [230, 888], [252, 900], [826, 900], [848, 888], [870, 900]];
  return c;
}
function paintHospital() { // bright hospital room: mint walls, window with blinds, bed, IV stand, heart monitor
  const S = CASTLE.S, W0 = 1078, H0 = 1920, c = document.createElement('canvas'); c.width = W0 * S; c.height = H0 * S;
  const g = c.getContext('2d'); g.scale(S, S); const R = rng(91), FY = CASTLE.floorY, OUT = '#21333a';
  const lg = (x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, col]) => q.addColorStop(o, col)); return q; };
  g.fillStyle = lg(0, 0, 0, FY, [[0, '#bfe3dc'], [1, '#d9f0ea']]); g.fillRect(0, 0, W0, FY);
  g.fillStyle = '#eaf6f3'; g.fillRect(0, 760, W0, FY - 760); g.strokeStyle = 'rgba(80,130,125,.25)'; g.lineWidth = 2;   // tiled wainscot
  for (let y = 760; y < FY; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(W0, y); g.stroke(); } for (let x = 0; x < W0; x += 60) { g.beginPath(); g.moveTo(x, 760); g.lineTo(x, FY); g.stroke(); }
  g.fillStyle = '#7cc4b8'; g.fillRect(0, 744, W0, 18); g.strokeStyle = OUT; g.strokeRect(0, 744, W0, 18);
  // ceiling strip lights
  g.fillStyle = '#9fcfc6'; g.fillRect(0, 0, W0, 250); for (const x of [180, 540, 900]) { g.fillStyle = '#ffffff'; g.fillRect(x - 120, 200, 240, 28); g.strokeStyle = OUT; g.lineWidth = 3; g.strokeRect(x - 120, 200, 240, 28);
    const q = g.createRadialGradient(x, 240, 0, x, 240, 260); q.addColorStop(0, 'rgba(255,255,255,.55)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(x - 260, 228, 520, 300); }
  // window with blinds (left)
  { const x0 = 70, y0 = 380, w = 300, h = 330; g.fillStyle = lg(0, y0, 0, y0 + h, [[0, '#8fd0ff'], [1, '#e6f6ff']]); g.fillRect(x0, y0, w, h);
    g.fillStyle = '#7fbf6a'; g.beginPath(); g.ellipse(x0 + 90, y0 + h, 120, 70, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x0 + 240, y0 + h + 10, 110, 80, 0, 0, 7); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(x0 + 200, y0 + 70, 50, 20, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x0 + 240, y0 + 60, 36, 18, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(245,250,250,.92)'; for (let y = y0; y < y0 + h * .55; y += 18) g.fillRect(x0, y, w, 11);
    g.strokeStyle = '#f5f5f0'; g.lineWidth = 16; g.strokeRect(x0, y0, w, h); g.lineWidth = 3; g.strokeStyle = OUT; g.strokeRect(x0 - 8, y0 - 8, w + 16, h + 16); g.beginPath(); g.moveTo(x0 + w / 2, y0); g.lineTo(x0 + w / 2, y0 + h); g.lineWidth = 8; g.strokeStyle = '#f5f5f0'; g.stroke(); }
  // red cross sign + clock
  { g.fillStyle = '#fff'; g.beginPath(); g.arc(539, 330, 58, 0, 7); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#e8343c'; g.fillRect(539 - 14, 330 - 40, 28, 80); g.fillRect(539 - 40, 330 - 14, 80, 28); }
  { const x = 880, y = 330; g.fillStyle = '#fff'; g.beginPath(); g.arc(x, y, 50, 0, 7); g.fill(); g.lineWidth = 7; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 34); g.moveTo(x, y); g.lineTo(x + 24, y + 8); g.stroke(); }
  // curtains at the edges (privacy curtain on a rail)
  g.fillStyle = '#9aa8ad'; g.fillRect(0, 262, W0, 10);
  const cur = (x0, x1) => { const n = 6, w = (x1 - x0) / n; for (let i = 0; i < n; i++) { const xa = x0 + i * w; g.fillStyle = lg(xa, 0, xa + w, 0, [[0, '#5aa7c7'], [.5, '#9fd6ea'], [1, '#5aa7c7']]); g.fillRect(xa, 270, w + 1, FY + 200 - 270); } };
  cur(-10, 60); cur(1018, 1090);
  // floor tiles
  { g.fillStyle = '#c9d8dc'; g.fillRect(0, FY, W0, H0 - FY); const vx = 539, vy = FY - 560, rows = 10;
    const yAt = k => FY + (H0 - FY) * Math.pow(k / rows, 1.6), xAt = (u, y) => vx + (u * 150 - vx) * (y - vy) / (FY - vy);
    for (let r = 0; r < rows; r++) { const ya = yAt(r), yb = yAt(r + 1); for (let col = -10; col < 18; col++) { g.fillStyle = (r + col) % 2 ? '#d6e3e6' : '#bccdd2'; g.beginPath(); g.moveTo(xAt(col, ya), ya); g.lineTo(xAt(col + 1, ya), ya); g.lineTo(xAt(col + 1, yb), yb); g.lineTo(xAt(col, yb), yb); g.closePath(); g.fill(); } }
    g.fillStyle = lg(0, FY - 6, 0, FY + 18, [[0, 'rgba(0,0,0,.25)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, FY - 6, W0, 24); }
  // hospital bed behind (headboard + mattress + pillow + blanket)
  { const cx = 539; g.fillStyle = lg(0, 760, 0, 1060, [[0, '#f1f4f5'], [1, '#c9d2d6']]); g.beginPath(); g.moveTo(cx - 300, 1100); g.lineTo(cx - 300, 820); g.quadraticCurveTo(cx, 740, cx + 300, 820); g.lineTo(cx + 300, 1100); g.closePath(); g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#ffffff'; g.fillRect(cx - 330, 1010, 660, 120); g.strokeRect(cx - 330, 1010, 660, 120);
    g.fillStyle = '#f7fbff'; g.beginPath(); g.ellipse(cx - 160, 1000, 120, 45, -.08, 0, 7); g.fill(); g.stroke();
    g.fillStyle = lg(0, 1040, 0, 1140, [[0, '#7cc4e8'], [1, '#4f9cc4']]); g.fillRect(cx - 40, 1030, 370, 100); g.strokeRect(cx - 40, 1030, 370, 100);
    g.fillStyle = '#8a969b'; for (const x of [cx - 320, cx + 300]) { g.fillRect(x, 1130, 20, 90); g.beginPath(); g.arc(x + 10, 1225, 14, 0, 7); g.fill(); g.stroke(); } }
  // heart monitor (right) on a stand
  { const x = 860, y = 560, w = 190, h = 140; g.fillStyle = '#8a969b'; g.fillRect(x + w / 2 - 8, y + h, 16, FY - y - h); g.beginPath(); g.ellipse(x + w / 2, FY, 70, 16, 0, 0, 7); g.fill();
    g.fillStyle = '#3d4a50'; g.fillRect(x - 12, y - 12, w + 24, h + 24); g.lineWidth = 4; g.strokeStyle = OUT; g.strokeRect(x - 12, y - 12, w + 24, h + 24); g.fillStyle = '#0b1a14'; g.fillRect(x, y, w, h);
    CASTLE.monitor = [x, y, w, h]; }
  // IV stand with bag (left of bed)
  { const x = 200; g.fillStyle = '#9aa6ab'; g.fillRect(x - 6, 470, 12, FY - 470); g.beginPath(); g.ellipse(x, FY, 60, 14, 0, 0, 7); g.fill(); g.fillRect(x - 50, 470, 100, 8);
    g.fillStyle = 'rgba(220,240,255,.9)'; g.beginPath(); g.moveTo(x - 40, 480); g.lineTo(x + 40, 480); g.lineTo(x + 34, 600); g.quadraticCurveTo(x, 630, x - 34, 600); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,220,120,.6)'; g.fillRect(x - 30, 540, 60, 50); g.strokeStyle = '#7c8a90'; g.lineWidth = 3; g.beginPath(); g.moveTo(x, 625); g.bezierCurveTo(x + 10, 760, x + 90, 820, x + 160, 900); g.stroke();
    CASTLE.drip = [x, 640]; }
  // bedside table with flowers + get-well balloon
  { const x = 810, y = 1080; g.fillStyle = lg(0, y, 0, y + 150, [[0, '#f0e6d8'], [1, '#c9b89f']]); g.fillRect(x, y, 160, 150); g.lineWidth = 4; g.strokeStyle = OUT; g.strokeRect(x, y, 160, 150);
    g.fillStyle = '#9ad3f0'; g.fillRect(x + 50, y - 60, 50, 60); g.strokeRect(x + 50, y - 60, 50, 60);
    for (const [fx, fy, col] of [[x + 55, y - 95, '#ff6b8a'], [x + 85, y - 110, '#ffd23a'], [x + 100, y - 85, '#ff8c3a'], [x + 70, y - 75, '#b86bff']]) { g.strokeStyle = '#3f8f4a'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 75, y - 55); g.lineTo(fx, fy); g.stroke(); g.fillStyle = col; g.beginPath(); g.arc(fx, fy, 16, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); }
    g.strokeStyle = '#555'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 140, y); g.quadraticCurveTo(x + 180, y - 160, x + 150, y - 300); g.stroke();
    g.fillStyle = '#ff5a6e'; g.beginPath(); g.moveTo(x + 150, y - 300); g.bezierCurveTo(x + 230, y - 360, x + 190, y - 440, x + 150, y - 400); g.bezierCurveTo(x + 110, y - 440, x + 70, y - 360, x + 150, y - 300); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#fff'; g.font = '900 22px Inter, sans-serif'; g.textAlign = 'center'; g.fillText('GET', x + 150, y - 372); g.fillText('WELL', x + 150, y - 348); }
  // pill bottle + clipboard chart on the floor-left
  { const x = 60, y = 1300; g.fillStyle = '#ffffff'; g.fillRect(x, y, 160, 200); g.lineWidth = 4; g.strokeStyle = OUT; g.strokeRect(x, y, 160, 200); g.fillStyle = '#b0b8bc'; g.fillRect(x + 50, y - 12, 60, 24);
    g.strokeStyle = '#e8343c'; g.lineWidth = 4; g.beginPath(); g.moveTo(x + 15, y + 120); for (let i = 0; i < 6; i++) g.lineTo(x + 15 + i * 26, y + 120 - (i % 2 ? 50 : 10) - i * 6); g.stroke(); }
  const q = g.createRadialGradient(539, 1000, 400, 539, 1000, 1200); q.addColorStop(0, 'rgba(0,0,0,0)'); q.addColorStop(1, 'rgba(10,40,40,.35)'); g.fillStyle = q; g.fillRect(0, 0, W0, H0);
  CASTLE.hcv = c; return c;
}
function paintBoard() { // ornate gold frame with a QR code and a "SCAN ME" ribbon
  const [bx, by, bw, bh] = CASTLE.boardRect, S = 2, c = document.createElement('canvas'); c.width = (bw + 40) * S; c.height = (bh + 40) * S;
  const g = c.getContext('2d'); g.scale(S, S); g.translate(20, 20); const OUT = '#2a0f08';
  const q = g.createLinearGradient(0, 0, bw, bh); q.addColorStop(0, '#fff0a0'); q.addColorStop(.5, '#e0a930'); q.addColorStop(1, '#8a5a12');
  g.fillStyle = q; g.fillRect(0, 0, bw, bh); g.strokeStyle = OUT; g.lineWidth = 4; g.strokeRect(0, 0, bw, bh);
  for (const [x, y] of [[0, 0], [bw, 0], [0, bh], [bw, bh]]) { g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); g.stroke(); }
  g.fillStyle = '#fbf6ea'; g.fillRect(22, 22, bw - 44, bh - 44); g.strokeRect(22, 22, bw - 44, bh - 44);
  const qs = bw - 90; drawQR(g, 45, 62, qs, 909); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(45, 62, qs, qs);
  const ry = 62 + qs + 22; g.fillStyle = '#d0263a'; g.beginPath(); g.moveTo(-14, ry); g.lineTo(bw + 14, ry); g.lineTo(bw + 2, ry + 34); g.lineTo(bw + 14, ry + 68); g.lineTo(-14, ry + 68); g.lineTo(-2, ry + 34); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = '900 46px Inter, Arial Black, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = OUT; g.strokeText('SCAN ME', bw / 2, ry + 36); g.fillText('SCAN ME', bw / 2, ry + 36);
  CASTLE.board = c; CASTLE.qrRect = [45, 62, qs]; return c;
}
// view: {k: zoom, ax, ay: zoom anchor in base-frame px, dx, dy: shift}, t: seconds, opts: {board, scan: 0..1+, scanOK}
function drawCastle(g, view, t, opts) {
  const hosp = opts && opts.kind === 'hospital';
  if (hosp && !CASTLE.hcv) paintHospital(); if (!hosp && !CASTLE.cv) paintCastle();
  const k = view.k, s = 1 / CASTLE.S, SRC = hosp ? CASTLE.hcv : CASTLE.cv;
  g.save(); g.setTransform(g.canvas.width / W, 0, 0, g.canvas.height / H, 0, 0);
  g.translate(view.ax + view.dx, view.ay + view.dy); if (view.rot) g.rotate(view.rot); g.scale(k, k); g.translate(-view.ax, -view.ay);
  g.drawImage(SRC, 0, 0, SRC.width * s, SRC.height * s);
  if (hosp) { // animated: ECG trace + beeping dot, IV drip
    const [mx, my, mw, mh] = CASTLE.monitor; g.save(); g.beginPath(); g.rect(mx, my, mw, mh); g.clip();
    g.strokeStyle = '#3dff8c'; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
    for (let i = 0; i <= 60; i++) { const x = mx + i / 60 * mw, ph = ((i / 60) * 1.6 - t * 1.2) % 1, p2 = ph < 0 ? ph + 1 : ph; let y = my + mh * .6;
      if (p2 > .40 && p2 < .44) y -= mh * .42 * Math.sin((p2 - .40) / .04 * Math.PI); else if (p2 > .44 && p2 < .47) y += mh * .18; else if (p2 > .6 && p2 < .7) y -= mh * .08 * Math.sin((p2 - .6) / .1 * Math.PI);
      i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    g.fillStyle = '#3dff8c'; g.font = '800 30px Inter, sans-serif'; g.fillText('♥ ' + (88 + Math.round(6 * Math.sin(t))), mx + 10, my + 34); g.restore();
    const [dx, dy] = CASTLE.drip, dp = (t * 1.4) % 1; g.fillStyle = 'rgba(180,220,255,.95)'; g.beginPath(); g.ellipse(dx, dy + dp * 30, 5, 7, 0, 0, 7); g.fill();
    g.restore(); return;
  }
  if (opts && opts.board) {
    if (!CASTLE.board) paintBoard();
    const [bx, by] = CASTLE.boardRect, pop = clamp(opts.boardIn == null ? 1 : opts.boardIn, 0, 1.3);
    const sc = pop < 1 ? easeOutBack(pop) : 1, bw = CASTLE.board.width / 2, bh = CASTLE.board.height / 2;
    g.save(); g.translate(bx + bw / 2 - 20, by + bh / 2 - 20); g.scale(sc, sc); g.rotate(-.03);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 30; g.shadowOffsetY = 14; g.drawImage(CASTLE.board, -bw / 2, -bh / 2, bw, bh); g.shadowColor = 'transparent';
    if (opts.scan > 0) { // green scanner sweep over the QR, then a check mark
      const [qx, qy, qs] = CASTLE.qrRect, X = -bw / 2 + 20 + qx, Y = -bh / 2 + 20 + qy, u = opts.scan;
      if (u < 1) { const ly = Y + qs * (.5 - .5 * Math.cos(u * Math.PI * 3));
        g.fillStyle = 'rgba(40,255,120,.22)'; g.fillRect(X, Y, qs, qs);
        const lgd = g.createLinearGradient(0, ly - 30, 0, ly + 30); lgd.addColorStop(0, 'rgba(60,255,140,0)'); lgd.addColorStop(.5, 'rgba(60,255,140,.95)'); lgd.addColorStop(1, 'rgba(60,255,140,0)'); g.fillStyle = lgd; g.fillRect(X - 10, ly - 30, qs + 20, 60);
        g.strokeStyle = '#3dff8c'; g.lineWidth = 8; const L = 40; for (const [cx, cy, sx, sy] of [[X, Y, 1, 1], [X + qs, Y, -1, 1], [X, Y + qs, 1, -1], [X + qs, Y + qs, -1, -1]]) { g.beginPath(); g.moveTo(cx, cy + sy * L); g.lineTo(cx, cy); g.lineTo(cx + sx * L, cy); g.stroke(); } }
      else { const e = u - 1, pk = springPop(e * 1.4); g.save(); g.translate(X + qs / 2, Y + qs / 2); g.scale(pk, pk); g.globalAlpha = clamp(1.6 - e * .5, 0, 1);
        g.fillStyle = '#21c55d'; g.beginPath(); g.arc(0, 0, qs * .32, 0, 7); g.fill(); g.lineWidth = 8; g.strokeStyle = '#fff'; g.stroke();
        g.lineWidth = 18; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-qs * .14, 0); g.lineTo(-qs * .03, qs * .11); g.lineTo(qs * .16, -qs * .1); g.stroke(); g.restore(); }
    }
    g.restore();
  }
  // animated: flame flicker glows, window beams, floating golden motes
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < CASTLE.flames.length; i++) { const [fx0, fy0] = CASTLE.flames[i], fl = .75 + .25 * Math.sin(t * 13 + i * 2.1) * Math.sin(t * 7.7 + i);
    const q = g.createRadialGradient(fx0, fy0, 0, fx0, fy0, 46 * fl); q.addColorStop(0, `rgba(255,240,180,${.9 * fl})`); q.addColorStop(.25, `rgba(255,170,60,${.55 * fl})`); q.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = q; g.beginPath(); g.arc(fx0, fy0, 46 * fl, 0, 7); g.fill();
    g.fillStyle = `rgba(255,250,220,${fl})`; g.beginPath(); g.ellipse(fx0, fy0 - 4, 5, 11 * fl, 0, 0, 7); g.fill(); }
  for (const cx of [170, 908]) { const sh = .1 + .03 * Math.sin(t * 1.3 + cx); const q = g.createLinearGradient(cx, 500, cx + (cx < 539 ? 260 : -260), 1500); q.addColorStop(0, `rgba(255,240,200,${sh * 1.8})`); q.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = q;
    g.beginPath(); g.moveTo(cx - 80, 520); g.lineTo(cx + 80, 520); g.lineTo(cx + (cx < 539 ? 470 : -170), 1600); g.lineTo(cx + (cx < 539 ? 170 : -470), 1600); g.closePath(); g.fill(); }
  for (let i = 0; i < 60; i++) { const sd = Math.sin(i * 91.7) * 43758.5453, r1 = sd - Math.floor(sd), r2 = (r1 * 13.37) % 1;
    const x = (r1 * 1078 + Math.sin(t * .6 + i) * 30) % 1078, y = 1650 - ((r2 * 1400 + t * (25 + 30 * r1)) % 1400), a = .35 + .35 * Math.sin(t * 3 + i * 1.7);
    const q = g.createRadialGradient(x, y, 0, x, y, 7 + 5 * r2); q.addColorStop(0, `rgba(255,230,150,${a})`); q.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = q; g.beginPath(); g.arc(x, y, 7 + 5 * r2, 0, 7); g.fill(); }
  g.restore();
}
