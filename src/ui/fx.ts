/**
 * Visual effects on a fixed full-screen layer. Transform/opacity animations only (Web Animations API);
 * every effect is skipped under `prefers-reduced-motion: reduce`. Pieces remove themselves when done.
 */
import { fishSvg, heartSvg, pawSvg } from './art/catArt';

export const CARD_MOVE_MS = 250;
const WIGGLE_MS = 300;

export function reducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Short shake for a tap the game refused. */
export function wiggle(el: HTMLElement): void {
  if (reducedMotion()) return;
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

/** Brief scale pop, e.g. when a pile or counter changes. */
export function pop(el: HTMLElement): void {
  if (reducedMotion()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], {
    duration: CARD_MOVE_MS,
    easing: 'ease-out',
  });
}

/**
 * A card copy flies from `from` to `to` (viewport rects). With `back`, it starts face-down and
 * flips face-up on the way. Resolves when it lands (or at once under reduced motion); never rejects.
 */
export function flyCard(layer: HTMLElement, from: DOMRect, to: DOMRect, face: string, back?: string): Promise<void> {
  if (reducedMotion() || from.width === 0) return Promise.resolve();
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
  layer.append(el);
  const timing: KeyframeAnimationOptions = { duration: CARD_MOVE_MS, easing: 'ease-out', fill: 'forwards' };
  const move = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
  const anims = [el.animate([{ transform: 'translate(0, 0) scale(1)' }, { transform: move }], timing)];
  if (back) {
    const inner = el.firstElementChild as HTMLElement;
    anims.push(inner.animate([{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }], timing));
  }
  return Promise.all(anims.map((a) => a.finished)).then(
    () => el.remove(),
    () => el.remove(),
  );
}

/** Paw prints bursting outward from (x, y). */
export function sparkleBurst(layer: HTMLElement, x: number, y: number): void {
  if (reducedMotion()) return;
  const count = 7;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'sparkle';
    p.innerHTML = pawSvg();
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    layer.append(p);
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = 34 + Math.random() * 20;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const spin = Math.round(Math.random() * 120 - 60);
    const anim = p.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.3)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${spin}deg)`, opacity: 0 },
      ],
      { duration: 550, easing: 'ease-out' },
    );
    anim.finished.then(() => p.remove(), () => p.remove());
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
    anim.finished.then(() => p.remove(), () => p.remove());
  }
}
