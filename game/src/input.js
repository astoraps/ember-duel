// Keyboard and pointer input. One-shot presses (confirm, pause, end turn, play a numbered
// card) are queued as flags or lists and taken once by the loop, so a press between two frames
// is never lost and never counted twice. Pointer clicks come back in logical 1280x720
// coordinates, matching the renderer's letterboxed field.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const PLAY_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];

export function createInput(target) {
  let actions = 0;
  let clicks = [];
  let playKeys = [];

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (PLAY_KEYS.includes(event.code)) {
      if (!event.repeat) playKeys.push(PLAY_KEYS.indexOf(event.code));
    } else return;
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    playKeys = [];
  });

  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * scale) / 2;
    const offsetY = (rect.height - FIELD.height * scale) / 2;
    clicks.push({
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    });
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Pointer clicks since the last call, in logical coordinates. */
    takeClicks() {
      const taken = clicks;
      clicks = [];
      return taken;
    },
    /** Hand-card indexes (0-4) queued by the 1-5 keys since the last call. */
    takePlayKeys() {
      const taken = playKeys;
      playKeys = [];
      return taken;
    },
  };
}
