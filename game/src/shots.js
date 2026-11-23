// The screenshot scenes behind ?shot=start|play|win|lose. Each one plays the real rules forward
// from a fresh world, steered by a simple autopilot (play the hardest affordable hit, guard when
// hurt, pass when told to lose), so the frame is what a real game looks like and the same seed
// always gives the same frame. Every simulation has a step budget, so it always terminates.
import { STEP } from './config.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const TITLE_SECONDS = 2;
const STEP_BUDGET = 30000;
const AI_STEP_BUDGET = 600;
const ROUND_CAP = 40;

/** Best card for the autopilot: hardest hit first, a Guard when hurt, a Siphon's heal counted. */
function chooseBest(state) {
  let best = -1;
  let bestScore = -1;
  state.player.hand.forEach((card, index) => {
    if (card.cost > state.player.mana) return;
    let score;
    if (card.type === 'Guard') score = state.player.hp < 10 ? card.power + 2 : card.power * 0.5;
    else if (card.type === 'Siphon') score = card.power + 1;
    else if (card.type === 'Surge') score = card.power + (state.player.surge[card.element] >= 1 ? 2 : 0);
    else score = card.power;
    if (score > bestScore) {
      bestScore = score;
      best = index;
    }
  });
  return best;
}

/** Play every card the autopilot wants this turn. */
function autopilotPlay(world) {
  let guard = 0;
  while (world.state.phase === 'play' && guard < 10) {
    guard += 1;
    const index = chooseBest(world.state);
    if (index < 0) return;
    world.playCard('player', index);
  }
}

/** Step the world until the AI's turn is done (or the game ends), within a step budget. */
function advanceAi(world, budget) {
  let used = 0;
  while (world.state.phase === 'ai' && used < budget) {
    world.step(STEP);
    used += 1;
  }
  return used;
}

/**
 * Set `world` to the named scene (start, play, win or lose; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    world.state.phase = 'title';
    for (let index = 0; index < TITLE_SECONDS / STEP; index += 1) world.step(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }

  if (name === 'play') {
    // Four real rounds, then one more card on the table mid-turn: hands are mid-game, a card is
    // freshly played, and the log has something to say.
    let budget = STEP_BUDGET;
    while (world.state.round < 5 && world.state.phase !== 'over' && budget > 0) {
      if (world.state.phase === 'play') {
        autopilotPlay(world);
        if (world.state.phase === 'over') break;
        world.endTurn();
      }
      budget -= advanceAi(world, AI_STEP_BUDGET);
    }
    if (world.state.phase === 'play') {
      const index = chooseBest(world.state);
      if (index >= 0) world.playCard('player', index);
      for (let step = 0; step < 20; step += 1) world.step(STEP);
    }
    return { screen: SCREEN_PLAY, best: 0 };
  }

  if (name === 'win') {
    let budget = STEP_BUDGET;
    while (world.state.phase !== 'over' && budget > 0 && world.state.round <= ROUND_CAP) {
      if (world.state.phase === 'play') {
        autopilotPlay(world);
        if (world.state.phase === 'over') break;
        world.endTurn();
      }
      budget -= advanceAi(world, AI_STEP_BUDGET);
    }
    const won = world.state.winner === 'player';
    return { screen: won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.player.hp };
  }

  // lose: the autopilot plays nothing, so the Warden wins on its own.
  let budget = STEP_BUDGET;
  while (world.state.phase !== 'over' && budget > 0 && world.state.round <= ROUND_CAP) {
    if (world.state.phase === 'play') world.endTurn();
    budget -= advanceAi(world, AI_STEP_BUDGET);
  }
  const lost = world.state.winner === 'ai';
  return { screen: lost ? SCREEN_LOSE : SCREEN_PLAY, best: 0 };
}
