/**
 * Visual effects. Transform/opacity animations only (Web Animations API); each effect measures its
 * rects once before it starts and never reads layout per frame. Under `prefers-reduced-motion: reduce`
 * movement becomes an opacity fade (or nothing, for confetti and bursts). Pieces remove themselves.
 */
import { ECON } from '../core/economy';
import type { GameState } from '../core/game';
import { fishSvg, heartSvg, pawShapes, pawSvg } from './art/catArt';

const POP_MS = 250;
const WIGGLE_MS = 300;
const FLIP_MS = 380;
const FADE_MS = 220;

/** A tapped table card first pops in place to this scale... */
export const POP_SCALE = 1.15;
/** ...over this long, ms; then it flies. */
export const POP_IN_MS = 80;
/** A table card's whole flight to the discard (pop, arc, landing), ms. */
export const PLAY_FLY_MS = 450;
/** A drawn card's flight from the stock to the discard (no pop), ms. */
export const DRAW_FLY_MS = 350;
/** The landing squash and rebound at the end of every flight, ms. */
export const SQUASH_MS = 80;
/** On landing the card widens and flattens by this fraction, then rebounds a third as far. */
export const SQUASH = 0.14;
/** The arc's rise over the straight line at mid-flight: at least ARC_LIFT_MIN, more for longer flights... */
export const ARC_LIFT_MIN = 60;
/** ...up to ARC_LIFT_MAX, CSS px. */
export const ARC_LIFT_MAX = 160;
/** One full flat spin (rotateZ) per flight, turning the way the card flies, deg. */
export const SPIN_DEG = 360;
/** The card swells by this fraction at the top of the arc, as if nearer the eye. */
const FLIGHT_PUFF = 0.06;
/** Keyframes along the arc (straight segments in between). */
const ARC_STEPS = 8;

export function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function removeWhenDone(el: HTMLElement, anim: Animation): void {
  anim.finished.then(
    () => el.remove(),
    () => el.remove(),
  );
}

/** Coins a play earned, split for the popups: the per-card coin and the streak bonus (win bonus left to the dialog). */
export function playCoins(prev: GameState, next: GameState): { card: number; streak: number } {
  const earned = next.coins - prev.coins;
  const winPart = next.status === 'won' ? ECON.winBonus + ECON.perStockLeft * next.stock.length : 0;
  const card = Math.min(ECON.perCard, earned);
  return { card, streak: earned - card - winPart };
}

/** One keyframe of a flight: offset in 0..1, translate (px), rotation (deg) and scale. */
export interface ArcPoint {
  readonly offset: number;
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly sx: number;
  readonly sy: number;
}

/**
 * Keyframes of a flight lasting `ms`: the card's centre moves by (dx, dy) and it ends at scale k (h is
 * its unscaled height). It pops in place to POP_SCALE for `popMs` (0: no pop), flies a high arc with one
 * full flat spin, lands on the discard, squashes and rebounds with its bottom edge kept on the discard,
 * and settles upright. Transforms are about the card's centre.
 */
export function arcPath(dx: number, dy: number, k: number, h: number, ms: number, popMs: number): ArcPoint[] {
  const lift = Math.min(ARC_LIFT_MAX, ARC_LIFT_MIN + Math.abs(dx) * 0.3 + Math.max(dy, 0) * 0.4);
  const spin = dx < 0 ? -SPIN_DEG : SPIN_DEG;
  const start = popMs / ms;
  const land = (ms - SQUASH_MS) / ms;
  const s0 = popMs > 0 ? POP_SCALE : 1;
  const path: ArcPoint[] = [{ offset: 0, x: 0, y: 0, rot: 0, sx: 1, sy: 1 }];
  if (popMs > 0) path.push({ offset: start, x: 0, y: 0, rot: 0, sx: s0, sy: s0 });
  for (let i = 1; i < ARC_STEPS; i++) {
    const u = i / ARC_STEPS;
    const s = (s0 + (k - s0) * u) * (1 + FLIGHT_PUFF * 4 * u * (1 - u));
    path.push({ offset: start + (land - start) * u, x: dx * u, y: dy * u - 4 * lift * u * (1 - u), rot: spin * u, sx: s, sy: s });
  }
  // On the discard: moving the centre by (k - sy) * h / 2 keeps the bottom edge put while sy changes.
  for (const [offset, sx, sy] of [
    [land, k, k],
    [land + (1 - land) * 0.45, k * (1 + SQUASH), k * (1 - SQUASH)],
    [land + (1 - land) * 0.75, k * (1 - SQUASH / 3), k * (1 + SQUASH / 3)],
    [1, k, k],
  ]) {
    path.push({ offset, x: dx, y: dy + ((k - sy) * h) / 2, rot: spin, sx, sy });
  }
  return path;
}

