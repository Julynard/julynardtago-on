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
