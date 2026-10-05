// Light/dark switch. Dark is the default; the choice is remembered.
(function () {
  var root = document.documentElement;
  var button = document.querySelector('.theme-toggle');
  var meta = document.querySelector('meta[name="theme-color"]');

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0F1513' : '#F5F7F4');
    if (button) button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    document.dispatchEvent(new CustomEvent('themechange'));
  }

  apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  if (button) button.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });
})();

// Highlight the nav link for the section in view.
(function () {
  var links = document.querySelectorAll('.nav a');
  if (!('IntersectionObserver' in window) || !links.length) return;

  var byId = {};
  links.forEach(function (a) { byId[a.hash.slice(1)] = a; });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      var link = byId[entry.target.id];
      if (link) link.setAttribute('aria-current', 'true');
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  Object.keys(byId).forEach(function (id) {
    var section = document.getElementById(id);
    if (section) observer.observe(section);
  });
})();

// Submit the Netlify contact form without leaving the page.
// Without JavaScript the form still posts normally to Netlify.
(function () {
  var form = document.querySelector('form[name="contact"]');
  if (!form || !window.fetch) return;

  var status = form.querySelector('.form-status');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.classList.remove('is-error');

    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
      .then(function (response) {
        if (!response.ok) throw new Error(response.status);
        form.reset();
        status.textContent = 'Message sent. I\'ll reply by email.';
      })
      .catch(function () {
        status.classList.add('is-error');
        status.textContent = 'Your message didn\'t send. Try again, or email tagoonjulynard@gmail.com.';
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Send message';
      });
  });
})();

