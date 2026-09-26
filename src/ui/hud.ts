/** HUD over the top corners: back to map and level title (left), coin counter and streak meter (right). */
import { pop, reducedMotion } from './fx';

const COUNT_MS = 400;
const HOT_STREAK = 5;

export interface Hud {
  readonly el: HTMLElement;
  /** Shows the wallet total; changes count up/down with a pop. */
  setCoins(coins: number, animate: boolean): void;
  setStreak(streak: number): void;
  destroy(): void;
}

export function createHud(levelId: number, coins: number, onBack: () => void): Hud {
  const el = document.createElement('header');
  el.className = 'hud';
  el.innerHTML =
    `<button type="button" class="hud-back" aria-label="Back to map">‹</button>` +
    `<span class="hud-level">Level ${levelId}</span>` +
    `<span class="hud-streak">×0</span>` +
    `<span class="hud-coins"><span class="coin" aria-hidden="true"></span><span class="hud-coin-value">${coins}</span></span>`;
  el.querySelector('.hud-back')!.addEventListener('click', onBack);
  const streakEl = el.querySelector<HTMLElement>('.hud-streak')!;
  const coinsEl = el.querySelector<HTMLElement>('.hud-coins')!;
  const valueEl = el.querySelector<HTMLElement>('.hud-coin-value')!;
  let shown = coins;
  let target = coins;
  let streak = 0;
  let frame = 0;

  return {
    el,
    setCoins(next, animate) {
      if (next === target) return;
      target = next;
      cancelAnimationFrame(frame);
      if (!animate || reducedMotion()) {
        shown = next;
        valueEl.textContent = String(next);
        return;
      }
      pop(coinsEl);
      const from = shown;
      const start = performance.now();
      const step = (now: number): void => {
        const t = Math.min(1, (now - start) / COUNT_MS);
        shown = Math.round(from + (next - from) * t);
        valueEl.textContent = String(shown);
        if (t < 1) frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
    },
    setStreak(next) {
      if (next === streak) return;
      if (next > streak) pop(streakEl);
      streak = next;
      streakEl.textContent = `×${next}`;
      streakEl.classList.toggle('hot', next >= HOT_STREAK);
    },
    destroy: () => cancelAnimationFrame(frame),
  };
}
