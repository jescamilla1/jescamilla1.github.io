/* ============================================================
   NAV — scroll border + active section highlight
============================================================ */
const nav      = document.getElementById('nav');
const navLinks = document.querySelectorAll('.nav-links a[data-section]');
const sections = document.querySelectorAll('section[id]');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const match = document.querySelector(`.nav-links a[data-section="${e.target.id}"]`);
      if (match) match.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));

window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

/* ============================================================
   THEME TOGGLE
============================================================ */
const toggle = document.getElementById('theme-toggle');
let theme = localStorage.getItem('theme') || 'dark';

const applyTheme = (t) => {
  document.documentElement.setAttribute('data-theme', t);
  toggle.textContent = t === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', t);
  theme = t;
};

applyTheme(theme);
toggle.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

/* ============================================================
   KOI POND — swimming fish with click ripple + startle
============================================================ */
(function initKoi() {
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  /* ---- config ---- */
  const KOI_COUNT      = 10;
  const SPEED_MIN      = 0.22;
  const SPEED_MAX      = 0.55;
  const TURN_RATE      = 0.028;   /* radians per frame, normal steering */
  const STARTLE_SPEED  = 1.8;     /* speed burst on ripple hit */
  const STARTLE_MS     = 600;     /* how long startle lasts */
  const RIPPLE_RINGS   = 5;
  const RIPPLE_MS      = 900;
  const EDGE_MARGIN    = 80;      /* px from edge before fish turns */
  const WANDER_CHANGE  = 0.004;   /* chance per frame to pick new heading */

  /* koi colour palettes [body, accent] */
  const PALETTES = [
    ['#e8622a', '#ffffff'],  /* orange + white */
    ['#ffffff', '#e8622a'],  /* white + orange */
    ['#c0392b', '#000000'],  /* red + black */
    ['#f5c842', '#e8622a'],  /* gold + orange */
    ['#ffffff', '#000000'],  /* white + black */
    ['#e8622a', '#c0392b'],  /* orange + red */
  ];

  let W = 0, H = 0;
  let ripples = [];
  let fish = [];

  /* ---- resize ---- */
  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ---- spawn fish ---- */
  function spawnFish() {
    fish = [];
    for (let i = 0; i < KOI_COUNT; i++) {
      const palette = PALETTES[i % PALETTES.length];
      const depth = 0.3 + Math.random() * 0.7;
      fish.push({
        x:        Math.random() * W,
        y:        Math.random() * H,
        angle:    Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        speed:    SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
        baseSpeed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
        length:   38 + depth * 28,
        depth,
        body:     palette[0],
        accent:   palette[1],
        wagT:     Math.random() * Math.PI * 2,
        wagSpeed: 0.06 + Math.random() * 0.04,
        startleUntil: 0,
        startleAngle: 0,
        attractUntil: 0,   /* new */
      });
    }
  }
  spawnFish();

  /* ---- draw one koi ---- */
  function drawKoi(f, now) {
    const L   = f.length;
    const W2  = L * 0.28;   /* half-width at widest */
    const wag = Math.sin(f.wagT) * (L * 0.18);  /* tail wag amplitude */

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle + Math.PI / 2);

    const alpha = 0.55 + f.depth * 0.35;

    /* --- body --- */
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.48);                     /* nose */
    ctx.bezierCurveTo( W2, -L * 0.1,  W2,  L * 0.25,  wag * 0.4,  L * 0.42);  /* right side */
    ctx.bezierCurveTo(-W2,  L * 0.25, -W2, -L * 0.1,  0, -L * 0.48);           /* left side */
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = f.body;
    ctx.fill();

    /* --- accent patch (mid-body blob) --- */
    ctx.beginPath();
    ctx.ellipse(W2 * 0.3, L * 0.05, W2 * 0.55, L * 0.18, 0.3, 0, Math.PI * 2);
    ctx.fillStyle = f.accent;
    ctx.globalAlpha = alpha * 0.7;
    ctx.fill();

    /* --- tail --- */
    ctx.beginPath();
    ctx.moveTo(0, L * 0.42);
    ctx.lineTo( wag + W2 * 0.9,  L * 0.72);
    ctx.lineTo( wag * 0.2,        L * 0.56);
    ctx.lineTo(-wag + W2 * -0.9,  L * 0.72);
    ctx.closePath();
    ctx.fillStyle   = f.body;
    ctx.globalAlpha = alpha * 0.85;
    ctx.fill();

    /* --- pectoral fins --- */
    ctx.beginPath();
    ctx.ellipse( W2 * 0.85, L * 0.02, W2 * 0.45, L * 0.1, 0.5, 0, Math.PI * 2);
    ctx.fillStyle   = f.body;
    ctx.globalAlpha = alpha * 0.5;
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-W2 * 0.85, L * 0.02, W2 * 0.45, L * 0.1, -0.5, 0, Math.PI * 2);
    ctx.fill();

    /* --- eye --- */
    ctx.beginPath();
    ctx.arc(W2 * 0.38, -L * 0.36, 2.2, 0, Math.PI * 2);
    ctx.fillStyle   = '#111';
    ctx.globalAlpha = alpha;
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function spawnFish() {
    fish = [];
    for (let i = 0; i < KOI_COUNT; i++) {
      const palette = PALETTES[i % PALETTES.length];
      const depth = 0.3 + Math.random() * 0.7;
      fish.push({
        x:        Math.random() * W,
        y:        Math.random() * H,
        angle:    Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        speed:    SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
        baseSpeed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
        length:   38 + depth * 28,
        depth,
        body:     palette[0],
        accent:   palette[1],
        wagT:     Math.random() * Math.PI * 2,
        wagSpeed: 0.06 + Math.random() * 0.04,
        startleUntil: 0,
        startleAngle: 0,
        attractUntil: 0,   /* new */
      });
    }
  }

  function updateFish(f, now) {
    f.wagT += f.wagSpeed;

    if (now < f.attractUntil && f.attractX !== undefined) {
      f.targetAngle = Math.atan2(f.attractY - f.y, f.attractX - f.x);
    }

    const startled  = now < f.startleUntil;
    const attracted = now < f.attractUntil;

    let aimAngle;
    if (startled) {
      aimAngle = f.startleAngle;
    } else if (attracted) {
      aimAngle = f.targetAngle;  /* kept fresh every frame below */
    } else {
      aimAngle = f.targetAngle;
    }

    let diff = aimAngle - f.angle;
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const turnRate = startled ? 0.18 : attracted ? 0.14 : TURN_RATE;
    f.angle += diff * turnRate;

    const targetSpeed = startled ? STARTLE_SPEED : attracted ? f.baseSpeed * 1.6 : f.baseSpeed;
    f.speed += (targetSpeed - f.speed) * 0.08;

    f.x += Math.cos(f.angle) * f.speed;
    f.y += Math.sin(f.angle) * f.speed;

    const nearEdge =
      f.x < EDGE_MARGIN || f.x > W - EDGE_MARGIN ||
      f.y < EDGE_MARGIN || f.y > H - EDGE_MARGIN;

    if (nearEdge && !startled && !attracted) {
      f.targetAngle = Math.atan2(H / 2 - f.y, W / 2 - f.x)
                      + (Math.random() - 0.5) * 0.8;
    } else if (!startled && !attracted && Math.random() < WANDER_CHANGE) {
      f.targetAngle = f.angle + (Math.random() - 0.5) * 1.4;
    }

    if (f.x < -f.length * 2) f.x = W + f.length;
    if (f.x > W + f.length * 2) f.x = -f.length;
    if (f.y < -f.length * 2) f.y = H + f.length;
    if (f.y > H + f.length * 2) f.y = -f.length;
  }

  /* ---- draw water ripples ---- */
  function drawRipples(now) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    ripples = ripples.filter(r => now - r.t < RIPPLE_MS);
    ripples.forEach(r => {
      const p = (now - r.t) / RIPPLE_MS;
      for (let i = 0; i < RIPPLE_RINGS; i++) {
        const rp = Math.max(0, p - i * 0.12);
        if (rp <= 0) continue;
        const radius  = rp * Math.min(W, H) * 0.35;
        const opacity = (1 - rp) * (isDark ? 0.18 : 0.45);
        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = isDark
          ? `rgba(255,255,255,${opacity})`
          : `rgba(10,100,90,${opacity})`;
        ctx.lineWidth = isDark ? 0.8 : 1.2;
        ctx.stroke();
      }
    });
  }

  /* ---- click handler ---- */
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const cx   = e.clientX - rect.left;
    const cy   = e.clientY - rect.top;

    ripples.push({ x: cx, y: cy, t: performance.now() });

    const now = performance.now();
    fish.forEach(f => {
      const dx   = f.x - cx;
      const dy   = f.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 200) {
        /* close fish — startle away */
        f.startleUntil = now + STARTLE_MS * (1 - dist / 200);
        f.startleAngle = Math.atan2(dy, dx) + Math.PI / 2;
      } else {
        /* far fish — lock onto click position, refresh angle every frame */
        f.attractX     = cx;
        f.attractY     = cy;
        f.attractUntil = now + 4000;
      }
    });

    canvas.style.pointerEvents = 'none';
    const below = document.elementFromPoint(e.clientX, e.clientY);
    if (below && below !== canvas) below.click();
    canvas.style.pointerEvents = 'all';
  });

