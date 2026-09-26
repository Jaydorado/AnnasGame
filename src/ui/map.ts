/**
 * Level map: a winding paw-print path of yarn-ball nodes, level 1 at the bottom.
 * The current level pulses with the cat sitting on it; locked levels are dimmed and inert.
 */
import { APP_NAME } from '../config';
import { LEVELS } from '../levels/levels';
import type { SaveV1 } from '../progress/save';
import { catHeadSvg, pawSvg, yarnBallSvg } from './art/catArt';

export interface MapDeps {
  getSave(): SaveV1;
  play(levelId: number): void;
  final(): void; // opens the thank-you screen (♥ button, shown once level 25 is won)
}

const SPACING = 110; // px between consecutive nodes
const TOP_PAD = 130; // room above the last node for the cat and the ♥ button
const BOTTOM_PAD = 70; // room below level 1 for its stars
const PAWS_PER_GAP = 3;
const PAW_CLEAR_BELOW = 28; // px kept free above a node's center (its yarn ball)
const PAW_CLEAR_ABOVE = 42; // px kept free below a node's center (its yarn ball and stars)

/** Horizontal center of node `i` (0-based) as a percentage of the path width. */
const nodeX = (i: number): number => 50 + Math.sin(i * 0.9) * 30;
/** Vertical center of node `i` (0-based) in px from the top of the path. */
const nodeY = (i: number): number => TOP_PAD + (LEVELS.length - 1 - i) * SPACING;

export function mountMap(root: HTMLElement, deps: MapDeps): () => void {
  const save = deps.getSave();
  const current = Math.min(save.unlocked, LEVELS.length);

  const screen = document.createElement('div');
  screen.className = 'map';
  screen.innerHTML =
    `<header class="map-header">` +
    `<h1 class="map-title">${APP_NAME}</h1>` +
    `<span class="map-coins" aria-label="${save.coins} coins"><span class="coin" aria-hidden="true"></span>${save.coins}</span>` +
    `</header>` +
    `<div class="map-scroll"><div class="map-path"></div></div>`;
  const scroller = screen.querySelector<HTMLElement>('.map-scroll')!;
  const path = screen.querySelector<HTMLElement>('.map-path')!;
  path.style.height = `${TOP_PAD + (LEVELS.length - 1) * SPACING + BOTTOM_PAD}px`;

  const paws: { el: HTMLElement; gap: number; k: number }[] = [];
  for (let gap = 0; gap < LEVELS.length - 1; gap++) {
    for (let k = 0; k < PAWS_PER_GAP; k++) {
      const el = document.createElement('div');
      el.className = 'map-paw';
      el.innerHTML = pawSvg();
      path.append(el);
      paws.push({ el, gap, k });
    }
  }

  LEVELS.forEach((level, i) => {
    const id = level.id;
    const best = save.stars[id] ?? 0;
    const locked = id > save.unlocked;
    const node = document.createElement('button');
    node.type = 'button';
    node.className = 'map-node' + (id === current ? ' current' : '');
    node.disabled = locked;
    node.style.left = `${nodeX(i)}%`;
    node.style.top = `${nodeY(i)}px`;
    node.setAttribute('aria-label', `Level ${id}, ` + (locked ? 'locked' : `${best} of 3 stars`));
    const stars = [1, 2, 3].map((n) => `<span class="map-star${n <= best ? ' earned' : ''}">★</span>`).join('');
    node.innerHTML =
      `<span class="map-ball" aria-hidden="true">${yarnBallSvg()}</span>` +
      `<span class="map-num" aria-hidden="true">${id}</span>` +
      `<span class="map-stars" aria-hidden="true">${stars}</span>` +
      (id === current ? `<span class="map-cat" aria-hidden="true">${catHeadSvg()}</span>` : '');
    if (!locked) node.addEventListener('click', () => deps.play(id));
    path.append(node);
  });

  if (save.stars[LEVELS.length] !== undefined) {
    const heart = document.createElement('button');
    heart.type = 'button';
    heart.className = 'map-heart';
    heart.textContent = '♥';
    heart.setAttribute('aria-label', 'Open the thank-you note');
    heart.addEventListener('click', () => deps.final());
    path.append(heart);
  }

  /**
   * Spreads each gap's paw prints between the two yarn balls, pointing up the path. Positions
   * depend on the path's pixel width, so this reruns on resize.
   */
  function layoutPaws(): void {
    const w = path.clientWidth;
    for (const { el, gap, k } of paws) {
      const dx = ((nodeX(gap + 1) - nodeX(gap)) / 100) * w;
      const dy = nodeY(gap + 1) - nodeY(gap);
      const len = Math.hypot(dx, dy);
      const from = PAW_CLEAR_BELOW / len;
      const to = 1 - PAW_CLEAR_ABOVE / len;
      const t = from + ((to - from) * (k + 0.5)) / PAWS_PER_GAP;
      el.style.left = `${nodeX(gap) + (nodeX(gap + 1) - nodeX(gap)) * t}%`;
      el.style.top = `${nodeY(gap) + dy * t}px`;
      el.style.transform = `rotate(${(Math.atan2(dx, -dy) * 180) / Math.PI}deg)`;
    }
  }

  root.append(screen);
  layoutPaws();
  scroller.scrollTop = nodeY(current - 1) - scroller.clientHeight / 2;
  window.addEventListener('resize', layoutPaws);

  let mounted = true;
  return () => {
    if (!mounted) return;
    mounted = false;
    window.removeEventListener('resize', layoutPaws);
    screen.remove();
  };
}
