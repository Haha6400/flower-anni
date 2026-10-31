# Anniversary Card — Plan

## 1. Overview and goal

A single-page interactive anniversary/birthday card for **Linh**. The visitor opens a wax-sealed envelope and moves through a short guided sequence: **seal → envelope → letter → photos → music → gift**. Each step shows one hint telling the visitor what to click. A Back button is always visible, and music plays only when the visitor turns it on.

The page is static: plain HTML, CSS, and vanilla JS with no framework and no build step. All text and media come from `content.json`, so the card can be reused by editing that one file.

## 2. Reference review

All 46 frames in `reference/frames/` were reviewed (`f_001`–`f_046`). That is about 2 fps over 23 s, not the 1 fps stated in the brief. Chrome's URL bar shows the original is a multi-page Canva site (`…/page-2`, `page-4`, `page-5`, `page-6`).

### What the frames actually show

| Time (s) | Frames | What is on screen | Original page |
|---|---|---|---|
| 0–1 | 001–002 | **Hub**: open cream envelope with the mint scalloped letter rising from it ("Dear Linh, Happy birthday!" plus handwritten body), the main photo tucked in at right, two polaroid photos on top, a red wax seal at the bottom centre, a dark-red calla lily on the left, and a pink anthurium on the right. Four hand-drawn hints with arrows: *Click the letter* (top-left → letter), *Click the photo* (top-right → polaroids), *Click the wax seal* (left → seal), *Click the top-left corner of the photo* (right → main photo). Back button at bottom-left, muted-speaker button at bottom-right. | page 2 |
| 1–6 | 003–011 | **Photo-strip scene** (reached from the hub by clicking the polaroids): a *closed* envelope with a seal, two black-and-white photo-booth strips fanned to the right, pink anthurium at the left. A caption types in letter by letter: "Thank you for walking this road together." | page 5 |
| 6 | 012 | Back is clicked. | — |
| 6–9 | 013–018 | **Hub rebuilds**: the envelope appears first, then the polaroids rise, the letter rises, and the main photo and flowers fade in (≈1.5 s). | page 2 |
| 9–9.5 | 019 | Crossfade from the hub into the record scene (main photo top-left corner clicked). | — |
| 9.5–14 | 020–029 | **Record scene**: stacked polaroids of the main photo with a paper clip, a black vinyl record behind them with a "Happy Birthday" label, musical notes, a dark-red calla lily at the left, and white calla lilies at the right. Caption: "*Double-tap* the record to hear the message song for you." The record is not clicked in the recording and the speaker stays muted. | page 4 |
| 14–15 | 029–031 | Back → hub rebuilds. | page 2 |
| 16 | 033–034 | The wax seal is clicked. | — |
| 17–22 | 035–045 | **Gift flower**: a five-petal cream flower with a green double edge, slowly swaying/rotating. The text types in at the centre: "A little gift for you, I hope you liked it, love youuu!" | page 6 |
| 22–23 | 045–046 | Back → the hub starts rebuilding (the "faint envelope overlay" in the brief is this crossfade back to the hub). | page 2 |

### Mismatches with the brief's timeline

1. **No fold at 1–4 s and no idle "waiting envelope" at 4–8 s.** What looks like folding is a *different scene*: the photo-strip page with a closed envelope. It is reached by clicking the polaroids.
2. **No flap-opening or letter slide-out appears in the recording** (8–9 s). It moves from the hub to the record scene with a crossfade. The "full letter" view (probably page 3) is never shown.
3. **The order is hub-and-spoke, not linear.** Every scene is a spoke from the hub, and Back always returns to the hub. The gift flower is opened by the **wax seal**, not by a step after the music.
4. **"Double-tap" the record** in the original, versus "Tap" in the brief.
5. Two photo-booth **strips** (4 frames each) in the photo scene, versus three polaroids in the hub.
6. The 22–23 s overlay is the Back crossfade, not a separate effect.

### Decision

The **"Done when"** section of the brief asks for a linear sequence (seal → envelope → letter → photos → music → gift), so the build follows that sequence. It borrows the visuals of each reference scene: the hub composition, the photo strips, the record, and the flower. The fold, flap, and letter slide-out from the brief's timeline are kept, because they are in the motion spec. See open question Q1.

