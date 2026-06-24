/* ============================================================
   NAV — scroll border + active section highlight
============================================================ */
const nav      = document.getElementById('nav');
const navLinks = document.querySelectorAll('.nav-links a[data-section]');
const sections = document.querySelectorAll('section[id]');

function updateActiveSection() {
  if (!sections.length) return;

  const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
  let current;

  if (atBottom) {
    current = sections[sections.length - 1];
  } else {
    const offset = 120;
    current = sections[0];
    sections.forEach(section => {
      if (section.getBoundingClientRect().top <= offset) {
        current = section;
      }
    });
  }

  navLinks.forEach(l => l.classList.remove('active'));
  const match = document.querySelector(`.nav-links a[data-section="${current.id}"]`);
  if (match) match.classList.add('active');
}

window.addEventListener('scroll', updateActiveSection, { passive: true });
updateActiveSection();

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
   NEURAL NETWORK — nodes that connect and grow over time
============================================================ */
(function initNetwork() {
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // skip the animated network entirely for reduced-motion users
  }

  const ctx = canvas.getContext('2d');

  /* ---- config ---- */
  const NODE_COUNT        = 42;
  const CONNECT_RADIUS    = 170;     /* px — nodes within this range can link */
  const MAX_EDGES_PER_NODE = 3;      /* caps density so it never saturates */
  const FIRE_INTERVAL_MS  = [1800, 4200]; /* random range between a node's connection attempts */
  const EDGE_FADE_IN_MS   = 700;
  const PULSE_MS          = 1400;
  const DRIFT_SPEED       = 0.05;    /* gentle ambient movement */
  const ACTIVATE_RADIUS   = 160;     /* click/hover activation radius */
  const PROPAGATE_HOPS    = 2;       /* how many edges a signal travels outward */

  let W = 0, H = 0;
  let nodes = [];
  let pulses = []; /* traveling signal dots along edges, for click/hover propagation */

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  function spawnNodes() {
    nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * DRIFT_SPEED,
        vy: (Math.random() - 0.5) * DRIFT_SPEED,
        edges: [],              /* { to: nodeIndex, bornAt: ms, strength: 0-1 } */
        nextFireAt: performance.now() + rand(FIRE_INTERVAL_MS[0], FIRE_INTERVAL_MS[1]),
        activatedUntil: 0,
        baseRadius: 1.6 + Math.random() * 1.4,
      });
    }
  }
  spawnNodes();

  function rand(a, b) { return a + Math.random() * (b - a); }

  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function hasEdge(i, j) {
    return nodes[i].edges.some(e => e.to === j);
  }

  function addEdge(i, j, now) {
    if (i === j || hasEdge(i, j)) return;
    const a = nodes[i], b = nodes[j];

    a.edges.push({ to: j, bornAt: now, strength: 0 });
    b.edges.push({ to: i, bornAt: now, strength: 0 });

    /* enforce cap — drop the oldest edge on each node if over limit */
    [i, j].forEach(idx => {
      const n = nodes[idx];
      if (n.edges.length > MAX_EDGES_PER_NODE) {
        n.edges.sort((e1, e2) => e1.bornAt - e2.bornAt);
        const dropped = n.edges.shift();
        /* remove the matching reverse edge on the other side too */
        const other = nodes[dropped.to];
        other.edges = other.edges.filter(e => e.to !== idx);
      }
    });
  }

  function tryFire(i, now) {
    const n = nodes[i];
    if (now < n.nextFireAt) return;
    n.nextFireAt = now + rand(FIRE_INTERVAL_MS[0], FIRE_INTERVAL_MS[1]);

    /* find nearby candidates not already connected */
    const candidates = [];
    for (let j = 0; j < nodes.length; j++) {
      if (j === i) continue;
      if (hasEdge(i, j)) continue;
      const d = dist(n, nodes[j]);
      if (d < CONNECT_RADIUS) candidates.push(j);
    }
    if (candidates.length === 0) return;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    addEdge(i, target, now);
  }

  function updateNodes(now) {
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      n.x = Math.max(0, Math.min(W, n.x));
      n.y = Math.max(0, Math.min(H, n.y));

      n.edges.forEach(e => {
        const age = now - e.bornAt;
        e.strength = Math.min(1, age / EDGE_FADE_IN_MS);
      });
    });

    for (let i = 0; i < nodes.length; i++) tryFire(i, now);
  }

  function isDark() {
    return document.documentElement.getAttribute('data-theme') !== 'light';
  }

  function drawEdges(now) {
    const dark = isDark();
    nodes.forEach((n, i) => {
      n.edges.forEach(e => {
        if (e.to < i) return; /* draw each edge once */
        const other = nodes[e.to];
        const opacity = e.strength * (dark ? 0.22 : 0.35);
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(other.x, other.y);
        ctx.strokeStyle = dark
          ? `rgba(45, 212, 184, ${opacity})`
          : `rgba(10, 143, 122, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });
  }

  function drawNodes(now) {
    const dark = isDark();
    nodes.forEach(n => {
      const activated = now < n.activatedUntil;
      const pulse = activated
        ? 0.5 + 0.5 * Math.sin((now % PULSE_MS) / PULSE_MS * Math.PI * 2)
        : 0;
      const r = n.baseRadius + (activated ? pulse * 2.2 : Math.min(1, n.edges.length / MAX_EDGES_PER_NODE) * 1.2);

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = activated
        ? (dark ? 'rgba(45, 212, 184, 0.95)' : 'rgba(10, 143, 122, 0.95)')
        : (dark ? 'rgba(244, 244, 245, 0.55)' : 'rgba(20, 18, 16, 0.45)');
      ctx.fill();

      if (activated) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 4 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = dark
          ? `rgba(45, 212, 184, ${0.3 * pulse})`
          : `rgba(10, 143, 122, ${0.3 * pulse})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
  }

  /* ---- activation / propagation on click or hover ---- */
  function activateAt(cx, cy) {
    const now = performance.now();
    const origin = [];
    nodes.forEach((n, i) => {
      if (dist(n, { x: cx, y: cy }) < ACTIVATE_RADIUS) {
        n.activatedUntil = now + PULSE_MS;
        origin.push(i);
      }
    });

    /* propagate outward along existing edges, a couple hops, with delay */
    let frontier = origin;
    for (let hop = 1; hop <= PROPAGATE_HOPS; hop++) {
      const delay = hop * 220;
      const next = new Set();
      frontier.forEach(i => {
        nodes[i].edges.forEach(e => next.add(e.to));
      });
      const nextArr = [...next];
      setTimeout(() => {
        const t = performance.now();
        nextArr.forEach(i => { nodes[i].activatedUntil = t + PULSE_MS; });
      }, delay);
      frontier = nextArr;
    }
  }

  let lastMoveActivate = 0;
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    activateAt(e.clientX - rect.left, e.clientY - rect.top);
  });

  canvas.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (now - lastMoveActivate < 260) return; /* throttle */
    lastMoveActivate = now;
    const rect = canvas.getBoundingClientRect();
    activateAt(e.clientX - rect.left, e.clientY - rect.top);
  }, { passive: true });

  /* ---- star field (unchanged) ---- */
  let stars = [];
  function spawnStars() {
    stars = [];
    const count = Math.floor((W * H) / 9000);
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
    if (!isDark()) return;
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
    updateNodes(now);
    drawEdges(now);
    drawNodes(now);
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();

/* ============================================================
   SCROLL FADE-IN
============================================================ */
requestAnimationFrame(() => {
  const fadeEls = document.querySelectorAll(
    '.exp-item, .project-card, .article-item, .section-header, .contact-inner, .about-body'
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




/* ============================================================
   EXPERIENCE — timeline rail + click to expand/collapse
============================================================ */
(function initExperienceTimeline() {
  const items = document.querySelectorAll('#exp-list-col .exp-item');
  const dotsContainer = document.getElementById('exp-rail-dots');
  if (!items.length || !dotsContainer) return;

  const dots = [];

  items.forEach((item, i) => {
    const dot = document.createElement('button');
    dot.className = 'exp-rail-dot';
    dot.setAttribute('aria-label', item.querySelector('.exp-role')?.textContent.trim() || `Experience ${i + 1}`);
    if (item.querySelector('.exp-badge-current')) dot.classList.add('is-current');
    if (item.classList.contains('is-expanded')) dot.classList.add('is-open');
    dotsContainer.appendChild(dot);
    dots.push(dot);

    dot.addEventListener('click', () => toggleItem(i));
    item.querySelector('.exp-toggle')?.addEventListener('click', () => toggleItem(i));
  });

  function toggleItem(i) {
    const item = items[i];
    const expanded = item.classList.toggle('is-expanded');
    item.querySelector('.exp-toggle')?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    dots[i].classList.toggle('is-open', expanded);
    animatePositionDots();
  }

  function animatePositionDots() {
    const duration = 400;
    const start = performance.now();
    function step(now) {
      positionDots();
      if (now - start < duration) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function positionDots() {
    const railRect = dotsContainer.getBoundingClientRect();
    items.forEach((item, i) => {
      const toggle = item.querySelector('.exp-toggle');
      const toggleRect = toggle.getBoundingClientRect();
      const centerY = (toggleRect.top - railRect.top) + toggleRect.height / 2 - 9;
      dots[i].style.top = `${centerY}px`;
    });
  }

  positionDots();
  window.addEventListener('resize', positionDots, { passive: true });
  setTimeout(positionDots, 50); /* catch late font/layout shifts */
})();

/* ============================================================
   MOBILE NAV MENU TOGGLE
============================================================ */
(function initMobileNav() {
  const menuToggle = document.getElementById('nav-menu-toggle');
  const links = document.querySelector('.nav-links');
  if (!menuToggle || !links) return;

  function setOpen(open) {
    links.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  menuToggle.addEventListener('click', () => {
    setOpen(!links.classList.contains('is-open'));
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });
})();

/* ============================================================
   CONTACT FORM → mailto
============================================================ */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const reason  = document.getElementById('contact-reason')?.value || 'Reaching out';
    const name    = document.getElementById('contact-name')?.value.trim() || '';
    const message = document.getElementById('contact-message')?.value.trim() || '';

    const subject = name ? `${reason} — from ${name}` : reason;

    let body = message ? `${message}\n\n` : '';
    body += `—\nSent via jescamilla.github.io`; // swap for your real domain

    const mailto = `mailto:joan.escamilla1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
})();
