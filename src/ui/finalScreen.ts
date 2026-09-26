/**
 * Thank-you screen after the last level: the cheering cat beside the credit line, over the map's
 * night sky and rooftops, with a gentle confetti fall. Sized to fit a 360 px landscape screen.
 */
import { CREDIT } from '../config';
import { cheerCatSvg, nightSkySvg, rooftopsSvg } from './art/catArt';
import { confetti } from './fx';

const TOWN_W = 1200; // wider than any landscape phone; the strip is cropped at the right

export function mountFinal(root: HTMLElement, deps: { back(): void }): () => void {
  const screen = document.createElement('div');
  screen.className = 'final';
  screen.innerHTML =
    `<div class="map-sky" aria-hidden="true">${nightSkySvg()}</div>` +
    `<div class="map-town" aria-hidden="true">${rooftopsSvg(TOWN_W)}</div>` +
    `<div class="final-cat">${cheerCatSvg()}</div>` +
    `<div class="final-note">` +
    `<h1 class="final-title">You finished all 25 levels!</h1>` +
    `<p class="final-credit">${CREDIT}</p>` +
    `<button type="button" class="final-back">Back to map</button>` +
    `</div>` +
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
