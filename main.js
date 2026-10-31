/* Thakur Pan v3 — motion + interaction layer. No dependencies. */
(function () {
  'use strict';
  var doc = document, body = doc.body, root = doc.documentElement;
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var reduced = window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  function safe(fn) { try { return fn(); } catch (e) {} }

  /* ================= THEME ================= */
  var themer = $('.themer');
  function markTheme() {
    var t = root.getAttribute('data-theme');
    $$('.th-opt').forEach(function (b) { b.setAttribute('aria-checked', b.dataset.themeSet === t ? 'true' : 'false'); });
    var m = $('meta[name="theme-color"]'); if (m && window.tpColors) m.setAttribute('content', window.tpColors[t] || '#07130c');
  }
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    safe(function () { localStorage.setItem('tp_theme', t); });
    if (window.tpFonts) window.tpFonts(t);
    markTheme();
  }
  function setTheme(t, x, y) {
    if (t === root.getAttribute('data-theme')) return;
    if (window.tpFonts) window.tpFonts(t); // start fetching fonts immediately
    if (!doc.startViewTransition || reduced) { applyTheme(t); return; }
    var vt = doc.startViewTransition(function () { applyTheme(t); });
    vt.ready.then(function () {
      var r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 950, easing: 'cubic-bezier(.22,.8,.2,1)', pseudoElement: '::view-transition-new(root)' });
    }, function () {});
  }
  markTheme();
  if (themer) {
    var tb = $('.th-btn', themer);
    tb.addEventListener('click', function () {
      var o = themer.classList.toggle('open'); tb.setAttribute('aria-expanded', o);
    });
    $$('.th-opt', themer).forEach(function (b) {
      b.addEventListener('click', function (e) {
        var r = b.getBoundingClientRect();
        setTheme(b.dataset.themeSet, e.clientX || r.left + r.width / 2, e.clientY || r.top + r.height / 2);
      });
    });
    doc.addEventListener('click', function (e) { if (!themer.contains(e.target)) { themer.classList.remove('open'); tb.setAttribute('aria-expanded', 'false'); } });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') themer.classList.remove('open'); });
  }

  /* ================= SMOOTH SCROLL (lerp, desktop wheel only) ================= */
  var S = { cur: 0, target: 0, on: false, enabled: false };
  var maxScroll = function () { return Math.max(0, root.scrollHeight - innerHeight); };
  function tick() {
    var d = S.target - S.cur;
    S.cur += d * 0.12;
    if (Math.abs(d) < 0.4) { S.cur = S.target; S.on = false; }
    window.scrollTo(0, S.cur);
    if (S.on) requestAnimationFrame(tick);
  }
  function kick() { if (!S.on) { S.on = true; requestAnimationFrame(tick); } }
  function scrollToY(y) {
    y = clamp(y, 0, maxScroll());
    if (S.enabled) { S.target = y; kick(); } else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  }
  if (fine && !reduced) {
    S.enabled = true; S.cur = S.target = window.scrollY;
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || e.defaultPrevented || root.classList.contains('menu-open')) return;
      var t = e.target;
      if (t && t.closest && t.closest('textarea,.tabs-in')) { if (t.closest('textarea')) return; }
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      var dy = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
      if (!S.on) S.cur = S.target = window.scrollY;
      S.target = clamp(S.target + dy, 0, maxScroll());
      kick();
    }, { passive: false });
    window.addEventListener('scroll', function () { if (!S.on) S.cur = S.target = window.scrollY; }, { passive: true });
    window.addEventListener('resize', function () { S.target = clamp(S.target, 0, maxScroll()); });
  }
  // same-page anchors
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href').slice(1), el = id && doc.getElementById(id);
      if (!el) return; e.preventDefault();
      scrollToY(el.getBoundingClientRect().top + window.scrollY - 90);
    });
  });

  /* ================= LOADER / PAGE CURTAIN ================= */
  var pre = $('.preloader'), curtain = $('.curtain'), started = false;
  function go() { if (started) return; started = true; startReveals(); }
  if (root.classList.contains('arrive')) {
    requestAnimationFrame(function () { requestAnimationFrame(function () {
      root.classList.add('arrive-out'); setTimeout(go, 280);
      setTimeout(function () {
        curtain.style.transition = 'none'; root.classList.remove('arrive', 'arrive-out'); void curtain.offsetWidth; curtain.style.transition = '';
      }, 850);
    }); });
  } else if (root.classList.contains('no-loader') || !pre) {
    go();
  } else {
    var vid = $('.pl-video'), skip = $('.pl-skip'), plBar = $('.pl-bar i'), closed = false;
    var finish = function () {
      if (closed) return; closed = true;
      pre.classList.add('done'); setTimeout(go, 350);
      setTimeout(function () { if (vid) { try { vid.pause(); } catch (e) {} } }, 1300);
    };
    var fallback = function () { if (closed) return; pre.classList.add('fallback'); setTimeout(finish, 1800); };
    if (skip) skip.addEventListener('click', finish);
    doc.addEventListener('keydown', function (e) { if (!closed && (e.key === 'Escape' || e.key === 'Enter')) finish(); });
    if (reduced || !vid) { fallback(); }
    else {
      if (!vid.getAttribute('src')) { vid.src = 'video/loader' + (vid.canPlayType && vid.canPlayType('video/mp4; codecs="avc1.42E01E"') ? '.mp4' : '.webm'); }
      vid.addEventListener('playing', function () { vid.classList.add('on'); });
      vid.addEventListener('timeupdate', function () { if (plBar && vid.duration) plBar.style.transform = 'scaleX(' + Math.min(1, vid.currentTime / vid.duration) + ')'; });
      vid.addEventListener('ended', function () { if (plBar) plBar.style.transform = 'scaleX(1)'; setTimeout(finish, 450); });
      vid.addEventListener('error', fallback);
      var pp = vid.play(); if (pp && pp.catch) pp.catch(fallback);
      setTimeout(function () { if (!vid.classList.contains('on')) fallback(); }, 5000);   // slow network / autoplay blocked
    }
    setTimeout(finish, 13000);                                                           // hard safety net
  }
  safe(function () { sessionStorage.setItem('tp_seen', '1'); });

  $$('a[href]').forEach(function (a) {
    var h = a.getAttribute('href');
    if (!h || h.charAt(0) === '#' || /^(https?:|tel:|mailto:|javascript:)/.test(h) || a.target === '_blank') return;
    a.addEventListener('click', function (e) {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var samePage = h.split('#')[0] === (location.pathname.split('/').pop() || 'index.html') && h.indexOf('#') > -1;
      if (samePage) { // same page + hash (e.g. menu.html#paan from menu page)
        e.preventDefault(); var id = h.split('#')[1]; if (openTab) openTab(id); var el = doc.getElementById(id);
        if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY - 140); return;
      }
      e.preventDefault();
      safe(function () { sessionStorage.setItem('tp_nav', '1'); });
      root.classList.remove('menu-open');
      if (reduced) { location.href = h; return; }
      curtain.classList.add('in');
      setTimeout(function () { location.href = h; }, 640);
    });
  });
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) { curtain.classList.remove('in'); root.classList.remove('arrive', 'arrive-out'); }
  });

  /* ================= HEADER, PROGRESS, PARALLAX ================= */
  var nav = $('.nav'), burger = $('.burger'), mob = $('.mob'), bar = $('.progress');
  var par = $$('[data-speed]'), ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    bar.style.setProperty('--p', (y / Math.max(1, maxScroll())).toFixed(4));
    if (reduced) return;
    par.forEach(function (el) {
      var host = el.parentElement.getBoundingClientRect();
      if (host.bottom < -300 || host.top > innerHeight + 300) return;
      el.style.translate = '0 ' + ((host.top + host.height / 2 - innerHeight / 2) * parseFloat(el.dataset.speed)).toFixed(1) + 'px';
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll); frame();

  function menu(open) {
    burger.classList.toggle('open', open); mob.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open); burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    root.classList.toggle('menu-open', open);
  }
  if (burger) burger.addEventListener('click', function () { menu(!burger.classList.contains('open')); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') menu(false); });

  /* ================= CURSOR, MAGNETIC, TILT, HERO PARALLAX ================= */
  if (fine && !reduced) {
    body.classList.add('has-cur');
    var dot = $('.cur'), ring = $('.cur-ring'), mx = 0, my = 0, rx = 0, ry = 0;
    window.addEventListener('mousemove', function (e) { body.classList.add('cur-on'); mx = e.clientX; my = e.clientY; dot.style.left = mx + 'px'; dot.style.top = my + 'px'; });
    (function loop() { rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16; ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; requestAnimationFrame(loop); })();
    $$('a,button,textarea,.tab').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('hover'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('hover'); });
    });
    $$('.hb a,.pm-card,.mb figure,.masonry figure,.card-img,.stack .arch').forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('hover', 'view'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('hover', 'view'); });
    });
    $$('.btn,.wa').forEach(function (b) {
      b.addEventListener('mousemove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.transform = 'translate(' + ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px,' + ((e.clientY - r.top - r.height / 2) * 0.32).toFixed(1) + 'px)';
      });
      b.addEventListener('mouseleave', function () { b.style.transform = ''; });
    });
    $$('.fcard,.qcard').forEach(function (c) {
      c.addEventListener('mousemove', function (e) {
        var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.style.transform = 'perspective(900px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) translateY(-6px)';
      });
      c.addEventListener('mouseleave', function () { c.style.transform = ''; });
    });
    var art = $('.hero-art');
    if (art) {
      var hero = art.closest('.hero');
      hero.addEventListener('mousemove', function (e) {
        art.style.setProperty('--mx', ((e.clientX / innerWidth - 0.5) * 40).toFixed(1));
        art.style.setProperty('--my', ((e.clientY / innerHeight - 0.5) * 40).toFixed(1));
      });
      hero.addEventListener('mouseleave', function () { art.style.setProperty('--mx', 0); art.style.setProperty('--my', 0); });
    }
  }

  /* ================= SPLIT HEADINGS ================= */
  $$('.split').forEach(function (el) {
    var out = [];
    (function walk(nodes) {
      nodes.forEach(function (n) {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            out.push(/^\s+$/.test(w) ? ' ' : '<span class="w"><span>' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>');
          });
        } else if (n.nodeType === 1 && n.tagName === 'BR') {
          out.push('<br>');
        } else if (n.nodeType === 1) {
          var tag = n.tagName.toLowerCase(), attrs = '';
          Array.prototype.forEach.call(n.attributes, function (a) { attrs += ' ' + a.name + '="' + a.value + '"'; });
          out.push('<' + tag + attrs + '>'); walk(Array.prototype.slice.call(n.childNodes)); out.push('</' + tag + '>');
        }
      });
    })(Array.prototype.slice.call(el.childNodes));
    el.innerHTML = out.join('');
    $$('.w>span', el).forEach(function (s, i) { s.style.transitionDelay = (i * 0.07) + 's'; });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
  });

  /* ================= REVEAL + COUNTERS ================= */
  function startReveals() {
    var targets = $$('.reveal,.split,.wipe,[data-count]');
    if (!('IntersectionObserver' in window)) { targets.forEach(function (t) { t.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.dataset.count) count(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    // clip-path'd elements report zero visible area to IntersectionObserver, so watch their parent instead
    var wio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        $$('.wipe', en.target).forEach(function (w) { if (w.parentElement === en.target) w.classList.add('in'); });
        wio.unobserve(en.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
    targets.forEach(function (el) {
      if (el.classList.contains('wipe')) wio.observe(el.parentElement); else io.observe(el);
    });
  }
  function count(el) {
    var end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, suf = el.dataset.suffix || '', t0 = null;
    if (reduced) { el.textContent = end.toFixed(dec) + suf; return; }
    (function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / 1700, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (end * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }

  /* ================= MENU TABS (sliding indicator) ================= */
  var tabs = $$('.tab'), panels = $$('.panel'), ind = $('.tab-ind'), tin = $('.tabs-in');
  var openTab = null;
  function moveInd(t, instant) {
    if (!ind || !t) return;
    if (instant) ind.style.transition = 'none';
    ind.style.width = t.offsetWidth + 'px'; ind.style.translate = t.offsetLeft + 'px 0';
    if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    if (tin && tin.scrollWidth > tin.clientWidth) tin.scrollTo({ left: t.offsetLeft - (tin.clientWidth - t.offsetWidth) / 2, behavior: instant || reduced ? 'auto' : 'smooth' });
  }
  if (tabs.length) {
    openTab = function (id, instant) {
      var found = null;
      tabs.forEach(function (t) { var on = t.dataset.tab === id; t.classList.toggle('on', on); t.setAttribute('aria-selected', on); if (on) found = t; });
      if (!found) return false;
      panels.forEach(function (p) {
        var on = p.id === id; p.classList.toggle('on', on);
        p.classList.remove('enter'); if (on && !instant) { void p.offsetWidth; p.classList.add('enter'); }
      });
      moveInd(found, instant); return true;
    };
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        openTab(t.dataset.tab);
        history.replaceState(null, '', '#' + t.dataset.tab);
        var top = $('.menu-sec').getBoundingClientRect().top + window.scrollY - 150;
        if (window.scrollY > top + 60 || window.scrollY < top - 400) scrollToY(top);
      });
    });
    var h = location.hash.replace('#', '');
    var first = (h && openTab(h, true)) ? null : openTab(tabs[0].dataset.tab, true);
    window.addEventListener('resize', function () { moveInd($('.tab.on'), true); });
    window.addEventListener('load', function () { moveInd($('.tab.on'), true); });
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { moveInd($('.tab.on'), true); });
    if (h && $('#' + h) && window.scrollY < 10) setTimeout(function () { scrollToY($('.menu-sec').getBoundingClientRect().top + window.scrollY - 150); }, 1400);
    window.addEventListener('hashchange', function () { var id = location.hash.replace('#', ''); if (id) openTab(id); });
  }
  // re-measure indicator after a theme (font) change
  new MutationObserver(function () { if (tabs.length) setTimeout(function () { moveInd($('.tab.on'), true); }, 500); }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  if (doc.fonts) doc.fonts.addEventListener && doc.fonts.addEventListener('loadingdone', function () { if (tabs.length) moveInd($('.tab.on'), true); });

  /* ================= OPEN NOW ================= */
  $$('[data-open]').forEach(function (chip) {
    function upd() {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
      var sun = false; parts.forEach(function (p) { if (p.type === 'weekday') sun = /^sun/i.test(p.value); });
      var h = 0, m = 0; parts.forEach(function (p) { if (p.type === 'hour') h = +p.value % 24; if (p.type === 'minute') m = +p.value; });
      var mins = h * 60 + m, open = mins >= 570 && mins < (sun ? 870 : 1410);
      chip.classList.toggle('closed', !open);
      chip.innerHTML = open ? '<i></i><b>Open now</b> until ' + (sun ? '2:30 PM' : '11:30 PM') : '<i></i><b>Closed now</b> opens 9:30 AM';
    }
    safe(upd);
  });

  /* ================= FEEDBACK -> GOOGLE REVIEW ================= */
  var toast = $('.toast');
  function say(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(say.t); say.t = setTimeout(function () { toast.classList.remove('show'); }, 4200);
  }
  $$('.fb').forEach(function (box) {
    var stars = $$('.rate button', box), label = $('.rate-label', box), rate = $('.rate', box);
    var words = ['', 'We are sorry, tell us what went wrong', 'Could be better, tell us how', 'Good, thank you', 'Great, glad you enjoyed it', 'Loved it, thank you!'];
    var val = 0;
    function paint(n) { stars.forEach(function (s, i) { s.classList.toggle('on', i < n); }); label.textContent = words[n] || ''; }
    stars.forEach(function (s, i) {
      s.addEventListener('mouseenter', function () { paint(i + 1); });
      s.addEventListener('click', function () { val = i + 1; paint(val); });
    });
    rate.addEventListener('mouseleave', function () { paint(val); });
    $('form', box).addEventListener('submit', function (e) {
      e.preventDefault();
      if (!val) { rate.classList.remove('shake'); void rate.offsetWidth; rate.classList.add('shake'); say('Please tap a star rating first'); return; }
      var txt = ($('textarea', box).value || '').trim(), url = box.dataset.google;
      var done = function (copied) {
        say(copied ? 'Your note is copied. Paste it into the Google review box.' : 'Opening Google reviews…');
        setTimeout(function () { window.open(url, '_blank', 'noopener'); }, 900);
      };
      if (txt && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });
  });

  $$('.yr').forEach(function (n) { n.textContent = new Date().getFullYear(); });
})();