/** Short shake for a tap the game refused (a brief fade under reduced motion). No penalty. */
export function wiggle(el: HTMLElement): void {
  if (reducedMotion()) {
    el.animate([{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: WIGGLE_MS, easing: 'ease-in-out' });
    return;
  }
  el.animate(
    [
      { transform: 'translateX(0) rotate(0)' },
      { transform: 'translateX(-5px) rotate(-3deg)' },
      { transform: 'translateX(5px) rotate(3deg)' },
      { transform: 'translateX(-3px) rotate(-2deg)' },
      { transform: 'translateX(0) rotate(0)' },
    ],
    { duration: WIGGLE_MS, easing: 'ease-in-out' },
  );
}

/** Brief scale pop, e.g. when a pile or counter changes; `scale` is the peak. */
export function pop(el: HTMLElement, scale = 1.18): void {
  if (reducedMotion()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: `scale(${scale})` }, { transform: 'scale(1)' }], {
    duration: POP_MS,
    easing: 'ease-out',
  });
}

/** Springy bounce for the coin pill when the wallet changes. */
export function bounce(el: HTMLElement): void {
  if (reducedMotion()) return;
  el.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.26)', offset: 0.3 },
      { transform: 'scale(0.92)', offset: 0.6 },
      { transform: 'scale(1.06)', offset: 0.8 },
      { transform: 'scale(1)' },
    ],
    { duration: 450, easing: 'ease-out' },
  );
}

/** Fades an element in (the discard's new top under reduced motion). */
export function fadeIn(el: HTMLElement): void {
  el.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: FADE_MS, easing: 'ease-out' });
}

/**
 * A card copy flies in an arc from `from` to `to` (viewport rects, measured by the caller), spinning once,
 * and lands with a squash. A table card (no `back`) pops first and takes PLAY_FLY_MS; a drawn card (with
 * `back`) starts face-down, flips face-up (rotateY) on the way and takes DRAW_FLY_MS. Resolves when it
 * lands; never rejects. Under reduced motion a face-up card fades out where it was and this resolves at once.
 */
