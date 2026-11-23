// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, win and lose.
//
// ?seed=N fixes the shuffle and the AI. ?shot=start|play|win|lose (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import {
  createRenderer,
  SCREEN_LOSE,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastLogLine = '';

  // Screen readers (and anyone watching the page's text) hear the screen changes and each play.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    lastLogLine = '';
    screen = SCREEN_PLAY;
    announce('Playing Ember Duel. You have 20 HP. The Warden has 20 HP.');
  }

  function endGame() {
    const won = world.state.winner === 'player';
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    if (won && world.state.player.hp > best) {
      best = world.state.player.hp;
      saveBest(best);
    }
    announce(
      won
        ? `Victory. You finish with ${world.state.player.hp} HP after ${world.state.round} rounds.`
        : `Defeat. The Warden stands with ${world.state.ai.hp} HP after ${world.state.round} rounds.`,
    );
  }

  function handleActions() {
    const actions = input.takeActions();
    const clicks = input.takeClicks();
    const playKeys = input.takePlayKeys();
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      if (actions & ACTION_CONFIRM || clicks.length > 0) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM) || clicks.length > 0) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_CONFIRM) world.endTurn();
    for (const index of playKeys) world.playCard('player', index);
    for (const click of clicks) {
      const hit = renderer.hit(world.state, click.x, click.y);
      if (hit === null) continue;
      if (hit.kind === 'card') world.playCard('player', hit.index);
      else world.endTurn();
    }
  }

  function step() {
    world.step(STEP);
    if (world.state.phase === 'over' && screen === SCREEN_PLAY) endGame();
    const log = world.state.log;
    const latest = log.length > 0 ? log[log.length - 1] : '';
    if (screen === SCREEN_PLAY && latest !== '' && latest !== lastLogLine) {
      lastLogLine = latest;
      announce(latest);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the Warden play unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Duel. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
