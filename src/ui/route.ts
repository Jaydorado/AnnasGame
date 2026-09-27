/**
 * History decisions for the router, kept pure so they can be tested without a browser. The map
 * owns no entry of its own: it lives on whatever entry the app was opened on, so system Back there
 * leaves the app. A level or the final screen opened from the map pushes exactly one entry, and
 * level → next level / final replaces it, so the map is always one Back away. All URLs stay as they
 * are (state-only entries), which keeps the base path and the service worker's fallback untouched.
 */

export type Screen = { readonly kind: 'map' } | { readonly kind: 'level'; readonly id: number } | { readonly kind: 'final' };

/** `history.state` on an entry this app pushed; the `tripeaks` key marks it as ours. */
export type Entry = { readonly tripeaks: 'level'; readonly level: number } | { readonly tripeaks: 'final' };

/** What the router should do: `show` a screen now (null: wait for the popstate `back` causes). */
export interface Step {
  readonly show: Screen | null;
  readonly op: 'push' | 'replace' | 'back' | 'none';
  readonly entry: Entry | null; // the state to push or replace with
}

/** The save facts that decide whether a restored entry can still be shown. */
export interface Progress {
  readonly levelCount: number;
  readonly unlocked: number;
  readonly finalOpen: boolean; // the last level is won
}

const MAP: Screen = { kind: 'map' };

export function entryFor(screen: Screen): Entry | null {
  if (screen.kind === 'level') return { tripeaks: 'level', level: screen.id };
  return screen.kind === 'final' ? { tripeaks: 'final' } : null;
}

const isOurs = (state: unknown): state is { readonly tripeaks: unknown; readonly level?: unknown } =>
  typeof state === 'object' && state !== null && 'tripeaks' in state;

/**
 * An in-app move to `to` while `current` is `history.state`. Leaving a pushed entry for the map goes
 * back in history, and the popstate that follows does the one transition; `pending` (a Back still on
 * its way) swallows further moves, so a double tap never steps back twice and out of the app.
 */
export function navigate(to: Screen, current: unknown, pending: boolean): Step {
  if (pending) return { show: null, op: 'none', entry: null };
  if (to.kind === 'map') return isOurs(current) ? { show: null, op: 'back', entry: null } : { show: MAP, op: 'none', entry: null };
  return { show: to, op: isOurs(current) ? 'replace' : 'push', entry: entryFor(to) };
}

/**
 * The screen for the entry history landed on (popstate, or boot after a reload). A pushed entry that
 * can no longer be shown (locked, out of range, unknown) shows the map and steps back onto the map
 * entry behind it, so no dead entry is left for Back to stop on.
 */
export function restore(state: unknown, progress: Progress): Step {
  if (!isOurs(state)) return { show: MAP, op: 'none', entry: null };
  const id = state.level;
  const playable = typeof id === 'number' && Number.isInteger(id) && id >= 1 && id <= Math.min(progress.unlocked, progress.levelCount);
  if (state.tripeaks === 'level' && playable) return { show: { kind: 'level', id }, op: 'none', entry: null };
  if (state.tripeaks === 'final' && progress.finalOpen) return { show: { kind: 'final' }, op: 'none', entry: null };
  return { show: MAP, op: 'back', entry: null };
}