/* ---- star field ---- */
  let stars = [];
  function spawnStars() {
    stars = [];
    const count = Math.floor((W * H) / 9000); /* density scales with canvas size */
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.4 + Math.random() * 1.1,
        baseAlpha: 0.15 + Math.random() * 0.35,
        twinkleSpeed: 0.4 + Math.random() * 0.8,
        twinkleOffset: Math.random() * Math.PI * 2,
      });
    }
  }
  spawnStars();
  window.addEventListener('resize', spawnStars, { passive: true });

  function drawStars(now) {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    if (!isDark) return; /* skip in light mode, dots read poorly on light bg */
    stars.forEach(s => {
      const t = now / 1000;
      const alpha = s.baseAlpha + Math.sin(t * s.twinkleSpeed + s.twinkleOffset) * 0.12;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, alpha)})`;
      ctx.fill();
    });
  }

  /* ---- main loop ---- */
  function tick(now) {
    ctx.clearRect(0, 0, W, H);
    drawStars(now);

    /* sort by depth so deeper fish render first (behind nearer ones) */
    const sorted = [...fish].sort((a, b) => a.depth - b.depth);

    sorted.forEach(f => {
      updateFish(f, now);
      drawKoi(f, now);
    });

    drawRipples(now);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();

/* ============================================================
   SCROLL FADE-IN
============================================================ */
requestAnimationFrame(() => {
  const fadeEls = document.querySelectorAll(
    '.exp-item, .project-card, .article-item, .section-header, .contact-inner'
  );

  fadeEls.forEach(el => el.classList.add('fade-init'));

  const fadeObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const siblings = [...e.target.parentElement.querySelectorAll('.fade-init')]
          .filter(el => !el.classList.contains('fade-in'));
        const idx = siblings.indexOf(e.target);
        e.target.style.transitionDelay = `${Math.min(idx * 60, 240)}ms`;
        e.target.classList.add('fade-in');
      } else {
        e.target.style.transitionDelay = '0ms';
        e.target.classList.remove('fade-in');
      }
    });
  }, { rootMargin: '0px 0px -40px 0px', threshold: 0.05 });

  fadeEls.forEach(el => fadeObserver.observe(el));
});
