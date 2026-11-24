/* Step-through diagrams and figures — pi2-flow style below-figure controls + readout.
 * Figure on top -> .figctl (Play/Pause + <- Overview 1 2 ... ->) -> .step-readout:
 *         • Title
 *   x / y   Body text line 1
 *           Body text line 2
 * Markup: .figure.stepfig[data-labels="a|b|c"][data-autoplay="2500,6000"] > .step-texts + .fig-scroll > svg.dg.
 * Needs js/core.js. */
(function () {
  'use strict';

  var h = window.PV.h;

  function plain(t) { return (t || '').replace(/\*/g, ''); }
  function fmtLabel(t) {
    var frag = document.createDocumentFragment();
    (t || '').split('*').forEach(function (part, i) {
      if (!part) return;
      frag.append(i % 2 ? h('i', {}, part) : document.createTextNode(part));
    });
    return frag;
  }
  function nums(s) { return (s || '').split(',').filter(Boolean).map(Number); }

  function initStepFigure(fig) {
    var stage = fig.querySelector('.fig-scroll');
    var svg = stage.querySelector('svg.dg') || stage.firstElementChild;
    var labels = (fig.dataset.labels || '').split('|');
    var count = labels.length, last = count - 1;
    var textBox = fig.querySelector('.step-texts');
    var rawTexts = [].slice.call(fig.querySelectorAll('.step-texts > p[data-step]'));

    // Build a step-readout below the figure:
    //   • Title (centered)
    //   Body text
    var readout = h('div', { class: 'step-readout' });
    var items = rawTexts.map(function (p) {
      var idx = Number(p.dataset.step);
      var ttl = p.dataset.title || (idx >= 0 ? labels[idx] : '');
      var wrap = h('div', { class: 'step-item', 'data-step': String(idx) });
      if (ttl) {
        wrap.append(h('div', { class: 'step-title' }, h('span', { class: 'step-dot', 'aria-hidden': 'true' }), fmtLabel(ttl)));
      }
      p.classList.add('step-body');
      p.removeAttribute('hidden');
      wrap.append(p);
      readout.append(wrap);
      return { idx: idx, el: wrap };
    });
    if (textBox) textBox.remove();

    var parts = [].map.call(svg.querySelectorAll('[data-in]'), function (el) {
      var inn = Number(el.dataset.in);
      var lit = el.dataset.lit != null ? nums(el.dataset.lit) : (inn === 0 ? null : [inn]);
      return { el: el, inn: inn, lit: lit, out: el.dataset.out ? Number(el.dataset.out) : Infinity, ov: el.dataset.ov !== '0', st: '', nw: false };
    });
    var flows = [].map.call(svg.querySelectorAll('.flow'), function (el) { return { el: el, run: nums(el.dataset.run) }; });

    // pi2-flow style control bar: Play/Pause + <- + Overview 1 2 ... + ->
    var ctl = h('div', { class: 'figctl' });
    var playBtn = h('button', { type: 'button', class: 'fig-play', 'aria-label': 'Play steps', 'aria-pressed': 'false', title: 'Play / pause' });
    playBtn.innerHTML = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false">' +
      '<path class="i-play" d="M5.2 3.2v9.6L13 8z"/><path class="i-pause" d="M4.2 3.2h2.6v9.6H4.2zM9.2 3.2h2.6v9.6H9.2z"/></svg>';
    var prevBtn = h('button', { type: 'button', class: 'navbtn prev', 'aria-label': 'Previous step', title: 'Previous step' });
    prevBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>';
    var nextBtn = h('button', { type: 'button', class: 'navbtn next', 'aria-label': 'Next step', title: 'Next step' });
    nextBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 12h15M13 6l6 6-6 6"/></svg>';
    var chipBox = h('div', { class: 'chips', role: 'group', 'aria-label': 'Steps' });
    ctl.append(playBtn, prevBtn, chipBox, nextBtn);
    stage.before(ctl);
    stage.after(readout);

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
    var apRaw = (fig.dataset.autoplay || '').split(',').map(Number);
    var ovMs = apRaw[0] > 0 ? apRaw[0] : 2500;
    var stepMs = apRaw[1] > 0 ? apRaw[1] : 6000;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var playing = apRaw.length === 2 && !reduce;
    var inView = false, timer = null;

    function syncPlayUI() {
      var on = playing && inView;
      fig.classList.toggle('is-playing', on);
      playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
      playBtn.setAttribute('aria-label', playing ? 'Pause autoplay' : 'Play steps');
      chips.forEach(function (c, i) {
        var active = i - 1 === cur;
        c.style.removeProperty('--dur');
        if (active && on) {
          c.classList.remove('prog');
          c.getBoundingClientRect();
          c.style.setProperty('--dur', (cur < 0 ? ovMs : stepMs) + 'ms');
          c.classList.add('prog');
        } else {
          c.classList.remove('prog');
        }
      });
    }

    function render() {
      var s = cur + 1;
      svg.classList.toggle('overview', cur < 0);
      parts.forEach(function (p) {
        var st;
        if (cur < 0) st = p.out === Infinity && p.ov ? 'lit' : 'off';
        else if (s < p.inn || s >= p.out) st = 'off';
        else st = !p.lit || p.lit.indexOf(s) >= 0 ? 'lit' : 'dim';
        var nw = cur >= 0 && s === p.inn;
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
      items.forEach(function (it) { it.el.hidden = it.idx !== cur; });
      fig.dataset.cur = String(cur);
      syncPlayUI();
    }

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

    function sched() {
      clearTimeout(timer);
      if (playing && inView) {
        timer = setTimeout(function () { go(cur + 1, true); }, cur < 0 ? ovMs : stepMs);
      }
      syncPlayUI();
    }

    function pauseAuto() {
      if (!playing) return;
      playing = false;
      clearTimeout(timer);
      syncPlayUI();
    }

    function go(n, fromAuto) {
      if (!fromAuto) pauseAuto();
      var wrappedToOv = fromAuto && n > last;
      cur = n < -1 ? last : (n > last ? -1 : n);
      if (wrappedToOv) {
        playing = false;
        clearTimeout(timer);
      }
      render();
      reveal();
      live.textContent = cur < 0 ? 'Overview' : 'Step ' + (cur + 1) + ' of ' + count + ': ' + plain(labels[cur] || '');
      if (fromAuto && !wrappedToOv) sched();
    }

    prevBtn.addEventListener('click', function () { go(cur - 1); });
    nextBtn.addEventListener('click', function () { go(cur + 1); });
    playBtn.addEventListener('click', function () {
      if (playing) {
        pauseAuto();
      } else {
        playing = true;
        if (!inView) inView = true;
        if (cur < 0) go(0, true);
        else sched();
      }
    });
    stage.addEventListener('click', function (e) {
      if (!e.target.closest('button, input, a, .controls')) go(cur + 1);
    });
    fig.addEventListener('keydown', function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
    });
    chips.forEach(function (c, i) { c.addEventListener('click', function () { go(i - 1); }); });
    render();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        sched();
      }, { threshold: 0.35 }).observe(stage);
    }
  }

  window.PV.initStepFigure = initStepFigure;
})();
