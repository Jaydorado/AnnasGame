import './ui/styles.css';
import { LEVELS } from './levels/levels';
import { loadSave, writeSave, type SaveV1 } from './progress/save';
import { catHeadSvg } from './ui/art/catArt';
import { mountFinal } from './ui/finalScreen';
import { mountLevel } from './ui/levelScreen';
import { mountMap } from './ui/map';

const root = document.querySelector<HTMLElement>('#app')!;

// Landscape only: in portrait a CSS media query shows this card over every screen, and the app
// underneath is inert so neither taps nor keys reach it.
const rotate = document.createElement('div');
rotate.className = 'rotate';
rotate.innerHTML = `<div class="rotate-cat">${catHeadSvg()}</div><p class="rotate-text">Turn your phone 🔄</p>`;
document.body.append(rotate);
const portrait = matchMedia('(orientation: portrait)');
const syncOrientation = (): void => {
  root.inert = portrait.matches;
};
portrait.addEventListener('change', syncOrientation);
syncOrientation();

// No in-memory save: every read goes to storage, so another tab's newer progress is never overwritten.
const getSave = (): SaveV1 => loadSave();
const setSave = (next: SaveV1): void => writeSave(next);

let unmount: () => void = () => {};

/** Replaces the current screen with the one `mount` builds. */
function show(mount: () => () => void): void {
  unmount();
  unmount = mount();
}

function showMap(): void {
  show(() => mountMap(root, { getSave, play: showLevel, final: showFinal, reload: showMap }));
}

function showLevel(id: number): void {
  show(() =>
    mountLevel(root, LEVELS[id - 1], {
      getSave,
      setSave,
      exit: (to) => (to === 'map' ? showMap() : to === 'next' ? showLevel(id + 1) : showFinal()),
    }),
  );
}

function showFinal(): void {
  show(() => mountFinal(root, { back: showMap }));
}

void navigator.storage?.persist?.();
showMap();
