import './ui/styles.css';
import { LEVELS } from './levels/levels';
import { loadSave, writeSave, type SaveV1 } from './progress/save';
import { catHeadSvg } from './ui/art/catArt';
import { mountFinal } from './ui/finalScreen';
import { mountLevel } from './ui/levelScreen';
import { mountMap } from './ui/map';
import { navigate, restore, type Screen, type Step } from './ui/route';

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
let backPending = false; // the app called history.back(); its popstate has not arrived yet

/** Replaces the current screen with the one `mount` builds. */
function show(mount: () => () => void): void {
  unmount();
  unmount = mount();
}

/** Carries out a route step: the history op first, then the screen (none for `back`: popstate shows it). */
function apply(step: Step): void {
  if (step.op === 'push') history.pushState(step.entry, '');
  else if (step.op === 'replace') history.replaceState(step.entry, '');
  else if (step.op === 'back') {
    backPending = true;
    history.back();
  }
  if (step.show) render(step.show);
}

/** An in-app move; leaving a level or the final screen for the map goes through history.back(). */
const go = (to: Screen): void => apply(navigate(to, history.state, backPending));

/** Shows the screen for the entry history is on (boot, reload, system Back). */
function route(state: unknown): void {
  const save = getSave();
  apply(restore(state, { levelCount: LEVELS.length, unlocked: save.unlocked, finalOpen: save.stars[LEVELS.length] !== undefined }));
}

function render(screen: Screen): void {
  if (screen.kind === 'map') showMap();
  else if (screen.kind === 'level') showLevel(screen.id);
  else showFinal();
}

function showMap(): void {
  show(() =>
    mountMap(root, { getSave, play: (id) => go({ kind: 'level', id }), final: () => go({ kind: 'final' }), reload: showMap }),
  );
}

function showLevel(id: number): void {
  show(() =>
    mountLevel(root, LEVELS[id - 1], {
      getSave,
      setSave,
      exit: (to) => go(to === 'map' ? { kind: 'map' } : to === 'next' ? { kind: 'level', id: id + 1 } : { kind: 'final' }),
    }),
  );
}

function showFinal(): void {
  show(() => mountFinal(root, { back: () => go({ kind: 'map' }) }));
}

addEventListener('popstate', (e) => {
  backPending = false;
  route(e.state);
});

void navigator.storage?.persist?.();
route(history.state);
