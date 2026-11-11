/* Method diagrams, drawn as inline SVG. Fills svg.dg[data-diagram].
 * Geometry follows the paper's figure scripts (scripts/figures/): draw_forcing.py (tiles and arrows),
 * export_antidrift_panels.py (data region, GT and rollout points, teacher and guided targets), and the vector paths of
 * figures/method/motion-aware-guidance (figures/method/motion_paths.js). Colors are the paper's (css/diagram.css).
 * Each part carries its step data for js/stepfig.js:
 *   data-in   first step (1-based) the part is on the figure; 0 = always there
 *   data-lit  steps (comma list) where the part is at full strength; elsewhere after data-in it is dimmed
 *   data-out  first step it is gone again (a part that a later step replaces); such parts are left out of Overview
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
    text(g, x + 4, y - 12, name, 'rt', 'start', 17);
  }
  // Tile: a video frame with a colored border, as in the paper's forcing figure.
  function tile(g, href, x, y, w, h, cls) { img(g, href, x, y, w, h); rect(g, x, y, w, h, 'tile ' + cls, 3); }
  function bracket(g, x0, x1, y, caption) {
    path(g, 'M' + x0 + ' ' + y + 'V' + (y + 5) + 'H' + x1 + 'V' + y, 'brk');
    text(g, (x0 + x1) / 2, y + 23, caption, 'brk-t', 'middle', 15);
  }

  var M = 'figures/method/';

  /* ---------- Figure: background, AR FlowMap distillation vs SF-DMD ---------- */
  /* Teacher on top, the chunks in the middle, the student below. Each panel plays as a timeline while its step is on:
   * parts with data-ph come in at that phase and stay (their arrows drawing on). Phases have their own lengths, so the
   * student's chunk-by-chunk rollout in (b) and (c) runs fast.
   * (a) teacher-forcing: real history into the student, the noisy chunk in, the student's FlowMap output, then the same
   * history into the AR teacher and its supervision. (b) self-forcing: the student makes the history chunk by chunk (each
   * chunk back into the model), the noisy chunk goes in, the rollout goes to the AR teacher, then both meet at the
   * FlowMap. (c) SF-DMD: the student makes all chunks, then the bidirectional teacher supervises all of them at once.
   * Frames: a clean video in (a), a drifting student rollout in (b) and (c) (figures/method/drift-teacher). */
  var PHASE_S = 1, ROLL_S = 0.34, HOLD_MS = 2200;
  function background(svg) {
    var body = se('g', {}, svg);
    var TW = 72, TH = 42, TG = 12, D = 'figures/method/drift-teacher/';
    var yT = 66, yF = 176, yS = 290, BH = 40, yX = 362;
    function cols(rx) { return [0, 1, 2, 3].map(function (k) { return rx + 12 + k * (TW + TG); }); }
    function frame(g, href, x, y, cls, s) {
      tile(g, href, x, y, TW, TH, cls);
      rect(g, x + 2, y + 2, 31, 19, 'tag-bg', 3);
      tex(g, x + 5, y + 16, s, '', 'start', 14);
    }
    function box(g, x, w, y, cls, label) {
      rect(g, x, y, w, BH, 'box ' + cls, 8);
      text(g, x + w / 2, y + BH / 2 + 6, label, 'lbl', 'middle', 17);
    }
    function vline(x, y0, y1) { return 'M' + x + ' ' + y0 + 'V' + y1; }
    var toT = [yF - 2, yT + BH + 2], fromT = [yT + BH + 2, yF - 2], toS = [yF + TH + 2, yS - 2], fromS = [yS - 2, yF + TH + 2];
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
      var imgs = tf ? [M + 'tf_1.jpg', M + 'tf_2.jpg', M + 'tf_3.jpg', M + 'tf_4.jpg']
                    : [D + 'rollout_1.jpg', D + 'rollout_2.jpg', D + 'rollout_3.jpg', D + 'teacher.jpg'];
      box(g, c[0], xr - c[0], yT, dmd ? 'orange' : 'blue', dmd ? 'Bidirectional teacher' : 'AR teacher');
      box(g, c[0], xr - c[0], yS, 'ink', 'Student');
      function hist(i) { return (tf ? 'x' : '\\hat{x}') + '^{' + (i + 1) + '}_{0}'; }
      var cx = c.map(function (x) { return x + TW / 2; }), cx4 = cx[3], p = 1, i;

      if (tf) {
        ph(1, PHASE_S); ph(2, PHASE_S);
        for (i = 0; i < 3; i++) {
          frame(ph(1), imgs[i], c[i], yF, 'blue', hist(i));
          arr(2, vline(cx[i], toS[0], toS[1]), 'gray', thin);
        }
        p = 3;
      } else {
        var m = dmd ? 4 : 3;
        for (var j = 0; j < m; j++) {
          var sx = j === 3 ? cx[j] : cx[j] - 9;
          ph(p, ROLL_S);
          arr(p, vline(sx, fromS[0], fromS[1]), 'ink', bold);
          frame(ph(p), imgs[j], c[j], yF, j === 3 ? 'out' : 'gray', hist(j));
          p++;
          if (j < 3) { ph(p, ROLL_S); arr(p, vline(cx[j] + 9, toS[0], toS[1]), 'gray', thin); p++; }
        }
      }
      if (dmd) {
        ph(p, 1.2);
        for (var q = 0; q < 4; q++) arr(p, vline(cx[q], fromT[0], fromT[1]), 'orange', { head: 10, dash: true });
        text(ph(p), xr + 6, yF + TH / 2 + 6, 'DMD', 'lbl orange-t', 'start', 16);
      } else {
        ph(p, PHASE_S);
        frame(ph(p), tf ? M + 'tf_4_noisy.jpg' : M + 'rollout_3_noisy.jpg', c[3], yX, 'orange', 'x^{4}_{t}');
        arr(p, vline(cx4, yX - 2, yS + BH + 2), 'orange', { head: 9 });
        p++;
        var outImg = tf ? M + 'tf_4.jpg' : D + 'teacher.jpg';
        if (tf) {
          ph(p, PHASE_S);
          arr(p, vline(cx4, fromS[0], fromS[1]), 'ink', bold);
          frame(ph(p), outImg, c[3], yF, 'out', '\\hat{x}^{4}_{0}');
          p++;
        }
        ph(p, PHASE_S);
        for (var t = 0; t < 3; t++) arr(p, vline(cx[t], toT[0], toT[1]), 'gray', thin);
        p++;
        ph(p, PHASE_S);
        arr(p, vline(cx4, fromT[0], fromT[1]), 'blue', { head: 10, dash: true });
        if (!tf) {
          arr(p, vline(cx4, fromS[0], fromS[1]), 'ink', bold);
          frame(ph(p), outImg, c[3], yF, 'out', '\\hat{x}^{4}_{0}');
        }
        text(ph(p), xr + 5, yF + TH / 2 + 6, 'FlowMap', 'cap', 'start', 15);
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
      p.items.forEach(function (e) { e.classList.toggle('shown', cur <= 0 || Number(e.dataset.ph) <= cur); });
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
    function later(g, t) { var q = se('g', { class: 'lt' }, g); q.style.setProperty('--d', t + 's'); return q; }
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
        tex(lg, P(q)[0] - 14, P(q)[1] + 8, 'x^{' + (k + 1) + '}', '', 'end', 21);
        if (k === 1 && labels) { text(lg, P(q)[0] - 22, P(q)[1] - 46, 'Teacher', 'lbl', 'end', 17); text(lg, P(q)[0] - 22, P(q)[1] - 26, 'rollout', 'lbl', 'end', 17); }
      });
    }
    // The student's rollout from t0; full: also its second, drifting step (panel (a)).
    function rollout(g, P, t0, full) {
      arrow(g, seg(P(p0), P(p), 11, 11), 'gray', { dash: true, head: 11, delay: t0, dur: STEP });
      var l0 = later(g, t0), l1 = later(g, t0 + STEP - 0.1);
      circ(l0, P(p0)[0], P(p0)[1], 6.2, 'pt-roll');
      tex(l0, P(p0)[0] + 12, P(p0)[1] + 24, '\\hat{x}^{1}', 'gray-t', 'start', 20);
      circ(l1, P(p)[0], P(p)[1], 6.2, 'pt-roll');
      tex(l1, P(p)[0] + 12, P(p)[1] + 26, '\\hat{x}^{2}', 'gray-t', 'start', 20);
      if (!full) return;
      var ls = later(g, t0 + STEP);
      text(ls, P(p)[0] + 34, P(p)[1] + 50, 'Student', 'lbl gray-t', 'start', 17);
      text(ls, P(p)[0] + 34, P(p)[1] + 70, 'rollout', 'lbl gray-t', 'start', 17);
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
    text(A2l, Pa(teacherEnd)[0] + 40, Pa(teacherEnd)[1] - 44, 'Drifted', 'lbl blue-t', 'middle', 19);
    text(A2l, Pa(teacherEnd)[0] + 40, Pa(teacherEnd)[1] - 22, 'supervision', 'lbl blue-t', 'middle', 19);

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
    text(Bd, dm[0] + 10, dm[1] + 32, 'Drift', 'lbl purple-t', 'start', 19);
    text(Bd, dm[0] + 10, dm[1] + 54, 'model', 'lbl purple-t', 'start', 19);
    arrow(B, seg(Pb(rollEnd), Pb(teacherEnd), 7, 7), 'orange', { head: 9, thin: true, delay: 3.3, dur: 0.4 });
    arrow(B, seg(Pb(teacherEnd), Pb(guidedEnd), 7, 8), 'orange', { head: 9, thin: true, dash: true, delay: 3.7, dur: 0.4 });
    arrow(B, seg(Pb(p), Pb(guidedEnd), 11, 9), 'orange', { head: 12, delay: 4.1, dur: 0.6 });
    var Bg = later(B, 4.6);
    circ(Bg, Pb(guidedEnd)[0], Pb(guidedEnd)[1], 6.2, 'pt-orange');
    text(Bg, Pb(teacherEnd)[0] + 42, Pb(teacherEnd)[1] - 50, 'Anti-drifting', 'lbl orange-t', 'middle', 19);
    text(Bg, Pb(teacherEnd)[0] + 42, Pb(teacherEnd)[1] - 28, 'guidance', 'lbl orange-t', 'middle', 19);

    /* (c) Next chunk generated from a drifted rollout by the teacher and by the guided teacher. */
    var cs = 2.3, cox = 787.5, coy = 104;
    function Q(x, y) { return [cox + x * cs, coy + y * cs]; }
    var F = 'figures/method/drift-teacher/', ar = 444 / 770;
    var C = part(body, 4, '4');
    var wh = 40, gh = 3, yh = 80, xh = 95 - (3 * wh + 2 * gh) / 2;
    for (var k = 0; k < 3; k++) {
      var q = Q(xh + k * (wh + gh), yh), lk = later(C, 0.1 + k * 0.3);
      tile(lk, F + 'rollout_' + (k + 1) + '.jpg', q[0], q[1], wh * cs, wh * ar * cs, 'gray');
      tex(lk, q[0] + wh * cs / 2, q[1] + wh * ar * cs + 24, '\\hat{x}^{' + (k + 1) + '}', 'gray-t', 'middle', 19);
    }
    var wo = 92, yo = 10, ho = wo * ar, yf = 72;
    var outs = [[0, 'teacher', 'Teacher', 'blue'], [wo + 6, 'guided', 'Guided Teacher', 'orange']];
    var stem = Q(95, yh - 1), fork = Q(95, yf);
    path(later(C, 1.0), 'M' + stem + 'L' + fork, 'ln gray');
    outs.forEach(function (o) {
      var q = Q(o[0], yo), lo = later(C, 1.6);
      tile(lo, F + o[1] + '.jpg', q[0], q[1], wo * cs, ho * cs, o[3]);
      text(lo, q[0] + wo * cs / 2, q[1] - 8, o[2], 'lbl ' + o[3] + '-t', 'middle', 17);
      var top = Q(o[0] + wo / 2, yo + ho + 1);
      var d = 'M' + fork + 'L' + top[0] + ' ' + fork[1] + 'L' + top;
      arrow(C, d, o[3], { head: 10, delay: 1.1, dur: 0.5 });
    });

    // Legend (the paper's antidrift legend)
    var Lg = part(body, 0, null);
    var lx = 125, ly = 458;
    function lgArrow(cls, dash, dotCls) {
      arrow(Lg, 'M' + lx + ' ' + (ly - 5) + 'L' + (lx + 34) + ' ' + (ly - 5), cls, { head: 9, dash: dash });
      if (dotCls) circ(Lg, lx, ly - 5, 4.5, dotCls);
    }
    lgArrow('ink', false, 'pt-gt'); text(Lg, lx + 44, ly, 'Teacher rollout', 'lg', 'start', 16); lx += 210;
    lgArrow('gray', true, 'pt-roll'); text(Lg, lx + 44, ly, 'Student rollout', 'lg', 'start', 16); lx += 220;
    lgArrow('blue', false); text(Lg, lx + 44, ly, 'Teacher', 'lg', 'start', 16); lx += 160;
    lgArrow('purple', false); text(Lg, lx + 44, ly, 'Drift model', 'lg', 'start', 16); lx += 190;
    lgArrow('orange', false, 'pt-orange'); text(Lg, lx + 44, ly, 'Guided', 'lg', 'start', 16);
  }

  /* ---------- Figure: motion-aware guidance ---------- */
  function motion(svg) {
    var items = window.MOTION_PATHS || [];
    var S = 1.5;
    var body = se('g', {}, svg), flows = se('g', { class: 'flows sc' }, svg);
    flows.setAttribute('transform', 'translate(4 14) scale(' + S + ')');

    region(part(body, 0, '2'), 852, 66, 382, 128, 'Soft skip at block $\\ell$');
    region(part(body, 0, '3'), 852, 262, 382, 92, 'Uncertainty head');

    function layer(inn, lit, extra) {
      var g = part(body, inn, lit, extra);
      return se('g', { transform: 'translate(4 14) scale(' + S + ')' }, g);
    }
    var base = layer(1, '1,2'), headL = layer(2, '2,3'), soft = layer(2, '2'), inset = layer(2, '2'), uni = layer(1, '1', { 'data-out': 2 });
    var HEAD = [7, 8, 18, 19, 43, 55, 77], CELLS = [], INSET = [];
    for (var i = 57; i <= 76; i++) CELLS.push(i);
    for (var j = 81; j <= 104; j++) INSET.push(j);
    var imgIdx = 0;
    items.forEach(function (it, k) {
      var g = HEAD.indexOf(k) >= 0 ? headL : CELLS.indexOf(k) >= 0 ? soft : INSET.indexOf(k) >= 0 ? inset : base;
      if (it.img) {
        se('image', { href: M + (imgIdx++ === 0 ? 'frame.png' : 'uncertainty.png'), x: it.x, y: it.y, width: it.w, height: it.h, preserveAspectRatio: 'none' }, g);
        return;
      }
      se('path', { d: it.d, style: it.s + (/stroke:/.test(it.s) ? '' : ';stroke:none') + (/fill:/.test(it.s) ? '' : ';fill:none') }, g);
      if (CELLS.indexOf(k) >= 0) se('path', { d: it.d, style: 'fill:#df865b;stroke:none' }, uni);
    });

    // Labels at the positions of draw_motion_aware_guidance.py (paper units, sizes scaled to the page).
    var k = 0.86;
    function T(g, x, y, s, cls, anchor, fs) { return text(g, x, y, s, cls, anchor, fs * k); }
    function X(g, x, y, s, cls, anchor, fs) { return tex(g, x, y, s, cls, anchor, fs * k); }
    X(base, 57.96, 202.98, 'x_t', '', 'middle', 19.44);
    T(base, 147.6, 53.13, 'Positive prompt', 'lbl', 'start', 15.12);
    T(base, 147.6, 281.37, 'Negative prompt', 'lbl', 'start', 15.12);
    X(base, 353.88, 100.15, 'v_\\phi', '', 'middle', 19);
    X(base, 353.88, 230.57, 'v_\\phi^-', '', 'middle', 19);
    X(base, 408.42, 130.59, 'w', '', 'start', 17);
    X(base, 379.8, 211.14, '1 - w', '', 'start', 17);
    X(base, 469.8, 151.93, 'v^\\star', '', 'middle', 19);
    T(headL, 236.88, 154.98, 'Uncertainty', 'lbl orange-t', 'middle', 15.12);
    T(headL, 236.88, 171.5, 'head', 'lbl orange-t', 'middle', 15.12);
    T(headL, 333.36, 190.06, 'Uncertainty $u$', 'lbl orange-t', 'middle', 12.96);
    X(headL, 249.84, 189.48, 'u', 'orange-t', 'start', 16.5);
    T(uni, 229.5, 190, 'Skip layer $\\ell$', 'lbl orange-t', 'middle', 15.12);
    T(inset, 324.72, 19.22, 'Soft skip', 'lbl orange-t', 'start', 12.24);
    T(inset, 381.24, 40.56, 'Block', 'lbl', 'middle', 12.24);
    X(inset, 429.12, 26.6, '1 - u', 'orange-t', 'middle', 12.5);
    X(inset, 429.12, 55.35, 'u', 'orange-t', 'middle', 12.5);
    T(inset, 381.24, 62.22, 'skip', 'lbl orange-t', 'middle', 11.52);

    // Dots along the paper's arrows: x_t into both branches, the outputs into the sum, the head's input and output.
    function D(idx) { return items[idx].d; }
    flow(flows, D(0) + D(1) + D(2) + D(3) + D(4) + D(9) + D(10) + D(11), '1,2');
    flow(flows, D(7) + D(8), '2,3');
    flow(flows, D(83) + D(84) + D(85) + D(86) + D(87) + D(88) + D(89), '2');

    /* Right column: the soft-skip rule (paper Eq. 1) and the head's training loss (supplementary). */
    var Q = part(body, 2, '2');
    tex(Q, 1043, 122, 'z = z^{\\mathrm{no\\text{-}skip}} + u \\odot (z^{\\mathrm{skip}} - z^{\\mathrm{no\\text{-}skip}})', '', 'middle', 19, 350);
    text(Q, 1043, 166, '$u \\approx 0$: keep block $\\ell$ \u00b7 large $u$: skip it', 'cap', 'middle', 15);
    var U = part(body, 3, '3');
    tex(U, 1043, 316, '\\mathcal{L}_u = \\tfrac{1}{2}\\Big( \\big\\| v_\\phi(x^i_t, t \\mid x^{<i}_0) - (x^i_1 - x^i_0) \\big\\|_p^2 \\, e^{-\\hat{u}_p} + \\hat{u}_p \\Big)', '', 'middle', 17, 356);
  }

  var build = { background: background, antidrift: antidrift, motion: motion };
  // Called by js/page.js once MathJax and the page fonts are ready.
  window.PV.buildDiagrams = function () {
    [].forEach.call(document.querySelectorAll('svg.dg[data-diagram]'), function (svg) {
      var f = build[svg.dataset.diagram];
      if (f) f(svg);
    });
  };
})();
