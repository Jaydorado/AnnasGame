/**
 * Level map: a yarn-thread trail of yarn-ball nodes over night-time rooftops, scrolling left to
 * right from level 1. The current level pulses with the cat sitting on it; locked levels are dimmed
 * and inert. The coin pill (top-left) and the title (top-right) float over the backdrop.
 */
import { APP_NAME } from '../config';
import { LEVELS } from '../levels/levels';
import type { SaveV1 } from '../progress/save';
import { catHeadSvg, HEART_PATH, nightSkySvg, rooftopsSvg, yarnBallSvg } from './art/catArt';

export interface MapDeps {
  getSave(): SaveV1; // reads the stored save fresh
  play(levelId: number): void;
  final(): void; // opens the thank-you screen (♥ button, shown once level 25 is won)
  reload(): void; // remounts the map from the stored save
}

const SPACING = 104; // px between consecutive nodes
const START_X = 84; // px from the track's left edge to level 1's centre
const HEART_GAP = 100; // px from the last node's centre to the ♥ button's centre
const END_PAD = 84; // px after the ♥ button's centre
const TRACK_W = START_X + (LEVELS.length - 1) * SPACING + HEART_GAP + END_PAD;
const WHEEL_LINE_PX = 40; // one wheel "line" (deltaMode 1) in px

/** Horizontal centre of node `i` (0-based), in px from the track's left edge. */
const nodeX = (i: number): number => START_X + i * SPACING;
/**
 * Vertical centre of node `i` as a percentage of the track height: a wave between 40% and 74%, so
 * the cat above the highest node clears the HUD and the stars under the lowest stay on screen.
 */
const nodeY = (i: number): number => 57 + 17 * Math.cos(i * 0.9);
const HEART_X = nodeX(LEVELS.length - 1) + HEART_GAP;
const HEART_Y = 50;

/**
 * Smooth trail through nodes `from`..`to` (inclusive) in track units (x px, y %). Each segment is a
 * cubic with horizontal handles, so the thread eases through every node.
 */
function trailPath(from: number, to: number): string {
  let d = `M${nodeX(from)} ${nodeY(from).toFixed(2)}`;
  for (let i = from + 1; i <= to; i++) {
    const mid = (nodeX(i - 1) + nodeX(i)) / 2;
    d += ` C${mid} ${nodeY(i - 1).toFixed(2)} ${mid} ${nodeY(i).toFixed(2)} ${nodeX(i)} ${nodeY(i).toFixed(2)}`;
  }
  return d;
}

export function mountMap(root: HTMLElement, deps: MapDeps): () => void {
  const save = deps.getSave();
  const shown = JSON.stringify(save);
  const current = Math.min(save.unlocked, LEVELS.length);
  const last = LEVELS.length - 1;

  // The trail's y is in % of the track height (viewBox height 100, stretched without aspect), and
  // its strokes stay round and even through vector-effect.
  const stroke = 'vector-effect="non-scaling-stroke" fill="none" stroke-linecap="round"';
  const done = trailPath(0, current - 1);
  const ahead = trailPath(current - 1, last);
  const trail =
    `<svg class="map-trail" viewBox="0 0 ${TRACK_W} 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<path d="${trailPath(0, last)}" ${stroke} stroke="rgba(8, 10, 40, 0.45)" stroke-width="10"/>` +
    `<path d="${ahead}" ${stroke} stroke="#8f86c9" stroke-width="4" stroke-dasharray="2 9" opacity="0.8"/>` +
    (current > 1
      ? `<path d="${done}" ${stroke} stroke="#e0709a" stroke-width="6"/>` +
        `<path d="${done}" ${stroke} stroke="#ffc9de" stroke-width="2" stroke-dasharray="3 8"/>`
      : '') +
    `</svg>`;

  const screen = document.createElement('div');
  screen.className = 'map';
  screen.innerHTML =
    `<div class="map-sky" aria-hidden="true">${nightSkySvg()}</div>` +
    `<div class="map-scroll"><div class="map-path">` +
    `<div class="map-town" aria-hidden="true">${rooftopsSvg(TRACK_W + 200)}</div>` +
    `<div class="map-track">${trail}</div>` +
    `</div></div>` +
    `<header class="map-hud">` +
    `<span class="hud-coins map-coins"><span class="coin" aria-hidden="true"></span><span class="hud-coin-value">${save.coins}</span></span>` +
    `<h1 class="map-title">${APP_NAME}</h1>` +
    `</header>`;
  const scroller = screen.querySelector<HTMLElement>('.map-scroll')!;
  const track = screen.querySelector<HTMLElement>('.map-track')!;
  screen.style.setProperty('--track-w', `${TRACK_W}px`);

  LEVELS.forEach((level, i) => {
    const id = level.id;
    const best = save.stars[id];
    const locked = id > save.unlocked;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'map-node' + (id === current ? ' current' : '');
    node.disabled = locked;
    node.style.left = `${nodeX(i)}px`;
    node.style.top = `${nodeY(i)}%`;
    node.setAttribute('aria-label', `Level ${id}, ` + (locked ? 'locked' : `${best ?? 0} of 3 stars`));
    const stars =
      best === undefined
        ? ''
        : `<span class="map-stars" aria-hidden="true">` +
          [1, 2, 3].map((n) => `<span class="map-star${n <= best ? ' earned' : ''}">★</span>`).join('') +
          `</span>`;
    node.innerHTML =
      `<span class="map-ball" aria-hidden="true">${yarnBallSvg()}</span>` +
      `<span class="map-num" aria-hidden="true">${id}</span>` +
      stars +
      (id === current ? `<span class="map-cat" aria-hidden="true">${catHeadSvg()}</span>` : '');
    if (!locked) node.addEventListener('click', () => deps.play(id));
    track.append(node);
  });

  const won = save.stars[LEVELS.length] !== undefined;
  if (won) {
    const heart = document.createElement('button');
    heart.type = 'button';
    heart.className = 'map-heart';
    heart.style.left = `${HEART_X}px`;
    heart.style.top = `${HEART_Y}%`;
    heart.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
    heart.setAttribute('aria-label', 'Open the thank-you note');
    heart.addEventListener('click', () => deps.final());
    track.append(heart);
  }

  // A mouse wheel scrolls the trail sideways; touch swipes and trackpads use native overflow-x.
  const onWheel = (e: WheelEvent): void => {
    if (e.ctrlKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? WHEEL_LINE_PX : e.deltaMode === 2 ? window.innerWidth : 1;
    scroller.scrollBy({ left: e.deltaY * unit });
  };
  scroller.addEventListener('wheel', onWheel, { passive: false });

  root.append(screen);
  // Centre the current level (or the ♥ once the last level is won) in one read on mount; this
  // also runs after a visibilitychange remount, which builds a fresh map.
  const focusX = won ? HEART_X : nodeX(current - 1);
  scroller.scrollLeft = track.offsetLeft + focusX - scroller.clientWidth / 2;

  // Another tab may have saved progress while this one was in the background.
  const onVisibility = (): void => {
    if (document.visibilityState === 'visible' && JSON.stringify(deps.getSave()) !== shown) deps.reload();
  };
  document.addEventListener('visibilitychange', onVisibility);

  let mounted = true;
  return () => {
    if (!mounted) return;
    mounted = false;
    scroller.removeEventListener('wheel', onWheel);
    document.removeEventListener('visibilitychange', onVisibility);
    screen.remove();
  };
}
