const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const progress = document.getElementById('progress');
const header   = document.getElementById('siteHeader');

/* ── scroll-linked: progress bar + image desaturation ──
   Images sit at full color near the middle of the viewport and fade
   toward gray as they travel away from it. */
let queued = false;

function measure(){
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (progress) progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
  if (header)   header.classList.toggle('stuck', window.scrollY > 8);

  if (reduce) return;

  const vh = window.innerHeight;
  const active = document.querySelector('.view.is-active');
  if (!active) return;

  active.querySelectorAll('[data-fade]').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.bottom < -200 || r.top > vh + 200) return;   // offscreen, skip

    const center = r.top + r.height / 2;
    const offset = Math.abs(center - vh / 2);
    const span   = vh / 2 + r.height / 2;
    let t = span > 0 ? offset / span : 0;              // 0 centered → 1 far
    t = Math.min(1, Math.max(0, t));
    const eased = t * t;                               // hold color longer near center

    el.style.setProperty('--g', (eased * 100).toFixed(1) + '%');
    el.style.setProperty('--o', (1 - eased * 0.45).toFixed(3));
  });
}

function onScroll(){
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { measure(); queued = false; });
}

window.addEventListener('scroll', onScroll, { passive:true });
window.addEventListener('resize', onScroll);

/* ── reveal on enter ────────────────────────────────── */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting){
      e.target.classList.add('in');
      observer.unobserve(e.target);
    }
  });
}, { threshold:0.1, rootMargin:'0px 0px -6% 0px' });

function watchReveals(root){
  root.querySelectorAll('[data-reveal]:not(.in)').forEach(el => observer.observe(el));
}

/* ── hash routing ───────────────────────────────────── */
const views = document.querySelectorAll('.view');

function show(id, resetScroll){
  let matched = false;
  views.forEach(v => {
    const isTarget = v.id === 'view-' + id;
    v.classList.toggle('is-active', isTarget);
    if (isTarget) matched = true;
  });
  if (!matched){
    const home = document.getElementById('view-home');
    if (home) home.classList.add('is-active');
  }

  if (resetScroll) window.scrollTo(0, 0);
  watchReveals(document.querySelector('.view.is-active'));
  measure();
}

function route(){
  const hash = location.hash;

  // in-page anchors (#work, #contact) — make sure we're home, then scroll
  if (hash && !hash.startsWith('#/')){
    show('home', false);
    const target = document.querySelector(hash);
    if (target) target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    return;
  }
  show(hash.replace('#/','') || 'home', true);
}

window.addEventListener('hashchange', route);
route();

/* Failsafe: IntersectionObserver only fires for elements that cross the
   boundary after it starts watching. Anything already sitting on screen at
   load, and anything the observer misses, gets revealed here so no section
   can ever be stranded at opacity 0. */
function revealVisible(){
  const active = document.querySelector('.view.is-active');
  if (!active) return;
  active.querySelectorAll('[data-reveal]:not(.in)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight * 1.1) el.classList.add('in');
  });
}

window.addEventListener('load', () => { revealVisible(); measure(); });
setTimeout(revealVisible, 400);

// Last resort: if something is still hidden after 2.5s, drop the effects entirely.
setTimeout(() => {
  const stuck = document.querySelectorAll('.view.is-active [data-reveal]:not(.in)');
  let offscreen = 0;
  stuck.forEach(el => { if (el.getBoundingClientRect().top > window.innerHeight) offscreen++; });
  if (stuck.length && stuck.length === offscreen) return;   // normal: waiting below the fold
  if (stuck.length) document.documentElement.classList.add('no-anim');
}, 2500);
