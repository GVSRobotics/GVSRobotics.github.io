/* Small 2D convex-geometry toolkit for the explainer demos.
 * Shapes are convex polygons (curved shapes are finely sampled), stored CCW
 * around their own origin, which is also the body's reference point. */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;

  // ---------- vectors ----------
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const mul = (a, s) => [a[0] * s, a[1] * s];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const cross = (a, b) => a[0] * b[1] - a[1] * b[0];
  const len = a => Math.hypot(a[0], a[1]);
  const norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  const perp = a => [a[1], -a[0]]; // outward normal of a CCW edge

  // ---------- shape library (local frame, CCW) ----------
  function circlePts(rx, ry, n) {
    const pts = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * TAU; pts.push([rx * Math.cos(t), ry * Math.sin(t)]); }
    return pts;
  }
  function regular(n, r, rot = 0) {
    const pts = [];
    for (let i = 0; i < n; i++) { const t = rot + (i / n) * TAU; pts.push([r * Math.cos(t), r * Math.sin(t)]); }
    return pts;
  }
  function capsule(r, half, n = 14) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = -Math.PI / 2 + (i / n) * Math.PI; pts.push([half + r * Math.cos(t), r * Math.sin(t)]); }
    for (let i = 0; i <= n; i++) { const t = Math.PI / 2 + (i / n) * Math.PI; pts.push([-half + r * Math.cos(t), r * Math.sin(t)]); }
    return pts;
  }

  const SHAPES = {
    box:      { label: 'Box',      pts: [[-0.75, -0.55], [0.75, -0.55], [0.75, 0.55], [-0.75, 0.55]] },
    triangle: { label: 'Triangle', pts: regular(3, 0.95, Math.PI / 2) },
    hexagon:  { label: 'Hexagon',  pts: regular(6, 0.8) },
    circle:   { label: 'Circle',   pts: circlePts(0.72, 0.72, 48) },
    ellipse:  { label: 'Ellipse',  pts: circlePts(1.0, 0.5, 48) },
    capsule:  { label: 'Capsule',  pts: capsule(0.42, 0.5) },
  };

  // ---------- poses ----------
  // pose = {x, y, th}; scale is applied about the body origin before placing it.
  function place(local, pose, scale = 1) {
    const c = Math.cos(pose.th), s = Math.sin(pose.th);
    return local.map(([x, y]) => [pose.x + scale * (c * x - s * y), pose.y + scale * (s * x + c * y)]);
  }

  // ---------- basic queries ----------
  function support(poly, d) {
    let best = poly[0], bd = -Infinity;
    for (const p of poly) { const v = dot(p, d); if (v > bd) { bd = v; best = p; } }
    return best;
  }
  function project(poly, axis) {
    let lo = Infinity, hi = -Infinity;
    for (const p of poly) { const v = dot(p, axis); if (v < lo) lo = v; if (v > hi) hi = v; }
    return [lo, hi];
  }
  function edgeNormals(poly) {
    const out = [];
    for (let i = 0; i < poly.length; i++) out.push(norm(perp(sub(poly[(i + 1) % poly.length], poly[i]))));
    return out;
  }
  function centroid(poly) {
    let a = 0, cx = 0, cy = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length], k = cross(p, q);
      a += k; cx += (p[0] + q[0]) * k; cy += (p[1] + q[1]) * k;
    }
    if (Math.abs(a) < 1e-12) return poly.reduce((s, p) => add(s, mul(p, 1 / poly.length)), [0, 0]);
    return [cx / (3 * a), cy / (3 * a)];
  }
  function aabb(poly) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    return { x0, y0, x1, y1 };
  }
  const aabbOverlap = (a, b) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

  // Separating-axis test: true when the convex polygons overlap.
  function overlaps(A, B) {
    for (const axis of edgeNormals(A).concat(edgeNormals(B))) {
      const [a0, a1] = project(A, axis), [b0, b1] = project(B, axis);
      if (a1 < b0 || b1 < a0) return false;
    }
    return true;
  }

  function closestOnSegment(p, a, b) {
    const ab = sub(b, a), t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / (dot(ab, ab) || 1)));
    return add(a, mul(ab, t));
  }

  /* Signed distance between convex polygons A and B.
   * Returns {dist (>0 apart, <0 overlapping), normal (unit, A -> B), pA, pB}
   * where pA lies on A's boundary, pB on B's, and pB - pA = dist * normal. */
  function signedDistance(A, B) {
    if (!overlaps(A, B)) {
      let best = { d: Infinity };
      const test = (P, Q, flip) => {
        for (const p of P) for (let j = 0; j < Q.length; j++) {
          const q = closestOnSegment(p, Q[j], Q[(j + 1) % Q.length]);
          const d = len(sub(p, q));
          if (d < best.d) best = flip ? { d, pA: q, pB: p } : { d, pA: p, pB: q };
        }
      };
      test(A, B, false); test(B, A, true);
      return { dist: best.d, normal: norm(sub(best.pB, best.pA)), pA: best.pA, pB: best.pB };
    }
    // Overlapping: the minimum translation lies along one of the edge normals.
    const cA = centroid(A), cB = centroid(B);
    let depth = Infinity, n = [1, 0];
    for (const axis of edgeNormals(A).concat(edgeNormals(B))) {
      const [a0, a1] = project(A, axis), [b0, b1] = project(B, axis);
      const o = Math.min(a1 - b0, b1 - a0);
      if (o < depth) { depth = o; n = (dot(sub(cB, cA), axis) >= 0) ? axis : mul(axis, -1); }
    }
    const pB = support(B, mul(n, -1));     // deepest point of B, pushed into A
    const pA = add(pB, mul(n, depth));     // where it would be on A's surface
    return { dist: -depth, normal: n, pA, pB };
  }

  // Convex hull (monotone chain), CCW.
  function hull(points) {
    const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length < 3) return pts;
    const lower = [], upper = [];
    for (const p of pts) { while (lower.length >= 2 && cross(sub(lower[lower.length - 1], lower[lower.length - 2]), sub(p, lower[lower.length - 1])) <= 0) lower.pop(); lower.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(sub(upper[upper.length - 1], upper[upper.length - 2]), sub(p, upper[upper.length - 1])) <= 0) upper.pop(); upper.push(p); }
    upper.pop(); lower.pop();
    return lower.concat(upper);
  }
  // Minkowski difference A - B = { a - b }.
  function minkowskiDiff(A, B) {
    const pts = [];
    for (const a of A) for (const b of B) pts.push(sub(a, b));
    return hull(pts);
  }

  // Clip convex subject by convex clip polygon (both CCW).
  function clip(subject, clipper) {
    let out = subject;
    for (let i = 0; i < clipper.length && out.length; i++) {
      const a = clipper[i], b = clipper[(i + 1) % clipper.length], input = out; out = [];
      const inside = p => cross(sub(b, a), sub(p, a)) >= 0;
      for (let j = 0; j < input.length; j++) {
        const p = input[j], q = input[(j + 1) % input.length], pi = inside(p), qi = inside(q);
        if (pi) out.push(p);
        if (pi !== qi) {
          const d = sub(q, p), e = sub(b, a), t = cross(sub(a, p), e) / cross(d, e);
          out.push(add(p, mul(d, t)));
        }
      }
    }
    return out;
  }

  /* DCOL-style proximity: the smallest uniform scale alpha (each body scaled
   * about its own origin) at which the two bodies first touch, plus the shared
   * point where they meet. alpha < 1 overlapping, = 1 touching, > 1 apart. */
  function scaleToTouch(localA, poseA, localB, poseB) {
    let lo = 0, hi = 1;
    while (!overlaps(place(localA, poseA, hi), place(localB, poseB, hi)) && hi < 1e4) { lo = hi; hi *= 2; }
    for (let i = 0; i < 48; i++) {
      const mid = (lo + hi) / 2;
      if (overlaps(place(localA, poseA, mid), place(localB, poseB, mid))) hi = mid; else lo = mid;
    }
    const alpha = hi;
    const s = alpha * (1 + 1e-6);
    const region = clip(place(localA, poseA, s), place(localB, poseB, s));
    const witness = region.length ? centroid(region) : [(poseA.x + poseB.x) / 2, (poseA.y + poseB.y) / 2];
    return { alpha, witness };
  }

  // ---------- canvas view ----------
  /* A view maps world units to CSS pixels on a HiDPI-aware canvas.
   * opts.span is the world height visible; opts.center is the world point at the middle. */
  function View(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.span = opts.span || 6;
    this.minWidth = opts.minWidth || 0;     // world width that must stay visible on narrow screens
    this.center = opts.center || [0, 0];
    this.resize();
  }
  View.prototype.resize = function () {
    const r = this.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.k = Math.min(this.h / this.span, this.minWidth ? this.w / this.minWidth : Infinity);
  };
  View.prototype.toPx = function (p) { return [this.w / 2 + (p[0] - this.center[0]) * this.k, this.h / 2 - (p[1] - this.center[1]) * this.k]; };
  View.prototype.toWorld = function (x, y) { return [this.center[0] + (x - this.w / 2) / this.k, this.center[1] - (y - this.h / 2) / this.k]; };
  View.prototype.clear = function () {
    const c = this.ctx; c.clearRect(0, 0, this.w, this.h);
    const step = 0.5, x0 = this.toWorld(0, 0)[0], x1 = this.toWorld(this.w, 0)[0];
    const y1 = this.toWorld(0, 0)[1], y0 = this.toWorld(0, this.h)[1];
    c.lineWidth = 1;
    for (let x = Math.ceil(x0 / step) * step; x <= x1; x += step) {
      const px = Math.round(this.toPx([x, 0])[0]) + 0.5;
      c.strokeStyle = Math.abs(x % 1) < 1e-6 ? 'rgba(23,26,31,.07)' : 'rgba(23,26,31,.035)';
      c.beginPath(); c.moveTo(px, 0); c.lineTo(px, this.h); c.stroke();
    }
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      const py = Math.round(this.toPx([0, y])[1]) + 0.5;
      c.strokeStyle = Math.abs(y % 1) < 1e-6 ? 'rgba(23,26,31,.07)' : 'rgba(23,26,31,.035)';
      c.beginPath(); c.moveTo(0, py); c.lineTo(this.w, py); c.stroke();
    }
  };
  View.prototype.poly = function (pts, { fill, stroke, width = 2, dash } = {}) {
    const c = this.ctx; if (!pts.length) return;
    c.beginPath();
    pts.forEach((p, i) => { const [x, y] = this.toPx(p); i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.setLineDash(dash || []); c.strokeStyle = stroke; c.lineWidth = width; c.stroke(); c.setLineDash([]); }
  };
  View.prototype.line = function (a, b, { stroke = '#171a1f', width = 2, dash } = {}) {
    const c = this.ctx, [x0, y0] = this.toPx(a), [x1, y1] = this.toPx(b);
    c.setLineDash(dash || []); c.strokeStyle = stroke; c.lineWidth = width;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]);
  };
  View.prototype.arrow = function (a, b, { stroke = '#171a1f', width = 2, head = 9, dash } = {}) {
    const [x0, y0] = this.toPx(a), [x1, y1] = this.toPx(b), c = this.ctx;
    const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, h = Math.min(head, L * 0.6);
    c.setLineDash(dash || []); c.strokeStyle = stroke; c.fillStyle = stroke; c.lineWidth = width;
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - ux * h * 0.6, y1 - uy * h * 0.6); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5);
    c.lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5); c.closePath(); c.fill();
  };
  View.prototype.dot = function (p, { r = 4.5, fill = '#171a1f', stroke = '#fff' } = {}) {
    const c = this.ctx, [x, y] = this.toPx(p);
    c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill();
    if (stroke) { c.lineWidth = 1.5; c.strokeStyle = stroke; c.stroke(); }
  };
  View.prototype.cross = function (p, { size = 6, stroke = '#171a1f', width = 1.5 } = {}) {
    const c = this.ctx, [x, y] = this.toPx(p);
    c.strokeStyle = stroke; c.lineWidth = width; c.beginPath();
    c.moveTo(x - size, y); c.lineTo(x + size, y); c.moveTo(x, y - size); c.lineTo(x, y + size); c.stroke();
  };
  View.prototype.label = function (p, text, { color = '#5b6470', dx = 8, dy = -8, align = 'left', font = '600 12px "DM Sans", sans-serif' } = {}) {
    const c = this.ctx, [x, y] = this.toPx(p);
    c.font = font; c.textAlign = align; c.textBaseline = 'middle';
    c.lineWidth = 4; c.strokeStyle = 'rgba(255,255,255,.9)'; c.strokeText(text, x + dx, y + dy);
    c.fillStyle = color; c.fillText(text, x + dx, y + dy);
  };

  /* Make a body draggable on a canvas (mouse, touch, pen) and nudgeable with
   * arrow keys when the canvas has focus. hitTest(worldPoint) decides whether a
   * press grabs the body; onMove(dx, dy) receives world-unit deltas. */
  function draggable(view, { hitTest, onMove, onEnd, bounds }) {
    const el = view.canvas;
    let last = null;
    const pos = e => { const r = el.getBoundingClientRect(); return view.toWorld(e.clientX - r.left, e.clientY - r.top); };
    el.addEventListener('pointerdown', e => {
      const p = pos(e);
      if (!hitTest(p)) return;
      last = p; el.setPointerCapture(e.pointerId); el.classList.add('dragging'); e.preventDefault();
    });
    el.addEventListener('pointermove', e => {
      const p = pos(e);
      if (!last) { el.style.cursor = hitTest(p) ? 'grab' : 'default'; return; }
      let dx = p[0] - last[0], dy = p[1] - last[1];
      if (bounds) { const lim = bounds(); dx = Math.max(lim.x0, Math.min(lim.x1, lim.x + dx)) - lim.x; dy = Math.max(lim.y0, Math.min(lim.y1, lim.y + dy)) - lim.y; }
      last = p; onMove(dx, dy);
    });
    const end = () => { if (last) { last = null; el.classList.remove('dragging'); onEnd && onEnd(); } };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('keydown', e => {
      const step = e.shiftKey ? 0.25 : 0.05;
      const map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      const d = map[e.key]; if (!d) return;
      e.preventDefault();
      let [dx, dy] = d;
      if (bounds) { const lim = bounds(); dx = Math.max(lim.x0, Math.min(lim.x1, lim.x + dx)) - lim.x; dy = Math.max(lim.y0, Math.min(lim.y1, lim.y + dy)) - lim.y; }
      onMove(dx, dy); onEnd && onEnd();
    });
  }

  function pointInConvex(poly, p) {
    for (let i = 0; i < poly.length; i++) if (cross(sub(poly[(i + 1) % poly.length], poly[i]), sub(p, poly[i])) < 0) return false;
    return true;
  }

  const fmt = (v, d = 2) => (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);

  global.G2 = {
    add, sub, mul, dot, cross, len, norm, SHAPES, place, support, aabb, aabbOverlap, overlaps,
    signedDistance, minkowskiDiff, hull, clip, scaleToTouch, centroid, pointInConvex, View, draggable, fmt,
  };
})(window);
