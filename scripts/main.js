// Anniversary card: content binding, state machine, hints, audio.

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

const card = $('.card');
const hint = $('.hint');
const hintText = $('.hint-text');
const backBtn = $('.btn-back');
const soundBtn = $('.btn-sound');
const audio = $('.song');
const bgVideo = $('.bg-video video');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- State machine ----------
const ORDER = ['sealed', 'envelope', 'letter', 'photos', 'music', 'gift'];

// action -> state in which it is clickable
const ACTIVE_IN = {
  seal: 'sealed',
  letter: 'envelope',
  photos: 'letter',
  mainPhoto: 'photos',
  record: 'music',
  lily: 'music',
};
// action -> state it leads to (record toggles audio instead)
const LEADS_TO = { seal: 'envelope', letter: 'letter', photos: 'photos', mainPhoto: 'music', lily: 'gift' };
// state -> key in content.hints
const HINT_KEY = { sealed: 'seal', envelope: 'letter', letter: 'photos', photos: 'mainPhoto', music: 'gift' };
// state -> element to focus after the transition
const FOCUS = {
  sealed: '.seal',
  envelope: '.letter',
  letter: '.polaroid[data-i="2"]',
  photos: '.main-photo',
  music: '.record',
  gift: '.gift-text',
};

const LOCK_MS = 1000;   // longest transition (fold 0.8s + delays)
const FADE_MS = 250;    // reduced-motion crossfade

let content = {};
let state = 'sealed';
let busy = false;

function go(next, { focus = true } = {}) {
  if (busy || next === state) return;
  busy = true;
  hideHint();

  const apply = () => {
    state = next;
    card.dataset.state = next;
    sync();
    document.body.dataset.state = next;
    if (next === 'music') bgVideo.preload = 'auto'; // start buffering before the record is clicked
    else if (next !== 'gift') hideVideo();          // the gift view keeps the video, dimmed
  };
  const settle = () => {
    busy = false;
    showHint();
    if (focus) focusTarget();
  };

  if (reduceMotion.matches) {
    card.classList.add('is-fading');
    setTimeout(() => {
      apply();
      card.classList.remove('is-fading');
      setTimeout(settle, FADE_MS);
    }, FADE_MS);
  } else {
    apply();
    setTimeout(settle, LOCK_MS);
  }
}

// Back always returns to the first view, the sealed envelope.
function back() {
  if (state !== ORDER[0]) go(ORDER[0]);
}

function activate(el) {
  const action = el.dataset.action;
  if (busy || ACTIVE_IN[action] !== state) return;
  if (action === 'record') {
    toggleAudio();
    showVideo();
  } else go(LEADS_TO[action]);
}

// Update roles, tab order, inert scenes and the Back button for the current state.
function sync() {
  $$('[data-action]').forEach((el) => {
    const action = el.dataset.action;
    const active = ACTIVE_IN[action] === state;
    // Only the top polaroid is a tab stop; the others are mouse targets.
    const secondary = el.classList.contains('polaroid') && el.dataset.i !== '2';

    if (active) {
      el.setAttribute('role', 'button');
      el.tabIndex = secondary ? -1 : 0;
      const label = labelFor(action);
      if (label) el.setAttribute('aria-label', label);
      el.toggleAttribute('aria-hidden', secondary);
    } else {
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
      el.removeAttribute('aria-label');
      el.removeAttribute('aria-hidden');
    }
  });

  const inMusic = state === 'music';
  const inGift = state === 'gift';
  $('.scene-envelope').inert = inMusic || inGift;
  $('.scene-music').inert = !inMusic;
  $('.scene-gift').inert = !inGift;

  backBtn.setAttribute('aria-disabled', String(state === 'sealed'));
  $('.countdown').toggleAttribute('aria-hidden', !inGift);
}

function labelFor(action) {
  const h = content.hints || {};
  switch (action) {
    case 'seal': return h.seal;
    case 'letter': return h.letter;
    case 'photos': return h.photos;
    case 'mainPhoto': return h.mainPhoto;
    case 'lily': return h.gift;
    case 'record': return [content.labels?.soundOn, content.music?.title].filter(Boolean).join(': ');
    default: return '';
  }
}

function focusTarget() {
  // Keep focus on Back when the visitor is stepping back with it.
  if (document.activeElement === backBtn) return;
  const el = $(FOCUS[state]);
  if (el) el.focus({ preventScroll: true });
}

