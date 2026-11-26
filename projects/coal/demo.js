/* COAL explainer demos: signed distance, the Minkowski-difference view, and a derivative nudge test. */
(function () {
  'use strict';
  const { SHAPES, place, signedDistance, minkowskiDiff, aabb, aabbOverlap, pointInConvex, View, draggable, fmt, dot, add, mul, sub, len } = G2;

  // Colors follow the page theme (iDCOL palette); refreshed at the start of every draw.
  const COL = {};
  function syncColors() {
    const T = G2.theme();
    Object.assign(COL, {
      a: T.field, aFill: T.field + '2e', b: T.contact, bFill: T.contact + '2e',
      ink: T.fg, muted: T.fgDim, grid: T.border, font: T.font, mono: T.mono,
      apart: T.good, touch: T.warn, hit: T.bad, violet: T.pred, mFill: T.pred + '1f',
    });
  }
  const TOUCH_TOL = 0.02;
  const deg = r => Math.round(r * 180 / Math.PI);
  const rad = d => d * Math.PI / 180;

  function fillSelect(sel, value) {
    sel.innerHTML = Object.entries(SHAPES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join('');
    sel.value = value;
  }
  function rafRenderer(fn) {
    let queued = false;
    return () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fn(); }); };
  }
  function boundsFor(view, pose, margin = 0.45) {
    return () => {
      const hw = view.w / 2 / view.k - margin, hh = view.h / 2 / view.k - margin;
      return { x: pose.x, y: pose.y, x0: view.center[0] - hw, x1: view.center[0] + hw, y0: view.center[1] - hh, y1: view.center[1] + hh };
    };
  }
  function stateOf(d) { return Math.abs(d) <= TOUCH_TOL ? 'touch' : d > 0 ? 'apart' : 'hit'; }

  // ------------------------------------------------------------ Demo 1
  (function collideDemo() {
    const root = document.getElementById('demo-collide');
    if (!root) return;
    const $ = s => root.querySelector(s);
    const world = new View($('[data-view=world]'), { span: 5.2, minWidth: 5.4 });
    const mink = new View($('[data-view=mink]'), { span: 6.4, minWidth: 6.6 });
    const st = { a: 'box', b: 'hexagon', poseA: { x: -0.8, y: 0, th: rad(12) }, poseB: { x: 1.35, y: 0.55, th: rad(20) }, boxes: false };

    fillSelect($('[data-in=shapeA]'), st.a);
    fillSelect($('[data-in=shapeB]'), st.b);

    const render = rafRenderer(draw);

    function draw() {
      syncColors();
      const A = place(SHAPES[st.a].pts, st.poseA), B = place(SHAPES[st.b].pts, st.poseB);
      const r = signedDistance(A, B), s = stateOf(r.dist);
      const bxA = aabb(A), bxB = aabb(B), boxHit = aabbOverlap(bxA, bxB);

      // ---- world pane
      world.clear();
      if (st.boxes) {
        const c = boxHit ? COL.hit : COL.muted;
        for (const b of [bxA, bxB]) world.poly([[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]], { stroke: c, width: 1.5, dash: [5, 4] });
      }
      world.poly(A, { fill: COL.aFill, stroke: COL.a });
      world.poly(B, { fill: COL.bFill, stroke: COL.b });
      world.label([st.poseA.x, st.poseA.y], 'A', { color: COL.a, dx: 0, dy: 0, align: 'center', font: '600 15px ' + COL.font });
      world.label([st.poseB.x, st.poseB.y], 'B', { color: COL.b, dx: 0, dy: 0, align: 'center', font: '600 15px ' + COL.font });
      if (s === 'apart') {
        world.line(r.pA, r.pB, { stroke: COL.apart, width: 2, dash: [6, 4] });
        world.label(mul(add(r.pA, r.pB), 0.5), fmt(r.dist), { color: COL.apart, dx: 0, dy: -16, align: 'center' });
      } else if (s === 'hit') {
        world.arrow(r.pB, r.pA, { stroke: COL.hit, width: 2.5 });
        world.label(mul(add(r.pA, r.pB), 0.5), 'overlap ' + fmt(-r.dist), { color: COL.hit });
      }
      world.arrow(r.pA, add(r.pA, mul(r.normal, 0.6)), { stroke: COL.ink, width: 1.5, head: 7 });
      world.dot(r.pA); world.dot(r.pB);

      // ---- Minkowski pane
      const M = minkowskiDiff(A, B), inside = pointInConvex(M, [0, 0]);
      const c = sub(r.pA, r.pB);
      // Keep both the origin and the combined shape in view.
      const mc = G2.centroid(M);
      mink.center = mul(mc, 0.5);
      mink.clear();
      mink.poly(M, { fill: inside ? COL.hit + '1f' : COL.mFill, stroke: inside ? COL.hit : COL.violet });
      mink.label(M.reduce((best, p) => (p[1] > best[1] ? p : best), M[0]), 'A − B', { color: inside ? COL.hit : COL.violet, dy: -12, align: 'center', dx: 0 });
      mink.line([0, 0], c, { stroke: s === 'apart' ? COL.apart : s === 'hit' ? COL.hit : COL.touch, width: 2, dash: [6, 4] });
      mink.dot(c, { r: 4, fill: COL.violet });
      mink.cross([0, 0], { size: 8, stroke: COL.ink, width: 2 });
      mink.label([0, 0], inside ? 'origin (inside → touching)' : 'origin', { color: COL.ink, dx: 10, dy: 14 });

      // ---- readouts
      const statusEl = $('[data-out=status]');
      statusEl.className = 'status ' + s;
      statusEl.querySelector('span').textContent = { apart: 'Separated', touch: 'Just touching', hit: 'Overlapping' }[s];
      $('[data-out=number]').innerHTML = s === 'touch'
        ? `0.00<small>touching: the gap is zero</small>`
        : `${fmt(Math.abs(r.dist))}<small>${s === 'apart' ? 'units apart (the shortest gap)' : 'units of overlap (penetration depth)'}</small>`;
      $('[data-out=explain]').textContent = {
        apart: 'The shapes are not touching. COAL reports the shortest gap and the two points where it occurs.',
        touch: 'The shapes meet at a single point: zero gap and zero overlap.',
        hit: 'The shapes overlap. The red arrow is the shortest push that would separate them, and its length is the penetration depth.',
      }[s];
      $('[data-out=signed]').textContent = (r.dist >= 0 ? '+' : '') + fmt(r.dist);
      $('[data-out=signed]').style.color = COL[s];
      $('[data-out=aabb]').textContent = boxHit ? 'overlap → look closer' : 'no overlap → skip';
      $('[data-out=normal]').textContent = `${deg(Math.atan2(r.normal[1], r.normal[0]))}°`;
      $('[data-out=rot]').textContent = `${deg(st.poseB.th)}°`;
    }

    draggable(world, {
      hitTest: p => pointInConvex(place(SHAPES[st.b].pts, st.poseB), p) || len(sub(p, [st.poseB.x, st.poseB.y])) < 0.4,
      onMove: (dx, dy) => { st.poseB.x += dx; st.poseB.y += dy; render(); },
      bounds: boundsFor(world, st.poseB),
    });
    $('[data-in=shapeA]').addEventListener('change', e => { st.a = e.target.value; render(); });
    $('[data-in=shapeB]').addEventListener('change', e => { st.b = e.target.value; render(); });
    $('[data-in=rot]').addEventListener('input', e => { st.poseB.th = rad(+e.target.value); render(); });
    $('[data-in=boxes]').addEventListener('change', e => { st.boxes = e.target.checked; render(); });

    // Presets: slide B along the line from A until the requested state.
    root.querySelectorAll('[data-preset]').forEach(btn => btn.addEventListener('click', () => {
      const dir = [st.poseB.x - st.poseA.x, st.poseB.y - st.poseA.y];
      const u = len(dir) > 1e-6 ? mul(dir, 1 / len(dir)) : [1, 0];
      const at = t => ({ x: st.poseA.x + u[0] * t, y: st.poseA.y + u[1] * t, th: st.poseB.th });
      const gap = t => signedDistance(place(SHAPES[st.a].pts, st.poseA), place(SHAPES[st.b].pts, at(t))).dist;
      let lo = 0, hi = 4;
      for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (gap(m) > 0) hi = m; else lo = m; }
      const touchT = hi;
      const t = { apart: touchT + 0.7, touch: touchT, hit: Math.max(0.15, touchT - 0.35) }[btn.dataset.preset];
      Object.assign(st.poseB, at(t));
      render();
    }));

    window.addEventListener('resize', () => { world.resize(); mink.resize(); render(); });
    window.addEventListener('themechange', render);
    draw();
  })();

  // ------------------------------------------------------------ Demo 2
  (function nudgeDemo() {
    const root = document.getElementById('demo-nudge');
    if (!root) return;
    const $ = s => root.querySelector(s);
    const world = new View($('[data-view=world]'), { span: 5, minWidth: 6.4 });
    const plotCanvas = $('[data-view=plot]');
    const st = { a: 'box', b: 'circle', poseA: { x: -1.1, y: -0.2, th: rad(-8) }, poseB: { x: 1.15, y: 0.6, th: 0 }, amt: 0.35, dir: rad(150) };
    fillSelect($('[data-in=shapeB]'), st.b);

    const render = rafRenderer(draw);
    const shapeA = () => place(SHAPES[st.a].pts, st.poseA);
    const shapeBAt = off => place(SHAPES[st.b].pts, { x: st.poseB.x + off[0], y: st.poseB.y + off[1], th: st.poseB.th });

    function drawPlot(d0, n, u) {
      const ctx = plotCanvas.getContext('2d'), r = plotCanvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      plotCanvas.width = r.width * dpr; plotCanvas.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height, pad = { l: 34, r: 8, t: 8, b: 20 };
      const A = shapeA(), xs = [], act = [], pred = [];
      for (let i = 0; i <= 60; i++) {
        const t = -1 + (2 * i) / 60; xs.push(t);
        act.push(signedDistance(A, shapeBAt(mul(u, t))).dist);
        pred.push(d0 + dot(n, u) * t);
      }
      let lo = Math.min(...act, ...pred), hi = Math.max(...act, ...pred);
      if (hi - lo < 0.2) { const m = (hi + lo) / 2; lo = m - 0.1; hi = m + 0.1; }
      const X = t => pad.l + ((t + 1) / 2) * (W - pad.l - pad.r);
      const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px ' + COL.mono; ctx.fillStyle = COL.muted; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
      [lo, (lo + hi) / 2, hi].forEach(v => { ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke(); ctx.fillText(fmt(v, 1), pad.l - 5, Y(v)); });
      if (lo < 0 && hi > 0) { ctx.strokeStyle = COL.hit; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Y(0)); ctx.lineTo(W - pad.r, Y(0)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText('nudge size →', (W + pad.l) / 2, H - 15);
      const path = (vals, color, w) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); vals.forEach((v, i) => (i ? ctx.lineTo(X(xs[i]), Y(v)) : ctx.moveTo(X(xs[i]), Y(v)))); ctx.stroke(); };
      path(pred, COL.violet, 2); path(act, COL.ink, 2);
      ctx.strokeStyle = COL.muted; ctx.beginPath(); ctx.moveTo(X(st.amt), pad.t); ctx.lineTo(X(st.amt), H - pad.b); ctx.stroke();
      const actNow = signedDistance(A, shapeBAt(mul(u, st.amt))).dist;
      [[d0 + dot(n, u) * st.amt, COL.violet], [actNow, COL.ink]].forEach(([v, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(X(st.amt), Y(v), 4, 0, Math.PI * 2); ctx.fill(); });
    }

    function draw() {
      syncColors();
      const A = shapeA(), B0 = shapeBAt([0, 0]);
      const u = [Math.cos(st.dir), Math.sin(st.dir)], delta = mul(u, st.amt);
      const B1 = shapeBAt(delta);
      const r0 = signedDistance(A, B0), r1 = signedDistance(A, B1);
      const pred = r0.dist + dot(r0.normal, delta);   // d(distance)/d(translation of B) = contact normal
      const err = Math.abs(pred - r1.dist);

      world.clear();
      world.poly(A, { fill: COL.aFill, stroke: COL.a });
      world.poly(B0, { fill: COL.bFill, stroke: COL.b });
      world.poly(B1, { fill: COL.b + '10', stroke: COL.b, width: 1.5, dash: [6, 4] });
      world.arrow([st.poseB.x, st.poseB.y], [st.poseB.x + delta[0], st.poseB.y + delta[1]], { stroke: COL.violet, width: 2.5 });
      if (r0.dist > TOUCH_TOL) world.line(r0.pA, r0.pB, { stroke: COL.apart, width: 2, dash: [6, 4] });
      world.arrow(r0.pA, add(r0.pA, mul(r0.normal, 0.7)), { stroke: COL.ink, width: 1.5, head: 7 });
      world.dot(r0.pA); world.dot(r0.pB);

      const sign = v => (v >= 0 ? '+' : '') + fmt(v);
      $('[data-out=d0]').textContent = sign(r0.dist);
      $('[data-out=pred]').textContent = sign(pred);
      $('[data-out=actual]').textContent = sign(r1.dist);
      $('[data-out=err]').textContent = fmt(err, 3);
      $('[data-out=err]').style.color = err < 0.02 ? COL.apart : err < 0.1 ? COL.touch : COL.hit;
      $('[data-out=amt]').textContent = fmt(st.amt);
      $('[data-out=dir]').textContent = `${deg(st.dir)}°`;
      const along = dot(r0.normal, u);
      $('[data-out=explain]').textContent =
        `The derivative says the distance changes by ${fmt(along)} for every unit you move B in this direction (` +
        (Math.abs(along) < 0.15 ? 'sideways to the normal, so barely at all' : along > 0 ? 'along the normal, so the gap grows' : 'against the normal, so the gap shrinks') + ').';
      drawPlot(r0.dist, r0.normal, u);
    }

    draggable(world, {
      hitTest: p => pointInConvex(shapeBAt([0, 0]), p) || len(sub(p, [st.poseB.x, st.poseB.y])) < 0.4,
      onMove: (dx, dy) => { st.poseB.x += dx; st.poseB.y += dy; render(); },
      bounds: boundsFor(world, st.poseB, 0.6),
    });
    const amtIn = $('[data-in=amt]');
    amtIn.addEventListener('input', e => { st.amt = +e.target.value; render(); });
    $('[data-in=dir]').addEventListener('input', e => { st.dir = rad(+e.target.value); render(); });
    $('[data-in=shapeB]').addEventListener('change', e => { st.b = e.target.value; render(); });

    let anim = null;
    const animBtn = $('[data-in=animate]');
    animBtn.addEventListener('click', () => {
      if (anim) { cancelAnimationFrame(anim); anim = null; animBtn.textContent = '▶ Sweep nudge'; return; }
      animBtn.textContent = '■ Stop';
      const t0 = performance.now();
      const step = now => { st.amt = Math.sin((now - t0) / 1100); amtIn.value = st.amt; draw(); anim = requestAnimationFrame(step); };
      anim = requestAnimationFrame(step);
    });

    window.addEventListener('resize', () => { world.resize(); render(); });
    window.addEventListener('themechange', render);
    draw();
  })();
})();
