/* Method diagrams, drawn as inline SVG. Fills svg.dg[data-diagram].
 * Geometry follows the paper's figure scripts (scripts/figures/): draw_forcing.py (tiles and arrows),
 * export_antidrift_panels.py (data region, GT and rollout points, teacher and guided targets), the Lipschitz data of
 * js/cvchart.js, and the vector paths of figures/method/motion-aware-guidance (figures/method/motion_paths.js). Colors are the paper's (css/diagram.css).
 * Each part carries its step data for js/stepfig.js:
 *   data-in   first step (1-based) the part is on the figure; 0 = always there
 *   data-lit  steps (comma list) where the part is at full strength; elsewhere after data-in it is dimmed
 *   data-out  first step it is gone again (a part that a later step replaces); such parts are left out of Overview
 *   data-ov   "0": also left out of Overview (a detail step shown only when its chip is chosen)
 * Paths with class "draw" draw on when their part appears; ".flow" paths carry moving dots on the steps in data-run.
 * Needs js/core.js. */
(function () {
  'use strict';

  var se = window.PV.se;

  /* ---------- Helpers ---------- */
  function part(parent, inn, lit, extra) {
    var a = { 'data-in': inn };
    if (lit != null) a['data-lit'] = lit;
    if (extra) Object.keys(extra).forEach(function (k) { a[k] = extra[k]; });
    return se('g', a, parent);
  }
  function rect(g, x, y, w, h, cls, rx) { return se('rect', { x: x, y: y, width: w, height: h, rx: rx == null ? 3 : rx, class: cls }, g); }
  function circ(g, x, y, r, cls) { return se('circle', { cx: x, cy: y, r: r, class: cls }, g); }
  function path(g, d, cls) { return se('path', { d: d, class: cls }, g); }
  function img(g, href, x, y, w, h, cls) {
    se('image', { href: href, x: x, y: y, width: w, height: h, preserveAspectRatio: 'xMidYMid slice' }, g);
    if (cls) rect(g, x, y, w, h, cls, 2);
  }

  /* LaTeX through MathJax (vendor/mathjax/tex-svg.js), placed with its baseline at y. fs is the TeX em in px;
   * maxW shrinks a formula that would not fit. Returns the width. */
  function tex(g, x, y, s, cls, anchor, fs, maxW) {
    var m = window.MathJax.tex2svg(s, { display: false }).querySelector('svg');
    var vb = m.getAttribute('viewBox').split(/[\s,]+/).map(Number);
    var k = fs / 1000, w = vb[2] * k;
    if (maxW && w > maxW) { k *= maxW / w; w = maxW; }
    var left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    m.removeAttribute('style');
    ['x', 'y', 'width', 'height'].forEach(function (a, i) { m.setAttribute(a, [left, y + vb[1] * k, w, vb[3] * k][i]); });
    m.setAttribute('class', 'tx ' + (cls || ''));
    m.setAttribute('overflow', 'visible');
    g.appendChild(m);
    return w;
  }
  /* A label: plain text in the page serif, with inline LaTeX between $...$. */
  function text(g, x, y, s, cls, anchor, fs) {
    fs = fs || 16;
    if (s.indexOf('$') < 0) {
      var t0 = se('text', { x: x, y: y, class: cls || '', 'text-anchor': anchor || 'start', 'font-size': fs }, g);
      t0.textContent = s;
      return t0;
    }
    var wrap = se('g', {}, g), cx = 0;
    s.split('$').forEach(function (seg, i) {
      if (!seg) return;
      if (i % 2) { cx += tex(wrap, x + cx, y, seg, cls, 'start', fs * 1.04); return; }
      var lead = seg.length - seg.replace(/^\s+/, '').length, trail = seg.length - seg.replace(/\s+$/, '').length;
      cx += lead * fs * 0.26;
      var t = se('text', { x: x + cx, y: y, class: cls || '', 'font-size': fs }, wrap);
      t.textContent = seg.trim();
      cx += t.getComputedTextLength() + trail * fs * 0.26;
    });
    var dx = anchor === 'middle' ? -cx / 2 : anchor === 'end' ? -cx : 0;
    if (dx) wrap.setAttribute('transform', 'translate(' + dx.toFixed(2) + ' 0)');
    return wrap;
  }

  // Arrow along path d; the head's tip is the path's end point. cls sets the color (ink, gray, blue, orange, purple).
  // Shafts draw on along the path when their part comes in (dashed and dotted ones through a mask), then the head shows.
  // opt.delay and opt.dur (s) place the draw-on in time, so arrows of one step can come out one after another.
  var maskId = 0;
  function arrow(g, d, cls, opt) {
    opt = opt || {};
    var a = se('g', { class: 'ar ' + (cls || 'ink') + (opt.thin ? ' thin' : '') }, g);
    if (opt.delay != null) a.style.setProperty('--d', opt.delay + 's');
    if (opt.dur != null) a.style.setProperty('--dr', opt.dur + 's');
    var plain = !opt.dash && !opt.dot;
    var p = se('path', { d: d, class: 'shaft' + (opt.dash ? ' dash' : opt.dot ? ' dot' : ' draw') }, a);
    var L = p.getTotalLength(), e = p.getPointAtLength(L), b = p.getPointAtLength(Math.max(0, L - 3));
    var ux = e.x - b.x, uy = e.y - b.y, n = Math.hypot(ux, uy) || 1; ux /= n; uy /= n;
    var hl = opt.head || 9, hw = hl * 0.4;
    var bx = e.x - ux * hl, by = e.y - uy * hl;
    se('path', { class: 'head', d: 'M' + e.x + ' ' + e.y + 'L' + (bx - uy * hw) + ' ' + (by + ux * hw) + 'L' + (bx + uy * hw) + ' ' + (by - ux * hw) + 'Z' }, a);
    var len = Math.max(0, L - hl * 0.6).toFixed(2);
    if (plain) p.style.setProperty('--len', len);
    else {
      var id = 'dgm' + (++maskId);
      var mk = se('mask', { id: id, maskUnits: 'userSpaceOnUse', x: -2000, y: -2000, width: 6000, height: 6000 }, a);
      se('path', { d: d, class: 'mk draw', style: '--len:' + len }, mk);
      p.setAttribute('mask', 'url(#' + id + ')');
    }
    return a;
  }
  function seg(p, q, t1, t2) {
    var dx = q[0] - p[0], dy = q[1] - p[1], n = Math.hypot(dx, dy);
    dx /= n; dy /= n;
    return 'M' + (p[0] + dx * (t1 || 0)) + ' ' + (p[1] + dy * (t1 || 0)) + 'L' + (q[0] - dx * (t2 || 0)) + ' ' + (q[1] - dy * (t2 || 0));
  }
  function flow(layer, d, run, cls) {
    var g = se('g', { class: 'flow' + (cls ? ' ' + cls : ''), 'data-run': run }, layer);
    path(g, d, 'dots halo');
    path(g, d, 'dots');
    return g;
  }
  function region(g, x, y, w, h, name) {
    rect(g, x, y, w, h, 'region', 10);
    text(g, x + 4, y - 13, name, 'rt', 'start', 21);
  }
  // Tile: a video frame with a colored border, as in the paper's forcing figure.
  function tile(g, href, x, y, w, h, cls) { img(g, href, x, y, w, h); rect(g, x, y, w, h, 'tile ' + cls, 3); }
  // A group that fades in t s after its part comes in.
  function later(g, t) { var q = se('g', { class: 'lt' }, g); q.style.setProperty('--d', t + 's'); return q; }
  function bracket(g, x0, x1, y, caption) {
    path(g, 'M' + x0 + ' ' + y + 'V' + (y + 5) + 'H' + x1 + 'V' + y, 'brk');
    text(g, (x0 + x1) / 2, y + 25, caption, 'brk-t', 'middle', 18);
  }

  var M = 'figures/method/';

  /* ---------- Figure: background, AR FlowMap distillation vs SF-DMD ---------- */
  /* Four rows: the teacher on top; under it the teacher's context (chunks 1 to 3) and, in the fourth place, where the
   * teacher's output (down) and the student's (up) meet; the student; the student's input at the bottom. The student
   * always runs bottom to top (noisy chunk in, clean chunk out). The teacher's noisy input is left out: in the fourth
   * place only its output arrow is drawn. Each panel plays as a timeline while its step is on: parts with data-ph come
   * in at that phase and stay (their arrows drawing on); the chunk-by-chunk rollout runs fast.
   * (a) teacher-forcing: real history and x^4_t into the student, its output up; the same history as the teacher's
   * context; the teacher's output comes down to meet it (FlowMap). (b) self-forcing: from full noise x_1, the student
   * makes each chunk, which lands in the teacher's context row and is laid over its noise as the next condition; then
   * x^4_t, the student's output up and the teacher's down meet. (c) SF-DMD: the student makes all four chunks, and the
   * bidirectional teacher supervises all of them (DMD). Frames: a clean video in (a), a drifting student rollout in (b)
   * and (c) (figures/method/drift-teacher); full noise is figures/method/noise.jpg. */
  var PHASE_S = 1, ROLL_S = 0.4, HOLD_MS = 2200;
  function background(svg) {
    var body = se('g', {}, svg);
    var TW = 72, TH = 42, TG = 12, D = 'figures/method/drift-teacher/';
    var yT = 72, yF = 176, yS = 262, BH = 40, yX = 366;
    function cols(rx) { return [0, 1, 2, 3].map(function (k) { return rx + 12 + k * (TW + TG); }); }
    function frame(g, href, x, y, cls, s) {
      tile(g, href, x, y, TW, TH, cls);
      rect(g, x + 2, y + 2, 39, 25, 'tag-bg', 3);
      tex(g, x + 5.5, y + 18.5, s, '', 'start', 17);
    }
    function box(g, x, w, y, cls, label) {
      rect(g, x, y, w, BH, 'box ' + cls, 8);
      text(g, x + w / 2, y + BH / 2 + 7, label, 'lbl', 'middle', 21);
    }
    function vline(x, y0, y1) { return 'M' + x + ' ' + y0 + 'V' + y1; }
    var intoT = [yF - 2, yT + BH + 2], outT = [yT + BH + 2, yF - 2], outS = [yS - 2, yF + TH + 2], intoS = [yX - 2, yS + BH + 2];
    var thin = { head: 8, thin: true }, bold = { head: 10 };

    function panel(k, rx, kind, title) {
      region(part(body, 0, String(k)), rx, 46, 398, 380, title);
      var g = part(body, k, String(k), { 'data-phases': '1' }), c = cols(rx), xr = c[3] + TW;
      var tf = kind === 'tf', dmd = kind === 'dmd', durs = [], groups = {};
      function ph(i, dur) {
        if (dur != null) durs[i - 1] = dur;
        if (!groups[i]) {
          groups[i] = se('g', { 'data-ph': i }, g);
          groups[i].style.setProperty('--dr', ((durs[i - 1] || PHASE_S) * 0.8).toFixed(2) + 's');
          groups[i].style.setProperty('--d', '0s');
        }
        return groups[i];
      }
      function arr(i, d, cls, opt) { arrow(ph(i), d, cls, opt); }
      /* Causal input: chunk j is made from chunks 1..j, so the arrows from those chunks (row y0) gather into the model
       * (edge y1) at one point under chunk j; own colors chunk j's own arrow. Fans for every j make the causal triangle. */
      function fan(i, j, y0, y1, own, until) {
        var fg = ph(i);
        if (until) { fg = se('g', { 'data-ph': i, 'data-until': until }, g); fg.style.cssText = ph(i).style.cssText; }
        for (var q = 0; q <= j; q++) {
          arrow(fg, 'M' + cx[q] + ' ' + y0 + 'L' + cx[j] + ' ' + y1, q === j && own ? own : 'gray', q === j && own ? { head: 9 } : thin);
        }
      }
      // The causal teacher: each context chunk goes up to its own place and to every later one (chunk 4: just left of the output arrow).
      function fanT(i) {
        for (var q = 0; q < 3; q++) for (var t = q; t < 4; t++)
          arr(i, 'M' + cx[q] + ' ' + intoT[0] + 'L' + (t === 3 ? cx[3] - 14 : cx[t]) + ' ' + intoT[1], 'gray', thin);
      }
      box(g, c[0], xr - c[0], yT, dmd ? 'orange' : 'blue', dmd ? 'Bidirectional teacher' : 'AR teacher');
      box(g, c[0], xr - c[0], yS, 'ink', 'Student');
      var cx = c.map(function (x) { return x + TW / 2; }), p = 1, j;
      var lab = function (j) { return (tf ? 'x' : '\\hat{x}') + '^{' + (j + 1) + '}_{0}'; };

      if (tf) {
        var real = [M + 'tf_1.jpg', M + 'tf_2.jpg', M + 'tf_3.jpg'];
        ph(1, PHASE_S);
        for (j = 0; j < 3; j++) frame(ph(1), real[j], c[j], yX, 'blue', lab(j));
        frame(ph(1), M + 'tf_4_noisy.jpg', c[3], yX, 'orange', 'x^{4}_{t}');
        ph(2, PHASE_S);
        for (j = 0; j < 4; j++) fan(2, j, intoS[0], intoS[1], j === 3 ? 'orange' : null);
        ph(3, PHASE_S);
        arr(3, vline(cx[3], outS[0], outS[1]), 'ink', bold);
        frame(ph(3), M + 'tf_4.jpg', c[3], yF, 'out', '\\hat{x}^{4}_{0}');
        ph(4, PHASE_S);
        for (j = 0; j < 3; j++) frame(ph(4), real[j], c[j], yF, 'blue', lab(j));
        fanT(4);
        p = 5;
      } else {
        var roll = [D + 'rollout_1.jpg', D + 'rollout_2.jpg', D + 'rollout_3.jpg', D + 'teacher.jpg'], m = dmd ? 4 : 3;
        ph(1, 0.6);
        for (j = 0; j < m; j++) frame(ph(1), M + 'noise.jpg', c[j], yX, 'gray', 'x^{' + (j + 1) + '}_{1}');
        p = 2;
        for (j = 0; j < m; j++) {
          ph(p, ROLL_S);
          fan(p, j, intoS[0], intoS[1]);
          arr(p, vline(cx[j], outS[0], outS[1]), 'ink', bold);
          frame(ph(p), roll[j], c[j], yF, j === 3 ? 'out' : 'gray', lab(j));
          p++;
          if (j < 3) {
            // The chunk goes back in: a copy slides down from the context row onto its noise, as the next condition.
            ph(p, 0.75);
            var sl = se('g', { class: 'slide' }, ph(p));
            sl.style.setProperty('--dy', (yF - yX + 4) + 'px');
            frame(sl, roll[j], c[j] + 4, yX - 4, 'gray', lab(j));
            p++;
          }
        }
        if (!dmd) {
          ph(p, PHASE_S);
          frame(ph(p), M + 'rollout_3_noisy.jpg', c[3], yX, 'orange', 'x^{4}_{t}');
          fan(p, 3, intoS[0], intoS[1], 'orange');
          p++;
          ph(p, PHASE_S);
          arr(p, vline(cx[3], outS[0], outS[1]), 'ink', bold);
          frame(ph(p), D + 'teacher.jpg', c[3], yF, 'out', '\\hat{x}^{4}_{0}');
          p++;
          ph(p, PHASE_S);
          fanT(p);
          p++;
        }
      }
      if (dmd) {
        ph(p, PHASE_S);
        for (j = 0; j < 4; j++) arr(p, vline(cx[j] - 9, intoT[0], intoT[1]), 'gray', thin);
        p++;
        ph(p, 1.2);
        for (j = 0; j < 4; j++) arr(p, vline(cx[j] + 9, outT[0], outT[1]), 'orange', { head: 10, dash: true });
        text(ph(p), cx[3] + 16, (outT[0] + outT[1]) / 2 + 6, 'DMD', 'lbl orange-t', 'start', 19);
      } else {
        ph(p, PHASE_S);
        arr(p, vline(cx[3], outT[0], outT[1]), 'blue', { head: 10, dash: true });
        text(ph(p), cx[3] + 7, (outT[0] + outT[1]) / 2 + 6, 'FlowMap', 'cap', 'start', 17.5);
      }
      g.setAttribute('data-phases', durs.map(function (x) { return Math.round(x * 1000); }).join(','));
    }
    panel(1, 6, 'tf', '(a) AR FlowMap: teacher-forcing');
    panel(2, 421, 'sf', '(b) AR FlowMap: self-forcing');
    panel(3, 836, 'dmd', '(c) DMD: self-forcing');
    playPhases(svg);
  }

  // Runs the phase timeline of the panel whose step is on; Overview and dimmed panels show everything, still.
  function playPhases(svg) {
    var panels = [].slice.call(svg.querySelectorAll('[data-phases]')).map(function (el) {
      var durs = el.dataset.phases.split(',').map(Number), ends = [], t = 0;
      durs.forEach(function (d) { t += d; ends.push(t); });
      return { el: el, n: durs.length, ends: ends, t0: 0, cur: -1,
               items: [].slice.call(el.querySelectorAll('[data-ph]')) };
    });
    var reduce = window.PV.reduce && window.PV.reduce.matches;
    function set(p, cur) {
      if (cur === p.cur) return;
      p.cur = cur;
      p.el.classList.toggle('playing', cur > 0);
      p.items.forEach(function (e) {
        e.classList.toggle('shown', cur <= 0 || Number(e.dataset.ph) <= cur);
        if (e.dataset.until) e.classList.toggle('gone', cur <= 0 || cur >= Number(e.dataset.until));
      });
    }
    function tick(now) {
      var ov = svg.classList.contains('overview');
      panels.forEach(function (p) {
        if (reduce || ov || p.el.getAttribute('data-st') !== 'lit') { p.t0 = 0; set(p, 0); return; }
        if (!p.t0) p.t0 = now;
        var e = now - p.t0, end = p.ends[p.n - 1];
        if (e >= end + HOLD_MS) { p.t0 = now; e = 0; }
        var k = 0;
        while (k < p.n && e >= p.ends[k]) k++;
        set(p, k < p.n ? k + 1 : p.n + 0.5);
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Figure: anti-drifting guidance ---------- */
  /* The paper figure (sections/02_related_work.tex): (a) and (b) in the data units of export_antidrift_panels.py
   * (axes x -42..308, y 80..355), (c) in the canvas units of draw_drift_teacher.py (190 x 115). */
  function antidrift(svg) {
    var body = se('g', {}, svg);

    region(part(body, 0, '1,2'), 6, 46, 370, 380, '(a) Teacher on rollout');
    region(part(body, 0, '3'), 392, 46, 370, 380, '(b) Anti-drifting guidance');
    region(part(body, 0, '4'), 778, 46, 456, 380, '(c) Teacher given a student rollout');

    function sub(a, b) { return [a[0] - b[0], a[1] - b[1]]; }
    function add(a, b) { return [a[0] + b[0], a[1] + b[1]]; }
    function mul(a, k) { return [a[0] * k, a[1] * k]; }
    function norm(a) { return Math.hypot(a[0], a[1]); }

    var tau = [0, 1 / 3, 2 / 3];
    var GT = tau.map(function (t) { return [55 + 20 * t + 105 * t * t, 300 - 240 * t]; });
    var stepLen = [norm(sub(GT[1], GT[0])), norm(sub(GT[2], GT[1]))];
    var rd = [[108, -62], [140, -48]].map(function (v, i) { return mul(v, stepLen[i] / norm(v)); });
    // The second rollout step R is sized so that the correction T - R is parallel to the cap of the region.
    var capDx = 20 + 210 * 0.7, cn = mul([240, capDx], 1 / Math.hypot(capDx, 240));
    var d2 = mul(rd[1], 1 / norm(rd[1])), T = sub(GT[2], GT[1]);
    var R = mul(d2, (T[0] * cn[1] - cn[0] * T[1]) / (d2[0] * cn[1] - cn[0] * d2[1]));
    var p0 = add(GT[0], [40, 4]), p = add(p0, rd[0]);
    var teacherEnd = add(p, T), rollEnd = add(p, R), guidedEnd = add(add(p, T), sub(T, R));

    var S = 1.02;
    function mapper(ox, oy) { return function (v) { return [(v[0] + 42) * S + ox, (v[1] - 80) * S + oy]; }; }

    // Shaded data region, GT trajectory and the drifting rollout: the base of panels (a) and (b). Within a step the
    // arrows come out one after another from t0 (s): each point shows when the arrow into it arrives.
    var STEP = 0.5;
    function base(g, P, t0, labels) {
      var n = 120, ts = [];
      for (var i = 0; i < n; i++) ts.push(-0.13 + (0.83 * i) / (n - 1));
      var c = ts.map(function (t) { return [55 + 20 * t + 105 * t * t, 300 - 240 * t]; });
      var nr = ts.map(function (t) { var dx = 20 + 210 * t, l = Math.hypot(dx, 240); return [240 / l, dx / l]; });
      var tg = ts.map(function (t) { var dx = 20 + 210 * t, l = Math.hypot(dx, 240); return [dx / l, -240 / l]; });
      var shades = ['#fdf7f2', '#fbf0e7', '#f9e9dc', '#f7e2d2', '#f5dcc9', '#f3d6c0', '#f1d0b7', '#efcbae', '#edc5a6'];
      var th = []; for (var k = 0; k <= 40; k++) th.push(Math.PI * k / 40);
      function d(pts) { return 'M' + pts.map(function (q) { q = P(q); return q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('L') + 'Z'; }
      shades.forEach(function (col, si) {
        var half = 84 - (41 * si) / 8, pts = [];
        c.forEach(function (q, i) { pts.push(add(q, mul(nr[i], half))); });
        th.forEach(function (a) { pts.push(add(add(c[n - 1], mul(nr[n - 1], half * Math.cos(a))), mul(tg[n - 1], 10 * Math.sin(a)))); });
        for (var i = n - 1; i >= 0; i--) pts.push(sub(c[i], mul(nr[i], half)));
        th.forEach(function (a) { pts.push(sub(sub(c[0], mul(nr[0], half * Math.cos(a))), mul(tg[0], 10 * Math.sin(a)))); });
        se('path', { d: d(pts), fill: col }, g);
      });
      var cap = [];
      for (var k2 = 0; k2 <= 80; k2++) {
        var a = 2 * Math.PI * k2 / 80;
        cap.push(add(add(c[n - 1], mul(nr[n - 1], 84 * Math.cos(a))), mul(tg[n - 1], 10 * Math.sin(a))));
      }
      se('path', { d: d(cap), class: 'bandcap' }, g);
      for (var j = 0; j < 2; j++) arrow(g, seg(P(GT[j]), P(GT[j + 1]), 11, 11), 'ink', { head: 11, delay: t0 + j * STEP, dur: STEP });
      GT.forEach(function (q, k) {
        var lg = later(g, t0 + Math.max(0, k * STEP - 0.1));
        circ(lg, P(q)[0], P(q)[1], 6.2, 'pt-gt');
        tex(lg, P(q)[0] - 15, P(q)[1] + 9, 'x^{' + (k + 1) + '}', '', 'end', 24);
        if (k === 1 && labels) { text(lg, P(q)[0] - 22, P(q)[1] - 48, 'Teacher', 'lbl', 'end', 20); text(lg, P(q)[0] - 22, P(q)[1] - 25, 'rollout', 'lbl', 'end', 20); }
      });
    }
    // The student's rollout from t0; full: also its second, drifting step (panel (a)).
    function rollout(g, P, t0, full) {
      arrow(g, seg(P(p0), P(p), 11, 11), 'gray', { dash: true, head: 11, delay: t0, dur: STEP });
      var l0 = later(g, t0), l1 = later(g, t0 + STEP - 0.1);
      circ(l0, P(p0)[0], P(p0)[1], 6.2, 'pt-roll');
      tex(l0, P(p0)[0] + 13, P(p0)[1] + 27, '\\hat{x}^{1}', 'gray-t', 'start', 23);
      circ(l1, P(p)[0], P(p)[1], 6.2, 'pt-roll');
      tex(l1, P(p)[0] + 13, P(p)[1] + 28, '\\hat{x}^{2}', 'gray-t', 'start', 23);
      if (!full) return;
      var ls = later(g, t0 + STEP);
      text(ls, P(p)[0] + 34, P(p)[1] + 52, 'Student', 'lbl gray-t', 'start', 20);
      text(ls, P(p)[0] + 34, P(p)[1] + 75, 'rollout', 'lbl gray-t', 'start', 20);
      arrow(g, seg(P(p), P(rollEnd), 11, 9), 'gray', { dash: true, head: 11, delay: t0 + STEP, dur: STEP });
      circ(later(g, t0 + 2 * STEP - 0.1), P(rollEnd)[0], P(rollEnd)[1], 4.5, 'pt-hollow');
    }

    /* (a) Teacher on rollout: the AR teacher on the drifted rollout keeps the offset from GT. */
    var Pa = mapper(12.5, 96);
    var A = part(body, 1, '1,2');
    base(A, Pa, 0.1, true);
    rollout(A, Pa, 1.2, true);
    var A2 = part(body, 2, '2');
    arrow(A2, seg(Pa(p), Pa(teacherEnd), 11, 9), 'blue', { head: 12, delay: 0.1, dur: 0.6 });
    var A2l = later(A2, 0.6);
    circ(A2l, Pa(teacherEnd)[0], Pa(teacherEnd)[1], 6.2, 'pt-blue');
    text(A2l, Pa(teacherEnd)[0] + 36, Pa(teacherEnd)[1] - 46, 'Drifted', 'lbl blue-t', 'middle', 21.5);
    text(A2l, Pa(teacherEnd)[0] + 36, Pa(teacherEnd)[1] - 22, 'supervision', 'lbl blue-t', 'middle', 21.5);

    /* (b) Anti-drifting guidance: the teacher, then the drift model v_psi (it mimics the student's drifted transition),
     * then the guided velocity, pushed from the teacher away from the drift model back toward the data. */
    var Pb = mapper(398.5, 96), dm = mul(add(Pb(p), Pb(rollEnd)), 0.5);
    var B = part(body, 3, '3');
    base(B, Pb, 0.1, false);
    rollout(B, Pb, 1.2, false);
    arrow(B, seg(Pb(p), Pb(teacherEnd), 11, 9), 'blue', { head: 12, delay: 1.8, dur: 0.5 });
    circ(later(B, 2.2), Pb(teacherEnd)[0], Pb(teacherEnd)[1], 4.5, 'pt-hollow blue');
    arrow(B, seg(Pb(p), Pb(rollEnd), 11, 9), 'purple', { head: 12, delay: 2.5, dur: 0.5 });
    var Bd = later(B, 2.9);
    circ(Bd, Pb(rollEnd)[0], Pb(rollEnd)[1], 4.5, 'pt-hollow purple');
    text(Bd, dm[0] + 8, dm[1] + 34, 'Drift', 'lbl purple-t', 'start', 21.5);
    text(Bd, dm[0] + 8, dm[1] + 58, 'model', 'lbl purple-t', 'start', 21.5);
    arrow(B, seg(Pb(rollEnd), Pb(teacherEnd), 7, 7), 'orange', { head: 9, thin: true, delay: 3.3, dur: 0.4 });
    arrow(B, seg(Pb(teacherEnd), Pb(guidedEnd), 7, 8), 'orange', { head: 9, thin: true, dash: true, delay: 3.7, dur: 0.4 });
    arrow(B, seg(Pb(p), Pb(guidedEnd), 11, 9), 'orange', { head: 12, delay: 4.1, dur: 0.6 });
    var Bg = later(B, 4.6);
    circ(Bg, Pb(guidedEnd)[0], Pb(guidedEnd)[1], 6.2, 'pt-orange');
    text(Bg, Pb(teacherEnd)[0] + 36, Pb(teacherEnd)[1] - 52, 'Anti-drifting', 'lbl orange-t', 'middle', 21.5);
    text(Bg, Pb(teacherEnd)[0] + 36, Pb(teacherEnd)[1] - 28, 'guidance', 'lbl orange-t', 'middle', 21.5);

    /* (c) Next chunk generated from a drifted rollout by the teacher and by the guided teacher. */
    var cs = 2.3, cox = 787.5, coy = 106;
    function Q(x, y) { return [cox + x * cs, coy + y * cs]; }
    var F = 'figures/method/drift-teacher/', ar = 444 / 770;
    var C = part(body, 4, '4');
    var wh = 40, gh = 3, yh = 80, xh = 95 - (3 * wh + 2 * gh) / 2;
    for (var k = 0; k < 3; k++) {
      var q = Q(xh + k * (wh + gh), yh), lk = later(C, 0.1 + k * 0.3);
      tile(lk, F + 'rollout_' + (k + 1) + '.jpg', q[0], q[1], wh * cs, wh * ar * cs, 'gray');
      tex(lk, q[0] + wh * cs / 2, q[1] + wh * ar * cs + 27, '\\hat{x}^{' + (k + 1) + '}', 'gray-t', 'middle', 22);
    }
    var wo = 92, yo = 10, ho = wo * ar, yf = 72;
    var outs = [[0, 'teacher', 'Teacher', 'blue'], [wo + 6, 'guided', 'Guided Teacher', 'orange']];
    var stem = Q(95, yh - 1), fork = Q(95, yf);
    path(later(C, 1.0), 'M' + stem + 'L' + fork, 'ln gray');
    outs.forEach(function (o) {
      var q = Q(o[0], yo), lo = later(C, 1.6);
      tile(lo, F + o[1] + '.jpg', q[0], q[1], wo * cs, ho * cs, o[3]);
      text(lo, q[0] + wo * cs / 2, q[1] - 10, o[2], 'lbl ' + o[3] + '-t', 'middle', 20);
      var top = Q(o[0] + wo / 2, yo + ho + 1);
      var d = 'M' + fork + 'L' + top[0] + ' ' + fork[1] + 'L' + top;
      arrow(C, d, o[3], { head: 10, delay: 1.1, dur: 0.5 });
    });

    // Legend (the paper's antidrift legend)
    var Lg = part(body, 0, null);
    var lx = 86, ly = 463;
    function lgItem(cls, dash, dotCls, lbl) {
      arrow(Lg, 'M' + lx + ' ' + (ly - 6) + 'L' + (lx + 34) + ' ' + (ly - 6), cls, { head: 9, dash: dash });
      if (dotCls) circ(Lg, lx, ly - 6, 4.5, dotCls);
      var t = text(Lg, lx + 43, ly, lbl, 'lg', 'start', 19.5);
      lx += 43 + t.getComputedTextLength() + 40;
    }
    lgItem('ink', false, 'pt-gt', 'Teacher rollout');
    lgItem('gray', true, 'pt-roll', 'Student rollout');
    lgItem('blue', false, null, 'Teacher');
    lgItem('purple', false, null, 'Drift model');
    lgItem('orange', false, 'pt-orange', 'Guided');
  }

  /* ---------- Figure: motion-aware guidance ---------- */
  /* One row of three cells: the Lipschitz constant of the guided teacher in the first and in the second chunk (paper
   * Figure "curvature", data of js/cvchart.js), and the paper's motion-aware guidance figure (the vector paths of
   * figures/method/motion-aware-guidance, figures/method/motion_paths.js). Step 1 lays the initialized student's
   * one-step prediction and the unguided Lipschitz constant across motion deciles over the charts; steps 2 to 5 bring in
   * one guidance at a time, with its numbers at the line ends; step 5 shows the conceptual figure. Step 6, left out of Overview (data-ov="0"), lays the soft-skip rule and the
   * uncertainty head's loss over the conceptual figure. */
  function motionaware(svg) {
    function f1(v) { return v.toFixed(1); }
    var Dt = window.PV.cvData, body = se('g', {}, svg);
    var CW = 300, CH = [{ x: 6, title: 'First chunk', min: -10, max: 1, step: 2 }, { x: 316, title: 'Second chunk', min: -4, max: 3, step: 1 }];
    var PT = 82, PB = 326, PL = 60, PR = 68;
    var SER = [{ key: 'cfg', cls: 'cfg', inn: [3, 4], name: 'CFG' }, { key: 'fixed', cls: 'slg', inn: [5, 5], name: 'Skip-layer guidance' },
               { key: 'motion', cls: 'ours', inn: [6, 6], name: 'Motion-aware guidance' }];
    function fmt(v) { return (v > 0 ? '+' : v < 0 ? '\u2212' : '') + Math.abs(v).toFixed(1) + '%'; }
    CH.forEach(function (c, ci) {
      var g = part(body, 0, null);
      region(g, c.x, 46, CW, 382, c.title);
      var x0 = c.x + PL, x1 = c.x + CW - PR;
      var X = function (v) { return x0 + (x1 - x0) * v / 2; };
      var Y = function (v) { return PT + (PB - PT) * (c.max - v) / (c.max - c.min); };
      for (var v = Math.ceil(c.min / c.step) * c.step; v <= c.max; v += c.step) {
        path(g, 'M' + x0 + ' ' + Y(v) + 'H' + x1, v === 0 ? 'cv-zero' : 'cv-grid');
        text(g, x0 - 8, Y(v) + 6, String(v), 'tk', 'end', 17);
      }
      [0, 1, 2].forEach(function (v) { text(g, X(v), PB + 24, String(v), 'tk', 'middle', 17); });
      text(g, (x0 + x1) / 2, PB + 52, 'Guidance norm', 'lg', 'middle', 19);
      if (ci === 0) {
        var yl = text(g, 0, 0, '\u0394 Lipschitz constant (%)', 'lg', 'middle', 19);
        yl.setAttribute('transform', 'translate(' + (c.x + 21) + ' ' + ((PT + PB) / 2) + ') rotate(-90)');
      }
      // End labels at least 22 px apart, keeping their order.
      var ends = SER.map(function (s) { var vs = Dt[s.key + '_' + ci]; return { v: vs[vs.length - 1], y: Y(vs[vs.length - 1]) + 6 }; });
      ends.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (e, k, arr) { if (k) e.y = Math.max(e.y, arr[k - 1].y + 22); });
      SER.forEach(function (s, si) {
        var vals = Dt[s.key + '_' + ci], inn = s.inn[ci];
        var lp = part(body, inn, String(inn));
        var d = vals.map(function (v, k) { return (k ? 'L' : 'M') + X(Dt.lambdas[k]).toFixed(1) + ' ' + Y(v).toFixed(1); }).join('');
        var p = path(lp, d, 'cv-ln draw ' + s.cls);
        p.style.setProperty('--len', p.getTotalLength().toFixed(1));
        p.style.setProperty('--dr', '1s');
        text(later(lp, 0.9), x1 + 5, ends[si].y, fmt(ends[si].v), 'cv-end ' + s.cls, 'start', 17.5);
      });
    });

    // Legend under the charts; each entry comes in with its guidance.
    var lx = 26;
    SER.forEach(function (s) {
      var lg = part(body, s.inn[0], null);
      path(lg, 'M' + lx + ' 456h26', 'cv-ln ' + s.cls);
      var lt = text(lg, lx + 34, 462, s.name, 'lg', 'start', 19);
      lx += 34 + lt.getComputedTextLength() + 36;
    });

    // The paper's motion-aware guidance figure, scaled into the third cell.
    var items = window.MOTION_PATHS || [], SC = 1.1, rx = 626, rw = 608;
    var tr = 'translate(' + (rx + (rw - 515 * SC) / 2 - 15.84 * SC).toFixed(1) + ' ' + (46 + (382 - 285 * SC) / 2 - 5 * SC).toFixed(1) + ') scale(' + SC + ')';
    var R = part(body, 6, '6');
    region(R, rx, 46, rw, 382, 'Motion-aware guidance');
    var art = se('g', { transform: tr }, R), flows = se('g', { class: 'flows sc', transform: tr }, R);
    var imgIdx = 0;
    items.forEach(function (it) {
      if (it.img) {
        se('image', { href: M + (imgIdx++ === 0 ? 'frame.png' : 'uncertainty.png'), x: it.x, y: it.y, width: it.w, height: it.h, preserveAspectRatio: 'none' }, art);
        return;
      }
      se('path', { d: it.d, style: it.s + (/stroke:/.test(it.s) ? '' : ';stroke:none') + (/fill:/.test(it.s) ? '' : ';fill:none') }, art);
    });
    var k = 0.86 * 1.5 / SC;
    function T(x, y, s, cls, anchor, fs) { return text(art, x, y, s, cls, anchor, fs * k); }
    function X2(x, y, s, cls, anchor, fs) { return tex(art, x, y, s, cls, anchor, fs * k); }
    X2(57.96, 206.5, 'x_t', '', 'middle', 16.5);
    T(147.6, 51.5, 'Positive prompt', 'lbl', 'start', 13);
    T(147.6, 283.5, 'Negative prompt', 'lbl', 'start', 13);
    X2(350.5, 98.5, 'v_\\phi', '', 'middle', 15.8);
    X2(350.5, 232.5, 'v_\\phi^-', '', 'middle', 15.8);
    X2(410.5, 129.5, 'w', '', 'start', 14.5);
    X2(374.5, 213.5, '1 - w', '', 'start', 14.2);
    X2(473.5, 152.5, 'v^\\star', '', 'middle', 16.2);
    T(236.88, 155.2, 'Uncertainty', 'lbl orange-t', 'middle', 12.4);
    T(236.88, 171.2, 'head', 'lbl orange-t', 'middle', 12.4);
    T(333.36, 193.2, 'Uncertainty $u$', 'lbl orange-t', 'middle', 11.8);
    X2(251.0, 191.5, 'u', 'orange-t', 'start', 14);
    T(321.0, 20.5, 'Soft skip', 'lbl orange-t', 'start', 11.2);
    T(381.24, 40.5, 'Block', 'lbl', 'middle', 10.5);
    X2(431.5, 26.2, '1 - u', 'orange-t', 'middle', 11.6);
    X2(431.5, 56.5, 'u', 'orange-t', 'middle', 11.6);
    T(381.24, 61.8, 'skip', 'lbl orange-t', 'middle', 10.6);
    function Dp(idx) { return items[idx].d; }
    flow(flows, Dp(0) + Dp(1) + Dp(2) + Dp(3) + Dp(4) + Dp(9) + Dp(10) + Dp(11), '6');
    flow(flows, Dp(7) + Dp(8), '6');
    flow(flows, Dp(83) + Dp(84) + Dp(85) + Dp(86) + Dp(87) + Dp(88) + Dp(89), '6');

    /* Steps 1 and 2, over the whole figure: on the left in both, the initialized student's one-step prediction from a
     * real history (the frames of the paper's one-step figure). Step 1 pairs it with the takeaway on the right (the
     * background is already sharp, so the failure lies in motion); step 2 swaps the right side for the teacher's
     * patch-level Lipschitz constant across motion and the chain of cause and effect. */
    var O = part(body, 1, '1,2', { 'data-out': 3 });
    rect(O, 0, 14, 1240, 420, 'overlay', 10);
    region(O, 6, 46, 300, 382, '');
    var IW = 453, IH = 259, fw = 242, fh = fw * IH / IW, fl = 35, fy0 = 54, fy1 = 256;
    tile(O, M + 'os_real.jpg', fl, fy0, fw, fh, 'blue');
    tile(O, M + 'os_next_clean.jpg', fl, fy1, fw, fh, 'out');
    // Patch grid on the next frame, with a 2x2 static region (blue) and a 2x2 moving region (orange); cells in image pixels.
    var CS = IW / 14, kk = fw / IW, gp = '';
    for (var gc = 1; gc < 14; gc++) gp += 'M' + f1(fl + gc * CS * kk) + ' ' + fy1 + 'v' + f1(fh);
    for (var gr = 1; gr * CS < IH; gr++) gp += 'M' + fl + ' ' + f1(fy1 + gr * CS * kk) + 'h' + fw;
    path(O, gp, 'patch-grid');
    var P2 = [{ c: 10, r: 2, cls: 'blue' }, { c: 3, r: 3, cls: 'orange' }];
    P2.forEach(function (p) {
      rect(O, fl + p.c * CS * kk, fy1 + p.r * CS * kk, 2 * CS * kk, 2 * CS * kk, 'patch ' + p.cls, 1.5);
    });
    text(O, fl + fw / 2, fy0 + fh + 21, 'Real frame (history)', 'cap', 'middle', 18);
    text(O, fl + fw / 2, fy1 + fh + 23, 'Next frame (1 NFE)', 'cap', 'middle', 18);
    var ay0 = fy0 + fh + 28, ay1 = fy1 - 6;
    arrow(O, 'M' + (fl + fw / 2) + ' ' + ay0 + 'V' + ay1, 'ink', { head: 8 });

    var cx0 = 316;
    region(O, cx0, 46, 918, 382, '');

    // Step 1 right: two observation cards (each with a zoomed 2x2 patch thumbnail) converging on the conclusion.
    var S1 = part(body, 1, '1', { 'data-out': 2 });
    var topY = 78, topH = 128, topW = 418, lx0 = cx0 + 28, rx0 = cx0 + 918 - 28 - topW;
    var botY = 278, botH = 100, botW = 610, bxC = cx0 + 918 / 2, thS = 96;
    [['Background is already sharp', 'low-motion patches', 'blue', lx0, P2[0]],
     ['Moving objects are blurred', 'high-motion patches', 'orange', rx0, P2[1]]].forEach(function (b) {
      var bx0 = b[3], p = b[4], tx = bx0 + 16, ty = topY + (topH - thS) / 2;
      rect(S1, bx0, topY, topW, topH, 'box ' + b[2], 8);
      var vb = [f1(p.c * CS), f1(p.r * CS), f1(2 * CS), f1(2 * CS)].join(' ');
      var sv = se('svg', { x: tx, y: ty, width: thS, height: thS, viewBox: vb, preserveAspectRatio: 'xMidYMid slice' }, S1);
      se('image', { href: M + 'os_next_clean.jpg', x: 0, y: 0, width: IW, height: IH }, sv);
      path(S1, 'M' + f1(tx + thS / 2) + ' ' + f1(ty) + 'v' + thS + 'M' + f1(tx) + ' ' + f1(ty + thS / 2) + 'h' + thS, 'patch-grid');
      rect(S1, tx, ty, thS, thS, 'tile ' + b[2], 3);
      var tcx = tx + thS + (topW - 16 - thS - 10) / 2 + 2;
      text(S1, tcx, topY + 55, b[0], 'lbl ' + b[2] + '-t', 'middle', 20.5);
      text(S1, tcx, topY + 86, b[1], 'cap', 'middle', 17.5);
    });
    var s1c = later(S1, 0.35);
    arrow(s1c, 'M' + (lx0 + topW / 2) + ' ' + (topY + topH + 8) + 'L' + (bxC - 56) + ' ' + (botY - 8), 'ink', { head: 9 });
    arrow(s1c, 'M' + (rx0 + topW / 2) + ' ' + (topY + topH + 8) + 'L' + (bxC + 56) + ' ' + (botY - 8), 'ink', { head: 9 });
    rect(s1c, bxC - botW / 2, botY, botW, botH, 'box orange', 8);
    text(s1c, bxC, botY + 42, 'Student fails on learning motion', 'lbl orange-t', 'middle', 23);
    text(s1c, bxC, botY + 73, 'not on generating the static scene', 'cap', 'middle', 18);

    // Step 2 right: the teacher's Lipschitz constant across patch motion, and the chain of cause and effect.
    var S2 = part(body, 2, '2', { 'data-out': 3 });
    var dv = Dt.decile_cond, vmin = 0.82, vmax = 0.87, gx0 = cx0 + 116, gx1 = cx0 + 566;
    var GX = function (k) { return gx0 + 28 + (gx1 - gx0 - 56) * k / 9; }, GY = function (v) { return PT + (PB - PT) * (vmax - v) / (vmax - vmin); };
    [[0, 2, 'blue', 'static'], [8, 9, 'orange', 'moving']].forEach(function (b) {
      var bx0 = Math.max(gx0, GX(b[0]) - 22), bx1 = Math.min(gx1, GX(b[1]) + 22);
      rect(S2, bx0, PT, bx1 - bx0, PB - PT, 'mo-band ' + b[2], 2);
      text(S2, (bx0 + bx1) / 2, PB - 12, b[3], 'lbl ' + b[2] + '-t', 'middle', 17.5);
    });
    for (var gv = vmin; gv <= vmax + 1e-9; gv += 0.01) {
      path(S2, 'M' + gx0 + ' ' + GY(gv) + 'H' + gx1, 'cv-grid');
      text(S2, gx0 - 9, GY(gv) + 6, gv.toFixed(2), 'tk', 'end', 17);
    }
    text(S2, GX(0), PB + 26, 'low', 'lg', 'middle', 17.5);
    text(S2, GX(9), PB + 26, 'high', 'lg', 'middle', 17.5);
    arrow(S2, 'M' + (GX(0) + 30) + ' ' + (PB + 20) + 'H' + (GX(9) - 34), 'gray', { head: 7, thin: true });
    text(S2, (gx0 + gx1) / 2, PB + 52, 'Motion of a patch', 'lg', 'middle', 19);
    var yl2 = text(S2, 0, 0, 'Teacher\u2019s Lipschitz constant', 'lg', 'middle', 19);
    yl2.setAttribute('transform', 'translate(' + (cx0 + 36) + ' ' + ((PT + PB) / 2) + ') rotate(-90)');
    var dd = dv.map(function (v, k) { return (k ? 'L' : 'M') + GX(k).toFixed(1) + ' ' + GY(v).toFixed(1); }).join('');
    var lp2 = path(S2, dd, 'cv-ln draw cfg');
    lp2.style.setProperty('--len', lp2.getTotalLength().toFixed(1));
    lp2.style.setProperty('--dr', '1s');
    dv.forEach(function (v, k) { circ(later(S2, 0.1 + k * 0.09), GX(k), GY(v), 3.6, k < 3 ? 'pt-blue' : k > 7 ? 'pt-orange' : 'pt-ink'); });
    var LG = [['High motion', 'moving patches', 'ink'], ['Non-smooth teacher', 'large Lipschitz constant', 'ink'], ['Hard to learn', 'the student blurs motion', 'orange']];
    var bx = gx1 + 52, bw = 1234 - 20 - bx, bh = 74, by0 = 66, bstep = 122;
    var lgG = later(S2, 1.1);
    LG.forEach(function (l, i) {
      var y = by0 + i * bstep;
      rect(lgG, bx, y, bw, bh, 'box ' + l[2], 8);
      text(lgG, bx + bw / 2, y + 32, l[0], 'lbl' + (l[2] === 'orange' ? ' orange-t' : ''), 'middle', 20);
      text(lgG, bx + bw / 2, y + 57, l[1], 'cap', 'middle', 16.5);
      if (i) arrow(lgG, 'M' + (bx + bw / 2) + ' ' + (y - bstep + bh + 6) + 'V' + (y - 6), 'ink', { head: 8 });
    });
  }


  /* ---------- Figure: FlowMap distillation vs. DMD (general background) ---------- */
  /* Two panels in the layout of panel (a) of the Pi2-Flow page's Figure 1 (that page's js/fig-principle.js): noise
   * (top) to data (bottom), s and t on the left axis. The teacher's distribution is a fixed uneven mixture; its
   * trajectories and the shading under them follow from it (the 1D flow sends each quantile of the Gaussian noise to the
   * same quantile of the data). Under each panel the teacher's distribution (filled blue) and the student's (filled
   * orange) are drawn over each other on one line. Step 1, FlowMap: the student's trajectory from x_s converges onto
   * the teacher's, and its distribution onto the teacher's. Step 2, DMD: one jump of the student from noise, and its
   * distribution pulled toward the teacher's by reverse KL, which shrinks one mode. Notation is the paper's
   * (sections/03_preliminaries.tex; noise at t = 1). The animations are SMIL <animate> elements started when their
   * step is shown; their frozen last frame is what Overview shows. */
  function fmdmd(svg) {
    var S = 327, GAP = 114, TOPM = 34, YM = 1.74 / 2.22;
    var Y_TOP = 0.68, Y_BOT = 0.08, Y_T = 0.38, AX_X = 0.14, XC = 0.57, SRC = 1, NT = 7, YB = 0.08, HD = 0.1, X0 = 0.2, X1 = 0.95;
    function X(x) { return x * S; }
    function Y(y) { return TOPM + (YM - y) * S; }
    function f1(v) { return v.toFixed(1); }
    function frac(y) { var q = Math.min(1, Math.max(0, (Y_TOP - y) / (Y_TOP - Y_BOT))); return 3 * q * q - 2 * q * q * q; }
    function tx(i, y) { return TOPS[i] + (BOTS[i] - TOPS[i]) * frac(y); }
    function poly(fx, y0, y1, n) {
      var d = '';
      for (var i = 0; i <= n; i++) { var y = y0 + (y1 - y0) * i / n; d += (i ? 'L' : 'M') + f1(X(fx(y))) + ' ' + f1(Y(y)); }
      return d;
    }
    /* Densities are mixtures of Gaussian components [mean, sd, weight] (area-preserving: height ~ weight / sd), drawn up
     * from the line at YB on one scale, so the teacher's peak reaches HD. The teacher's distribution is uneven on
     * purpose: a sharp mode on the left, a broader one with a shoulder on the right, where the trajectories end. */
    var TEACH = [[XC - 0.215, 0.038, 1.0], [XC + 0.165, 0.055, 0.75], [XC + 0.275, 0.032, 0.55]];
    var INIT = [[XC - 0.1, 0.06, 0.7], [XC + 0.03, 0.05, 0.85], [XC + 0.14, 0.085, 0.6]];
    var NOISE = [[XC, 0.13, 1]];
    function mixv(cs, x) { return cs.reduce(function (a, c) { return a + c[2] / c[1] * Math.exp(-(x - c[0]) * (x - c[0]) / (2 * c[1] * c[1])); }, 0); }
    var PEAK = 0;
    for (var q = 0; q <= 400; q++) PEAK = Math.max(PEAK, mixv(TEACH, 0.2 + 0.75 * q / 400));
    /* The teacher's trajectories: in 1D the flow keeps the order of samples, so the trajectory of quantile u runs from
     * the noise's u-quantile to the data's u-quantile. Quantiles come from the CDF on a fine grid. */
    function quantiles(cs, us) {
      var n = 4000, xs = [], cdf = [0];
      for (var k = 0; k <= n; k++) xs.push(0.05 + 1.05 * k / n);
      for (k = 1; k <= n; k++) cdf.push(cdf[k - 1] + mixv(cs, xs[k]));
      return us.map(function (u) { var t = u * cdf[n], j = 0; while (cdf[j] < t) j++; return xs[j]; });
    }
    var UQ = []; for (q = 0; q < NT; q++) UQ.push((q + 0.5) / NT);
    var TOPS = quantiles(NOISE, UQ), BOTS = quantiles(TEACH, UQ);
    var UF = []; for (q = 0; q < 1500; q++) UF.push((q + 0.5) / 1500);
    var QN = quantiles(NOISE, UF), QT = quantiles(TEACH, UF);
    // Shading: the density of the teacher's marginal at each level, from the same quantile paths, normalized per row.
    function shading() {
      var W = 240, H = 200, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var cx = cv.getContext('2d'), im = cx.createImageData(W, H);
      for (var r = 0; r < H; r++) {
        var y = Y_TOP + 0.04 - (Y_TOP - Y_BOT + 0.04) * (r + 0.5) / H, f = frac(y), bins = new Float32Array(W), sm = new Float32Array(W), mx = 0;
        for (var k = 0; k < QN.length; k++) { var x = QN[k] + (QT[k] - QN[k]) * f, b = Math.floor((x - X0) / (X1 - X0) * W); if (b >= 0 && b < W) bins[b]++; }
        for (var c = 0; c < W; c++) { var a = 0; for (var o = -12; o <= 12; o++) { var cc = c + o; if (cc >= 0 && cc < W) a += bins[cc] * Math.exp(-o * o / 50); } sm[c] = a; mx = Math.max(mx, a); }
        for (c = 0; c < W; c++) { var v = Math.pow(sm[c] / mx, 0.75), i4 = 4 * (r * W + c); im.data[i4] = 228; im.data[i4 + 1] = 140; im.data[i4 + 2] = 88; im.data[i4 + 3] = Math.round(85 * v); }
      }
      cx.putImageData(im, 0, 0);
      return cv.toDataURL();
    }
    function dens(cs) {
      var d = 'M' + f1(X(0.2)) + ' ' + f1(Y(YB));
      for (var i = 0; i <= 90; i++) { var x = 0.2 + 0.75 * i / 90; d += 'L' + f1(X(x)) + ' ' + f1(Y(YB + HD * mixv(cs, x) / PEAK)); }
      return d + 'L' + f1(X(0.95)) + ' ' + f1(Y(YB)) + 'Z';
    }
    // Keyframes from INIT to the end components, eased, for the student's training.
    function compsAt(end, k, n) {
      var u = k / n; u = u * u * (3 - 2 * u);
      return INIT.map(function (c, j) { return c.map(function (v, m) { return v + (end[j][m] - v) * u; }); });
    }
    function frames(end, n) {
      var out = [];
      for (var k = 0; k <= n; k++) out.push(dens(compsAt(end, k, n)));
      return out;
    }
    var DMD_END = [[XC - 0.215, 0.034, 0.22], [XC + 0.17, 0.05, 0.75], [XC + 0.272, 0.03, 0.6]];
    var anims = [[], []];
    function anim(el, attr, vals, panel, dur) {
      el.setAttribute(attr, vals[vals.length - 1]);
      var at = { attributeName: attr, values: vals.join(';'), dur: (dur || 2.4) + 's', begin: 'indefinite', fill: 'freeze',
        keyTimes: vals.map(function (v, i) { return (i / (vals.length - 1)).toFixed(3); }).join(';') };
      if (vals.length <= 4) { at.calcMode = 'spline'; at.keySplines = vals.slice(1).map(function () { return '0.4 0 0.4 1'; }).join(';'); }
      anims[panel].push(se('animate', at, el));
    }
    var GY0 = Y_TOP + 0.075;
    function axis(g, title, ticks) {
      // Gaussian noise over the start of the trajectories.
      var gd = 'M' + f1(X(0.2)) + ' ' + f1(Y(GY0));
      for (var i = 0; i <= 60; i++) { var x = 0.2 + 0.75 * i / 60; gd += 'L' + f1(X(x)) + ' ' + f1(Y(GY0 + 0.085 * Math.exp(-(x - XC) * (x - XC) / (2 * 0.13 * 0.13)))); }
      path(g, gd + 'Z', 'fm-noise');
      path(g, 'M' + f1(X(0.2)) + ' ' + f1(Y(GY0)) + 'H' + f1(X(0.95)), 'fm-base');
      tex(g, X(0.95), Y(GY0 + 0.06), '\\mathcal{N}(0, I)', 'gray-t', 'end', 16.5);
      path(g, 'M' + f1(X(AX_X)) + ' ' + f1(Y(Y_TOP + 0.04)) + 'V' + f1(Y(Y_BOT - 0.05) - 6), 'fm-ax');
      path(g, 'M' + f1(X(AX_X) - 4) + ' ' + f1(Y(Y_BOT - 0.05) - 7) + 'L' + f1(X(AX_X)) + ' ' + f1(Y(Y_BOT - 0.05)) + 'L' + f1(X(AX_X) + 4) + ' ' + f1(Y(Y_BOT - 0.05) - 7) + 'Z', 'fm-axh');
      text(g, X(AX_X), Y(Y_TOP + 0.064), 'noise', 'fm-mono', 'middle', 13);
      text(g, X(AX_X), Y(Y_BOT - 0.068) + 5, 'data', 'fm-mono', 'middle', 13);
      ticks.forEach(function (tk) {
        var y = Y(tk[0]);
        path(g, 'M' + f1(X(AX_X) - 4) + ' ' + f1(y) + 'H' + f1(X(AX_X)), 'fm-ax');
        path(g, 'M' + f1(X(AX_X)) + ' ' + f1(y) + 'H' + f1(X(0.97)), 'fm-guide');
        tex(g, X(AX_X) - 8, y + 5, tk[1], 'gray-t', 'end', 16.5);
      });
      // Teacher (up) and student (down) distributions on one line.
      path(g, dens(TEACH), 'fm-dens-t');
      path(g, 'M' + f1(X(0.2)) + ' ' + f1(Y(YB)) + 'H' + f1(X(0.95)), 'fm-base');
      text(g, S / 2 + 8, Y(YB) + 50, title, 'fm-title', 'middle', 18.5);
    }

    /* (a) FlowMap distillation */
    var A = se('g', {}, svg);
    var a0 = part(A, 0, '1');
    se('image', { href: shading(), x: f1(X(X0)), y: f1(Y(Y_TOP + 0.04)), width: f1(X(X1 - X0)), height: f1((Y_TOP - Y_BOT + 0.04) * S), preserveAspectRatio: 'none' }, a0);
    for (var i = 0; i < NT; i++) path(a0, poly(function (y) { return tx(i, y); }, Y_TOP + 0.04, Y_BOT, 40), 'fm-traj');
    axis(a0, '(a) FlowMap distillation', [[Y_TOP, 's'], [Y_T, 't']]);
    var a1 = part(A, 1, '1');
    path(a1, poly(function (y) { return tx(SRC, y); }, Y_TOP, Y_T, 30), 'fm-teach');
    var ES = [0.13, 0.08, 0.03, 0];
    var sp = path(a1, '', 'fm-stu');
    anim(sp, 'd', ES.map(function (e) { return poly(function (y) { return tx(SRC, y) + e * Math.sin(Math.PI / 2 * (Y_TOP - y) / (Y_TOP - Y_T)); }, Y_TOP, Y_T, 30); }), 0);
    circ(a1, X(tx(SRC, Y_T)), Y(Y_T), 4.5, 'fm-pt-t');
    var sd = circ(a1, 0, Y(Y_T), 4.5, 'fm-pt-s');
    anim(sd, 'cx', ES.map(function (e) { return f1(X(tx(SRC, Y_T) + e)); }), 0);
    circ(a1, X(tx(SRC, Y_TOP)), Y(Y_TOP), 4.5, 'fm-pt-ink');
    tex(a1, X(tx(SRC, Y_TOP)) + 9, Y(Y_TOP) - 8, 'x_s', '', 'start', 17.5);
    var ym = (Y_TOP + Y_T) / 2;
    tex(a1, X(tx(SRC, ym)) + 34, Y(ym) + 5, '\\Phi^\\theta_{t\\leftarrow s}(x_s)', 'orange-t', 'start', 18);
    tex(a1, X(tx(SRC, ym)) - 10, Y(ym) + 5, '\\Phi_{t\\leftarrow s}(x_s)', 'blue-t', 'end', 18);
    var dA = path(a1, '', 'fm-dens-s');
    anim(dA, 'd', frames(TEACH, 10), 0);

    /* (b) DMD */
    var B = se('g', { transform: 'translate(' + (S + GAP) + ' 0)' }, svg);
    var b0 = part(B, 0, '2');
    axis(b0, '(b) Distribution Matching Distillation (DMD)', [[Y_TOP, '1'], [Y_BOT, '0']]);
    var b1 = part(B, 2, '2');
    // One jump of the student from noise; the x_1 are spread over the noise level (the trajectories' noise quantiles).
    var ax0 = X(XC), ay0 = Y(Y_TOP) + 12, ay1 = Y(Y_BOT + 0.15);
    path(b1, 'M' + f1(ax0) + ' ' + f1(ay0) + 'V' + f1(ay1 - 14), 'fm-big');
    path(b1, 'M' + f1(ax0 - 11) + ' ' + f1(ay1 - 16) + 'L' + f1(ax0) + ' ' + f1(ay1) + 'L' + f1(ax0 + 11) + ' ' + f1(ay1 - 16) + 'Z', 'fm-bigh');
    TOPS.forEach(function (x0) { circ(b1, X(x0), Y(Y_TOP), 3.4, 'fm-pt-ink'); });
    tex(b1, X(TOPS[NT - 1]) + 9, Y(Y_TOP) - 8, 'x_1', '', 'start', 17.5);
    tex(b1, ax0 + 16, Y(0.4) + 5, '\\Phi^\\theta_{0\\leftarrow 1}(x_1)', 'orange-t', 'start', 18);
    var dB = path(b1, '', 'fm-dens-s');
    anim(dB, 'd', frames(DMD_END, 10), 1);
    var kl = later(b1, 0.3);
    tex(kl, X(0.97), Y(YB) + 21, '\\min\\ \\mathrm{KL}(p_{\\mathrm{student}} \\,\\|\\, p_{\\mathrm{teacher}})', 'orange-t', 'end', 15);
    var shr = later(b1, 2.2);
    text(shr, X(XC - 0.215), Y(YB) + 19, 'shrinks', 'fm-lbl orange-t', 'middle', 14);

    /* Legend */
    var L = se('g', {}, svg), lx = 132, ly = Math.round(Y(YB) + 88);
    function fmLg(fn, lbl) {
      fn();
      var t = text(L, lx + 34, ly, lbl, 'lg', 'start', 17);
      lx += 34 + t.getComputedTextLength() + 28;
    }
    fmLg(function () { path(L, 'M' + lx + ' ' + (ly - 5) + 'h26', 'fm-teach'); }, 'Teacher');
    fmLg(function () { path(L, 'M' + lx + ' ' + (ly - 5) + 'h26', 'fm-stu solid'); }, 'Student');
    fmLg(function () { rect(L, lx, ly - 12, 26, 12, 'fm-noise', 2); }, 'Noise');
    fmLg(function () { rect(L, lx, ly - 12, 26, 12, 'fm-id', 2); }, 'High-density region');

    var fig = svg.closest('figure');
    if (fig) new MutationObserver(function () {
      var c = fig.dataset.cur;
      if (c === '0' || c === '1') anims[+c].forEach(function (a) { a.beginElementAt(0.35); });
    }).observe(fig, { attributes: true, attributeFilter: ['data-cur'] });
  }

  /* ---------- Figure: Lipschitz constant of the teacher's velocity field (cf. under the motion-aware figure) ---------- */
  /* The layout, helpers and styles of the FlowMap vs. DMD figure (fmdmd above): noise (top) to data (bottom), the
   * teacher's trajectories sending each quantile of the noise to the same quantile of the data, and the shading of
   * its marginal density. On the level t a point x_t moves back and forth, with the teacher's velocity v(x_t) along the
   * trajectory through it. (a) One broad mode: v barely changes. (b) Many narrow modes: v turns as x_t moves. */
  function lipschitz(svg) {
    var S = 327, GAP = 76, TOPM = 34, YM = 1.74 / 2.22;
    var Y_TOP = 0.68, Y_BOT = 0.08, Y_T = 0.38, AX_X = 0.14, XC = 0.57, YB = 0.08, HD = 0.1, X0 = 0.2, X1 = 0.95;
    function X(x) { return x * S; }
    function Y(y) { return TOPM + (YM - y) * S; }
    function f1(v) { return v.toFixed(1); }
    function qf(y) { return Math.min(1, Math.max(0, (Y_TOP - y) / (Y_TOP - Y_BOT))); }
    function frac(y) { var q = qf(y); return q * q * q * (q * (6 * q - 15) + 10); }
    var DFR = 1.875 / (Y_TOP - Y_BOT);   // d frac / d(-y) at t, the middle of the transport
    function mixv(cs, x) { return cs.reduce(function (a, c) { return a + c[2] / c[1] * Math.exp(-(x - c[0]) * (x - c[0]) / (2 * c[1] * c[1])); }, 0); }
    function quantiles(cs, us) {
      var n = 4000, xs = [], cdf = [0];
      for (var k = 0; k <= n; k++) xs.push(0.05 + 1.05 * k / n);
      for (k = 1; k <= n; k++) cdf.push(cdf[k - 1] + mixv(cs, xs[k]));
      return us.map(function (u) { var t = u * cdf[n], j = 0; while (cdf[j] < t) j++; return xs[j]; });
    }
    var NOISE = [[XC, 0.13, 1]];
    var PANELS = [
      { data: [[XC + 0.02, 0.12, 1]], nt: 7, title: '(a) Low Lipschitz constant' },
      { data: [-0.32, -0.16, 0, 0.16, 0.32].map(function (m) { return [XC + m, 0.022, 1]; }), nt: 10, title: '(b) High Lipschitz constant' }];
    var UF = []; for (var q = 0; q < 1500; q++) UF.push((q + 0.5) / 1500);
    var QN = quantiles(NOISE, UF);
    function shading(QT) {
      var W = 240, H = 200, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var cx = cv.getContext('2d'), im = cx.createImageData(W, H);
      for (var r = 0; r < H; r++) {
        var y = Y_TOP + 0.04 - (Y_TOP - Y_BOT + 0.04) * (r + 0.5) / H, f = frac(y), bins = new Float32Array(W), sm = new Float32Array(W), mx = 0;
        for (var k = 0; k < QN.length; k++) { var x = QN[k] + (QT[k] - QN[k]) * f, b = Math.floor((x - X0) / (X1 - X0) * W); if (b >= 0 && b < W) bins[b]++; }
        for (var c = 0; c < W; c++) { var a = 0; for (var o = -12; o <= 12; o++) { var cc = c + o; if (cc >= 0 && cc < W) a += bins[cc] * Math.exp(-o * o / 50); } sm[c] = a; mx = Math.max(mx, a); }
        for (c = 0; c < W; c++) { var v = Math.pow(sm[c] / mx, 0.75), i4 = 4 * (r * W + c); im.data[i4] = 228; im.data[i4 + 1] = 140; im.data[i4 + 2] = 88; im.data[i4 + 3] = Math.round(85 * v); }
      }
      cx.putImageData(im, 0, 0);
      return cv.toDataURL();
    }
    var GY0 = Y_TOP + 0.075;
    PANELS.forEach(function (P, pi) {
      var g = se('g', { transform: 'translate(' + pi * (S + GAP) + ' 0)' }, svg);
      var QT = quantiles(P.data, UF), UQ = [];
      for (q = 0; q < P.nt; q++) UQ.push((q + 0.5) / P.nt);
      var TOPS = quantiles(NOISE, UQ), BOTS = quantiles(P.data, UQ), PEAK = 0;
      for (q = 0; q <= 400; q++) PEAK = Math.max(PEAK, mixv(P.data, X0 + (X1 - X0) * q / 400));
      se('image', { href: shading(QT), x: f1(X(X0)), y: f1(Y(Y_TOP + 0.04)), width: f1(X(X1 - X0)), height: f1((Y_TOP - Y_BOT + 0.04) * S), preserveAspectRatio: 'none' }, g);
      for (var i = 0; i < P.nt; i++) {
        var d = '';
        for (var k = 0; k <= 40; k++) { var y = Y_TOP + 0.04 - (Y_TOP + 0.04 - Y_BOT) * k / 40; d += (k ? 'L' : 'M') + f1(X(TOPS[i] + (BOTS[i] - TOPS[i]) * frac(y))) + ' ' + f1(Y(y)); }
        path(g, d, 'fm-traj');
      }
      // Axis, noise and data, as in fmdmd's axis().
      var gd = 'M' + f1(X(X0)) + ' ' + f1(Y(GY0));
      for (i = 0; i <= 60; i++) { var x = X0 + (X1 - X0) * i / 60; gd += 'L' + f1(X(x)) + ' ' + f1(Y(GY0 + 0.085 * Math.exp(-(x - XC) * (x - XC) / (2 * 0.13 * 0.13)))); }
      path(g, gd + 'Z', 'fm-noise');
      path(g, 'M' + f1(X(X0)) + ' ' + f1(Y(GY0)) + 'H' + f1(X(X1)), 'fm-base');
      tex(g, X(X1), Y(GY0 + 0.06), '\\mathcal{N}(0, I)', 'gray-t', 'end', 16.5);
      path(g, 'M' + f1(X(AX_X)) + ' ' + f1(Y(Y_TOP + 0.04)) + 'V' + f1(Y(Y_BOT - 0.05) - 6), 'fm-ax');
      path(g, 'M' + f1(X(AX_X) - 4) + ' ' + f1(Y(Y_BOT - 0.05) - 7) + 'L' + f1(X(AX_X)) + ' ' + f1(Y(Y_BOT - 0.05)) + 'L' + f1(X(AX_X) + 4) + ' ' + f1(Y(Y_BOT - 0.05) - 7) + 'Z', 'fm-axh');
      text(g, X(AX_X), Y(Y_TOP + 0.064), 'noise', 'fm-mono', 'middle', 13);
      text(g, X(AX_X), Y(Y_BOT - 0.068) + 5, 'data', 'fm-mono', 'middle', 13);
      path(g, 'M' + f1(X(AX_X) - 4) + ' ' + f1(Y(Y_T)) + 'H' + f1(X(AX_X)), 'fm-ax');
      path(g, 'M' + f1(X(AX_X)) + ' ' + f1(Y(Y_T)) + 'H' + f1(X(0.97)), 'fm-guide');
      tex(g, X(AX_X) - 8, Y(Y_T) + 5, 't', 'gray-t', 'end', 16.5);
      var dd = 'M' + f1(X(X0)) + ' ' + f1(Y(YB));
      for (i = 0; i <= 160; i++) { x = X0 + (X1 - X0) * i / 160; dd += 'L' + f1(X(x)) + ' ' + f1(Y(YB + HD * mixv(P.data, x) / PEAK)); }
      path(g, dd + 'L' + f1(X(X1)) + ' ' + f1(Y(YB)) + 'Z', 'fm-dens-t');
      path(g, 'M' + f1(X(X0)) + ' ' + f1(Y(YB)) + 'H' + f1(X(X1)), 'fm-base');
      text(g, S / 2 + 8, Y(YB) + 50, P.title, 'fm-title', 'middle', 18.5);

      /* x_t on the level t and v(x_t): x_t = xn + (xd - xn) frac(t) for the quantile through it, so the trajectory's
       * slope there is (xd - xn) DFR. x_t sweeps the same range in both panels. */
      var ft = frac(Y_T), xa = XC - 0.17, xb = XC + 0.17, NF = 90, LEN = 0.12;
      function at(xt) {
        var lo = 0, hi = UF.length - 1;
        while (hi - lo > 1) { var m = (lo + hi) >> 1; if (QN[m] + (QT[m] - QN[m]) * ft < xt) lo = m; else hi = m; }
        var sl = (QT[lo] - QN[lo]) * DFR, n = Math.sqrt(1 + sl * sl);
        var px = X(xt), py = Y(Y_T), ux = sl / n, uy = 1 / n, qx = px + LEN * S * ux, qy = py + LEN * S * uy, hx = qx - 10 * ux, hy = qy - 10 * uy;
        return { line: 'M' + f1(px) + ' ' + f1(py) + 'L' + f1(hx) + ' ' + f1(hy),
                 head: 'M' + f1(qx) + ' ' + f1(qy) + 'L' + f1(hx - 5 * uy) + ' ' + f1(hy + 5 * ux) + 'L' + f1(hx + 5 * uy) + ' ' + f1(hy - 5 * ux) + 'Z',
                 px: px };
      }
      var fr = [];
      for (k = 0; k <= NF; k++) fr.push(at(xa + (xb - xa) * (0.5 - 0.5 * Math.cos(Math.PI * k / NF))));
      fr = fr.concat(fr.slice(0, -1).reverse());
      function loop(el, attr, vals, type) {
        var at2 = { attributeName: attr, values: vals.join(';'), dur: '7s', repeatCount: 'indefinite' };
        if (type) { at2.type = type; se('animateTransform', at2, el); } else se('animate', at2, el);
      }
      // Five fixed x_t with their v, faint; the moving x_t sweeps over them.
      var gh = se('g', { class: 'lip-ghost' }, g);
      for (k = 0; k < 5; k++) {
        var f5 = at(xa + (xb - xa) * k / 4);
        path(gh, f5.line, 'fm-teach'); path(gh, f5.head, 'lip-vh'); circ(gh, f5.px, Y(Y_T), 4, 'fm-pt-ink');
      }
      var ln = path(g, fr[0].line, 'fm-teach'), hd = path(g, fr[0].head, 'lip-vh'), pt = circ(g, fr[0].px, Y(Y_T), 4.5, 'fm-pt-ink');
      loop(ln, 'd', fr.map(function (f) { return f.line; }));
      loop(hd, 'd', fr.map(function (f) { return f.head; }));
      loop(pt, 'cx', fr.map(function (f) { return f1(f.px); }));
      var xl = se('g', {}, g);
      tex(xl, 0, 0, 'x_t', '', 'middle', 17.5);
      loop(xl, 'transform', fr.map(function (f) { return f1(f.px) + ' ' + f1(Y(Y_T) - 13); }), 'translate');
      var fe = at(xb);
      tex(g, fe.px + 34, Y(Y_T) + 32, 'v(x_t)', 'blue-t', 'start', 17.5);
    });

    // Legend, as in fmdmd.
    var L = se('g', {}, svg), lx = 92, ly = Math.round(Y(YB) + 88);
    function lipLg(fn, lbl) {
      fn();
      var t = text(L, lx + 34, ly, lbl, 'lg', 'start', 17);
      lx += 34 + t.getComputedTextLength() + 30;
    }
    lipLg(function () { path(L, 'M' + lx + ' ' + (ly - 5) + 'h26', 'fm-teach'); }, 'Teacher velocity');
    lipLg(function () { rect(L, lx, ly - 12, 26, 12, 'fm-noise', 2); }, 'Noise');
    lipLg(function () { rect(L, lx, ly - 12, 26, 12, 'fm-id', 2); }, 'High-density region');
  }

  var build = { fmdmd: fmdmd, background: background, antidrift: antidrift, motionaware: motionaware, lipschitz: lipschitz };
  // Called by js/page.js once MathJax and the page fonts are ready.
  window.PV.buildDiagrams = function () {
    [].forEach.call(document.querySelectorAll('svg[data-diagram]'), function (svg) {
      var f = build[svg.dataset.diagram];
      if (f) f(svg);
    });
  };
})();
