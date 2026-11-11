/* Line chart of the approximated Lipschitz constant of the guided teacher velocity (paper Figure "curvature"):
 * percent change over the unguided teacher against the guidance norm, first and second chunk side by side.
 * Fills div.cv-chart; the lines draw in when the chart scrolls into view. */
(function () {
  'use strict';

  var D = {"lambdas":[0.0,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.75,0.8,0.85,0.9,0.95,1.0,1.05,1.1,1.15,1.2,1.25,1.3,1.35,1.4,1.45,1.5,1.55,1.6,1.65,1.7,1.75,1.8,1.85,1.9,1.95,2.0],"motion_0":[0.0,-0.351,-0.719,-1.093,-1.483,-1.879,-2.281,-2.671,-3.067,-3.45,-3.813,-4.173,-4.522,-4.851,-5.16,-5.459,-5.748,-6.01,-6.262,-6.496,-6.72,-6.927,-7.125,-7.305,-7.477,-7.631,-7.786,-7.923,-8.052,-8.173,-8.285,-8.389,-8.485,-8.581,-8.668,-8.748,-8.819,-8.89,-8.954,-9.017,-9.072],"motion_1":[0.0,-0.216,-0.422,-0.627,-0.84,-1.044,-1.238,-1.432,-1.608,-1.783,-1.95,-2.099,-2.248,-2.38,-2.503,-2.61,-2.717,-2.806,-2.888,-2.961,-3.026,-3.075,-3.124,-3.165,-3.197,-3.221,-3.246,-3.262,-3.278,-3.278,-3.286,-3.286,-3.286,-3.278,-3.27,-3.262,-3.246,-3.237,-3.221,-3.205,-3.189],"fixed_0":[0.0,-0.332,-0.691,-1.047,-1.409,-1.769,-2.136,-2.49,-2.833,-3.165,-3.495,-3.804,-4.094,-4.374,-4.643,-4.885,-5.126,-5.34,-5.545,-5.74,-5.917,-6.086,-6.237,-6.379,-6.512,-6.637,-6.753,-6.861,-6.96,-7.05,-7.141,-7.215,-7.289,-7.362,-7.419,-7.485,-7.534,-7.583,-7.631,-7.68,-7.721],"fixed_1":[0.0,-0.224,-0.439,-0.644,-0.849,-1.035,-1.221,-1.39,-1.541,-1.683,-1.816,-1.933,-2.033,-2.124,-2.198,-2.264,-2.314,-2.355,-2.388,-2.413,-2.421,-2.429,-2.429,-2.413,-2.405,-2.38,-2.363,-2.33,-2.297,-2.264,-2.231,-2.19,-2.149,-2.107,-2.066,-2.024,-1.983,-1.933,-1.891,-1.841,-1.8],"cfg_0":[0.0,-0.351,-0.71,-1.075,-1.437,-1.788,-2.136,-2.472,-2.797,-3.111,-3.406,-3.689,-3.954,-4.199,-4.435,-4.652,-4.859,-5.057,-5.229,-5.4,-5.553,-5.697,-5.833,-5.959,-6.069,-6.178,-6.278,-6.37,-6.462,-6.537,-6.612,-6.679,-6.745,-6.803,-6.861,-6.91,-6.96,-7.001,-7.042,-7.083,-7.125],"cfg_1":[0.0,-0.104,-0.181,-0.25,-0.293,-0.327,-0.336,-0.336,-0.31,-0.284,-0.233,-0.181,-0.112,-0.043,0.043,0.13,0.217,0.312,0.417,0.513,0.618,0.723,0.828,0.925,1.031,1.128,1.234,1.332,1.429,1.527,1.616,1.706,1.795,1.885,1.966,2.047,2.128,2.209,2.281,2.354,2.426]};
  var SERIES = [{ key: 'cfg', name: 'CFG', cls: 'cfg' }, { key: 'fixed', name: 'Skip-layer guidance', cls: 'slg' },
                { key: 'motion', name: 'Motion-aware guidance', cls: 'ours' }];
  var PANELS = [{ chunk: 0, title: 'First chunk', min: -10, max: 1, step: 2 }, { chunk: 1, title: 'Second chunk', min: -4, max: 3, step: 1 }];
  var NS = 'http://www.w3.org/2000/svg';
  var W = 340, H = 230, L = 40, R = 10, T = 26, B = 40;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(e);
    return e;
  }

  function panel(p) {
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'cv-panel', role: 'img',
                          'aria-label': p.title + ': change in the Lipschitz constant against the guidance norm' });
    var x = function (v) { return L + (W - L - R) * v / 2; };
    var y = function (v) { return T + (H - T - B) * (p.max - v) / (p.max - p.min); };
    var t = el('text', { x: L + (W - L - R) / 2, y: 14, class: 'cv-title' }, svg); t.textContent = p.title;
    for (var v = Math.ceil(p.min / p.step) * p.step; v <= p.max; v += p.step) {
      el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: v === 0 ? 'cv-zero' : 'cv-grid' }, svg);
      var lab = el('text', { x: L - 6, y: y(v) + 4, class: 'cv-tick', 'text-anchor': 'end' }, svg); lab.textContent = v;
    }
    [0, 0.5, 1, 1.5, 2].forEach(function (v) {
      var lab = el('text', { x: x(v), y: H - B + 16, class: 'cv-tick', 'text-anchor': 'middle' }, svg); lab.textContent = v;
    });
    el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, class: 'cv-axis' }, svg);
    var xl = el('text', { x: L + (W - L - R) / 2, y: H - 6, class: 'cv-label', 'text-anchor': 'middle' }, svg); xl.textContent = 'Guidance norm';
    SERIES.forEach(function (s, i) {
      var vals = D[s.key + '_' + p.chunk];
      var d = vals.map(function (v, k) { return (k ? 'L' : 'M') + x(D.lambdas[k]).toFixed(1) + ' ' + y(v).toFixed(1); }).join('');
      el('path', { d: d, class: 'cv-line ' + s.cls, pathLength: 1, style: '--i:' + i }, svg);
    });
    return svg;
  }

  function init(box) {
    var legend = document.createElement('div'); legend.className = 'cv-legend';
    SERIES.slice().reverse().forEach(function (s) {
      var span = document.createElement('span'); span.innerHTML = '<i class="cv-sw ' + s.cls + '"></i>' + s.name; legend.appendChild(span);
    });
    var row = document.createElement('div'); row.className = 'cv-row';
    var yl = document.createElement('div'); yl.className = 'cv-ylabel'; yl.textContent = 'Change in Lipschitz constant (%)';
    row.appendChild(yl);
    PANELS.forEach(function (p) { row.appendChild(panel(p)); });
    box.append(legend, row);
    var show = function () { box.classList.add('in'); };
    if (!('IntersectionObserver' in window) || (window.PV && window.PV.reduce && window.PV.reduce.matches)) return show();
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { show(); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(box);
  }

  document.querySelectorAll('.cv-chart').forEach(init);
})();
