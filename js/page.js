/* BibTeX copy, nav scroll-spy, and the init that wires every component (from the PixVid page).
 * Loaded last. Needs js/core.js, js/stepfig.js, js/videos.js. */
(function () {
  'use strict';

  function initCopy() {
    var btn = document.getElementById('copy-bib');
    var pre = document.getElementById('bib-text');
    if (!btn || !pre) return;
    var timer = 0;
    function done(ok) {
      btn.textContent = ok ? 'Copied' : 'Press Ctrl+C';
      btn.classList.toggle('ok', ok);
      clearTimeout(timer);
      timer = setTimeout(function () { btn.textContent = 'Copy'; btn.classList.remove('ok'); }, 1800);
    }
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(pre);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { /* ignore */ }
      done(ok);
    }
    btn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pre.textContent).then(function () { done(true); }, fallback);
      } else { fallback(); }
    });
  }

  function initNav() {
    var links = [].slice.call(document.querySelectorAll('.nav a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    function mark(id) { links.forEach(function (a) { if (a === byId[id]) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }); }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) mark(e.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    window.addEventListener('scroll', function () { if (window.scrollY < 120) mark('top'); }, { passive: true });
  }

  // Result tabs (5 s, long video, ablations): one panel shown at a time; Left / Right move between tabs.
  function initTabs() {
    document.querySelectorAll('.exp-tabs').forEach(function (list) {
      var tabs = [].slice.call(list.querySelectorAll('[role="tab"]'));
      function select(t, focus) {
        tabs.forEach(function (u) {
          var on = u === t;
          u.setAttribute('aria-selected', on ? 'true' : 'false');
          u.tabIndex = on ? 0 : -1;
          document.getElementById(u.getAttribute('aria-controls')).hidden = !on;
        });
        if (focus) t.focus();
      }
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          select(tabs[(i + d + tabs.length) % tabs.length], true);
        });
      });
    });
  }

  // Collapsed sections open when the nav links to them.
  function initToggles() {
    document.querySelectorAll('details.toggle-sec:not(.sub)').forEach(function (d) {
      var sec = d.closest('section');
      function open() { d.open = true; }
      document.querySelectorAll('a[href="#' + sec.id + '"]').forEach(function (a) { a.addEventListener('click', open); });
      if (location.hash === '#' + sec.id) open();
    });
  }

  // Figure 2: the charts span exactly the height of the videos next to them (plot plus its axis label row).
  /* Rank shading of the result tables: within each block (rows between group rows or a block-start row), every
   * metric column from data-rank-from on is ranked among the non-reference rows, higher first; single rows are left. */
  function initRankTables() {
    document.querySelectorAll('table.res[data-rank-from]').forEach(function (t) {
      var from = Number(t.dataset.rankFrom), blocks = [], cur = [];
      blocks.push(cur);
      [].forEach.call(t.tBodies[0].rows, function (tr) {
        if (tr.classList.contains('grp') || tr.classList.contains('block-start')) { cur = []; blocks.push(cur); }
        if (!tr.classList.contains('grp') && !tr.classList.contains('ref')) cur.push(tr);
      });
      blocks.forEach(function (rows) {
        if (rows.length < 2) return;
        for (var c = from; c < rows[0].cells.length; c++) {
          var vals = rows.map(function (r) { return parseFloat(r.cells[c].textContent.replace('\u2212', '-')); });
          var order = vals.filter(function (v) { return !isNaN(v); }).sort(function (a, b) { return b - a; });
          rows.forEach(function (r, i) { if (!isNaN(vals[i])) r.cells[c].classList.add('r' + Math.min(6, order.indexOf(vals[i]) + 1)); });
        }
      });
    });
  }

  function initAlign() {
    var fig = document.querySelector('.f1-dn');
    if (!fig) return;
    var slot = fig.querySelector('.f1-video'), charts = fig.querySelector('.f1-charts');
    function align() {
      var players = slot.querySelector('.players');
      var plots = [].slice.call(charts.querySelectorAll('.vc-plot'));
      var stacked = getComputedStyle(fig.querySelector('.f1-row')).gridTemplateColumns.split(' ').length < 2;
      if (!players || !plots.length || stacked) {
        charts.style.marginTop = '';
        plots.forEach(function (p) { p.style.height = ''; });
        return;
      }
      var top = players.getBoundingClientRect().top - slot.getBoundingClientRect().top;
      var gl = charts.querySelector('.vc-gl');
      var below = gl ? gl.getBoundingClientRect().bottom - plots[0].getBoundingClientRect().bottom : 0;
      charts.style.marginTop = top + 'px';
      plots.forEach(function (p) { p.style.height = Math.max(120, players.offsetHeight - below) + 'px'; });
    }
    align();
    if ('ResizeObserver' in window) new ResizeObserver(align).observe(slot);
    else window.addEventListener('resize', align);
  }

  // The diagrams set their LaTeX with MathJax and measure text, so they wait for MathJax and the fonts.
  Promise.all([window.MathJax && window.MathJax.startup ? window.MathJax.startup.promise : null,
               document.fonts ? Promise.all(['400 16px Newsreader', 'italic 400 16px Newsreader', '500 16px Newsreader'].map(function (f) {
                 return document.fonts.load(f).catch(function () {});
               })) : null]).then(function () {
    window.PV.buildDiagrams();
    document.querySelectorAll('.figure.stepfig').forEach(window.PV.initStepFigure);
  });
  window.PV.renderSlots();
  initTabs();
  initToggles();
  initAlign();
  initRankTables();
  initCopy();
  initNav();
})();
