/* Result slots (video galleries), adapted from the PixVid page. Reads globals set by media/manifest.js.
 * Exposes PV.renderSlots. */
(function () {
  'use strict';

  var h = window.PV.h, se = window.PV.se, reduce = window.PV.reduce;
  var MEDIA = window.SITE_MEDIA || {};

  /* ---------- Video groups (synchronized players) ---------- */

  function fmt(t) {
    if (!isFinite(t)) return '0:00';
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function failMsg(text, path) {
    var box = h('div', { class: 'failed-msg' });
    box.append(document.createTextNode(text));
    if (path) { box.append(document.createElement('br'), h('code', {}, path)); }
    return box;
  }

  /* Returns the group element; root._pv is its loading API: poster() sets the posters, prefetch() starts loading the
   * clips (preload auto) without playing them, ready(cb) calls cb once every live clip is fully downloaded. opts.deferPoster
   * leaves the posters unset until poster() is called (hidden scenes: no image requests before they are needed).
   * entry.prompt is a line of text above the tiles; opts.promptAt 'after' puts it directly under them (text-to-video card). */
  function makeGroup(items, entry, opts) {
    var root = h('div', { class: 'group' });
    var usePoster = entry.posters === true;   // entry opts in: poster = clip path with .mp4 replaced by .jpg
    var readyCbs = [], isReady = false;
    var prompt = entry.prompt ? h('p', { class: 'prompt' }, entry.prompt) : null;
    var promptAfter = !!(opts && opts.promptAt === 'after');
    if (prompt && !promptAfter) root.append(prompt);
    var players = h('div', { class: 'players', style: '--n:' + items.length });
    players.dataset.n = String(items.length);   // css centers a pair of tiles in the camera compare card
    var nBase = items.filter(function (it) { return (it.cls || '').split(' ').indexOf('base') >= 0; }).length;
    if (nBase) players.dataset.base = String(nBase);   // depth card: css centers 1 to 3 baselines under the top row
    var vids = [];

    items.forEach(function (it) {
      var box = h('div', { class: 'player' + (it.cls ? ' ' + it.cls : '') });
      if (it.src) {
        var v = document.createElement('video');
        v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('loop', '');
        v.preload = 'none';
        v.dataset.src = it.src;
        if (usePoster) v.dataset.poster = it.src.replace(/\.mp4$/, '.jpg');
        v.addEventListener('error', function () { fail(v, box, it.src); });
        v.addEventListener('canplay', maybePlay);
        v.addEventListener('suspend', checkReady);   // the browser has stopped downloading: the clip is fully buffered
        v.addEventListener('canplaythrough', checkReady);
        box.append(v);
        vids.push(v);
      } else {
        box.append(failMsg('No file listed for this video.'));
      }
      if (it.label) box.append(h('span', { class: 'label' }, it.label));
      players.append(box);
    });
    root.append(players);
    if (prompt && promptAfter) root.append(prompt);

    /* Play bar: a small round icon button (Play or Pause icon, drawn by css from aria-pressed), a thin scrub line (a range
     * input; css paints its filled part from --p, in a neutral color) and the time. aria-pressed is true while playing. */
    var btn = h('button', { type: 'button', class: 'pp', 'aria-label': 'Play', 'aria-pressed': 'false' });
    var icon = se('svg', { viewBox: '0 0 16 16', width: '14', height: '14', 'aria-hidden': 'true', focusable: 'false' }, btn);
    se('path', { class: 'i-play', d: 'M5.5 3.2v9.6L13 8z' }, icon);
    se('path', { class: 'i-pause', d: 'M4.5 3.2h2.6v9.6H4.5zM8.9 3.2h2.6v9.6H8.9z' }, icon);
    var range = h('input', { type: 'range', min: '0', max: '1000', value: '0', 'aria-label': 'Scrub' });
    var time = h('span', { class: 'time' }, '0:00 / 0:00');
    var controls = h('div', { class: 'controls' }, btn, range, time);
    if (vids.length) root.append(controls);
    if (entry.caption) root.append(h('p', { class: 'note' }, entry.caption));

    var userPaused = false, inView = false, loaded = false, scrubbing = false, raf = 0;

    function live() { return vids.filter(function (v) { return !v._failed; }); }
    function master() { return live()[0]; }
    function shouldPlay() { return inView && !userPaused && !reduce.matches; }

    function fail(v, box, path) {
      v._failed = true;
      v.remove();
      box.prepend(failMsg('Could not load this video:', path));
      if (!live().length) controls.style.display = 'none';
      checkReady();
    }
    function poster() {
      vids.forEach(function (v) { if (v.dataset.poster && !v.poster) v.poster = v.dataset.poster; });
    }
    function buffered(v) {   // the whole clip is downloaded (clips are 1 to 2 s long and loop)
      var b = v.buffered;
      return v.readyState >= 3 && isFinite(v.duration) && b.length > 0 && b.end(b.length - 1) >= v.duration - 0.05;
    }
    function checkReady() {
      if (isReady || !loaded || !live().every(buffered)) return;
      isReady = true;
      readyCbs.splice(0).forEach(function (cb) { cb(); });
    }
    function load() {
      if (loaded) return;
      loaded = true;
      poster();
      live().forEach(function (v) { v.preload = 'auto'; v.src = v.dataset.src; v.load(); });
    }
    function playAll() { live().forEach(function (v) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }); }
    function pauseAll() { live().forEach(function (v) { v.pause(); }); }
    function maybePlay() {
      checkReady();
      var l = live();
      if (!shouldPlay() || !l.length || !l.every(function (v) { return v.readyState >= 3; })) return;
      if (l[0].paused) { l.forEach(function (v) { v.currentTime = l[0].currentTime; }); playAll(); }
    }
    function setRange(v) { range.value = String(v); range.style.setProperty('--p', (v / 10) + '%'); }
    function tick() {
      var m = master();
      if (m) {
        if (!m.paused) {
          live().forEach(function (v) { if (v !== m && !v.seeking && Math.abs(v.currentTime - m.currentTime) > 0.12) v.currentTime = m.currentTime; });
        }
        if (!scrubbing && m.duration) setRange(Math.round(m.currentTime / m.duration * 1000));
        time.textContent = fmt(m.currentTime) + ' / ' + fmt(m.duration);
        var playing = !m.paused;
        if (btn.getAttribute('aria-pressed') !== String(playing)) {
          btn.setAttribute('aria-pressed', String(playing));
          btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
        }
      }
      raf = requestAnimationFrame(tick);
    }

    btn.addEventListener('click', function () {
      var m = master();
      if (!m) return;
      if (m.paused) { userPaused = false; load(); playAll(); } else { userPaused = true; pauseAll(); }
    });
    range.addEventListener('pointerdown', function () { scrubbing = true; });
    window.addEventListener('pointerup', function () { scrubbing = false; });
    range.addEventListener('input', function () {
      var m = master();
      if (!m || !m.duration) return;
      setRange(Number(range.value));
      var t = Number(range.value) / 1000 * m.duration;
      live().forEach(function (v) { v.currentTime = t; });
    });

    if (vids.length) {
      var observe = function (visible) {
        inView = visible;
        if (visible) { load(); if (!raf) tick(); maybePlay(); }
        else { pauseAll(); cancelAnimationFrame(raf); raf = 0; }
      };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) { observe(es[0].isIntersecting); }, { rootMargin: '200px' }).observe(root);
      } else { observe(true); }
    }
    if (usePoster && !(opts && opts.deferPoster)) poster();
    root._pv = {
      poster: poster,
      prefetch: load,
      loaded: function () { return loaded; },
      ready: function (cb) { if (isReady) cb(); else readyCbs.push(cb); }
    };
    return root;
  }

  /* Scene selector: a strip of thumbnail buttons (a small still of the scene; its title is read by screen readers); only the chosen group is
   * shown. A hidden group is not intersecting, so makeGroup's observer never loads it and pauses it. Prefetching starts
   * only after the card has been near the viewport (`armed`): pointerenter or focus on a button loads that scene's clips,
   * and once the shown scene can play, the next scene in the list loads too (one scene ahead; that scene's own readiness
   * starts nothing). The thumbnails themselves are tiny and load with the page; if one fails, the button shows its title instead.
   * Left and Right (and Home, End) move focus between the buttons. */
  function sceneSelector(groups, titles, slot, thumbs) {
    var row = h('div', { class: 'scene-select', role: 'group', 'aria-label': 'Scene' });
    var current = 0, armed = false;
    function warm(i) { var g = groups[i]; if (armed && g && g._pv) { g._pv.poster(); g._pv.prefetch(); } }
    function aheadOf(i) {
      groups[i]._pv.ready(function () { if (i === current) warm(i + 1); });
    }
    var buttons = groups.map(function (g, i) {
      var b = h('button', { type: 'button', 'aria-pressed': i === 0 ? 'true' : 'false' });
      if (thumbs[i]) {
        var img = h('img', { src: thumbs[i], alt: '', width: '240', height: '138', draggable: 'false', decoding: 'async' });
        img.addEventListener('error', function () { b.classList.add('no-thumb'); });
        b.append(h('span', { class: 'scene-thumb' }, img));
      } else { b.classList.add('no-thumb'); }
      b.append(h('span', { class: 'scene-title' }, titles[i] || 'Scene ' + (i + 1)));
      b.addEventListener('pointerenter', function () { warm(i); });
      b.addEventListener('focus', function () { warm(i); });
      b.addEventListener('keydown', function (e) {
        var to = e.key === 'ArrowRight' ? (i + 1) % buttons.length : e.key === 'ArrowLeft' ? (i + buttons.length - 1) % buttons.length
               : e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : -1;
        if (to < 0 || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        buttons[to].focus();
      });
      b.addEventListener('click', function () {
        current = i;
        groups.forEach(function (other, j) {
          other.hidden = j !== i;
          buttons[j].setAttribute('aria-pressed', j === i ? 'true' : 'false');
        });
        if (g._pv) { g._pv.poster(); if (armed) aheadOf(i); }
      });
      row.append(b);
      return b;
    });
    groups.forEach(function (g, i) { g.hidden = i !== 0; });
    var arm = function () { if (armed) return; armed = true; if (groups[0]._pv) aheadOf(0); };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { arm(); io.disconnect(); } }, { rootMargin: '200px' });
      io.observe(slot);
    } else { arm(); }
    return row;
  }

  /* Thumbnail path of a scene entry: an explicit `thumb`, else (posters: true) thumb.jpg next to the scene's first clip:
   * `source` (depth card), else `real` or `pixvid` (camera compare card), else `src` (text-to-video card). */
  function thumbPath(entry) { return entry.thumb || ''; }

  /* Every slot uses one entry shape: { title, prompt, thumb, posters, caption, tiles: [{ label, src, ours }] }.
   * The order of `tiles` is the order on the page; css lays them out per slot. */
  function normalize(key, entry) {
    return {
      entry: entry,
      items: (entry.tiles || []).map(function (t) {
        return { src: t.src, label: t.label || '', cls: t.ours ? 'ours' : '' };
      })
    };
  }

  /* An empty slot is hidden. A result card with no visible slot is hidden whole, so no heading
   * shows without media. It comes back by itself once the manifest has entries for it. */
  function renderSlots() {
    var cards = [];
    document.querySelectorAll('.slot[data-slot]').forEach(function (slot) {
      var key = slot.dataset.slot;
      var raw = MEDIA[key];
      var list = Array.isArray(raw) ? raw : [];
      var promptAt = 'after';
      var groups = [], titles = [], thumbs = [], select = slot.hasAttribute('data-select');
      list.forEach(function (entry) {
        if (!entry) return;
        try {
          var n = normalize(key, entry);
          if (n.items.some(function (i) { return i.src; })) {
            groups.push(makeGroup(n.items, n.entry, { deferPoster: select && groups.length > 0, promptAt: promptAt }));
            titles.push(entry.title || '');
            thumbs.push(select ? thumbPath(entry) : '');
          }
        } catch (e) { /* malformed entry: skip it */ }
      });
      slot.textContent = '';
      slot.hidden = !groups.length;
      if (groups.length && select) slot.append(sceneSelector(groups, titles, slot, thumbs));
      groups.forEach(function (g) { slot.append(g); });
      var card = slot.closest('.result, .slot-fig');   // .slot-fig: a figure with its own slot (hidden when empty)
      if (card) {
        if (groups.length && card.classList.contains('result')) card.classList.add('has-media');
        if (cards.indexOf(card) < 0) cards.push(card);
      }
    });
    cards.forEach(function (card) { card.hidden = !card.querySelector('.slot[data-slot]:not([hidden])'); });
  }

  window.PV.renderSlots = renderSlots;
})();