// ---------- Hint ----------
function hideHint() {
  hint.classList.remove('is-visible');
}

function showHint() {
  const key = HINT_KEY[state];
  const text = key ? get(content, `hints.${key}`) : '';
  hint.dataset.for = state;
  hintText.textContent = typeof text === 'string' ? text : '';
  hint.classList.toggle('is-visible', Boolean(hintText.textContent));
}

// ---------- Start: the card opens on the sealed envelope ----------
function start() {
  sync();
  showHint();
}

// ---------- Content ----------
async function loadContent() {
  try {
    const res = await fetch('content.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('content.json could not be loaded; serve this folder over HTTP.', err);
    return {};
  }
}

function setImage(img, src, alt) {
  const frame = img.closest('.photo');
  frame.classList.add('is-missing');
  img.alt = alt || '';
  if (typeof src !== 'string' || !src) {
    img.removeAttribute('src');
    return;
  }
  img.addEventListener('load', () => frame.classList.remove('is-missing'), { once: true });
  img.addEventListener('error', () => frame.classList.add('is-missing'), { once: true });
  img.src = src;
}

function render(c) {
  $$('[data-bind]').forEach((el) => {
    const value = get(c, el.dataset.bind);
    const text = typeof value === 'string' ? value : '';
    el.textContent = text;
    el.toggleAttribute('hidden', !text);
  });

  $$('img[data-img]').forEach((img) => {
    const isMain = img.dataset.img === 'mainPhoto';
    setImage(img, get(c, img.dataset.img), isMain ? c.recipientName : '');
  });

  const title = c.letter?.greeting || c.recipientName || '';
  document.title = title.replace(/[,\s]+$/, '');

  setupAudio(c.music?.src);
  setupVideo(c.music?.video);
  setupCountdown(c.countdown);
}

// ---------- Gift flower ----------
function buildFlower() {
  const NS = 'http://www.w3.org/2000/svg';
  const group = $('.petals');
  // Each layer is drawn for all petals before the next layer, which gives one
  // outline around the whole flower (edge, cream band, inner line, fill).
  for (const layer of ['edge', 'band', 'line', 'fill']) {
    for (let i = 0; i < 5; i++) {
      const use = document.createElementNS(NS, 'use');
      use.setAttribute('href', '#petal');
      use.setAttribute('class', `petal petal-${layer}`);
      use.style.setProperty('--i', i);
      group.append(use);
    }
  }
}

// ---------- Audio ----------
let audioAvailable = false;

function setupAudio(src) {
  if (typeof src !== 'string' || !src) return markAudioUnavailable();
  audioAvailable = true;
  audio.src = src; // preload="none": nothing is fetched until the first play
  audio.addEventListener('error', markAudioUnavailable);
  audio.addEventListener('play', syncAudioUI);
  audio.addEventListener('pause', syncAudioUI);
  audio.addEventListener('play', syncVideo);
  audio.addEventListener('pause', syncVideo);
  syncAudioUI();
}

function markAudioUnavailable() {
  audioAvailable = false;
  if (!audio.paused) audio.pause();
  soundBtn.setAttribute('aria-disabled', 'true');
  syncAudioUI();
}

async function toggleAudio() {
  if (!audioAvailable) return;
  if (!audio.paused) {
    audio.pause();
    return;
  }
  try {
    await audio.play();
  } catch (err) {
    // NotAllowedError/AbortError: the visitor can try again. Anything else
    // (e.g. NotSupportedError for a missing file): skip music silently.
    if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') markAudioUnavailable();
  }
}

// Autoplay (music.autoplay: true). Browsers block sound until the visitor
// interacts with the page, so try straight away and, if that is blocked,
// start on the first click, tap or key press anywhere.
let gestureArmed = false;

function autoplay() {
  if (!audioAvailable || content.music?.autoplay !== true) return;
  audio.play().catch(onAutoplayError);
}

function onAutoplayError(err) {
  if (err.name === 'NotAllowedError') armFirstGesture();
  else if (err.name !== 'AbortError') markAudioUnavailable();
}

function armFirstGesture() {
  if (gestureArmed) return;
  gestureArmed = true;
  const events = ['click', 'touchend', 'keydown'];
  const onGesture = (e) => {
    events.forEach((t) => document.removeEventListener(t, onGesture, true));
    gestureArmed = false;
    // The speaker button and the record toggle the music themselves.
    if (e.target.closest?.('.btn-sound, .record')) return;
    if (audioAvailable && audio.paused) audio.play().catch(onAutoplayError);
  };
  events.forEach((t) => document.addEventListener(t, onGesture, true));
}

function syncAudioUI() {
  const playing = audioAvailable && !audio.paused;
  card.classList.toggle('is-playing', playing);
  soundBtn.setAttribute('aria-pressed', String(playing));
  const label = playing ? content.labels?.soundOff : content.labels?.soundOn;
  if (label) soundBtn.setAttribute('aria-label', label);
}

// ---------- Background video ----------
// Clicking the record fades the page background into a full-screen video.
// It stays (darker) through the gift view and fades back on Start over. The video is muted and follows the
// song (same clip), pausing and playing with it.
let videoAvailable = false;
let videoOn = false;
let videoHideTimer = 0;

function setupVideo(src) {
  if (typeof src !== 'string' || !src) return;
  videoAvailable = true;
  bgVideo.src = src;
  bgVideo.addEventListener('error', () => {
    videoAvailable = false;
    hideVideo();
  });
}

function showVideo() {
  if (!videoAvailable || videoOn) return;
  videoOn = true;
  clearTimeout(videoHideTimer);
  document.body.classList.add('has-video');
  syncVideo();
}

function hideVideo() {
  if (!videoOn) return;
  videoOn = false;
  document.body.classList.remove('has-video');
  // Pause once the fade-out has finished.
  videoHideTimer = setTimeout(() => bgVideo.pause(), 1300);
}

function syncVideo() {
  if (!videoOn) return;
  const songPlaying = audioAvailable && !audio.paused;
  if (audioAvailable && !songPlaying) {
    bgVideo.pause();
    return;
  }
  if (songPlaying && Math.abs(bgVideo.currentTime - audio.currentTime) > 0.3
      && (!bgVideo.duration || audio.currentTime < bgVideo.duration)) {
    bgVideo.currentTime = audio.currentTime;
  }
  bgVideo.play().catch(() => {});
}

// ---------- Gift view: falling blossoms ----------
function buildBlossoms(count = 22) {
  const box = $('.blossoms');
  const rand = (min, max) => min + Math.random() * (max - min);
  for (let i = 0; i < count; i++) {
    const petal = document.createElement('span');
    petal.className = i % 4 === 0 ? 'blossom is-cream' : 'blossom';
    const dur = rand(9, 16);
    petal.style.cssText = [
      `--left:${rand(0, 100).toFixed(1)}vw`,
      `--size:${rand(10, 20).toFixed(1)}px`,
      `--dur:${dur.toFixed(1)}s`,
      `--delay:${(-rand(0, dur)).toFixed(1)}s`,   // negative: already mid-fall when shown
      `--sway:${rand(14, 40).toFixed(0)}px`,
      `--spin:${rand(90, 300).toFixed(0)}deg`,
    ].join(';');
    petal.append(document.createElement('i'));
    box.append(petal);
  }
}

// ---------- Gift view: countdown ----------
function setupCountdown(cfg) {
  const box = $('.countdown');
  const target = new Date(cfg?.date ?? '');
  if (Number.isNaN(target.getTime())) {
    box.hidden = true;
    return;
  }
  const out = Object.fromEntries($$('.cd-num', box).map((el) => [el.dataset.unit, el]));
  const pad = (n) => String(n).padStart(2, '0');
  const tick = () => {
    const s = Math.max(0, Math.floor((target - Date.now()) / 1000)); // stops at zero on the day
    out.days.textContent = Math.floor(s / 86400);
    out.hours.textContent = pad(Math.floor((s % 86400) / 3600));
    out.minutes.textContent = pad(Math.floor((s % 3600) / 60));
    out.seconds.textContent = pad(s % 60);
  };
  tick();
  setInterval(tick, 1000);
}

// ---------- Events ----------
card.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (el) activate(el);
});

card.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('[data-action]');
  if (!el || el.getAttribute('role') !== 'button') return;
  e.preventDefault();
  activate(el);
});

backBtn.addEventListener('click', () => {
  if (backBtn.getAttribute('aria-disabled') === 'true') return;
  back();
});

soundBtn.addEventListener('click', toggleAudio);

// ---------- Boot ----------
buildFlower();
buildBlossoms();
content = await loadContent();
render(content);
start();
autoplay();
