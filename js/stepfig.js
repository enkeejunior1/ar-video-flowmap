/* Step-through diagrams (Method section). Same controls as the PixVid step figures (Overview chip, numbered chips,
 * Previous / Next, Left / Right keys, click to advance). The diagram is one inline SVG drawn by js/diagrams.js;
 * each step brings in its parts, keeps the parts it is about at full strength and dims the rest, draws on its
 * arrows and runs dots along its paths. Overview shows the whole diagram, still.
 * Markup: .figure.stepfig[data-labels="a|b|c"] > .fig-scroll > svg.dg,
 *         optional .step-texts > p[data-step="-1" | "0" | ...] (the text shown with each state). Needs js/core.js. */
(function () {
  'use strict';

  var h = window.PV.h;

  function plain(t) { return t.replace(/\*/g, ''); }
  function fmtLabel(t) {
    var frag = document.createDocumentFragment();
    t.split('*').forEach(function (part, i) {
      if (!part) return;
      frag.append(i % 2 ? h('i', {}, part) : document.createTextNode(part));
    });
    return frag;
  }
  function nums(s) { return (s || '').split(',').filter(Boolean).map(Number); }

  function initStepFigure(fig) {
    var stage = fig.querySelector('.fig-scroll');
    var svg = stage.querySelector('svg.dg');
    var labels = (fig.dataset.labels || '').split('|');
    var count = labels.length, last = count - 1;
    var texts = [].slice.call(fig.querySelectorAll('.step-texts > p[data-step]'));

    var parts = [].map.call(svg.querySelectorAll('[data-in]'), function (el) {
      var inn = Number(el.dataset.in);
      var lit = el.dataset.lit != null ? nums(el.dataset.lit) : (inn === 0 ? null : [inn]);   // null: lit on every step
      return { el: el, inn: inn, lit: lit, out: el.dataset.out ? Number(el.dataset.out) : Infinity, st: '', nw: false };
    });
    var flows = [].map.call(svg.querySelectorAll('.flow'), function (el) { return { el: el, run: nums(el.dataset.run) }; });

    var ctl = h('div', { class: 'figctl' });
    var prevBtn = h('button', { type: 'button', class: 'navbtn prev', 'aria-label': 'Previous step', title: 'Previous step' });
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>';
    var nextBtn = h('button', { type: 'button', class: 'navbtn next', 'aria-label': 'Next step', title: 'Next step' });
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
    var chipBox = h('div', { class: 'chips', role: 'group', 'aria-label': 'Steps' });
    ctl.append(prevBtn, chipBox, nextBtn);
    stage.after(ctl);
    var stepLabel = h('p', { class: 'steplabel', 'aria-hidden': 'true' });
    ctl.after(stepLabel);
    var live = h('span', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    fig.append(live);
    var hint = h('p', { class: 'scroll-hint' }, 'Swipe sideways to see the whole figure.');
    stage.before(hint);
    function checkHint() { hint.hidden = !(stage.scrollWidth > stage.clientWidth + 2); }
    checkHint();
    if ('ResizeObserver' in window) new ResizeObserver(checkHint).observe(stage);
    else window.addEventListener('resize', checkHint);

    var chips = ['Overview'].concat(labels).map(function (text, i) {
      var c = h('button', { type: 'button', class: 'chip' + (i === 0 ? ' chip-ov' : ''), 'aria-pressed': 'false', title: plain(text),
                            'aria-label': i === 0 ? 'Overview, the whole figure' : 'Step ' + i + ': ' + plain(text) }, i === 0 ? '' : String(i));
      if (i === 0) {
        c.innerHTML = '<svg class="ov-icon" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">' +
          '<rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1"/><rect x="9" y="1.5" width="5.5" height="5.5" rx="1"/>' +
          '<rect x="1.5" y="9" width="5.5" height="5.5" rx="1"/><rect x="9" y="9" width="5.5" height="5.5" rx="1"/></svg>' +
          '<span class="ov-text">Overview</span>';
      }
      chipBox.append(c);
      return c;
    });

    // cur: -1 is Overview, 0 .. count-1 are the steps (data-in / data-lit / data-run count steps from 1).
    var cur = -1;
    function render() {
      var s = cur + 1;
      svg.classList.toggle('overview', cur < 0);
      parts.forEach(function (p) {
        var st;
        if (cur < 0) st = p.out === Infinity ? 'lit' : 'off';
        else if (s < p.inn || s >= p.out) st = 'off';
        else st = !p.lit || p.lit.indexOf(s) >= 0 ? 'lit' : 'dim';
        var nw = cur >= 0 && s === p.inn;
        // A part its step brings in plays its draw-on again, also when it was already showing (coming from Overview).
        if (nw && !p.nw && p.st === st) { p.el.setAttribute('data-st', 'off'); p.el.getBoundingClientRect(); p.st = 'off'; }
        if (st !== p.st) { p.el.setAttribute('data-st', st); p.st = st; }
        if (nw !== p.nw) { p.el.classList.toggle('new', nw); p.nw = nw; }
      });
      flows.forEach(function (f) { f.el.classList.toggle('run', cur >= 0 && f.run.indexOf(s) >= 0); });
      chips.forEach(function (c, i) {
        var on = i - 1 === cur;
        c.classList.toggle('active', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      texts.forEach(function (p) { p.hidden = Number(p.dataset.step) !== cur; });
      stepLabel.textContent = '';
      if (cur < 0) stepLabel.append('Overview: the whole figure');
      else stepLabel.append(h('span', { class: 'sl-n' }, (cur + 1) + ' / ' + count), fmtLabel(labels[cur] || ''));
      fig.dataset.cur = String(cur);
    }
    // Phones: the diagram scrolls sideways, so bring the parts a step is about into view.
    function reveal() {
      if (stage.scrollWidth <= stage.clientWidth + 2) return;
      var lo = Infinity, hi = -Infinity;
      parts.forEach(function (p) {
        if (p.inn === 0 || p.st !== 'lit') return;
        var r = p.el.getBoundingClientRect();
        lo = Math.min(lo, r.left); hi = Math.max(hi, r.right);
      });
      if (cur < 0 || lo === Infinity) { stage.scrollTo({ left: 0, behavior: 'smooth' }); return; }
      var box = stage.getBoundingClientRect();
      var mid = (lo + hi) / 2 - box.left + stage.scrollLeft;
      stage.scrollTo({ left: mid - stage.clientWidth / 2, behavior: 'smooth' });
    }
    function go(n) {
      cur = n < -1 ? last : (n > last ? -1 : n);   // wraps: after the last step comes Overview
      render();
      reveal();
      live.textContent = cur < 0 ? 'Overview' : 'Step ' + (cur + 1) + ' of ' + count + ': ' + plain(labels[cur] || '');
    }

    prevBtn.addEventListener('click', function () { go(cur - 1); });
    nextBtn.addEventListener('click', function () { go(cur + 1); });
    stage.addEventListener('click', function () { go(cur + 1); });
    fig.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    chips.forEach(function (c, i) { c.addEventListener('click', function () { go(i - 1); }); });
    render();
  }

  window.PV.initStepFigure = initStepFigure;
})();
