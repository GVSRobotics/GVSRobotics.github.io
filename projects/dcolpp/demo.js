/* DCOL++ explainer demos: scale-to-touch (alpha) and following its slope. */
(function () {
  'use strict';
  const { SHAPES, place, scaleToTouch, pointInConvex, View, draggable, fmt, add, sub, mul, len } = G2;

  const COL = {
    a: '#3a66f0', aFill: 'rgba(58,102,240,.12)',
    b: '#e08a2a', bFill: 'rgba(224,138,42,.14)',
    ink: '#171a1f', muted: '#5b6470', violet: '#6a4bd8',
    apart: '#1f9d6b', touch: '#d99a00', hit: '#d4473b',
  };
  const deg = r => Math.round(r * 180 / Math.PI);
  const rad = d => d * Math.PI / 180;
  const fillSelect = (sel, value) => { sel.innerHTML = Object.entries(SHAPES).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join(''); sel.value = value; };
  const rafRenderer = fn => { let q = false; return () => { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(); }); }; };
  const boundsFor = (view, pose, margin = 0.55) => () => {
    const hw = view.w / 2 / view.k - margin, hh = view.h / 2 / view.k - margin;
    return { x: pose.x, y: pose.y, x0: view.center[0] - hw, x1: view.center[0] + hw, y0: view.center[1] - hh, y1: view.center[1] + hh };
  };
  const meaningOf = a => (Math.abs(a - 1) < 0.01 ? ['touch', 'touching'] : a > 1 ? ['apart', 'apart'] : ['hit', 'overlapping']);
  const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

  // ------------------------------------------------------------ Demo 1: find alpha
  (function scaleDemo() {
    const root = document.getElementById('demo-scale');
    if (!root) return;
    const $ = s => root.querySelector(s);
    const view = new View($('[data-view=world]'), { span: 5.4, minWidth: 7.2 });
    const st = { a: 'box', b: 'ellipse', poseA: { x: -1.5, y: -0.2, th: rad(10) }, poseB: { x: 1.5, y: 0.4, th: rad(-25) }, guess: 1.6, revealed: false };
    fillSelect($('[data-in=shapeA]'), st.a);
    fillSelect($('[data-in=shapeB]'), st.b);
    const guessIn = $('[data-in=guess]');
    const render = rafRenderer(draw);

    function draw() {
      const LA = SHAPES[st.a].pts, LB = SHAPES[st.b].pts;
      const { alpha, witness } = scaleToTouch(LA, st.poseA, LB, st.poseB);
      const cA = [st.poseA.x, st.poseA.y], cB = [st.poseB.x, st.poseB.y];
      const rel = (st.guess - alpha) / alpha;
      const found = Math.abs(rel) < 0.02;
      if (found) st.revealed = true;

      view.clear();
      view.poly(place(LA, st.poseA), { fill: COL.aFill, stroke: COL.a });
      view.poly(place(LB, st.poseB), { fill: COL.bFill, stroke: COL.b });
      if (st.revealed && !found) {
        view.poly(place(LA, st.poseA, alpha), { stroke: COL.violet, width: 1.2 });
        view.poly(place(LB, st.poseB, alpha), { stroke: COL.violet, width: 1.2 });
      }
      view.poly(place(LA, st.poseA, st.guess), { stroke: COL.a, width: 2, dash: [7, 5] });
      view.poly(place(LB, st.poseB, st.guess), { stroke: COL.b, width: 2, dash: [7, 5] });
      for (const [c, col, name] of [[cA, COL.a, 'A'], [cB, COL.b, 'B']]) {
        view.cross(c, { stroke: col, size: 6, width: 2 });
        view.label(c, name + ' center', { color: col, dx: 9, dy: 11 });
      }
      if (st.revealed) {
        // Body witnesses: the shared point mapped back onto each real surface.
        const wA = add(cA, mul(sub(witness, cA), 1 / alpha)), wB = add(cB, mul(sub(witness, cB), 1 / alpha));
        view.dot(wA, { r: 3.5, fill: COL.a }); view.dot(wB, { r: 3.5, fill: COL.b });
        view.dot(witness, { r: 6, fill: COL.violet });
        view.label(witness, 'witness', { color: COL.violet, dx: 10, dy: -12 });
      }

      const gs = $('[data-out=guessStatus]');
      if (found) { gs.className = 'status touch'; gs.querySelector('span').textContent = 'Just touching: that\'s α!'; }
      else if (rel < 0) { gs.className = 'status'; gs.querySelector('span').textContent = 'Not touching yet: grow them'; }
      else { gs.className = 'status hit'; gs.querySelector('span').textContent = 'Overlapping: shrink them'; }
      $('[data-out=guessText]').textContent = found
        ? 'At this scale the dashed outlines meet at exactly one point.'
        : rel < 0 ? 'Slide the scale to the right until the dashed outlines just meet.' : 'Slide the scale to the left until the dashed outlines only just meet.';
      $('[data-out=guess]').textContent = fmt(st.guess);
      $('[data-out=rot]').textContent = `${deg(st.poseB.th)}°`;

      const [cls, word] = meaningOf(alpha);
      if (st.revealed) {
        $('[data-out=alpha]').innerHTML = `α = ${fmt(alpha)}<small>DCOL++'s answer (thin violet outlines)</small>`;
        $('[data-out=meaning]').textContent = `shapes are ${word}`;
        $('[data-out=meaning]').style.color = COL[cls];
        $('[data-out=gap]').textContent = (alpha >= 1 ? '+' : '') + fmt((1 - 1 / alpha) * len(sub(cB, cA)));
      } else {
        $('[data-out=alpha]').innerHTML = `α = ?<small>Find it with the slider, or press the button</small>`;
        $('[data-out=meaning]').textContent = '—'; $('[data-out=meaning]').style.color = '';
        $('[data-out=gap]').textContent = '—';
      }
      root._alpha = alpha;
    }

    let anim = null;
    function animateGuess(to) {
      cancelAnimationFrame(anim);
      const from = st.guess, t0 = performance.now(), T = 700;
      const step = now => {
        const t = Math.min(1, (now - t0) / T);
        st.guess = from + (to - from) * easeInOut(t); guessIn.value = st.guess; draw();
        if (t < 1) anim = requestAnimationFrame(step);
      };
      anim = requestAnimationFrame(step);
    }

    draggable(view, {
      hitTest: p => pointInConvex(place(SHAPES[st.b].pts, st.poseB), p) || len(sub(p, [st.poseB.x, st.poseB.y])) < 0.4,
      onMove: (dx, dy) => { st.poseB.x += dx; st.poseB.y += dy; render(); },
      bounds: boundsFor(view, st.poseB),
    });
    guessIn.addEventListener('input', e => { cancelAnimationFrame(anim); st.guess = +e.target.value; render(); });
    $('[data-in=reveal]').addEventListener('click', () => { st.revealed = true; animateGuess(Math.min(3, Math.max(0.2, root._alpha))); });
    $('[data-in=shapeA]').addEventListener('change', e => { st.a = e.target.value; render(); });
    $('[data-in=shapeB]').addEventListener('change', e => { st.b = e.target.value; render(); });
    $('[data-in=rot]').addEventListener('input', e => { st.poseB.th = rad(+e.target.value); render(); });
    window.addEventListener('resize', () => { view.resize(); render(); });
    draw();
  })();

  // ------------------------------------------------------------ Demo 2: follow the slope
  (function slopeDemo() {
    const root = document.getElementById('demo-opt');
    if (!root) return;
    const $ = s => root.querySelector(s);
    const view = new View($('[data-view=world]'), { span: 5.4, minWidth: 7.2 });
    const plot = $('[data-view=plot]');
    const START = { x: 1.9, y: 0.7, th: rad(35) };
    const st = { a: 'hexagon', b: 'capsule', poseA: { x: -1.3, y: -0.3, th: rad(8) }, poseB: { ...START }, target: 1, path: [], history: [], running: false };
    fillSelect($('[data-in=shapeB]'), st.b);
    const render = rafRenderer(draw);

    const alphaAt = (x, y) => scaleToTouch(SHAPES[st.a].pts, st.poseA, SHAPES[st.b].pts, { x, y, th: st.poseB.th }).alpha;
    function gradAt(x, y) {
      const h = 1e-3;
      return [(alphaAt(x + h, y) - alphaAt(x - h, y)) / (2 * h), (alphaAt(x, y + h) - alphaAt(x, y - h)) / (2 * h)];
    }

    function drawPlot(alpha) {
      const ctx = plot.getContext('2d'), r = plot.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      plot.width = r.width * dpr; plot.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const W = r.width, H = r.height, pad = { l: 34, r: 8, t: 8, b: 20 };
      const xs = [], ys = [];
      for (let i = 0; i <= 70; i++) { const x = st.poseB.x - 2.5 + (5 * i) / 70; xs.push(x); ys.push(Math.min(3.5, alphaAt(x, st.poseB.y))); }
      const lo = 0, hi = Math.max(2, Math.min(3.5, Math.max(...ys) * 1.05));
      const X = x => pad.l + ((x - xs[0]) / 5) * (W - pad.l - pad.r);
      const Y = v => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
      ctx.clearRect(0, 0, W, H);
      ctx.font = '11px "DM Sans", sans-serif'; ctx.fillStyle = '#5b6470'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.strokeStyle = '#e2e0d8'; ctx.lineWidth = 1;
      [0, 1, 2, 3].filter(v => v <= hi).forEach(v => { ctx.beginPath(); ctx.moveTo(pad.l, Y(v)); ctx.lineTo(W - pad.r, Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(0), pad.l - 5, Y(v)); });
      ctx.strokeStyle = COL.apart; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(pad.l, Y(st.target)); ctx.lineTo(W - pad.r, Y(st.target)); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('← B slides left · right →', (W + pad.l) / 2, H - 15);
      ctx.strokeStyle = COL.violet; ctx.lineWidth = 2; ctx.beginPath();
      xs.forEach((x, i) => (i ? ctx.lineTo(X(x), Y(ys[i])) : ctx.moveTo(X(x), Y(ys[i])))); ctx.stroke();
      ctx.fillStyle = COL.ink; ctx.beginPath(); ctx.arc(X(st.poseB.x), Y(Math.min(3.5, alpha)), 4.5, 0, Math.PI * 2); ctx.fill();
    }

    function draw() {
      const LA = SHAPES[st.a].pts, LB = SHAPES[st.b].pts;
      const { alpha } = scaleToTouch(LA, st.poseA, LB, st.poseB);
      const g = gradAt(st.poseB.x, st.poseB.y), gl = len(g);
      view.clear();
      view.poly(place(LA, st.poseA), { fill: COL.aFill, stroke: COL.a });
      if (st.path.length > 1) {
        st.path.forEach((p, i) => { if (i) view.line(st.path[i - 1], p, { stroke: COL.violet, width: 1.5, dash: [3, 3] }); });
        st.path.forEach(p => view.dot(p, { r: 3.5, fill: COL.violet }));
      }
      view.poly(place(LB, st.poseB), { fill: COL.bFill, stroke: COL.b });
      if (gl > 1e-6 && !st.running) {
        const c = [st.poseB.x, st.poseB.y], tip = add(c, mul(g, 0.9 / gl));
        view.arrow(c, tip, { stroke: COL.ink, width: 2.5 });
        const nearRight = view.toPx(tip)[0] > view.w - 130;
        view.label(tip, 'α grows fastest', { color: COL.ink, dx: nearRight ? -8 : 8, dy: -12, align: nearRight ? 'right' : 'left' });
      }
      $('[data-out=alpha]').innerHTML = `α = ${fmt(alpha)}<small>current value: shapes are ${meaningOf(alpha)[1]}</small>`;
      $('[data-out=target]').textContent = fmt(st.target);
      $('[data-out=targetOut]').textContent = fmt(st.target) + (Math.abs(st.target - 1) < 1e-9 ? ' (just touching)' : st.target > 1 ? ' (keep a gap)' : ' (overlap)');
      $('[data-out=slope]').textContent = fmt(gl) + ' per unit';
      $('[data-out=steps]').textContent = String(Math.max(0, st.history.length - 1));
      $('[data-out=explain]').textContent = st.history.length > 1
        ? 'α at each step: ' + st.history.map(v => fmt(v, 3)).join(' → ')
        : 'The arrow is the slope of α. The optimizer steps along it, further when α is far from the target and less as it gets close.';
      drawPlot(alpha);
    }

    async function run() {
      if (st.running) return;
      st.running = true; runBtn.disabled = true;
      st.path = [[st.poseB.x, st.poseB.y]];
      st.history = [alphaAt(st.poseB.x, st.poseB.y)];
      for (let k = 0; k < 12; k++) {
        const a = st.history[st.history.length - 1];
        if (Math.abs(a - st.target) < 1e-3) break;
        const g = gradAt(st.poseB.x, st.poseB.y), g2 = g[0] * g[0] + g[1] * g[1];
        if (g2 < 1e-10) break;
        let step = mul(g, -(a - st.target) / g2);                    // Newton step on alpha(x) = target
        const L = len(step); if (L > 1.2) step = mul(step, 1.2 / L);
        const from = [st.poseB.x, st.poseB.y], to = add(from, step);
        await new Promise(res => {
          const t0 = performance.now();
          const tick = now => {
            const t = Math.min(1, (now - t0) / 450), e = easeInOut(t);
            st.poseB.x = from[0] + (to[0] - from[0]) * e; st.poseB.y = from[1] + (to[1] - from[1]) * e; draw();
            t < 1 ? requestAnimationFrame(tick) : res();
          };
          requestAnimationFrame(tick);
        });
        st.path.push(to);
        st.history.push(alphaAt(to[0], to[1]));
        draw();
        await new Promise(r => setTimeout(r, 160));
      }
      st.running = false; runBtn.disabled = false; draw();
    }

    draggable(view, {
      hitTest: p => !st.running && (pointInConvex(place(SHAPES[st.b].pts, st.poseB), p) || len(sub(p, [st.poseB.x, st.poseB.y])) < 0.4),
      onMove: (dx, dy) => { st.poseB.x += dx; st.poseB.y += dy; st.path = []; st.history = []; render(); },
      bounds: boundsFor(view, st.poseB),
    });
    const runBtn = $('[data-in=run]');
    runBtn.addEventListener('click', run);
    $('[data-in=reset]').addEventListener('click', () => { if (st.running) return; Object.assign(st.poseB, START); st.path = []; st.history = []; render(); });
    $('[data-in=target]').addEventListener('input', e => { st.target = +e.target.value; st.path = []; st.history = []; render(); });
    $('[data-in=shapeB]').addEventListener('change', e => { st.b = e.target.value; st.path = []; st.history = []; render(); });
    window.addEventListener('resize', () => { view.resize(); render(); });
    draw();
  })();
})();
