import './ui/styles.css';
import { LEVELS } from './levels/levels';
import { loadSave, writeSave, type SaveV1 } from './progress/save';
import { mountFinal } from './ui/finalScreen';
import { mountLevel } from './ui/levelScreen';
import { mountMap } from './ui/map';

const root = document.querySelector<HTMLElement>('#app')!;
let save = loadSave();
const getSave = (): SaveV1 => save;
const setSave = (next: SaveV1): void => {
  save = next;
  writeSave(next);
};

let unmount: () => void = () => {};

/** Replaces the current screen with the one `mount` builds. */
function show(mount: () => () => void): void {
  unmount();
  unmount = mount();
}

function showMap(): void {
  show(() => mountMap(root, { getSave, play: showLevel, final: showFinal }));
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