// Particle "JLT" in the hero, set against the right edge of the page.
// Particles fly in once on load, then drift back into place when the
// pointer pushes them. With reduced motion the word is drawn still.
(function () {
  var canvas = document.querySelector('.hero-particles');
  var hero = document.querySelector('.hero');
  var photo = document.querySelector('.hero-photo');
  if (!canvas || !hero || !canvas.getContext) return;

  var ctx = canvas.getContext('2d');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var particles = [];
  var pointer = { x: -9999, y: -9999 };
  var running = false;
  var visible = true;
  var width = 0;
  var height = 0;

  function hexToRgb(hex) {
    var n = parseInt(hex.trim().replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function textRegion() {
    var heroBox = hero.getBoundingClientRect();
    var photoBox = photo ? photo.getBoundingClientRect() : null;
    if (width > 640) {
      var bottom = photoBox ? photoBox.top - heroBox.top - 24 : height * 0.5;
      if (bottom < 140) bottom = 140;
      return { x0: width * 0.52, x1: width - 6, y0: 24, y1: bottom };
    }
    if (!photoBox) return { x0: width * 0.45, x1: width - 4, y0: 24, y1: 140 };
    return {
      x0: photoBox.right - heroBox.left + 16,
      x1: width - 4,
      y0: photoBox.top - heroBox.top,
      y1: photoBox.bottom - heroBox.top
    };
  }

  function build() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = hero.clientWidth;
    height = hero.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var r = textRegion();
    var family = '"Schibsted Grotesk", system-ui, sans-serif';

    // Fit the word to the region, then sample its pixels as targets.
    var probe = document.createElement('canvas').getContext('2d');
    probe.font = '800 100px ' + family;
    var widthAt100 = probe.measureText('JLT').width;
    var size = Math.min((r.x1 - r.x0) / widthAt100 * 100, (r.y1 - r.y0) / 0.78, 300);
    var step = Math.max(3, Math.round(size / 48));

    var off = document.createElement('canvas');
    off.width = Math.ceil(width);
    off.height = Math.ceil(height);
    var octx = off.getContext('2d');
    octx.font = '800 ' + size + 'px ' + family;
    octx.textAlign = 'right';
    octx.textBaseline = 'middle';
    octx.fillText('JLT', r.x1, (r.y0 + r.y1) / 2);
    var data = octx.getImageData(0, 0, off.width, off.height).data;

    var styles = getComputedStyle(document.documentElement);
    var a = hexToRgb(styles.getPropertyValue('--particle-a') || '#0B4438');
    var b = hexToRgb(styles.getPropertyValue('--particle-b') || '#2FA484');
    var span = Math.max(1, r.x1 - r.x0);

    particles = [];
    for (var y = 0; y < off.height; y += step) {
      for (var x = 0; x < off.width; x += step) {
        if (data[(y * off.width + x) * 4 + 3] < 128) continue;
        // Gradient runs light to dark toward the page edge.
        var t = Math.min(1, Math.max(0, (x - r.x0) / span));
        var c = [0, 1, 2].map(function (i) { return Math.round(b[i] + (a[i] - b[i]) * t); });
        particles.push({
          tx: x, ty: y,
          x: still.matches ? x : Math.random() * width,
          y: still.matches ? y : Math.random() * height,
          vx: 0, vy: 0,
          r: step * (0.22 + Math.random() * 0.18),
          color: 'rgb(' + c.join(',') + ')'
        });
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    if (!running) return;
    var reach = 90;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var dx = pointer.x - p.x;
      var dy = pointer.y - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < reach && dist > 0) {
        var push = (reach - dist) / reach * 3;
        p.vx -= dx / dist * push;
        p.vy -= dy / dist * push;
      }
      p.vx = (p.vx + (p.tx - p.x) * 0.02) * 0.86;
      p.vy = (p.vy + (p.ty - p.y) * 0.02) * 0.86;
      p.x += p.vx;
      p.y += p.vy;
    }
    draw();
    requestAnimationFrame(tick);
  }

  function start() {
    if (still.matches) { draw(); return; }
    if (running || !visible) return;
    running = true;
    requestAnimationFrame(tick);
  }

  function stop() { running = false; }

  function reset() {
    stop();
    build();
    start();
  }

  hero.addEventListener('pointermove', function (e) {
    var box = hero.getBoundingClientRect();
    pointer.x = e.clientX - box.left;
    pointer.y = e.clientY - box.top;
  });
  hero.addEventListener('pointerleave', function () { pointer.x = pointer.y = -9999; });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(hero);
  }

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (hero.clientWidth !== width) reset();
    }, 200);
  });
  if (still.addEventListener) still.addEventListener('change', reset);
  document.addEventListener('themechange', function () { if (width) reset(); });

  var fontsReady = document.fonts && document.fonts.load
    ? document.fonts.load('800 100px "Schibsted Grotesk"')
    : Promise.resolve();
  fontsReady.then(reset, reset);
})();

