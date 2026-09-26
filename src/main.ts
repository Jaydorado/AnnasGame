import './ui/styles.css';
import { LEVELS } from './levels/levels';
import { loadSave, writeSave } from './progress/save';
import { mountLevel } from './ui/levelScreen';

// Temporary entry: open `?level=N` (default 1). Replaced by the router in Task 9.
const requested = Number(new URLSearchParams(location.search).get('level'));
const id = Number.isInteger(requested) && requested >= 1 && requested <= LEVELS.length ? requested : 1;
let save = loadSave();

mountLevel(document.querySelector<HTMLElement>('#app')!, LEVELS[id - 1], {
  getSave: () => save,
  setSave: (next) => {
    save = next;
    writeSave(next);
  },
  exit: (to) => {
    const nextId = to === 'next' ? id + 1 : to === 'final' ? 1 : id;
    location.search = `?level=${nextId}`;
  },
});
