/* Experiment bar charts (vertical, as on the previous project page): fills figure/div.chart[data-chart]. The DMD
 * student of the same init is a dashed horizontal line over its group. Bars grow in when the chart scrolls into view;
 * tabs switch the metric. Numbers are the paper's (Table 3 and Figure 1). Needs js/core.js. */
(function () {
  'use strict';

  var h = window.PV.h;

  var PAIR = [{ name: 'FlowMap', cls: 'base' }, { name: 'FlowMap + Ours', cls: 's1' }];
  var AD = [{ name: 'w/o anti-drifting guidance', cls: 'base' }, { name: 'w/ anti-drifting guidance', cls: 's1' }];
  function mini(label, min, max, step, digits, vals, dmd, series) {
    return { metrics: [{ label: label, min: min, max: max, step: step, digits: digits }], series: series || PAIR, legend: false, compact: true,
             groups: [{ name: label, vals: vals.map(function (v) { return [v]; }), dmd: dmd == null ? null : [dmd] }] };
  }

  // A chart told in phases, after the bar charts of correction-training.github.io: the FlowMap bar grows, the + Ours bar
  // starts at its height and moves to its own value with the change written above it, then the DMD line comes in.
  function story(spec, delta) { spec.story = { delta: delta }; return spec; }

  var CHARTS = {
    ablation: {
      metrics: [{ label: 'VBench Total', min: 80.5, max: 85.5, step: 1, digits: 2 }],
      groups: [{ vals: [[81.61], [84.19], [84.35], [84.76]], dmd: [84.74],
                 labels: ['CFG only', '+ anti-drifting', '+ motion-aware', 'Ours (both)'], cls: ['base', 'mid', 'mid', 's1'] }]
    },
    // Figure 1 of the paper (Causal-rCM init; Tables 1, 2 and Supplementary Table 7)
    'f1-drift': story(mini('Drifting ↓', 0, 5, 1, 2, [3.88, 1.64], 3.28), 'percent'),
    'f1-div': story(mini('Diversity ↑', 0.05, 0.08, 0.01, 4, [0.0708, 0.0735], 0.0666), 'percent'),
    'f1-total': story(mini('VBench Total ↑', 82, 88, 2, 2, [84.08, 84.87], 84.92), 'points'),
    'f1-quality': story(mini('VBench Quality ↑', 82, 88, 2, 2, [84.96, 85.76], 85.44), 'points'),
    // π-Flow after Stage 2, Causal Forcing init: γ = 1 vs n = 5, γ = 5
    'dn-vjepa': mini('V-JEPA 2 ↑', 6, 10, 1, 2, [9.05, 9.64], null, AD),
    'dn-mae': mini('VideoMAE V2 ↑', 1.5, 3, 0.5, 2, [2.39, 2.81], null, AD),
    'dn-vbench': mini('VBench ↑', 83.5, 85, 0.5, 2, [84.35, 84.76], null, AD)
  };

  function pct(m, v) { return Math.max(0, Math.min(100, (100 * (v - m.min)) / (m.max - m.min))); }
  function fmt(v, d) { var s = v.toFixed(d); return d >= 3 ? s.replace(/^0/, '') : s; }

  function initChart(fig) {
    var spec = CHARTS[fig.dataset.chart];
    if (!spec) return;
    var bodyEl = fig.querySelector('.chart-body') || fig, tabsEl = fig.querySelector('.chart-tabs');
    var cur = 0, shown = false, bars = [], refs = [];

    if (spec.legend) {
      var lg = h('div', { class: 'vc-legend' });
      spec.series.forEach(function (s) { lg.append(h('span', {}, h('i', { class: 'sw ' + s.cls }), s.name)); });
      lg.append(h('span', {}, h('i', { class: 'sw dash' }), 'DMD, same init'));
      bodyEl.append(lg);
    }
    var plot = h('div', { class: 'vc-plot' + (spec.compact ? ' compact' : '') + (spec.groups[0].labels ? ' single' : '') });
    var grid = h('div', { class: 'vc-grid' }), cols = h('div', { class: 'vc-cols' });
    plot.append(grid, cols);
    bodyEl.append(plot);

    spec.groups.forEach(function (g) {
      var grp = h('div', { class: 'vc-group' }), inner = h('div', { class: 'vc-bars' });
      g.vals.forEach(function (v, i) {
        var cls = g.cls ? g.cls[i] : spec.series[i].cls;
        var val = h('span', { class: 'vc-v' }), bar = h('span', { class: 'vc-b ' + cls });
        var col = h('div', { class: 'vc-col' }, h('div', { class: 'vc-stack' }, val, bar));
        if (g.labels) col.append(h('span', { class: 'vc-xl' }, g.labels[i]));
        inner.append(col);
        bars.push({ bar: bar, val: val, vals: v, i: bars.length });
      });
      grp.append(inner);
      if (g.name) grp.append(h('span', { class: 'vc-gl' }, g.name));
      if (g.dmd) {
        var tag = h('span', { class: 'vc-reftag' }), line = h('span', { class: 'vc-ref' }, tag);
        grp.append(line);
        refs.push({ line: line, tag: tag, vals: g.dmd });
      }
      cols.append(grp);
    });

    function render(animate) {
      var m = spec.metrics[cur];
      grid.textContent = '';
      for (var t = m.min; t <= m.max + 1e-9; t += m.step) {
        var tl = String(+t.toFixed(4));
        if (m.digits >= 3) tl = tl.replace(/^0\./, '.');
        grid.append(h('div', { class: 'vc-tick', style: 'bottom:' + pct(m, t) + '%' }, h('span', {}, tl)));
      }
      bars.forEach(function (b) {
        var v = b.vals[cur], delay = animate ? (b.i * 0.06).toFixed(2) + 's' : '0s';
        b.bar.style.transitionDelay = delay;
        b.bar.style.height = shown ? pct(m, v) + '%' : '0%';
        b.val.textContent = fmt(v, m.digits);
        b.val.style.transitionDelay = delay;
        b.val.classList.toggle('in', shown);
      });
      refs.forEach(function (r) {
        r.line.style.bottom = pct(m, r.vals[cur]) + '%';
        r.tag.textContent = 'DMD ' + fmt(r.vals[cur], m.digits);
        r.line.classList.toggle('in', shown);
      });
      plot.setAttribute('aria-label', m.label);
    }

    if (tabsEl && spec.metrics.length > 1) {
      spec.metrics.forEach(function (m, i) {
        var b = h('button', { type: 'button', role: 'tab', class: 'ctab', 'aria-selected': i === 0 ? 'true' : 'false' }, m.label);
        b.addEventListener('click', function () {
          cur = i;
          [].forEach.call(tabsEl.children, function (c, j) { c.setAttribute('aria-selected', j === i ? 'true' : 'false'); });
          render(false);
        });
        tabsEl.append(b);
      });
    } else if (tabsEl) tabsEl.remove();

    render(false);
    var show = function () { shown = true; render(true); };
    if (spec.story) show = storyAnim(spec, plot, bars, refs);
    if (window.PV.reduce.matches || !('IntersectionObserver' in window)) { show(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); requestAnimationFrame(show); }
    }, { threshold: 0.35 });
    io.observe(fig);
  }

  var GROW = 700, WAIT = 350, FADE = 300, MOVE = 1100, PAUSE = 300, REF = 600;
  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  function clamp(u) { return Math.min(1, Math.max(0, u)); }
  function storyAnim(spec, plot, bars, refs) {
    var m = spec.metrics[0], b0 = bars[0], b1 = bars[1], v0 = b0.vals[0], v1 = b1.vals[0], ref = refs[0];
    plot.classList.add('story');
    [b0, b1].forEach(function (b) { b.bar.append(b.val); b.val.classList.add('in'); });
    var col = b1.bar.closest('.vc-col');
    var ghost = h('span', { class: 'vc-ghost' }), mark = h('span', { class: 'vc-mark' }), delta = h('span', { class: 'vc-delta' });
    col.append(ghost, mark, delta);
    var change = v1 - v0;
    delta.textContent = (change >= 0 ? '+' : '\u2212') + (spec.story.delta === 'points' ? Math.abs(change).toFixed(2)
      : (Math.abs(change / v0) * 100).toFixed(Math.abs(change / v0) >= 0.1 ? 0 : 1) + '%');
    delta.style.bottom = 'calc(' + pct(m, Math.max(v0, v1)) + '% + 6px)';
    var s1 = GROW + WAIT, s2 = s1 + FADE + MOVE + PAUSE, END = s2 + REF;
    function draw(ms) {
      var u0 = ease(clamp(ms / GROW)), a = m.min + (v0 - m.min) * u0;
      b0.bar.style.height = pct(m, a) + '%';
      b0.val.textContent = fmt(a, m.digits);
      b0.val.style.opacity = clamp(u0 * 3 - 2);
      var l = ms - s1, u1 = ease(clamp((l - FADE) / MOVE)), b = v0 + change * u1;
      b1.bar.style.height = pct(m, b) + '%';
      b1.bar.style.opacity = l < 0 ? 0 : clamp(l / FADE);
      b1.val.textContent = fmt(b, m.digits);
      b1.val.style.opacity = l < 0 ? 0 : clamp(l / FADE);
      ghost.style.bottom = pct(m, b) + '%';
      ghost.style.height = Math.max(0, pct(m, v0) - pct(m, b)) + '%';
      ghost.style.opacity = l >= 0 && change < 0 ? 1 : 0;
      mark.style.bottom = pct(m, v0) + '%';
      mark.style.opacity = l >= FADE && change > 0 && (pct(m, b) - pct(m, v0)) * plot.clientHeight / 100 > 24 ? 1 : 0;
      delta.style.opacity = clamp((l - FADE - MOVE * 0.75) / 250);
      if (ref) {
        var u2 = ease(clamp((ms - s2) / REF));
        ref.line.style.bottom = pct(m, ref.vals[0]) + '%';
        ref.line.style.opacity = ms < s2 ? 0 : 0.8;
        ref.line.style.transform = 'scaleX(' + u2 + ')';
      }
    }
    draw(0);
    return function () {
      if (window.PV.reduce.matches) { draw(END); return; }
      var t0 = performance.now();
      (function frame(now) { var ms = now - t0; draw(ms); if (ms < END) requestAnimationFrame(frame); })(t0);
    };
  }

  document.querySelectorAll('[data-chart]').forEach(initChart);
})();