// Smooth page scrolling (Lenis). Skipped when the visitor prefers reduced motion.
(function () {
  if (!window.Lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  new window.Lenis({ autoRaf: true, anchors: true });
})();

// Repo links without a URL yet: clickable, but they don't jump the page.
document.addEventListener('click', function (e) {
  var link = e.target.closest && e.target.closest('a.repo-link[href="#"]');
  if (link) e.preventDefault();
});

// Projects scroller: loops forever, cards drifting in from the left.
// Hover, focus, dragging or the arrows pause it; reduced motion stops it.
(function () {
  var track = document.querySelector('.side-track');
  if (!track) return;
  var buttons = document.querySelectorAll('.scroller-btn');
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SPEED = 32; // px per second

  // Second copy of the cards makes the loop seamless. Copies are hidden from
  // screen readers and keyboard focus.
  var originals = Array.prototype.slice.call(track.children);
  originals.forEach(function (card) {
    var copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    copy.setAttribute('inert', '');
    copy.querySelectorAll('a, button').forEach(function (el) { el.setAttribute('tabindex', '-1'); });
    track.appendChild(copy);
  });

  var loop = 0;      // width of one full set of cards
  var pos = 0;       // fractional scroll position we drive
  var hovering = false;
  var focused = false;
  var dragging = false;
  var visible = true;
  var pausedUntil = 0;
  var last = 0;

  function measure() {
    loop = track.children[originals.length].offsetLeft - track.children[0].offsetLeft;
  }

  function wrap() {
    // Stay inside the middle of the doubled strip so either direction loops.
    if (track.scrollLeft < 1) track.scrollLeft += loop;
    else if (track.scrollLeft >= loop * 2 - track.clientWidth - 1) track.scrollLeft -= loop;
  }

  function cardStep() {
    var gap = parseFloat(getComputedStyle(track).columnGap) || 16;
    return originals[0].getBoundingClientRect().width + gap;
  }

  function pauseFor(ms) { pausedUntil = performance.now() + ms; }

  function frame(now) {
    var dt = last ? Math.min(now - last, 64) / 1000 : 0;
    last = now;
    var moving = !still.matches && visible && !hovering && !focused && !dragging && now > pausedUntil;
    if (moving && loop) {
      if (Math.abs(track.scrollLeft - pos) > 2) pos = track.scrollLeft; // someone else scrolled
      pos -= SPEED * dt; // content moves right
      if (pos < 1) pos += loop;
      track.scrollLeft = pos;
    } else {
      pos = track.scrollLeft;
    }
    requestAnimationFrame(frame);
  }

  function start() {
    measure();
    track.scrollLeft = loop; // begin on the copy so there's room to drift right
    pos = track.scrollLeft;
    requestAnimationFrame(frame);
  }

  track.addEventListener('scroll', function () { if (!dragging) wrap(); }, { passive: true });
  track.addEventListener('mouseenter', function () { hovering = true; });
  track.addEventListener('mouseleave', function () { hovering = false; });
  track.addEventListener('focusin', function () { focused = true; });
  track.addEventListener('focusout', function () { focused = false; });
  window.addEventListener('resize', function () { measure(); wrap(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(track);
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      pauseFor(2500);
      track.scrollBy({ left: cardStep() * Number(b.dataset.dir), behavior: still.matches ? 'auto' : 'smooth' });
    });
  });

  // Drag to scroll with a mouse; touch and trackpads scroll natively.
  var startX = 0;
  var startLeft = 0;
  var moved = false;

  track.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    dragging = true;
    moved = false;
    startX = e.clientX;
    startLeft = track.scrollLeft;
  });

  window.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) {
      moved = true;
      track.classList.add('is-dragging');
    }
    if (!moved) return;
    var left = startLeft - dx;
    // Loop while dragging too, keeping the grab point under the pointer.
    if (left < 1) { left += loop; startLeft += loop; }
    else if (left >= loop * 2 - track.clientWidth - 1) { left -= loop; startLeft -= loop; }
    track.scrollLeft = left;
  });

  window.addEventListener('pointerup', function () {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    pauseFor(1500);
  });

  // A drag shouldn't count as a click on a card's link.
  track.addEventListener('click', function (e) {
    if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
  }, true);

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start);
})();

// Experience: lists longer than three bullets fold, with a toggle after the
// last bullet. Without JavaScript every bullet simply shows.
(function () {
  var VISIBLE = 3;
  document.querySelectorAll('.jobs > li ul').forEach(function (list, i) {
    var extra = Array.prototype.slice.call(list.children, VISIBLE);
    if (!extra.length) return;

    list.id = list.id || 'job-bullets-' + i;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'more-toggle';
    button.setAttribute('aria-controls', list.id);
    list.insertAdjacentElement('afterend', button);

    function set(open) {
      extra.forEach(function (li) {
        li.classList.toggle('is-folded', !open);
        li.classList.toggle('is-revealed', open);
      });
      button.setAttribute('aria-expanded', String(open));
      button.textContent = open ? 'Show less' : 'Show ' + extra.length + ' more';
    }

    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      set(open);
      if (open) {
        // Move focus to the first revealed bullet for keyboard and screen reader users.
        extra[0].setAttribute('tabindex', '-1');
        extra[0].focus({ preventScroll: true });
      }
    });
    set(false);
  });
})();
