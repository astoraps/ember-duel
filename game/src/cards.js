// Card definitions and the pure effect helpers: how much a card hits for, what it heals, and
// the words that describe a play. Nothing here touches the canvas or the clock; the world
// applies these numbers to its state.
import { CARD_DECK, ELEMENTS, TYPE_GUARD, TYPE_SIPHON, TYPE_STRIKE, TYPE_SURGE } from './config.js';

/** The element's display info (colour + shape), for one element key. */
export function elementInfo(element) {
  return ELEMENTS[element];
}

/** A fresh shuffled deck: one copy of each of the 24 cards, Fisher-Yates with the seeded RNG. */
export function buildDeck(random) {
  const deck = CARD_DECK.map((def) => ({ ...def }));
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = deck[index];
    deck[index] = deck[other];
    deck[other] = held;
  }
  return deck;
}

/**
 * Surge's bonus: a Surge card deals +2 when it is the second card of its element played this
 * turn, so `playedBefore` is how many cards of that element the side already played this turn.
 */
export function surgeBonus(card, playedBefore) {
  return card.type === TYPE_SURGE && playedBefore >= 1 ? 2 : 0;
}

/** Damage a card deals: its power, plus the Surge bonus when it applies. */
export function cardDamage(card, playedBefore) {
  if (card.type === TYPE_GUARD) return 0;
  return card.power + surgeBonus(card, playedBefore);
}

/** What a Siphon heals its owner: half its power, rounded down. */
export function cardHeal(card) {
  return card.type === TYPE_SIPHON ? Math.floor(card.power / 2) : 0;
}

/** What a Guard gives its owner: its power as shield. */
export function cardShield(card) {
  return card.type === TYPE_GUARD ? card.power : 0;
}

/** True when the card can be played with this much mana. */
export function canAfford(card, mana) {
  return card.cost <= mana;
}

/** One log line for a play, naming the card and what it did. */
export function describePlay(ownerName, card, bonus, damage, heal, shield) {
  const verb = ownerName === 'You' ? 'play' : 'plays';
  const parts = [`${ownerName} ${verb} ${card.name}`];
  if (card.type === TYPE_STRIKE || card.type === TYPE_SURGE) {
    parts.push(`for ${damage} damage${bonus > 0 ? ` (Surge +${bonus})` : ''}`);
  } else if (card.type === TYPE_SIPHON) {
    parts.push(`for ${damage} damage, heals ${heal}`);
  } else if (card.type === TYPE_GUARD) {
    parts.push(`gains ${shield} shield`);
  }
  return parts.join(' ');
}
