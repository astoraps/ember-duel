// The game's rules and state, with no drawing and no browser in it: the two sides, their decks
// and hands, mana, turns, the AI, and the table. step() advances one fixed step (animations,
// the AI's paced plays, floating numbers) and returns what happened as bit flags, so the caller
// can react without the world knowing about screens or sound. All randomness flows through the
// seeded RNG, so a fixed seed replays the same game.
import { HAND_SIZE, MAX_HP, MAX_MANA, STARTING_MANA, TYPE_GUARD } from './config.js';
import { buildDeck, canAfford, cardDamage, cardHeal, cardShield, describePlay } from './cards.js';

export const EVENT_OVER = 4;

const AI_PLAYS_PER_TURN = 2;
const AI_FIRST_DELAY = 0.6;
const AI_BETWEEN_DELAY = 0.55;
const AI_END_DELAY = 0.35;
const LOG_LINES = 4;
const TABLE_SHOWN = 3;
const EMBER_COUNT = 36;

function newSide() {
  return {
    hp: MAX_HP,
    maxHp: MAX_HP,
    shield: 0,
    mana: 0,
    deck: [],
    hand: [],
    discard: [],
    surge: { flame: 0, frost: 0, leaf: 0, bolt: 0 },
  };
}

function newEmber(random) {
  return {
    x: random() * 1280,
    y: random() * 720,
    vy: 12 + random() * 26,
    size: 1.5 + random() * 3,
    drift: random() * Math.PI * 2,
  };
}