export function flyCard(layer: HTMLElement, from: DOMRect, to: DOMRect, face: string, back?: string): Promise<void> {
  if (from.width === 0) return Promise.resolve();
  const el = document.createElement('div');
  el.className = 'flyer' + (back ? '' : ' up');
  el.style.left = `${from.left}px`;
  el.style.top = `${from.top}px`;
  el.style.width = `${from.width}px`;
  el.style.height = `${from.height}px`;
  el.innerHTML =
    `<div class="card-inner"><div class="card-face front">${face}</div>` +
    (back ? `<div class="card-face back">${back}</div>` : '') +
    `</div>`;
  if (reducedMotion()) {
    if (back) return Promise.resolve();
    layer.append(el);
    removeWhenDone(el, el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' }));
    return Promise.resolve();
  }
  layer.append(el);
  // Centre to centre: the flyer spins and scales about its centre (arcPath keeps the squash on the discard).
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const ms = back ? DRAW_FLY_MS : PLAY_FLY_MS;
  const path = arcPath(dx, dy, to.width / from.width, from.height, ms, back ? 0 : POP_IN_MS);
  const timing: KeyframeAnimationOptions = { duration: ms, easing: 'linear', fill: 'forwards' };
  const anims = [
    el.animate(
      path.map((p) => ({
        offset: p.offset,
        transform: `translate(${p.x}px, ${p.y}px) rotateZ(${p.rot}deg) scale(${p.sx}, ${p.sy})`,
      })),
      timing,
    ),
  ];
  if (back) {
    const inner = el.firstElementChild as HTMLElement;
    const landed = (ms - SQUASH_MS) / ms;
    anims.push(
      inner.animate(
        [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)', offset: landed }, { transform: 'rotateY(0deg)' }],
        timing,
      ),
    );
  }
  return Promise.all(anims.map((a) => a.finished)).then(
    () => el.remove(),
    () => el.remove(),
  );
}

/**
 * 3D flip of a board card whose exposure just changed (its `.up` class is already set). Uncovered
 * cards flip up a beat after the covering card leaves. Reduced motion: the card fades in instead.
 */
export function flipCard(card: HTMLElement, up: boolean): void {
  if (reducedMotion()) {
    fadeIn(card);
    return;
  }
  const inner = card.firstElementChild as HTMLElement;
  const from = up ? 180 : 0;
  const to = up ? 0 : 180;
  inner.animate(
    [
      { transform: `rotateY(${from}deg) scale(1)` },
      { transform: `rotateY(90deg) scale(1.12)`, offset: 0.5 },
      { transform: `rotateY(${to}deg) scale(1)` },
    ],
    { duration: FLIP_MS, delay: up ? 90 : 0, easing: 'ease-in-out', fill: 'backwards' },
  );
}

/** A floating label at (x, y): rises and fades (only fades under reduced motion). */
function floatLabel(layer: HTMLElement, cls: string, html: string, x: number, y: number, ms: number, peak: number): void {
  const el = document.createElement('div');
  el.className = cls;
  el.innerHTML = html;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  layer.append(el);
  const anim = reducedMotion()
    ? el.animate([{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], {
        duration: ms,
        fill: 'forwards',
      })
    : el.animate(
        [
          { transform: 'translate(-50%, -50%) translateY(0px) scale(0.4)', opacity: 0 },
          { transform: `translate(-50%, -50%) translateY(-14px) scale(${peak})`, opacity: 1, offset: 0.18 },
          { transform: 'translate(-50%, -50%) translateY(-34px) scale(1)', opacity: 1, offset: 0.65 },
          { transform: 'translate(-50%, -50%) translateY(-56px) scale(1)', opacity: 0 },
        ],
        { duration: ms, easing: 'ease-out', fill: 'forwards' },
      );
  removeWhenDone(el, anim);
}

/** "+N" with a coin, floating up from a cleared card's centre. */
export function coinPop(layer: HTMLElement, x: number, y: number, amount: number): void {
  floatLabel(layer, 'coin-pop', `<span class="coin" aria-hidden="true"></span>+${amount}`, x, y, 850, 1.2);
}

/** The bigger "+N streak!" popup, kept clear of the screen edges. */
export function streakPop(layer: HTMLElement, x: number, y: number, amount: number): void {
  const cx = Math.min(Math.max(x, 110), window.innerWidth - 110);
  floatLabel(layer, 'streak-pop', `+${amount} streak!`, cx, Math.max(y - 34, 40), 1300, 1.35);
}

/** Paw prints bursting outward from (x, y); `big` for the win celebration, in bold rose and gold. */
export function sparkleBurst(layer: HTMLElement, x: number, y: number, big = false): void {
  if (reducedMotion()) return;
  const count = big ? 16 : 7;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = big ? 'sparkle big' : 'sparkle';
    p.innerHTML = big
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true">${pawShapes(i % 2 ? '#ffb21f' : '#ff4f8b')}</svg>`
      : pawSvg();
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    layer.append(p);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = big ? 90 + Math.random() * 80 : 34 + Math.random() * 20;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const spin = Math.round(Math.random() * 120 - 60);
    const at = (f: number): string => `translate(calc(-50% + ${dx * f}px), calc(-50% + ${dy * f}px))`;
    const anim = p.animate(
      [
        { transform: `${at(0)} scale(0.3) rotate(0deg)`, opacity: 1 },
        { transform: `${at(0.8)} scale(1.1) rotate(${spin * 0.8}deg)`, opacity: 1, offset: 0.55 },
        { transform: `${at(1)} scale(1) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: big ? 1000 : 550, easing: 'ease-out' },
    );
    removeWhenDone(p, anim);
  }
}

/** Hearts, fish and paw prints falling across the layer. */
export function confetti(layer: HTMLElement): void {
  if (reducedMotion()) return;
  const art = [heartSvg, fishSvg, pawSvg];
  const w = layer.clientWidth;
  const h = layer.clientHeight;
  for (let i = 0; i < 36; i++) {
    const p = document.createElement('div');
    p.className = 'confetti';
    p.innerHTML = art[i % art.length]();
    p.style.left = `${Math.random() * w}px`;
    layer.append(p);
    const drift = Math.random() * 80 - 40;
    const spin = Math.round(Math.random() * 720 - 360);
    const anim = p.animate(
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${drift}px, ${h + 60}px) rotate(${spin}deg)`, opacity: 0.8 },
      ],
      { duration: 1800 + Math.random() * 1200, delay: Math.random() * 700, easing: 'cubic-bezier(0.3, 0.2, 0.6, 1)' },
    );
    removeWhenDone(p, anim);
  }
}
