/* =========================================================================
   Ashish Constructions — site behaviour
   Shared by index.html and shivani-properties.html

   Design rule followed throughout: every enhancement fails OPEN.
   If JS breaks, is blocked, or an API is missing, the page must still be
   fully readable and every phone number / email must still work.
   ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------
     CONFIG — the only block the site owner needs to touch.
     --------------------------------------------------------------- */
  var CONFIG = {
    phone:        '7027929161',
    phoneIntl:    '917027929161',            // for wa.me — country code, no +
    email:        'Mailtoashish29@gmail.com',
    // FormSubmit needs a ONE-TIME activation: submit the form once, then click
    // the confirmation link Google sends to the inbox above. Until that is
    // done (or if it ever fails) the form falls back to WhatsApp — see below.
    endpoint:     'https://formsubmit.co/ajax/Mailtoashish29@gmail.com'
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ===============================================================
     1 · REVEAL ON SCROLL
     The reference site leaves 54 of 56 panels stuck at opacity 0 on
     mobile — whole screens of blank white. Here the hidden state is
     only armed once we know the observer exists, and a hard timeout
     force-reveals anything the observer somehow missed.
     =============================================================== */
  function initReveal() {
    var nodes = $$('.reveal');
    if (!nodes.length) return;

    var showAll = function () {
      nodes.forEach(function (n) { n.classList.add('is-visible'); });
    };

    if (reduceMotion || !('IntersectionObserver' in window)) { showAll(); return; }

    document.documentElement.classList.add('js-reveal');

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

    nodes.forEach(function (n) { io.observe(n); });

    // Safety net: nothing stays invisible for more than 3.5s, ever.
    setTimeout(showAll, 3500);
    window.addEventListener('pagehide', showAll);
  }

  /* ===============================================================
     2 · NAV — sticky state + mobile drawer
     =============================================================== */
  function initNav() {
    var nav = $('#nav');
    if (!nav) return;

    var onScroll = function () {
      nav.classList.toggle('is-stuck', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // ---- fit guard --------------------------------------------------------
    // Last line of defence against the wordmark being squeezed by the links.
    // The CSS is sized to fit, but font fallbacks and zoom can change widths,
    // so measure for real: if the row overflows, drop the CTA button rather
    // than let the company name clip.
    var inner = $('.nav__inner', nav);
    var brand = $('.brand', nav);
    var linkRow = $('.nav__links', nav);
    var cta = $('.nav__cta', nav);

    function fitNav() {
      if (!inner || !brand || !linkRow || !cta) return;
      nav.classList.remove('nav--tight');
      if (getComputedStyle(linkRow).display === 'none') return;   // drawer mode
      var avail = inner.clientWidth
                - parseFloat(getComputedStyle(inner).paddingLeft)
                - parseFloat(getComputedStyle(inner).paddingRight);
      // + a minimum breathing gap between the wordmark and the first link
      var needed = brand.offsetWidth + linkRow.offsetWidth + cta.offsetWidth + 24;
      if (needed > avail) nav.classList.add('nav--tight');
    }

    fitNav();
    window.addEventListener('resize', fitNav);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitNav);

    var drawer = $('#drawer');
    var toggle = $('#navToggle');
    if (!drawer || !toggle) return;

    var lastFocus = null;

    function openDrawer() {
      lastFocus = document.activeElement;
      drawer.classList.add('is-open');
      drawer.removeAttribute('inert');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      // .focus() is a no-op while the drawer is still visibility:hidden, so
      // wait for the frame that paints it open before moving focus in.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var first = drawer.querySelector('a, button');
          if (first) first.focus();
        });
      });
    }

    function closeDrawer() {
      drawer.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      // keep it out of the tab order while hidden
      setTimeout(function () {
        if (!drawer.classList.contains('is-open')) drawer.setAttribute('inert', '');
      }, 320);
      // return focus where it came from; if that is gone (or was never a real
      // control) put it on the toggle so the keyboard user is not dumped at
      // the top of the document.
      var back = (lastFocus && lastFocus.focus && lastFocus !== document.body) ? lastFocus : toggle;
      back.focus();
    }

    drawer.setAttribute('inert', '');
    toggle.addEventListener('click', function () {
      drawer.classList.contains('is-open') ? closeDrawer() : openDrawer();
    });

    var closeBtn = $('#drawerClose');
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // any link inside the drawer closes it
    $$('a', drawer).forEach(function (a) { a.addEventListener('click', closeDrawer); });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !drawer.classList.contains('is-open')) return;
      closeDrawer();
    });

    // trap focus inside the open drawer
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a[href], button:not([disabled])', drawer);
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // a resize back to desktop must not leave the page scroll-locked
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1180 && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  /* ===============================================================
     3 · SCROLLSPY — highlight the section you are actually in
     =============================================================== */
  function initScrollspy() {
    var links = $$('.nav__link[href^="#"]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    links.forEach(function (l) {
      var id = l.getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if (sec) map[id] = l;
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { l.removeAttribute('aria-current'); });
        var active = map[e.target.id];
        if (active) active.setAttribute('aria-current', 'page');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  }

  /* ===============================================================
     4 · HERO SLIDESHOW
     Slides are background-images on top of a painted gradient, so a
     slow or failed photo shows a designed panel rather than nothing.
     =============================================================== */
  function initHero() {
    var slides = $$('.hero__slide');
    var dots   = $$('.hero__dot');
    if (slides.length < 2) return;

    var i = 0, timer = null, DELAY = 6000;

    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
    }

    function start() { if (!reduceMotion) { stop(); timer = setInterval(function () { go(i + 1); }, DELAY); } }
    function stop()  { if (timer) { clearInterval(timer); timer = null; } }

    dots.forEach(function (d, k) {
      d.addEventListener('click', function () { go(k); start(); });
    });

    // do not burn CPU animating a tab nobody is looking at
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });

    go(0);
    start();
  }

  /* ===============================================================
     5 · COUNTERS
     =============================================================== */
  function initCounters() {
    var nums = $$('[data-count]');
    if (!nums.length) return;

    var run = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;
      if (reduceMotion) { el.textContent = String(target); return; }
      var dur = 1400, t0 = null;
      var step = function (ts) {
        if (!t0) t0 = ts;
        var p = Math.min((ts - t0) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        run(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ===============================================================
     6 · GALLERY LIGHTBOX — keyboard driven, focus returned on close
     =============================================================== */
  function initLightbox() {
    var box = $('#lightbox');
    var items = $$('.gallery__item');
    if (!box || !items.length) return;

    var img  = $('#lightboxImg');
    var cap  = $('#lightboxCap');
    var idx  = 0, lastFocus = null;

    function show(n) {
      idx = (n + items.length) % items.length;
      var src = items[idx].getAttribute('data-full') || '';
      var alt = items[idx].getAttribute('data-caption') || '';
      img.src = src;
      img.alt = alt;
      cap.textContent = alt;
      // If the full-size photo cannot load, close rather than show a broken box.
      img.onerror = function () { close(); };
    }

    function open(n) {
      lastFocus = document.activeElement;
      show(n);
      box.classList.add('is-open');
      box.removeAttribute('aria-hidden');
      document.body.classList.add('no-scroll');
      // as with the drawer: focus only lands once the box is actually painted
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var c = $('#lightboxClose');
          if (c) c.focus();
        });
      });
    }

    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    items.forEach(function (it, k) {
      it.addEventListener('click', function () { open(k); });
    });

    $$('[data-lb]', box).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var a = btn.getAttribute('data-lb');
        if (a === 'close') close();
        if (a === 'prev') show(idx - 1);
        if (a === 'next') show(idx + 1);
      });
    });

    box.addEventListener('click', function (e) { if (e.target === box) close(); });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape')     { close(); }
      if (e.key === 'ArrowLeft')  { show(idx - 1); }
      if (e.key === 'ArrowRight') { show(idx + 1); }
    });
  }

  /* ===============================================================
     7 · IMAGE FALLBACK
     A photo that 404s hides itself, uncovering the painted panel
     underneath. No broken-image icons anywhere on the site.
     =============================================================== */
  function initImageFallback() {
    $$('img[data-fallback]').forEach(function (im) {
      im.addEventListener('error', function () {
        im.style.opacity = '0';
        im.setAttribute('aria-hidden', 'true');
      });
    });
  }

  /* ===============================================================
     8 · ENQUIRY / INVESTOR FORMS
     Validated in-browser, posted to FormSubmit. If that post fails
     for ANY reason the lead is handed to WhatsApp instead — it is
     never silently dropped, which is what the reference site does
     (its forms have no action at all and just show a thank-you).
     =============================================================== */
  function initForms() {
    $$('form[data-enquiry]').forEach(function (form) {
      var status = $('.form__status', form);
      var submit = form.querySelector('[type="submit"]');
      var label  = submit ? submit.textContent : '';

      function setStatus(kind, html) {
        if (!status) return;
        status.className = 'form__status is-shown form__status--' + kind;
        status.innerHTML = html;
        status.setAttribute('role', kind === 'err' ? 'alert' : 'status');
        status.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      }

      function fieldError(input, msg) {
        var wrap = input.closest('.field');
        if (!wrap) return;
        wrap.classList.add('has-error');
        var e = $('.field__error', wrap);
        if (e) e.textContent = msg;
      }

      function clearErrors() {
        $$('.field.has-error', form).forEach(function (f) { f.classList.remove('has-error'); });
      }

      function validate() {
        clearErrors();
        var ok = true, firstBad = null;

        // Every field is checked, not just the required ones — an optional
        // email typed wrong is still an unreachable lead.
        $$('input, select, textarea', form).forEach(function (input) {
          var v = (input.value || '').trim();
          var required = input.hasAttribute('required');
          var bad = '';

          if (input.type === 'checkbox') {
            if (required && !input.checked) bad = 'Please tick this to continue.';
          } else if (required && !v) {
            bad = 'This field is required.';
          } else if (v && input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
            bad = 'Enter a valid email address.';
          } else if (v && input.type === 'tel' && v.replace(/\D/g, '').length < 10) {
            bad = 'Enter a valid 10-digit phone number.';
          }

          if (bad) { ok = false; fieldError(input, bad); if (!firstBad) firstBad = input; }
        });

        if (firstBad) firstBad.focus();
        return ok;
      }

      // clear a field's error as soon as the visitor starts fixing it
      $$('input, select, textarea', form).forEach(function (input) {
        input.addEventListener('input', function () {
          var w = input.closest('.field');
          if (w) w.classList.remove('has-error');
        });
      });

      function toWhatsApp(data) {
        var lines = ['*New enquiry — ' + (form.getAttribute('data-enquiry') || 'Website') + '*'];
        Object.keys(data).forEach(function (k) {
          if (data[k] && k.charAt(0) !== '_') lines.push(k + ': ' + data[k]);
        });
        return 'https://wa.me/' + CONFIG.phoneIntl + '?text=' + encodeURIComponent(lines.join('\n'));
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate()) return;

        var fd = new FormData(form);
        var data = {};
        fd.forEach(function (v, k) { data[k] = v; });
        data._subject = 'Website enquiry — ' + (form.getAttribute('data-enquiry') || 'General');
        data._template = 'table';

        if (submit) { submit.disabled = true; submit.textContent = 'Sending…'; }

        var restore = function () {
          if (submit) { submit.disabled = false; submit.textContent = label; }
        };

        var fail = function () {
          restore();
          setStatus('err',
            'We could not send that automatically. Please reach us directly — ' +
            '<a href="https://wa.me/' + CONFIG.phoneIntl + '" target="_blank" rel="noopener"><strong>WhatsApp ' + CONFIG.phone + '</strong></a>, ' +
            '<a href="tel:+91' + CONFIG.phone + '"><strong>call ' + CONFIG.phone + '</strong></a> or ' +
            '<a href="mailto:' + CONFIG.email + '"><strong>email us</strong></a>. ' +
            '<a href="' + toWhatsApp(data) + '" target="_blank" rel="noopener">Send this message on WhatsApp →</a>');
        };

        if (!window.fetch || !CONFIG.endpoint) { fail(); return; }

        fetch(CONFIG.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function (r) { return r.ok ? r.json() : Promise.reject(r); })
          .then(function () {
            restore();
            form.reset();
            setStatus('ok',
              '<strong>Thank you — your enquiry has reached us.</strong><br>' +
              'Our team will call you back within 24 working hours. For anything urgent, ' +
              'call <a href="tel:+91' + CONFIG.phone + '">' + CONFIG.phone + '</a>.');
          })
          .catch(fail);
      });
    });
  }

  /* ===============================================================
     9 · YEAR STAMP
     =============================================================== */
  function initYear() {
    $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* --------------------------------------------------------------- */
  function boot() {
    initReveal();
    initNav();
    initScrollspy();
    initHero();
    initCounters();
    initLightbox();
    initImageFallback();
    initForms();
    initYear();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