export function createWorld(random) {
  const state = {
    phase: 'title',
    round: 1,
    winner: null,
    player: newSide(),
    ai: newSide(),
    log: [],
    table: [],
    floaters: [],
    embers: [],
    shake: 0,
    elapsed: 0,
  };

  function pushLog(line) {
    state.log.push(line);
    while (state.log.length > LOG_LINES) state.log.shift();
  }

  function drawTo(side) {
    while (side.hand.length < HAND_SIZE) {
      if (side.deck.length === 0) {
        if (side.discard.length === 0) return;
        // The discard pile is shuffled back in as the new deck.
        side.deck = side.discard.splice(0, side.discard.length);
        for (let index = side.deck.length - 1; index > 0; index -= 1) {
          const other = Math.floor(random() * (index + 1));
          const held = side.deck[index];
          side.deck[index] = side.deck[other];
          side.deck[other] = held;
        }
      }
      side.hand.push(side.deck.pop());
    }
  }

  function clearTable() {
    for (const shown of state.table) {
      (shown.owner === 'player' ? state.player : state.ai).discard.push(shown.card);
    }
    state.table = [];
  }

  function reset() {
    state.phase = 'play';
    state.round = 1;
    state.winner = null;
    state.player = newSide();
    state.ai = newSide();
    state.log = [];
    state.table = [];
    state.floaters = [];
    state.shake = 0;
    state.elapsed = 0;
    state.player.deck = buildDeck(random);
    state.ai.deck = buildDeck(random);
    drawTo(state.player);
    drawTo(state.ai);
    state.player.mana = STARTING_MANA;
    state.ai.mana = STARTING_MANA;
    state.embers = [];
    for (let index = 0; index < EMBER_COUNT; index += 1) state.embers.push(newEmber(random));
    pushLog('Round 1 — your turn. Play a card or end your turn.');
  }

  function startPlayerTurn() {
    state.round += 1;
    state.player.mana = Math.min(state.round, MAX_MANA);
    state.player.surge = { flame: 0, frost: 0, leaf: 0, bolt: 0 };
    drawTo(state.player);
    clearTable();
    state.phase = 'play';
    pushLog(`Round ${state.round} — your turn. ${state.player.mana} mana.`);
  }

  function dealDamage(target, amount, anchor) {
    let remaining = amount;
    if (target.shield > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
      if (absorbed > 0) pushLog(`Shield absorbs ${absorbed}.`);
    }
    if (remaining > 0) {
      target.hp = Math.max(0, target.hp - remaining);
      state.floaters.push({ anchor, text: `-${remaining}`, color: '#ff6b5e', t: 0 });
      if (amount >= 4) state.shake = 7;
    }
  }

  function heal(target, amount, anchor) {
    if (amount <= 0) return;
    const healed = Math.min(target.maxHp - target.hp, amount);
    target.hp += healed;
    if (healed > 0) state.floaters.push({ anchor, text: `+${healed}`, color: '#7ddc8a', t: 0 });
  }

  function playCard(sideName, handIndex) {
    const side = sideName === 'player' ? state.player : state.ai;
    const foe = sideName === 'player' ? state.ai : state.player;
    const card = side.hand[handIndex];
    if (!card || !canAfford(card, side.mana)) return false;
    if (sideName === 'player' && state.phase !== 'play') return false;
    if (sideName === 'ai' && state.phase !== 'ai') return false;

    side.mana -= card.cost;
    side.hand.splice(handIndex, 1);
    const playedBefore = side.surge[card.element];
    const damage = cardDamage(card, playedBefore);
    const healed = cardHeal(card);
    const shield = cardShield(card);
    side.surge[card.element] += 1;

    if (damage > 0) dealDamage(foe, damage, sideName === 'player' ? 'ai' : 'player');
    if (healed > 0) heal(side, healed, sideName);
    if (shield > 0) {
      side.shield += shield;
      state.floaters.push({ anchor: sideName, text: `+${shield} shield`, color: '#8ec9ee', t: 0 });
    }

    state.table.push({ card, owner: sideName, t: 0 });
    while (state.table.length > TABLE_SHOWN) {
      const old = state.table.shift();
      (old.owner === 'player' ? state.player : state.ai).discard.push(old.card);
    }
    pushLog(describePlay(sideName === 'player' ? 'You' : 'The Warden', card, damage - card.power, damage, healed, shield));

    if (foe.hp <= 0) {
      state.winner = sideName;
      state.phase = 'over';
      pushLog(sideName === 'player' ? 'The Warden falls. Victory!' : 'You fall. The Warden stands.');
    }
    return true;
  }

  /** The AI's pick: a finishing blow first, a Guard when it is hurt, else the hardest hit. */
  function aiChooseCard() {
    const ai = state.ai;
    const affordable = [];
    ai.hand.forEach((card, index) => {
      if (canAfford(card, ai.mana)) affordable.push({ card, index });
    });
    if (affordable.length === 0) return -1;
    const finishing = affordable.filter(
      ({ card }) => card.type !== TYPE_GUARD && cardDamage(card, ai.surge[card.element]) >= state.player.hp,
    );
    if (finishing.length > 0) return bestPick(finishing).index;
    if (ai.hp < 8) {
      const guards = affordable.filter(({ card }) => card.type === TYPE_GUARD);
      if (guards.length > 0) return bestPick(guards).index;
    }
    return bestPick(affordable).index;
  }

  /** Hardest damage first, then cheapest, then earliest — deterministic, no coin flips. */
  function bestPick(picks) {
    let best = picks[0];
    for (let index = 1; index < picks.length; index += 1) {
      const pick = picks[index];
      const bestDamage = cardDamage(best.card, state.ai.surge[best.card.element]);
      const pickDamage = cardDamage(pick.card, state.ai.surge[pick.card.element]);
      if (pickDamage > bestDamage || (pickDamage === bestDamage && pick.card.cost < best.card.cost)) best = pick;
    }
    return best;
  }

  function endTurn() {
    if (state.phase !== 'play') return false;
    state.ai.mana = Math.min(state.round, MAX_MANA);
    state.ai.surge = { flame: 0, frost: 0, leaf: 0, bolt: 0 };
    drawTo(state.ai);
    state.phase = 'ai';
    state.aiPlaysLeft = AI_PLAYS_PER_TURN;
    state.aiTimer = AI_FIRST_DELAY;
    pushLog('The Warden takes its turn…');
    return true;
  }

  function step(dt) {
    state.elapsed += dt;
    for (const ember of state.embers) {
      ember.y -= ember.vy * dt;
      ember.drift += dt * 0.6;
      ember.x += Math.sin(ember.drift) * 8 * dt;
      if (ember.y < -8) {
        ember.y = 728;
        ember.x = random() * 1280;
      }
    }
    for (const shown of state.table) shown.t = Math.min(1, shown.t + dt / 0.25);
    for (let index = state.floaters.length - 1; index >= 0; index -= 1) {
      state.floaters[index].t += dt;
      if (state.floaters[index].t > 0.9) state.floaters.splice(index, 1);
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 24);

    if (state.phase !== 'ai') return 0;
    state.aiTimer -= dt;
    if (state.aiTimer > 0) return 0;
    if (state.aiPlaysLeft > 0) {
      const index = aiChooseCard();
      if (index >= 0) {
        playCard('ai', index);
        state.aiPlaysLeft -= 1;
        state.aiTimer = AI_BETWEEN_DELAY;
      } else {
        state.aiPlaysLeft = 0;
        state.aiTimer = AI_END_DELAY;
      }
    } else {
      startPlayerTurn();
    }
    return state.phase === 'over' ? EVENT_OVER : 0;
  }

  return { state, reset, playCard, endTurn, step };
}