## 3. Scene timeline (corrected, as built)

Durations assume the visitor clicks straight away. User clicks drive every transition.

| # | State | Enters via | What the visitor sees | Active hint |
|---|---|---|---|---|
| 1 | `sealed` | page load | Closed cream envelope. Both flowers cross on its front with their stems tucked under the red wax seal. (The opening card-folds-into-envelope intro was removed at the user's request.) | `hints.seal` |
| 2 | `envelope` | click seal | The seal lifts and fades, the **flap opens** (0.6 s), and the mint letter slides partway out. | `hints.letter` |
| 3 | `letter` | click letter | The letter rises and enlarges into reading view: greeting (script), subtitle, and body. The main photo is tucked at the right and the polaroid strip peeks out behind. | `hints.photos` |
| 4 | `photos` | click polaroids | The letter dims and moves back. The main photo is centred and three polaroids fan out (0.1 s stagger). `photosCaption` fades in. | `hints.mainPhoto` |
| 5 | `music` | click main photo | Crossfade to the record scene: the main photo as a polaroid on a vinyl record, musical notes, and lilies. Caption `music.caption`. Clicking the record plays or pauses; it spins (3.3 s/rev) only while playing. | `hints.gift` (on the white lily) |
| 6 | `gift` | click lily | Crossfade to the five-petal flower. The petals open (0.9 s, spring) and `gift.text` fades in at the centre. End of sequence. | — |

## 4. State machine

```
  sealed ──seal──▶ envelope ──letter──▶ letter ──photos──▶ photos ──mainPhoto──▶ music ──lily──▶ gift
  ▲                 │                   │                 │                    │                │
  └──── Back ───────┘◀──── Back ────────┘◀──── Back ──────┘◀──── Back ─────────┘◀──── Back ─────┘
```

- **States:** `sealed`, `envelope`, `letter`, `photos`, `music`, `gift`.
- **Order array:** `['sealed','envelope','letter','photos','music','gift']`. *Forward* goes to `order[i+1]` and *Back* goes to `order[i-1]`.
- **The Back button exists in every state.**
  - In `sealed`, the first interactive state, Back is shown but `aria-disabled="true"` and dimmed, because there is nothing before it (Q2).
  - In every other state, Back returns straight to `sealed` (changed after build at the user's request; originally it stepped back one state). The envelope contents fold back in and the flap closes.
- **Transition lock:** clicks and keys are ignored while a transition is running (`busy` flag, cleared by a timeout sized to the longest transition). Rapid clicking therefore cannot desync the state.
- **Rendering:** a single `data-state` attribute on `<main class="stage">` drives the CSS. JS sets the state, updates the hint text and position, updates which objects are focusable (`tabindex`/`aria-hidden`), and moves focus to the new primary target.
- **Audio:** this is separate from the scene state. `audio.playing` is toggled by the record (in `music`) or the speaker button (any state). Leaving `music` does **not** stop the song (Q3). The record spins only when `state === 'music' && playing`.

## 5. Tech stack

- `index.html`: semantic markup and inline SVG (seal, flowers, record, notes, gift flower, speaker icons). `<html lang="en">`, `<meta charset="utf-8">`, viewport meta.
- `styles/card.css`: tokens as CSS custom properties, layout, state-driven transforms, `@media (max-width: 767px)`, `@media (prefers-reduced-motion: reduce)`.
- `scripts/main.js`: an ES module (`<script type="module">`) that fetches `content.json`, fills the DOM, runs the state machine, handles audio, and checks images and audio for errors.
- Fonts: Google Fonts (Dancing Script, Cormorant Garamond) via `<link>`, falling back to `cursive` / `Georgia, serif`.
- No framework, no bundler, no npm. Serve with any static server, e.g. `python3 -m http.server` (needed because `fetch('content.json')` is blocked on `file://`).

## 6. Design tokens

```css
:root {
  /* colour */
  --bg-olive-dark:   #4F5A3A;
  --bg-olive-light:  #6B7650;
  --pattern-ink:     rgba(243, 238, 227, .07);  /* faint floral pattern */
  --letter-mint:     #C9D6CB;
  --paper-cream:     #F3EEE3;
  --paper-shadow:    rgba(40, 45, 28, .35);
  --seal-red:        #7A1F2B;
  --seal-red-dark:   #5A1520;
  --ink:             #3A3F2E;     /* letter text */
  --hint-ink:        #F3EEE3;     /* hints on olive */
  --btn-back-bg:     #7A1F2B;
  --btn-back-fg:     #FFFFFF;
  --btn-audio-bg:    rgba(0, 0, 0, .45);
  --placeholder:     #B9B9B4;     /* missing image */
  --flower-edge:     #9DB37A;     /* gift flower green edge */
  --lily-red:        #6E1424;
  --lily-pink:       #C98BB0;
  --vinyl:           #151515;

  /* type */
  --font-script: 'Dancing Script', cursive;
  --font-serif:  'Cormorant Garamond', Georgia, serif;
  --fs-title:    clamp(1.6rem, 3.2vw, 2.4rem);
  --fs-body:     clamp(.95rem, 1.6vw, 1.15rem);
  --fs-hint:     clamp(14px, 1.4vw, 16px);

  /* layout */
  --stage-max:   960px;
  --stage-ratio: 16 / 10;
  --radius-btn:  999px;
  --radius-card: 6px;
  --gap:         16px;
  --tap-min:     44px;

  /* motion */
  --ease-std:    cubic-bezier(.4, 0, .2, 1);
  --ease-spring: cubic-bezier(.34, 1.56, .64, 1);
  --t-fold:      .8s;
  --t-flap:      .6s;
  --t-fade:      .4s;
  --t-scene:     .6s;
  --t-petal:     .9s;
  --stagger:     .1s;
  --spin:        3.3s;
}
```

Breakpoints: desktop ≥ 768px (hint sits beside its target with a hand-drawn arrow); mobile < 768px (the stage scales down and the hint sits in a bar **below** the stage, without an arrow). Verify at 1440 / 768 / 375 px.

## 7. Content schema (`content.json`)

This extends the schema in the brief. Every brief field is kept, and the new fields are optional with the defaults described below, so the brief's JSON still works as is.

| Field | Type | Req. | Use |
|---|---|---|---|
| `recipientName` | string | ✓ | Main photo alt text; `<title>` fallback (the title is normally `letter.greeting` without its trailing comma) |
| `coverTitle` | string | — | Script heading above the envelope in the first view (added after build). Hidden if absent |
| `letter.greeting` | string | ✓ | Script title on the letter |
| `letter.subtitle` | string | ✓ | Line under the greeting |
| `letter.body` | string | ✓ | Message; `\n` becomes a line break (rendered with `textContent` and `white-space: pre-line`, never `innerHTML`) |
| `mainPhoto` | string (path) | ✓ | Letter, photos, and record scenes |
| `photos` | string[] (paths), 3 | ✓ | Polaroids. Fewer or more than 3 still render, up to 3 shown |
| `photosCaption` | string | — | Caption in the `photos` state. Hidden if absent |
| `music.src` | string (path) | ✓ | Song. If missing or failing to load, the music is skipped silently and the speaker shows disabled |
| `music.title` | string | ✓ | `aria-label` / tooltip of the record ("Play: {title}") |
| `music.caption` | string | — | Text under the record. Hidden if absent |
| `music.video` | string (path) | — | Full-screen background video (added after build). Fades in when the record is clicked, stays (darker) in the gift view, and fades out on Start over. Muted; follows the song's play/pause. Hidden if absent or failing |
| `music.autoplay` | boolean | — | `true`: start the song on load, or on the first click/tap/key if the browser blocks autoplay. Absent or `false`: music stays off until the record or speaker is clicked |
| `gift.text` | string | ✓ | Text in the flower's centre |
| `countdown.date` | string (ISO date-time, viewer's local time) | — | Gift view countdown target (added after build). Hidden if absent or invalid; stops at zero |
| `countdown.caption` | string | — | Caption above the countdown |
| `countdown.labels.days` / `hours` / `minutes` / `seconds` | string | — | Unit labels under the numbers |
| `hints.seal` / `letter` / `photos` / `mainPhoto` | string | ✓ | Hints for states 1–4 |
| `hints.gift` | string | — | Hint in `music` pointing at the lily. Hidden if absent |
| `labels.back` | string | — | Back button text |
| `labels.soundOn` / `labels.soundOff` | string | — | `aria-label` for the speaker button |

Proposed file:

```json
{
  "recipientName": "Anh",
  "letter": {
    "greeting": "Dear Anh,",
    "subtitle": "Happy birthday!",
    "body": "Another year of you, and I still can't believe my luck.\nThank you for every laugh, every late-night talk,\nand every ordinary day you made special.\nHere's to many more chapters together."
  },
  "mainPhoto": "assets/main.jpg",
  "photos": ["assets/p1.jpg", "assets/p2.jpg", "assets/p3.jpg"],
  "photosCaption": "Thank you for walking this road with me.",
  "music": {
    "src": "assets/song.mp3",
    "title": "Message song",
    "caption": "Tap the record to hear a song for you."
  },
  "gift": { "text": "A little gift for you. Love you!" },
  "hints": {
    "seal": "Click the wax seal",
    "letter": "Click the letter",
    "photos": "Click the photo",
    "mainPhoto": "Click the top-left corner of the photo",
    "gift": "Click the flower"
  },
  "labels": { "back": "Back", "soundOn": "Play music", "soundOff": "Pause music" }
}
```

## 8. Implementation tasks

### Setup
- [x] 1. Create the folder structure: `index.html`, `styles/card.css`, `scripts/main.js`, `content.json`, `assets/` (empty, plus a short `assets/README.md` listing the expected file names).
- [x] 2. Write `content.json` as in §7.

### Markup and static visuals
- [x] 3. `index.html` skeleton: lang, charset, viewport, fonts, stylesheet, module script, `<main class="stage" data-state="intro">`, a hint element with `aria-live="polite"`, the Back button, and the audio toggle.
- [x] 4. Background: olive gradient plus a faint floral pattern (inline SVG data URI, tiled, low opacity).
- [x] 5. Envelope: cream back, front pocket, and a top flap (separate element with `transform-origin: top` for the open/close `rotateX`).
- [x] 6. Letter: mint sheet with a scalloped top edge (CSS `mask` with radial gradients), greeting, subtitle, and body.
- [x] 7. Wax seal SVG (`#7A1F2B`, irregular rim, embossed rose/initial).
- [x] 8. Flowers: inline SVGs (dark-red calla lily at left, pink anthurium at right, white calla lilies for the record scene).
- [x] 9. Main photo and three polaroids (white frame, slight rotation), with image placeholder handling.
- [x] 10. Record scene: vinyl SVG (grooves, label with the music title), musical-note SVGs, main-photo polaroid with a paper clip, and caption.
- [x] 11. Gift scene: five-petal cream flower SVG with a green double edge, petals as separate elements for the open animation, and a centre text box.

### Behaviour
- [x] 12. `main.js`: load `content.json` and fill all text, image `src`/alt, and audio `src` with `textContent`/attributes only.
- [x] 13. Image fallback: on `error` (or an empty path), swap in a gray placeholder (CSS class with `--placeholder` and a small picture icon). No thrown errors.
- [x] 14. State machine: `order`, `go(next)`, `back()`, a busy lock released by a timeout sized to the longest transition (1 s; 0.5 s with reduced motion), and `data-state` on the card.
- [x] 15. Intro: show the full card for ~1 s, then fold into `sealed`. Back or any click during the intro skips it.
- [x] 16. Hint controller: set the text from `hints.*` per state and position it next to the target on desktop (arrow side per state). On mobile, render it in the bar below the stage.
- [x] 17. Back button in every state (disabled at `sealed`), with the reverse transitions.
- [x] 18. Audio: `<audio preload="none">`, off by default. The record toggles playback in `music` and the speaker toggles in any state. Swap the icon and `aria-pressed`. If `play()` rejects or the audio errors, catch it, mark audio unavailable, and log nothing to `console.error`.
- [x] 19. Record spin: CSS `animation: spin var(--spin) linear infinite`, `animation-play-state` tied to playback.

### Motion
- [x] 20. Transitions use only `transform` and `opacity`: fold 0.8s, flap 0.6s `--ease-std`, polaroid stagger 0.1s (`transition-delay: calc(var(--i) * var(--stagger))`), scene crossfades 0.6s, and gift petals 0.9s `--ease-spring` from `scale(.2) rotate(-30deg)`.
- [x] 21. `prefers-reduced-motion: reduce`: every transform transition is removed and only opacity fades remain. The record does not spin, and the intro shows the sealed envelope directly.

### Accessibility
- [x] 22. Every interactive object (seal, letter, polaroid group, main photo, record, lily) has `role="button"`, `tabindex="0"` only when active in the current state, an `aria-label`, and handles Enter and Space (Space with `preventDefault`).
- [x] 23. Visible `:focus-visible` rings. Focus moves to the new state's primary target after each transition. Inactive scenes get `aria-hidden="true"` and `inert`.

### Responsive
- [x] 24. Stage centred, `width: min(960px, 100vw - 32px)`, aspect ratio 16/10, all inner positions in %. Under 768px: aspect ratio 4/5, objects scaled down, and hints below the stage. Back and speaker stay fixed to the viewport corners (bottom-left and bottom-right).

### Verification
- [x] 25. Walk the full sequence seal → envelope → letter → photos → music → gift by mouse and by keyboard.
- [x] 26. Press Back from every state and confirm the previous state is restored correctly.
- [x] 27. Change values in `content.json` (name, body, hints, a photo path) and confirm the page updates with no code changes.
- [x] 28. Missing assets: with the default empty `assets/`, confirm gray placeholders, that music is skipped silently, and that there are no console errors.
- [x] 29. Check the layout at 1440px, 768px, and 375px (headless Chrome screenshots).
- [x] 30. Emulate reduced motion and confirm only fades remain.
- [x] 31. Tick every checkbox in this file.

## 9. Open questions and assumptions

**Open questions** (please confirm or override; otherwise the default in bold is used):

- **Q1. Linear vs. hub.** The reference is hub-and-spoke (Back always returns to the open-envelope hub, and the seal opens the gift). Your "Done when" asks for a linear sequence. **Default: linear**, with Back going to the previous step. A hub could be added later with a few lines in the state machine.
- **Q2. Back at the first state (`sealed`).** **Default: visible but disabled.** The alternative is replaying the intro.
- **Q3. Music when leaving the record scene.** **Default: it keeps playing** until it is toggled off by the speaker button. The alternative is pausing it on leaving `music`.
- **Q4. Moving from music to gift.** The brief gives no trigger. **Default: click the white calla lily** next to the record, with an added hint `hints.gift` = "Click the flower".
- **Q5. Real photos and song.** None are in the repo. **Default: ship with the paths from the brief, so gray placeholders show** until you drop files into `assets/`.

**Assumptions:**

- The project root is `/Users/hanguyen/Documents/flower-anni/` and stands in for `card/` in the brief's structure. `reference/frames/` stays where it is and is not used by the page.
- **Change (after build):** music now auto-starts (`music.autoplay: true`) at the user's request, replacing "off by default". Browsers forbid sound before the first user interaction, so when autoplay is blocked the song starts on the visitor's first click, tap, or key press. A first click on the speaker button or record is left to their own toggle, so it never turns the music straight back off.
- English copy throughout. The record caption uses "Tap" (single click/tap), not the original's "double-tap".
- The main-photo click target is the **whole photo**, with a visible photo-corner mount at the top-left that pulses as the affordance. This keeps the hint's wording without needing a tiny hit area (minimum 44px).
- Only one hint is visible at a time, the one for the current step. This keeps `aria-live` announcements clean and makes the mobile layout ("hints below objects") a single bar.
- The letter body is placeholder English copy. Replace it in `content.json`.
- The extra `content.json` fields (`photosCaption`, `music.caption`, `hints.gift`, `labels`) are optional, so the brief's original JSON is still valid.
- The typewriter text effect from the reference is replaced by a fade-in, which keeps motion to opacity/transform and reads better for screen readers.
- With an empty `assets/`, Chrome's console shows its own network lines (`Failed to load resource: 404`) for the missing photo files, and for `song.mp3` once the record is clicked. These are browser network logs, not script errors: the page throws nothing and logs no errors itself. They disappear once the files are added. Verified: with media present, the console is empty.
- Fonts come from Google Fonts at runtime. Offline, they fall back to system cursive/serif.
- The page must be served over HTTP (`python3 -m http.server`). Opening `index.html` via `file://` cannot load `content.json`.
