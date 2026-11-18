/* igormarques.art — interações (sem dependências) */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- imagens: fade quando carregam ---------- */
  document.querySelectorAll('img.img').forEach(function (img) {
    if (img.complete && img.naturalWidth) img.classList.add('is-loaded');
    else img.addEventListener('load', function () { img.classList.add('is-loaded'); }, { once: true });
  });

  /* ---------- vídeos curtos (antigos GIFs): tocam só quando estão na tela ---------- */
  var vids = document.querySelectorAll('video[data-autoplay]');
  if (vids.length && 'IntersectionObserver' in window && !reduce) {
    var vio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) { v.preload = 'auto'; var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else v.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) { vio.observe(v); });
  }

  /* ---------- primeiro painel: animação da logo em loop (até o showreel ficar pronto) ---------- */
  var loopBox = document.querySelector('[data-logo-loop]');
  if (loopBox && window.IMALogo) {
    var loopAnim = window.IMALogo(loopBox, { onExit: function (ex) { loopBox.style.opacity = 1 - ex; } });
    if (reduce) { loopAnim.render(3.3); }
    else {
      // forma a logo (0–3,3 s), segura pronta, sai com o fade (3,5–3,98 s) e recomeça
      var HOLD = 2.2, PLAY = 3.3, EXIT0 = 3.5, EXIT = 0.48, GAP = 0.5;
      var CYCLE = PLAY + HOLD + EXIT + GAP;
      var visible = true, started = false, base = null, rafL;
      var loopFrame = function (now) {
        if (base === null) base = now;
        var c = ((now - base) / 1000) % CYCLE, t;
        if (c < PLAY) t = c;
        else if (c < PLAY + HOLD) t = PLAY;
        else if (c < PLAY + HOLD + EXIT) t = EXIT0 + (c - PLAY - HOLD);
        else t = 3.98;
        loopAnim.render(t);
        if (c >= PLAY + HOLD + EXIT) loopBox.style.opacity = 0;
        if (visible) rafL = requestAnimationFrame(loopFrame);
      };
      var startLoop = function () { if (started) return; started = true; rafL = requestAnimationFrame(loopFrame); };
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (e) {
            visible = e.isIntersecting;
            if (!started) return;
            if (visible) { base = null; cancelAnimationFrame(rafL); rafL = requestAnimationFrame(loopFrame); }
          });
        }).observe(loopBox);
      }
      if (document.documentElement.classList.contains('is-loading')) document.addEventListener('loader:done', startLoop, { once: true });
      else startLoop();
    }
  }

  /* ---------- seções aparecem uma vez ao entrar na tela ---------- */
  function startReveal() {
    var items = document.querySelectorAll('[data-reveal]');
    if (reduce || !('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  }
  if (document.documentElement.classList.contains('is-loading')) document.addEventListener('loader:done', startReveal, { once: true });
  else startReveal();

  /* ---------- navbar compacta ao rolar ---------- */
  var nav = document.querySelector('[data-navbar]');
  if (nav) {
    var inner = nav.querySelector('.navbar__inner');
    var desktop = window.matchMedia('(min-width: 769px)');
    var settle;
    // A versão compacta tem a largura do próprio conteúdo (cresce junto com o menu aberto).
    // Para animar a troca entre "largura total" e "largura do conteúdo", medimos as duas e animamos em px.
    var setScrolled = function (on) {
      if (nav.classList.contains('is-scrolled') === on) return;
      if (!desktop.matches || reduce) { nav.classList.toggle('is-scrolled', on); inner.style.width = ''; return; }
      var from = inner.getBoundingClientRect().width;
      inner.style.transition = 'none';
      nav.classList.toggle('is-scrolled', on);
      inner.style.width = '';
      var to = inner.getBoundingClientRect().width;
      inner.style.width = from + 'px';
      void inner.offsetWidth;
      inner.style.transition = '';
      inner.style.width = to + 'px';
      clearTimeout(settle);
      settle = setTimeout(function () { inner.style.width = ''; }, 480);
    };
    var onScroll = function () { setScrolled(window.scrollY > 80); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
    desktop.addEventListener && desktop.addEventListener('change', function () { inner.style.width = ''; });
  }

  /* ---------- menus (hambúrguer) ---------- */
  var menus = document.querySelectorAll('[data-menu]');
  function setMenu(m, open) {
    var btn = m.querySelector('.menu__toggle');
    m.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? btn.dataset.labelClose : btn.dataset.labelOpen);
  }
  menus.forEach(function (m) {
    m.querySelector('.menu__toggle').addEventListener('click', function (ev) {
      ev.stopPropagation();
      var open = !m.classList.contains('is-open');
      menus.forEach(function (o) { if (o !== m) setMenu(o, false); });
      setMenu(m, open);
    });
  });
  document.addEventListener('click', function (ev) { menus.forEach(function (m) { if (!m.contains(ev.target)) setMenu(m, false); }); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') menus.forEach(function (m) { setMenu(m, false); }); });

  /* ---------- popup do formulário ---------- */
  var dialog = document.querySelector('[data-form-dialog]');
  if (dialog) {
    document.querySelectorAll('[data-open-form]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
        document.documentElement.classList.add('has-dialog');
      });
    });
    var close = function () { dialog.close ? dialog.close() : dialog.removeAttribute('open'); };
    dialog.querySelectorAll('[data-close-form]').forEach(function (b) { b.addEventListener('click', close); });
    dialog.addEventListener('click', function (ev) { if (ev.target === dialog) close(); });
    dialog.addEventListener('close', function () { document.documentElement.classList.remove('has-dialog'); });
  }

  /* ---------- filtros da página Projetos ---------- */
  var filterBar = document.querySelector('[data-filters]');
  if (filterBar) {
    var cards = document.querySelectorAll('.project-card[data-filters]');
    filterBar.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-filter]'); if (!b) return;
      var key = b.dataset.filter;
      filterBar.querySelectorAll('[data-filter]').forEach(function (o) {
        var on = o === b;
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
        o.classList.toggle('tag--white', on); o.classList.toggle('tag--black', !on);
      });
      cards.forEach(function (c) {
        var show = key === 'all' || c.dataset.filters.split(' ').indexOf(key) > -1;
        c.classList.toggle('is-hidden', !show);
        if (show) c.classList.add('is-visible');
      });
    });
  }

  /* ---------- formulário em etapas ---------- */
  document.querySelectorAll('[data-form]').forEach(initForm);

  function initForm(form) {
    var steps = Array.prototype.slice.call(form.querySelectorAll('[data-step]'));
    var sent = form.querySelector('[data-sent]');
    var sendError = form.querySelector('[data-send-error]');
    var msg = form.dataset;
    var current = 1;
    var lastSend = 0;
    form.querySelector('[name=pagina]').value = location.pathname;

    function show(n) {
      current = n; form.dataset.current = n;
      steps.forEach(function (s) { s.hidden = Number(s.dataset.step) !== n; });
      var first = steps[n - 1].querySelector('legend');
      if (first && form.getBoundingClientRect().top < 0) form.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
    show(1);

    function setState(field, state, text) {
      field.classList.toggle('is-invalid', state === 'error');
      field.classList.toggle('is-valid', state === 'ok');
      var help = field.querySelector('[data-help]');
      if (help) help.textContent = state === 'error' ? text : (help.dataset.default || '');
    }

    function check(field, strict) {
      var input = field.querySelector('input:not([type=radio]), textarea, select');
      if (field.matches('fieldset')) {
        if (!field.hasAttribute('data-required')) return true;
        var ok = !!field.querySelector('input:checked');
        if (strict || ok) setState(field, ok ? 'none' : 'error', msg.msgChoice);
        return ok;
      }
      if (!input) return true;
      var v = input.value.trim();
      if (!v) {
        if (input.required) { if (strict) setState(field, 'error', msg.msgRequired); return false; }
        setState(field, 'none'); return true;
      }
      var valid = true, text = msg.msgRequired;
      if (input.type === 'email') { valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); text = msg.msgEmail; }
      if (input.type === 'tel') { valid = v.replace(/\D/g, '').length >= 10; text = msg.msgPhone; }
      if (input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') { setState(field, 'none'); return true; }
      setState(field, valid ? 'ok' : 'error', text);
      return valid;
    }

    form.querySelectorAll('[data-field]').forEach(function (field) {
      field.addEventListener('focusout', function (ev) {
        if (field.matches('fieldset') && field.contains(ev.relatedTarget)) return;
        check(field, false);
      });
      field.addEventListener('input', function () { if (field.classList.contains('is-invalid')) check(field, false); });
      field.addEventListener('change', function () { if (field.matches('fieldset')) check(field, false); });
      var sel = field.querySelector('select');
      if (sel) { var upd = function () { sel.classList.toggle('is-empty', !sel.value); }; sel.addEventListener('change', upd); upd(); }
    });

    function validStep(n) {
      var ok = true, firstBad = null;
      steps[n - 1].querySelectorAll('[data-field]').forEach(function (f) {
        if (!check(f, true)) { ok = false; firstBad = firstBad || f; }
      });
      if (firstBad) { var el = firstBad.querySelector('input, textarea, select'); if (el) el.focus(); }
      return ok;
    }

    form.querySelectorAll('[data-next]').forEach(function (b) { b.addEventListener('click', function () { if (validStep(current)) show(current + 1); }); });
    form.querySelectorAll('[data-back]').forEach(function (b) { b.addEventListener('click', function () { show(current - 1); }); });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!validStep(current)) return;
      if (Date.now() - lastSend < 30000) return; // evita envios repetidos
      sendError.hidden = true;
      form.classList.add('is-sending');
      var data = new FormData(form);
      var body = new URLSearchParams();
      data.forEach(function (v, k) { body.append(k, v); });
      var endpoint = form.dataset.endpoint;
      var req = endpoint
        ? fetch(endpoint, { method: 'POST', body: body, mode: 'no-cors' })
        : new Promise(function (r) { setTimeout(r, 600); }); // sem endereço configurado: só simula
      // animação de envio: a logo se forma enquanto o pedido é enviado
      var sending = form.querySelector('[data-sending]');
      var anim = null, t0 = null, done = false, failed = false, raf;
      var reveal = function () {
        sending.hidden = true;
        form.classList.remove('is-sending-anim');
        form.classList.add('is-sent');
        sent.hidden = false;
        if (reduce) { sent.focus(); return; }
        form.classList.add('is-revealing');
        void sent.offsetWidth;
        form.classList.add('is-revealed');
        form.classList.remove('is-revealing');
        sent.focus({ preventScroll: true });
      };
      if (!reduce && window.IMALogo) {
        steps.forEach(function (s) { s.hidden = true; });
        form.classList.add('is-sending-anim');
        sending.hidden = false;
        var box = form.querySelector('[data-sending-logo]');
        box.style.opacity = 1;
        anim = window.IMALogo(box, { invert: true, onExit: function (ex) { box.style.opacity = 1 - ex; } });
        var frame = function (now) {
          if (failed) return;
          if (t0 === null) t0 = now;
          var t = (now - t0) / 1000;
          // segura a logo pronta (3,3 s) enquanto o envio não termina; depois faz a saída
          if (!done && t > 3.3) { t0 = now - 3300; t = 3.3; }
          anim.render(Math.min(t, anim.duration));
          if (t < anim.duration) raf = requestAnimationFrame(frame); else reveal();
        };
        raf = requestAnimationFrame(frame);
      }
      req.then(function () {
        lastSend = Date.now();
        done = true;
        if (!anim) { steps.forEach(function (s) { s.hidden = true; }); reveal(); }
      }).catch(function () {
        failed = true; cancelAnimationFrame(raf);
        sending.hidden = true; form.classList.remove('is-sending-anim');
        show(3);
        sendError.textContent = msg.msgSend; sendError.hidden = false;
      }).then(function () { form.classList.remove('is-sending'); });
    });

    form.querySelector('[data-again]').addEventListener('click', function () {
      form.reset();
      form.querySelectorAll('[data-field]').forEach(function (f) { setState(f, 'none'); var s = f.querySelector('select'); if (s) s.classList.add('is-empty'); });
      form.classList.remove('is-sent', 'is-revealed'); sent.hidden = true; show(1);
      var first = form.querySelector('input:not([type=hidden]):not([name=website])'); if (first) first.focus();
    });
  }
})();
