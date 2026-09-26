/** Thank-you screen after the last level: the cat, the credit line and a gentle confetti fall. */
import { CREDIT } from '../config';
import { catHeadSvg } from './art/catArt';
import { confetti } from './fx';

export function mountFinal(root: HTMLElement, deps: { back(): void }): () => void {
  const screen = document.createElement('div');
  screen.className = 'final';
  screen.innerHTML =
    `<div class="final-cat">${catHeadSvg()}</div>` +
    `<h1 class="final-title">You finished all 25 levels!</h1>` +
    `<p class="final-credit">${CREDIT}</p>` +
    `<button type="button" class="final-back">Back to map</button>` +
    `<div class="fx"></div>`;
  screen.querySelector('.final-back')!.addEventListener('click', () => deps.back());
  root.append(screen);
  confetti(screen.querySelector<HTMLElement>('.fx')!); // skipped under prefers-reduced-motion

  let mounted = true;
  return () => {
    if (!mounted) return;
    mounted = false;
    for (const a of screen.getAnimations({ subtree: true })) a.cancel();
    screen.remove();
  };
}
